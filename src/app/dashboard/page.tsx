'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { 
  Activity, 
  DollarSign, 
  CalendarCheck, 
  UtensilsCrossed,
  Gamepad2,
  MonitorPlay,
  Wifi
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    activeSessions: 0,
    revenueToday: 0,
    availableStations: 0,
    occupiedStations: 0,
    reservationsToday: 0,
    ordersToday: 0,
  });
  const [zones, setZones] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchStats();
    fetchZones();
    fetchSessions();

    // Subscribe to realtime updates
    const channels = [
      supabase.channel('sessions-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => fetchStats())
        .subscribe(),
      supabase.channel('stations-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'stations' }, () => fetchStats())
        .subscribe(),
    ];

    return () => channels.forEach(ch => supabase.removeChannel(ch));
  }, []);

  const fetchStats = async () => {
    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Fetch active sessions
    const { data: activeSessionsData } = await (supabase
      .from('sessions')
      .select('*')
      .eq('status', 'active') as any);

    // Fetch stations status
    const { data: stationsData } = await (supabase.from('stations').select('status') as any);

    // Fetch today's reservations
    const { data: reservationsData } = await (supabase
      .from('reservations')
      .select('*')
      .eq('date', today) as any);

    // Fetch today's orders
    const { data: ordersData } = await (supabase
      .from('orders')
      .select('total')
      .gte('created_at', `${today}T00:00:00`) as any);

    // Calculate today's revenue from payments
    const { data: paymentsData } = await (supabase
      .from('payments')
      .select('amount')
      .gte('created_at', `${today}T00:00:00`) as any);

    const revenueToday = paymentsData?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
    const availableCount = stationsData?.filter((s: any) => s.status === 'available').length || 0;
    const occupiedCount = stationsData?.filter((s: any) => s.status === 'occupied').length || 0;

    setStats({
      activeSessions: activeSessionsData?.length || 0,
      revenueToday,
      availableStations: availableCount,
      occupiedStations: occupiedCount,
      reservationsToday: reservationsData?.length || 0,
      ordersToday: ordersData?.length || 0,
    });
  };

  const fetchZones = async () => {
    const { data } = await (supabase.from('zones').select('*, stations(count)') as any);
    setZones(data || []);
  };

  const fetchSessions = async () => {
    const { data } = await (supabase
      .from('sessions')
      .select('*, stations(*), zones(*), customers(*)')
      .eq('status', 'active')
      .order('start_time', { ascending: false }) as any);
    setSessions(data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-yellow-500 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-zinc-400">Welcome to CYBERDINE Management System</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-[#0a0a0a] border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Active Sessions</CardTitle>
            <Activity className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.activeSessions}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0a] border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Revenue Today</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{formatCurrency(stats.revenueToday)}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0a] border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Reservations Today</CardTitle>
            <CalendarCheck className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.reservationsToday}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0a] border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Available Stations</CardTitle>
            <div className="h-4 w-4 bg-green-500 rounded-full" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{stats.availableStations}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0a] border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Occupied Stations</CardTitle>
            <div className="h-4 w-4 bg-red-500 rounded-full" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{stats.occupiedStations}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0a] border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Orders Today</CardTitle>
            <UtensilsCrossed className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.ordersToday}</div>
          </CardContent>
        </Card>
      </div>

      {/* Zones and Active Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Zones */}
        <Card className="bg-[#0a0a0a] border-zinc-800">
          <CardHeader>
            <CardTitle>Zones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {zones.map((zone: any) => {
                const Icon = zone.name === 'Gaming' ? Gamepad2 : zone.name === 'Movie Pods' ? MonitorPlay : Wifi;
                return (
                  <div key={zone.id} className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: zone.color }}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{zone.name}</p>
                        <p className="text-sm text-zinc-400">{formatCurrency(zone.rate_per_hour)}/hour</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">{zone.stations?.[0]?.count || 0}</p>
                      <p className="text-xs text-zinc-500">Stations</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card className="bg-[#0a0a0a] border-zinc-800">
          <CardHeader>
            <CardTitle>Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No active sessions</p>
            ) : (
              <div className="space-y-4">
                {sessions.map((session: any) => (
                  <div key={session.id} className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                    <div>
                      <p className="font-medium text-white">{session.customers?.name || 'Walk-in'}</p>
                      <p className="text-sm text-zinc-400">{session.stations?.name} • {session.zones?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-yellow-500 font-mono">{new Date(session.start_time).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
