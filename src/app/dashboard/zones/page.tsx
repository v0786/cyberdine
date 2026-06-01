'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { Zone, Station } from '@/types';
import { 
  Plus, 
  Gamepad2, 
  MonitorPlay, 
  Wifi,
  Edit,
  MoreHorizontal
} from 'lucide-react';

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchZones();
    fetchStations();

    // Subscribe to realtime updates
    const zonesChannel = supabase
      .channel('zones-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'zones' }, fetchZones)
      .subscribe();

    const stationsChannel = supabase
      .channel('stations-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stations' }, fetchStations)
      .subscribe();

    return () => {
      supabase.removeChannel(zonesChannel);
      supabase.removeChannel(stationsChannel);
    };
  }, []);

  const fetchZones = async () => {
    const { data } = await supabase.from('zones').select('*').order('name');
    setZones(data || []);
    if (!selectedZone && data && data.length > 0) {
      setSelectedZone(data[0].id);
    }
    setLoading(false);
  };

  const fetchStations = async () => {
    const { data } = await supabase.from('stations').select('*').order('name');
    setStations(data || []);
  };

  const getStationStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500 border-green-400';
      case 'occupied':
        return 'bg-red-500 border-red-400';
      case 'reserved':
        return 'bg-yellow-500 border-yellow-400';
      case 'maintenance':
        return 'bg-zinc-500 border-zinc-400';
      default:
        return 'bg-zinc-600 border-zinc-500';
    }
  };

  const getZoneIcon = (zoneName: string) => {
    if (zoneName.includes('Gaming')) return Gamepad2;
    if (zoneName.includes('Movie')) return MonitorPlay;
    return Wifi;
  };

  const filteredStations = selectedZone 
    ? stations.filter(s => s.zone_id === selectedZone) 
    : stations;

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
          <h1 className="text-3xl font-bold text-white mb-2">Zones & Stations</h1>
          <p className="text-zinc-400">Manage your zones and stations</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Zone
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Zone List */}
        <div className="lg:col-span-1 space-y-4">
          {zones.map((zone) => {
            const Icon = getZoneIcon(zone.name);
            return (
              <Card
                key={zone.id}
                className={`cursor-pointer transition-all border-zinc-800 ${
                  selectedZone === zone.id 
                    ? 'bg-zinc-900 border-yellow-500' 
                    : 'bg-[#0a0a0a] hover:bg-zinc-900'
                }`}
                onClick={() => setSelectedZone(zone.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="h-10 w-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: zone.color }}
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{zone.name}</CardTitle>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-zinc-400">
                    ₹{zone.rate_per_hour}/hour
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Station Grid */}
        <div className="lg:col-span-3">
          <Card className="bg-[#0a0a0a] border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {zones.find(z => z.id === selectedZone)?.name || 'All Stations'}
                </CardTitle>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Station
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredStations.length === 0 ? (
                <p className="text-zinc-500 text-center py-12">No stations in this zone</p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                  {filteredStations.map((station) => (
                    <div
                      key={station.id}
                      className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 cursor-pointer ${getStationStatusColor(station.status)}`}
                    >
                      <span className="text-white font-bold text-sm">{station.name}</span>
                      <span className="text-white/70 text-xs capitalize">{station.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Legend */}
              <div className="mt-8 flex flex-wrap gap-6 pt-6 border-t border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-green-500" />
                  <span className="text-sm text-zinc-400">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-red-500" />
                  <span className="text-sm text-zinc-400">Occupied</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-yellow-500" />
                  <span className="text-sm text-zinc-400">Reserved</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-zinc-500" />
                  <span className="text-sm text-zinc-400">Maintenance</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
