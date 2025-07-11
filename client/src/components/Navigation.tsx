import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { 
  Home, 
  MessageCircle, 
  Users, 
  Calendar, 
  Settings, 
  User, 
  Calendar as CalendarIcon, 
  UserPlus, 
  Shield, 
  Clock 
} from 'lucide-react';

export default function Navigation() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  if (!user) return null;

  const navigationItems = [
    { path: '/dashboard', icon: Home, label: 'Home' },
    { path: '/mentors', icon: MessageCircle, label: 'AI Guides' },
    { path: '/individual-booking', icon: Users, label: 'Human Mentors' },
    { path: '/dashboard', icon: CalendarIcon, label: 'Council Scheduling' },
    { path: '/sessions', icon: Calendar, label: 'My Sessions' },
    { path: '/plan-usage', icon: Settings, label: 'Plan & Usage' },
  ];

  // Add mentor-specific navigation for experienced guides
  if (user?.role && ['admin', 'super_admin'].includes(user.role)) {
    navigationItems.push({ path: '/mentor-availability', icon: Clock, label: 'Availability' });
  }

  // Add admin navigation
  const adminItems = [];
  if (user?.role === 'admin' || user?.role === 'super_admin') {
    adminItems.push({ path: '/admin', icon: Shield, label: 'Admin' });
  }

  const isActive = (path: string) => location === path;

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 dark:bg-slate-900/80 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard">
                <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Mentra
                </span>
              </Link>
              
              <div className="flex space-x-1">
                {navigationItems.map((item) => (
                  <Link key={item.path} href={item.path}>
                    <Button
                      variant={isActive(item.path) ? "default" : "ghost"}
                      size="sm"
                      className="flex items-center space-x-2 px-4 py-2 h-9"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                ))}
                {adminItems.map((item) => (
                  <Link key={item.path} href={item.path}>
                    <Button
                      variant={isActive(item.path) ? "default" : "ghost"}
                      size="sm"
                      className="flex items-center space-x-2 px-4 py-2 h-9"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {user.firstName} {user.lastName}
              </span>
              <Button variant="outline" size="sm" onClick={logout} className="px-4 py-2 h-9">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-slate-200 dark:bg-slate-900/90 dark:border-slate-700 pb-safe">
        <div className="grid grid-cols-5 gap-1 p-2">
          {navigationItems.slice(0, 5).map((item) => (
            <Link key={item.path} href={item.path}>
              <Button
                variant={isActive(item.path) ? "default" : "ghost"}
                size="sm"
                className="flex flex-col items-center space-y-1 h-auto py-2"
              >
                <item.icon className="h-4 w-4" />
                <span className="text-xs">{item.label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </nav>

      {/* Top padding for desktop, bottom padding for mobile */}
      <div className="hidden md:block h-16" />
      <div className="md:hidden h-20" />
    </>
  );
}