'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Gamepad2, 
  MonitorPlay, 
  Wifi, 
  Calendar, 
  Timer, 
  Users, 
  UtensilsCrossed, 
  Receipt, 
  BarChart3,
  LogOut,
  Menu,
  X
} from 'lucide-react';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, id: 'nav-dashboard' },
  { href: '/dashboard/zones', label: 'Zones & Stations', icon: Gamepad2, id: 'nav-zones' },
  { href: '/dashboard/reservations', label: 'Reservations', icon: Calendar, id: 'nav-reservations' },
  { href: '/dashboard/sessions', label: 'Sessions', icon: Timer, id: 'nav-sessions' },
  { href: '/dashboard/customers', label: 'Customers', icon: Users, id: 'nav-customers' },
  { href: '/dashboard/menu', label: 'Menu & Orders', icon: UtensilsCrossed, id: 'nav-menu' },
  { href: '/dashboard/billing', label: 'Billing', icon: Receipt, id: 'nav-billing' },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3, id: 'nav-reports' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
      }
      setLoading(false);
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase.auth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div id="dashboard-loading" className="min-h-screen bg-black flex items-center justify-center">
        <div id="dashboard-loading-text" className="text-yellow-500 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div id="dashboard-container" className="min-h-screen bg-black">
      {/* Sidebar */}
      <aside id="sidebar-main" className={cn(
        "fixed top-0 left-0 h-full bg-[#0a0a0a] border-r border-zinc-800 transition-all duration-300 z-40",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div id="sidebar-header" className="p-6 border-b border-zinc-800">
          <Link id="sidebar-brand-link" href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div id="sidebar-brand-logo" className="h-10 w-10 bg-yellow-500 rounded-lg flex items-center justify-center">
              <span id="sidebar-brand-logo-text" className="text-black font-bold text-xl">C</span>
            </div>
            {isSidebarOpen && (
              <div id="sidebar-brand-text-container">
                <h2 id="sidebar-brand-title" className="text-xl font-bold text-white">CYBERDINE</h2>
                <p id="sidebar-brand-subtitle" className="text-xs text-zinc-500">Time Is Malleable</p>
              </div>
            )}
          </Link>
        </div>
        
        <nav id="sidebar-nav" className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.id} id={item.id} href={item.href}>
                <Button
                  id={`${item.id}-btn`}
                  variant={pathname === item.href ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    pathname === item.href 
                      ? "bg-yellow-500 text-black hover:bg-yellow-400" 
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  <Icon id={`${item.id}-icon`} className="h-5 w-5" />
                  {isSidebarOpen && <span id={`${item.id}-label`} className="ml-2">{item.label}</span>}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div id="sidebar-footer" className="absolute bottom-0 left-0 right-0 p-4 border-t border-zinc-800">
          <Button
            id="btn-logout"
            variant="ghost"
            className="w-full justify-start text-zinc-400 hover:text-white"
            onClick={handleLogout}
          >
            <LogOut id="icon-logout" className="h-5 w-5" />
            {isSidebarOpen && <span id="label-logout" className="ml-2">Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main id="dashboard-main" className={cn(
        "transition-all duration-300 min-h-screen",
        isSidebarOpen ? "ml-64" : "ml-20"
      )}>
        {/* Header */}
        <header id="dashboard-header" className="sticky top-0 z-30 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-zinc-800 px-6 py-4">
          <div id="header-content" className="flex items-center justify-between">
            <Button
              id="btn-toggle-sidebar"
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-zinc-400"
            >
              {isSidebarOpen ? <X id="icon-close-sidebar" className="h-5 w-5" /> : <Menu id="icon-open-sidebar" className="h-5 w-5" />}
            </Button>
            <div id="header-user" className="flex items-center gap-4">
              <div id="header-user-info" className="text-right">
                <p id="header-user-email" className="text-sm font-medium text-white">{user?.email}</p>
                <p id="header-user-role" className="text-xs text-zinc-500">Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div id="dashboard-content" className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
