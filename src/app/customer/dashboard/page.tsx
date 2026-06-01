'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UtensilsCrossed, Gamepad2, MonitorPlay, Wifi, Calendar, Tag, ChevronRight, LogOut, Home } from 'lucide-react';

const supabase = createClient();

// Sample menu data
const menuCategories = [
  { id: '1', name: 'Beverages', items: [
    { id: 'm1', name: 'Coffee', price: 2.5, description: 'Freshly brewed coffee' },
    { id: 'm2', name: 'Smoothie', price: 4.5, description: 'Mixed fruit smoothie' },
    { id: 'm3', name: 'Soda', price: 1.5, description: 'Carbonated drink' }
  ]},
  { id: '2', name: 'Snacks', items: [
    { id: 'm4', name: 'French Fries', price: 3, description: 'Crispy golden fries' },
    { id: 'm5', name: 'Burger', price: 6.5, description: 'Juicy beef burger' },
    { id: 'm6', name: 'Nachos', price: 4, description: 'Cheese nachos' }
  ]}
];

// Sample recreation activities
const activities = [
  { id: 'a1', name: 'PC Gaming', icon: Gamepad2, description: 'High-end gaming PCs' },
  { id: 'a2', name: 'Movie Pods', icon: MonitorPlay, description: 'Private movie viewing' },
  { id: 'a3', name: 'Internet Lounge', icon: Wifi, description: 'High-speed internet' },
  { id: 'a4', name: 'Food Experience', icon: UtensilsCrossed, description: 'Delicious food & drinks' }
];

// Sample offers
const offers = [
  { id: 'o1', title: 'Happy Hour Discount', description: '50% off between 5-7 PM', discount: 50 },
  { id: 'o2', title: 'Student Special', description: 'Flat $10 off for students', discount: null, flat: 10 }
];

export default function CustomerDashboard() {
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('menu');
  const [bookingsTab, setBookingsTab] = useState('new');
  const router = useRouter();

  useEffect(() => {
    const name = localStorage.getItem('customerName');
    const id = localStorage.getItem('customerId');
    if (!name || !id) {
      router.push('/customer');
      return;
    }
    setCustomerName(name);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('customerId');
    localStorage.removeItem('customerName');
    router.push('/customer');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black p-4 md:p-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-yellow-500 rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-2xl">C</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-yellow-500">CYBERDINE</h1>
            <p className="text-zinc-400 text-sm">Welcome back, {customerName}!</p>
          </div>
        </div>
        <Button variant="ghost" onClick={handleLogout} className="text-zinc-400 hover:text-white">
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </header>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="menu" className="max-w-6xl mx-auto">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-8">
          <TabsTrigger value="menu" onClick={() => setActiveTab('menu')} className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
            <UtensilsCrossed className="h-4 w-4 mr-2" />
            Menu
          </TabsTrigger>
          <TabsTrigger value="recreation" onClick={() => setActiveTab('recreation')} className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
            <Gamepad2 className="h-4 w-4 mr-2" />
            Recreation
          </TabsTrigger>
          <TabsTrigger value="bookings" onClick={() => setActiveTab('bookings')} className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
            <Calendar className="h-4 w-4 mr-2" />
            Bookings
          </TabsTrigger>
          <TabsTrigger value="offers" onClick={() => setActiveTab('offers')} className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
            <Tag className="h-4 w-4 mr-2" />
            Offers
          </TabsTrigger>
        </TabsList>

        {/* Menu Tab */}
        <TabsContent value="menu" className="space-y-6">
          {menuCategories.map(category => (
            <Card key={category.id} className="bg-zinc-900/70 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-yellow-500">{category.name}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {category.items.map(item => (
                  <Card key={item.id} className="bg-zinc-800 border-zinc-600">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-white">{item.name}</h3>
                        <span className="text-yellow-500 font-bold">${item.price.toFixed(2)}</span>
                      </div>
                      <p className="text-zinc-400 text-sm mb-4">{item.description}</p>
                      <Button className="w-full bg-yellow-500 text-black hover:bg-yellow-400">
                        Add to Order
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Recreation Hub Tab */}
        <TabsContent value="recreation" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {activities.map(activity => (
            <Card key={activity.id} className="bg-zinc-900/70 border-zinc-700 hover:border-yellow-500/50 transition-all cursor-pointer">
              <CardContent className="pt-6">
                <div className="h-14 w-14 bg-yellow-500/10 rounded-lg flex items-center justify-center mb-4">
                  <activity.icon className="h-7 w-7 text-yellow-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{activity.name}</h3>
                <p className="text-zinc-400 text-sm mb-4">{activity.description}</p>
                <Button className="w-full bg-yellow-500 text-black hover:bg-yellow-400">
                  Book Now <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Bookings Management Tab */}
        <TabsContent value="bookings" className="space-y-4">
          <Tabs defaultValue="new" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="new" onClick={() => setBookingsTab('new')} className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">New Booking</TabsTrigger>
              <TabsTrigger value="upcoming" onClick={() => setBookingsTab('upcoming')} className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">Upcoming</TabsTrigger>
              <TabsTrigger value="history" onClick={() => setBookingsTab('history')} className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">History</TabsTrigger>
            </TabsList>

            <TabsContent value="new">
              <Card className="bg-zinc-900/70 border-zinc-700">
                <CardHeader>
                  <CardTitle className="text-yellow-500">New Booking</CardTitle>
                  <CardDescription>Select your desired activity</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activities.map(activity => (
                    <Button key={activity.id} className="h-auto py-6 bg-zinc-800 hover:bg-zinc-700 text-white justify-start flex-col">
                      <activity.icon className="h-8 w-8 mb-2 text-yellow-500" />
                      <span>{activity.name}</span>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upcoming">
              <Card className="bg-zinc-900/70 border-zinc-700">
                <CardContent className="pt-6 text-center">
                  <p className="text-zinc-400">No upcoming bookings</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card className="bg-zinc-900/70 border-zinc-700">
                <CardContent className="pt-6 text-center">
                  <p className="text-zinc-400">No booking history yet</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Offers & Promotions Tab */}
        <TabsContent value="offers" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {offers.map(offer => (
            <Card key={offer.id} className="bg-gradient-to-r from-yellow-500/20 to-yellow-500/5 border-yellow-500/30">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-500">{offer.title}</h3>
                    <p className="text-zinc-400 text-sm">{offer.description}</p>
                  </div>
                  {offer.discount ? (
                    <div className="bg-yellow-500 text-black px-3 py-1 rounded-full font-bold">{offer.discount}% OFF</div>
                  ) : (
                    <div className="bg-yellow-500 text-black px-3 py-1 rounded-full font-bold">${offer.flat} OFF</div>
                  )}
                </div>
                <Button className="w-full bg-yellow-500 text-black hover:bg-yellow-400">
                  Apply Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
