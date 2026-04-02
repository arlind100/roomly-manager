import { useState } from 'react';
import arluneLogo from '@/assets/arlune-logo.png';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import DashboardAssistant from '@/components/admin/assistant/DashboardAssistant';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useHotel, HotelProvider } from '@/hooks/useHotel';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, CalendarDays, BedDouble, CalendarRange, DollarSign,
  Users, FileText, Settings, LogOut, Menu, X, ChevronDown, Sun, Moon,
  BarChart3, DoorOpen, BotMessageSquare,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function AdminLayoutInner() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const { hotel } = useHotel();
  const { theme, toggle } = useAdminTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: t('admin.dashboard'), exact: true },
    { path: '/admin/reservations', icon: CalendarDays, label: t('admin.reservations') },
    { path: '/admin/room-types', icon: BedDouble, label: t('admin.roomTypes') },
    { path: '/admin/rooms', icon: DoorOpen, label: 'Rooms' },
    { path: '/admin/availability', icon: CalendarRange, label: t('admin.availability') },
    { path: '/admin/pricing', icon: DollarSign, label: t('admin.pricing') },
    { path: '/admin/staff', icon: Users, label: t('admin.staff') },
    { path: '/admin/invoices', icon: FileText, label: t('admin.invoices') },
    { path: '/admin/analytics-reports', icon: BarChart3, label: t('admin.analyticsReports') },
    { path: '/admin/settings', icon: Settings, label: t('admin.settings') },
  ];

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const currentPage = navItems.find(item =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
  );

  const handleSignOut = async () => { await signOut(); navigate('/admin/login'); };

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <LayoutDashboard size={15} className="text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{hotel?.name || t('admin.adminPanel')}</p>
            {hotel?.name && <p className="text-[10px] text-muted-foreground truncate">Admin Panel</p>}
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <button
            key={item.path}
            onClick={() => { navigate(item.path); setSidebarOpen(false); }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
              isActive(item.path, item.exact)
                ? 'bg-primary/10 text-primary font-medium border-l-[3px] border-primary ml-[-1px]'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-0.5">
        <button onClick={() => { setAssistantOpen(true); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150">
          <BotMessageSquare size={18} />
          Assistant
        </button>
        <button onClick={toggle} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150">
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          {theme === 'light' ? t('admin.dark') : t('admin.light')}
        </button>
        <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150">
          <LogOut size={18} />
          {t('admin.signOut')}
        </button>
        <a 
          href="https://arlune.site" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Powered by</span>
          <img src={arluneLogo} alt="Arlune" className="h-4" />
        </a>
      </div>
    </>
  );

  return (
    <div className={`min-h-screen flex admin-${theme}`}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 flex-col border-r border-sidebar-border bg-[hsl(var(--sidebar-background))] fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 inset-y-0 w-64 bg-[hsl(var(--sidebar-background))] flex flex-col border-r border-sidebar-border">
            <div className="absolute right-3 top-3">
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><X size={18} /></button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        <header className="h-14 border-b border-border/60 bg-card sticky top-0 z-20 flex items-center justify-between px-4 lg:px-6 shadow-card">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
              <Menu size={20} />
            </button>
            <h1 className="text-base font-semibold">{currentPage?.label || t('admin.dashboard')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted transition-all duration-150">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary text-xs font-semibold">{user?.email?.[0]?.toUpperCase() || 'A'}</span>
                  </div>
                  <span className="hidden md:block text-sm">{user?.email?.split('@')[0]}</span>
                  <ChevronDown size={14} className="text-muted-foreground hidden md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="text-xs text-muted-foreground">{user?.email}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/admin/settings')}><Settings size={14} className="mr-2" /> {t('admin.settings')}</DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive"><LogOut size={14} className="mr-2" /> {t('admin.signOut')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto"><Outlet /></main>
      </div>
      <DashboardAssistant open={assistantOpen} onOpenChange={setAssistantOpen} />
    </div>
  );
}

export default function AdminLayout() {
  return (
    <HotelProvider>
      <AdminLayoutInner />
    </HotelProvider>
  );
}
