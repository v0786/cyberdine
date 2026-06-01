'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { Zone, Station, Customer, Reservation } from '@/types';
import {
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  PhoneCall,
  User,
  MapPin,
  RefreshCw
} from 'lucide-react';

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newReservation, setNewReservation] = useState({
    customerName: '',
    customerMobile: '',
    zoneId: '',
    stationId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '12:00',
    endTime: '14:00',
    status: 'confirmed' as const,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: reservationsData },
        { data: zonesData },
        { data: stationsData },
        { data: customersData }
      ] = await Promise.all([
        supabase.from('reservations').select('*').order('date', { ascending: false }),
        supabase.from('zones').select('*'),
        supabase.from('stations').select('*'),
        supabase.from('customers').select('*')
      ]);
      
      setReservations(reservationsData || []);
      setZones(zonesData || []);
      setStations(stationsData || []);
      setCustomers(customersData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();

    // Set up Realtime subscriptions
    const channel = supabase
      .channel('reservations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchData]);

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Find or create customer
      let customerId = null;
      if (newReservation.customerMobile) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('mobile', newReservation.customerMobile)
          .single();
        
        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else if (newReservation.customerName) {
          const { data: newCustomer } = await supabase
            .from('customers')
            .insert({
              name: newReservation.customerName,
              mobile: newReservation.customerMobile
            })
            .select('id')
            .single();
          customerId = newCustomer?.id;
        }
      }

      await supabase.from('reservations').insert({
        customer_id: customerId,
        zone_id: newReservation.zoneId,
        station_id: newReservation.stationId || null,
        date: newReservation.date,
        start_time: newReservation.startTime,
        end_time: newReservation.endTime,
        status: newReservation.status
      });

      setIsCreating(false);
      setNewReservation({
        customerName: '',
        customerMobile: '',
        zoneId: '',
        stationId: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '12:00',
        endTime: '14:00',
        status: 'confirmed'
      });
    } catch (error) {
      console.error('Error creating reservation:', error);
      alert('Failed to create reservation');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await supabase
        .from('reservations')
        .update({ status })
        .eq('id', id);
    } catch (error) {
      console.error('Error updating reservation:', error);
    }
  };

  const handleDeleteReservation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reservation?')) return;
    try {
      await supabase
        .from('reservations')
        .delete()
        .eq('id', id);
    } catch (error) {
      console.error('Error deleting reservation:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-500';
      case 'checked_in': return 'bg-green-500';
      case 'completed': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getZoneById = (id: string) => zones.find(z => z.id === id);
  const getStationById = (id: string) => stations.find(s => s.id === id);
  const getCustomerById = (id: string) => customers.find(c => c.id === id);
  const availableStations = newReservation.zoneId
    ? stations.filter(s => s.zone_id === newReservation.zoneId && s.status === 'available')
    : [];

  if (loading) {
    return (
      <div id="reservations-loading" className="min-h-[60vh] flex items-center justify-center">
        <div className="text-yellow-500 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div id="reservations-container" className="space-y-6">
      {/* Header */}
      <div id="reservations-header" className="flex items-center justify-between">
        <div>
          <h1 id="reservations-title" className="text-3xl font-bold text-white">Reservations</h1>
          <p id="reservations-description" className="text-zinc-400">Manage customer reservations</p>
        </div>
        <div className="flex gap-2">
          <Button
            id="btn-refresh-reservations"
            variant="ghost"
            onClick={fetchData}
          >
            <RefreshCw id="icon-refresh" className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            id="btn-new-reservation"
            onClick={() => setIsCreating(!isCreating)}
          >
            <Plus id="icon-plus" className="h-4 w-4 mr-2" />
            New Reservation
          </Button>
        </div>
      </div>

      {/* Create Reservation Form */}
      {isCreating && (
        <Card id="card-new-reservation" className="bg-[#0a0a0a] border-zinc-800">
          <CardHeader>
            <CardTitle id="title-new-reservation">Create New Reservation</CardTitle>
          </CardHeader>
          <CardContent>
            <form id="form-new-reservation" onSubmit={handleCreateReservation} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2 lg:col-span-2">
                <Label id="label-customer-name" htmlFor="customer-name">Customer Name</Label>
                <Input
                  id="customer-name"
                  placeholder="Enter customer name"
                  value={newReservation.customerName}
                  onChange={(e) => setNewReservation({ ...newReservation, customerName: e.target.value })}
                  className="bg-zinc-900 border-zinc-700"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label id="label-customer-mobile" htmlFor="customer-mobile">Mobile Number</Label>
                <Input
                  id="customer-mobile"
                  placeholder="Enter mobile number"
                  value={newReservation.customerMobile}
                  onChange={(e) => setNewReservation({ ...newReservation, customerMobile: e.target.value })}
                  className="bg-zinc-900 border-zinc-700"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label id="label-zone" htmlFor="zone-select">Zone</Label>
                <Select
                  value={newReservation.zoneId}
                  onValueChange={(value) => setNewReservation({ ...newReservation, zoneId: value, stationId: '' })}
                >
                  <SelectTrigger id="zone-select" className="bg-zinc-900 border-zinc-700">
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent id="zone-select-content" className="bg-zinc-900 border-zinc-700">
                    {zones.map(zone => (
                      <SelectItem key={zone.id} value={zone.id} id={`zone-select-${zone.id}`}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label id="label-station" htmlFor="station-select">Station (Optional)</Label>
                <Select
                  value={newReservation.stationId}
                  onValueChange={(value) => setNewReservation({ ...newReservation, stationId: value })}
                  disabled={!newReservation.zoneId}
                >
                  <SelectTrigger id="station-select" className="bg-zinc-900 border-zinc-700">
                    <SelectValue placeholder="Select station" />
                  </SelectTrigger>
                  <SelectContent id="station-select-content" className="bg-zinc-900 border-zinc-700">
                    {availableStations.map(station => (
                      <SelectItem key={station.id} value={station.id} id={`station-select-${station.id}`}>
                        {station.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label id="label-date" htmlFor="reservation-date">Date</Label>
                <Input
                  id="reservation-date"
                  type="date"
                  value={newReservation.date}
                  onChange={(e) => setNewReservation({ ...newReservation, date: e.target.value })}
                  className="bg-zinc-900 border-zinc-700"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label id="label-start-time" htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={newReservation.startTime}
                  onChange={(e) => setNewReservation({ ...newReservation, startTime: e.target.value })}
                  className="bg-zinc-900 border-zinc-700"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label id="label-end-time" htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={newReservation.endTime}
                  onChange={(e) => setNewReservation({ ...newReservation, endTime: e.target.value })}
                  className="bg-zinc-900 border-zinc-700"
                  required
                />
              </div>

              <div className="space-y-2 lg:col-span-4 flex gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button type="submit" id="btn-submit-reservation">
                  Create Reservation
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Reservations List */}
      <div id="reservations-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reservations.map((reservation) => {
          const zone = getZoneById(reservation.zone_id);
          const station = getStationById(reservation.station_id || '');
          const customer = getCustomerById(reservation.customer_id || '');

          return (
            <Card
              key={reservation.id}
              id={`reservation-card-${reservation.id}`}
              className="bg-[#0a0a0a] border-zinc-800"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        id={`reservation-status-${reservation.id}`}
                        className={`w-3 h-3 rounded-full ${getStatusColor(reservation.status)}`}
                      />
                      <span id={`reservation-status-text-${reservation.id}`} className="text-sm text-zinc-400 capitalize">
                        {reservation.status.replace('_', ' ')}
                      </span>
                    </div>
                    <CardTitle id={`reservation-customer-${reservation.id}`} className="text-lg">
                      {customer?.name || reservation.customer_id ? (customer?.name || 'Customer') : 'Walk-in'}
                    </CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      id={`btn-edit-${reservation.id}`}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-400 hover:text-white"
                    >
                      <Edit2 id={`icon-edit-${reservation.id}`} className="h-4 w-4" />
                    </Button>
                    <Button
                      id={`btn-delete-${reservation.id}`}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-400 hover:text-red-500"
                      onClick={() => handleDeleteReservation(reservation.id)}
                    >
                      <Trash2 id={`icon-delete-${reservation.id}`} className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-zinc-400">
                  <PhoneCall id={`icon-phone-${reservation.id}`} className="h-4 w-4" />
                  <span id={`reservation-phone-${reservation.id}`}>{customer?.mobile || '-'}</span>
                </div>

                <div className="flex items-center gap-2 text-zinc-400">
                  <Calendar id={`icon-calendar-${reservation.id}`} className="h-4 w-4" />
                  <span id={`reservation-date-${reservation.id}`}>
                    {new Date(reservation.date).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-zinc-400">
                  <Clock id={`icon-clock-${reservation.id}`} className="h-4 w-4" />
                  <span id={`reservation-time-${reservation.id}`}>
                    {reservation.start_time} - {reservation.end_time}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-zinc-400">
                  <MapPin id={`icon-location-${reservation.id}`} className="h-4 w-4" />
                  <span id={`reservation-location-${reservation.id}`}>
                    {zone?.name || 'Unknown Zone'}
                    {station && ` • ${station.name}`}
                  </span>
                </div>

                {/* Status Actions */}
                <div id={`reservation-actions-${reservation.id}`} className="flex gap-2 pt-2 border-t border-zinc-800">
                  {reservation.status === 'confirmed' && (
                    <>
                      <Button
                        id={`btn-check-in-${reservation.id}`}
                        size="sm"
                        className="flex-1"
                        onClick={() => handleUpdateStatus(reservation.id, 'checked_in')}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Check In
                      </Button>
                      <Button
                        id={`btn-cancel-${reservation.id}`}
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleUpdateStatus(reservation.id, 'cancelled')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </>
                  )}
                  {reservation.status === 'checked_in' && (
                    <Button
                      id={`btn-complete-${reservation.id}`}
                      size="sm"
                      className="w-full"
                      onClick={() => handleUpdateStatus(reservation.id, 'completed')}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Complete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {reservations.length === 0 && (
        <Card id="card-no-reservations" className="bg-[#0a0a0a] border-zinc-800">
          <CardContent className="py-12 text-center">
            <Calendar id="icon-no-reservations" className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
            <h3 id="title-no-reservations" className="text-lg font-medium text-white mb-2">
              No Reservations Yet
            </h3>
            <p id="desc-no-reservations" className="text-zinc-400">
              Create your first reservation by clicking the button above
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
