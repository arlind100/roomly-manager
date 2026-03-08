import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CalendarDays,
  BedDouble,
  CalendarRange,
  DollarSign,
  Users,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/admin/reservations', icon: CalendarDays, label: 'Reservations' },
  { path: '/admin/room-types', icon: BedDouble, label: 'Room Types' },
  { path: '/admin/availability', icon: CalendarRange, label: 'Availability' },
  { path: '/admin/pricing', icon: DollarSign, label: 'Pricing' },
  { path: '/admin/staff', icon: Users, label: 'Staff' },
  { path: '/admin/invoices', icon: FileText, label: 'Invoices' },
  { path: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const currentPage = navItems.find(item =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-gold flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-sm">A</span>
          </div>
          <div>
            <span className="font-display text-base font-semibold text-foreground">Aurelia</span>
            <span className="text-xs text-muted-foreground block -mt-0.5">Hotel Admin</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <button
            key={item.path}
            onClick={() => {
              navigate(item.path);
              setSidebarOpen(false);
            }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
              isActive(item.path, item.exact)
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-border/50">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 flex-col border-r border-border/50 bg-card/50 fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 inset-y-0 w-64 bg-card flex flex-col shadow-2xl">
            <div className="absolute right-3 top-3">
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground">
                <X size={18} />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-20 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted/50 text-muted-foreground"
            >
              <Menu size={20} />
            </button>
            <h1 className="font-display text-lg font-semibold">{currentPage?.label || 'Dashboard'}</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative text-muted-foreground">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary text-xs font-semibold">
                      {user?.email?.[0]?.toUpperCase() || 'A'}
                    </span>
                  </div>
                  <span className="hidden md:block text-sm text-foreground">{user?.email?.split('@')[0]}</span>
                  <ChevronDown size={14} className="text-muted-foreground hidden md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="text-xs text-muted-foreground">{user?.email}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/admin/settings')}>
                  <Settings size={14} className="mr-2" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut size={14} className="mr-2" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
