'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, calculateCharges, formatDuration } from '@/lib/utils';
import { Session, Zone, Station, Customer } from '@/types';
import { 
  Play, 
  Pause, 
  Square, 
  Plus, 
  UserPlus,
  Timer
} from 'lucide-react';

interface ExtendedSession extends Session {
  zones: Zone;
  stations: Station;
  customers?: Customer;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<ExtendedSession[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewSession, setShowNewSession] = useState(false);
  const [newSession, setNewSession] = useState({
    customerName: '',
    customerMobile: '',
    zoneId: '',
    stationId: '',
  });
  const [timers, setTimers] = useState<Record<string, number>>({});
  const intervalsRef = useRef<Record<string, NodeJS.Timeout>>({});
  const supabase = createClient();

  useEffect(() => {
    fetchData();

    // Subscribe to realtime updates
    const sessionsChannel = supabase
      .channel('sessions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, fetchSessions)
      .subscribe();

    return () => {
      supabase.removeChannel(sessionsChannel);
      // Clear all intervals on unmount
      Object.values(intervalsRef.current).forEach(clearInterval);
    };
  }, []);

  useEffect(() => {
    // Update timers every second
    sessions.forEach(session => {
      if (session.status === 'active') {
        if (!intervalsRef.current[session.id]) {
          intervalsRef.current[session.id] = setInterval(() => {
            setTimers(prev => ({
              ...prev,
              [session.id]: Math.floor((Date.now() - new Date(session.start_time).getTime()) / 1000)
            }));
          }, 1000);
        }
        // Initialize timer value
        const initialSeconds = Math.floor((Date.now() - new Date(session.start_time).getTime()) / 1000);
        setTimers(prev => ({ ...prev, [session.id]: initialSeconds }));
      } else {
        if (intervalsRef.current[session.id]) {
          clearInterval(intervalsRef.current[session.id]);
          delete intervalsRef.current[session.id];
        }
      }
    });

    return () => {
      Object.values(intervalsRef.current).forEach(clearInterval);
    };
  }, [sessions]);

  const fetchData = async () => {
    await Promise.all([fetchSessions(), fetchZones(), fetchStations(), fetchCustomers()]);
    setLoading(false);
  };

  const fetchSessions = async () => {
    const { data } = await supabase
      .from('sessions')
      .select('*, zones(*), stations(*), customers(*)')
      .order('created_at', { ascending: false });
    setSessions((data as ExtendedSession[]) || []);
  };

  const fetchZones = async () => {
    const { data } = await supabase.from('zones').select('*');
    setZones(data || []);
  };

  const fetchStations = async () => {
    const { data } = await supabase.from('stations').select('*');
    setStations(data || []);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*').order('name');
    setCustomers(data || []);
  };

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getAvailableStations = () => {
    return stations.filter(s => s.status === 'available' && (!newSession.zoneId || s.zone_id === newSession.zoneId));
  };

  const handleStartSession = async () => {
    try {
      // First, check if customer exists or create new
      let customerId = null;
      
      if (newSession.customerMobile) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('mobile', newSession.customerMobile)
          .single();

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else if (newSession.customerName) {
          const { data: newCustomer } = await supabase
            .from('customers')
            .insert({
              name: newSession.customerName,
              mobile: newSession.customerMobile,
            })
            .select('id')
            .single();
          customerId = newCustomer?.id;
        }
      }

      // Get zone for selected station
      const selectedStation = stations.find(s => s.id === newSession.stationId);
      if (!selectedStation) return;

      // Create session
      const { data: session } = await supabase
        .from('sessions')
        .insert({
          customer_id: customerId,
          station_id: newSession.stationId,
          zone_id: selectedStation.zone_id,
          status: 'active',
          start_time: new Date().toISOString(),
        })
        .select()
        .single();

      // Update station status
      await supabase
        .from('stations')
        .update({ status: 'occupied' })
        .eq('id', newSession.stationId);

      // Add session log
      if (session) {
        await supabase
          .from('session_logs')
          .insert({
            session_id: session.id,
            action: 'start',
          });
      }

      setShowNewSession(false);
      setNewSession({ customerName: '', customerMobile: '', zoneId: '', stationId: '' });
    } catch (error) {
      console.error('Error starting session:', error);
      alert('Failed to start session');
    }
  };

  const handlePauseSession = async (session: ExtendedSession) => {
    // For this example, we'll just add a log - you could implement actual pause/resume with additional fields
    await supabase
      .from('session_logs')
      .insert({
        session_id: session.id,
        action: 'pause',
      });
    alert('Pause functionality can be implemented with additional fields in sessions table');
  };

  const handleEndSession = async (session: ExtendedSession) => {
    if (!confirm('End this session?')) return;

    try {
      const now = new Date();
      const startTime = new Date(session.start_time);
      const totalMinutes = Math.ceil((now.getTime() - startTime.getTime()) / 60000);
      const totalCharges = calculateCharges(session.zones.rate_per_hour, totalMinutes);

      // Update session
      await supabase
        .from('sessions')
        .update({
          status: 'completed',
          end_time: now.toISOString(),
          total_duration: totalMinutes,
          total_charges: totalCharges,
        })
        .eq('id', session.id);

      // Update station status
      await supabase
        .from('stations')
        .update({ status: 'available' })
        .eq('id', session.station_id);

      // Add session log
      await supabase
        .from('session_logs')
        .insert({
          session_id: session.id,
          action: 'end',
        });

      // Update customer stats
      if (session.customer_id) {
        await supabase.rpc('increment_customer_stats', {
          customer_id: session.customer_id,
          minutes_spent: totalMinutes,
          amount_spent: totalCharges,
        });
      }

      alert(`Session ended! Total: ${formatCurrency(totalCharges)}`);
    } catch (error) {
      console.error('Error ending session:', error);
      alert('Failed to end session');
    }
  };

  const activeSessions = sessions.filter(s => s.status === 'active');
  const completedSessions = sessions.filter(s => s.status === 'completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-yellow-500 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Sessions</h1>
          <p className="text-zinc-400">Manage active and completed sessions</p>
        </div>
        <Button onClick={() => setShowNewSession(!showNewSession)}>
          <Plus className="h-4 w-4 mr-2" />
          Start New Session
        </Button>
      </div>

      {/* New Session Form */}
      {showNewSession && (
        <Card className="bg-[#0a0a0a] border-zinc-800">
          <CardHeader>
            <CardTitle>Start New Session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input
                  placeholder="Enter name"
                  value={newSession.customerName}
                  onChange={(e) => setNewSession({ ...newSession, customerName: e.target.value })}
                  className="bg-zinc-900 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Mobile Number</Label>
                <Input
                  placeholder="Enter mobile"
                  value={newSession.customerMobile}
                  onChange={(e) => setNewSession({ ...newSession, customerMobile: e.target.value })}
                  className="bg-zinc-900 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Zone</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm"
                  value={newSession.zoneId}
                  onChange={(e) => setNewSession({ ...newSession, zoneId: e.target.value, stationId: '' })}
                >
                  <option value="">Select zone</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>{zone.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Station</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm"
                  value={newSession.stationId}
                  onChange={(e) => setNewSession({ ...newSession, stationId: e.target.value })}
                  disabled={!newSession.zoneId}
                >
                  <option value="">Select station</option>
                  {getAvailableStations().map((station) => (
                    <option key={station.id} value={station.id}>{station.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={handleStartSession} disabled={!newSession.stationId}>
                Start Session
              </Button>
              <Button variant="ghost" onClick={() => setShowNewSession(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Sessions */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Timer className="h-5 w-5 text-yellow-500" />
          Active Sessions ({activeSessions.length})
        </h2>
        {activeSessions.length === 0 ? (
          <Card className="bg-[#0a0a0a] border-zinc-800">
            <CardContent className="py-12 text-center">
              <p className="text-zinc-500">No active sessions</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeSessions.map((session) => (
              <Card key={session.id} className="bg-[#0a0a0a] border-zinc-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{session.customers?.name || 'Walk-in Customer'}</CardTitle>
                      <p className="text-sm text-zinc-400">
                        {session.stations?.name} • {session.zones?.name}
                      </p>
                    </div>
                    <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <p className="text-4xl font-mono font-bold text-yellow-500">
                      {formatTimer(timers[session.id] || 0)}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {formatCurrency(session.zones.rate_per_hour)}/hour
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 border border-zinc-700"
                      onClick={() => handlePauseSession(session)}
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleEndSession(session)}
                    >
                      <Square className="h-4 w-4 mr-2" />
                      End
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Completed Sessions */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Recent Sessions</h2>
        {completedSessions.length === 0 ? (
          <Card className="bg-[#0a0a0a] border-zinc-800">
            <CardContent className="py-12 text-center">
              <p className="text-zinc-500">No completed sessions</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-[#0a0a0a] border-zinc-800">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-zinc-800">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-zinc-400">Customer</th>
                      <th className="text-left p-4 text-sm font-medium text-zinc-400">Station</th>
                      <th className="text-left p-4 text-sm font-medium text-zinc-400">Duration</th>
                      <th className="text-left p-4 text-sm font-medium text-zinc-400">Charges</th>
                      <th className="text-left p-4 text-sm font-medium text-zinc-400">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedSessions.slice(0, 10).map((session) => (
                      <tr key={session.id} className="border-b border-zinc-800/50">
                        <td className="p-4">
                          <p className="font-medium text-white">{session.customers?.name || 'Walk-in'}</p>
                        </td>
                        <td className="p-4 text-zinc-400">
                          {session.stations?.name}
                        </td>
                        <td className="p-4 text-zinc-400">
                          {formatDuration(session.total_duration || 0)}
                        </td>
                        <td className="p-4 text-yellow-500 font-medium">
                          {formatCurrency(session.total_charges || 0)}
                        </td>
                        <td className="p-4 text-zinc-400">
                          {new Date(session.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
