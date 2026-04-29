import { useState } from 'react';

import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import DashboardAssistant from '@/components/admin/assistant/DashboardAssistant';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useHotel, HotelProvider } from '@/hooks/useHotel';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, CalendarDays, BedDouble, CalendarRange, DollarSign,
  Users, FileText, Settings, LogOut, Menu, X, ChevronDown, Sun, Moon,
  BarChart3, DoorOpen, BotMessageSquare, PackageSearch, Bell, Search,
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
  useSessionTimeout();

  type NavItem = { path: string; icon: any; label: string; exact?: boolean };
  type NavGroup = { label: string; items: NavItem[] };

  const navGroups: NavGroup[] = [
    {
      label: 'OPERATIONS',
      items: [
        { path: '/admin', icon: LayoutDashboard, label: t('admin.dashboard'), exact: true },
        { path: '/admin/reservations', icon: CalendarDays, label: t('admin.reservations') },
        { path: '/admin/room-types', icon: BedDouble, label: t('admin.roomTypes') },
        { path: '/admin/rooms', icon: DoorOpen, label: 'Rooms' },
        { path: '/admin/availability', icon: CalendarRange, label: t('admin.availability') },
        { path: '/admin/lost-found', icon: PackageSearch, label: 'Lost & Found' },
      ],
    },
    {
      label: 'FINANCE',
      items: [
        { path: '/admin/pricing', icon: DollarSign, label: t('admin.pricing') },
        { path: '/admin/invoices', icon: FileText, label: t('admin.invoices') },
        { path: '/admin/analytics-reports', icon: BarChart3, label: t('admin.analyticsReports') },
      ],
    },
    {
      label: 'SYSTEM',
      items: [
        { path: '/admin/staff', icon: Users, label: t('admin.staff') },
      ],
    },
  ];

  const allNavItems = navGroups.flatMap(g => g.items);

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const currentPage =
    allNavItems.find(item =>
      item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
    ) ||
    (location.pathname.startsWith('/admin/settings')
      ? { label: t('admin.settings') }
      : undefined);

  const handleSignOut = async () => { await signOut(); navigate('/admin/login'); };

  const hotelInitials = (hotel?.name || 'R')
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const NavButton = ({ item }: { item: NavItem }) => {
    const active = isActive(item.path, item.exact);
    return (
      <button
        onClick={() => { navigate(item.path); setSidebarOpen(false); }}
        className={cn(
          'relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150',
          active
            ? 'bg-primary/12 text-primary font-medium'
            : 'text-muted-foreground/70 hover:text-foreground hover:bg-muted/40'
        )}
      >
        {active && (
          <span className="absolute inset-y-[20%] left-0 w-[3px] bg-primary rounded-r-full" />
        )}
        <item.icon size={18} />
        <span className="font-body">{item.label}</span>
      </button>
    );
  };

  const SidebarContent = () => (
    <>
      {/* Brand block */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-sm">
            <span className="font-display font-bold text-sm text-white">R</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="font-display font-semibold text-sm text-foreground truncate">
                {hotel?.name || t('admin.adminPanel')}
              </p>
              <span className="text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/25">
                PMS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sectioned nav */}
      <nav className="flex-1 px-2 pb-3 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-0.5">
            <p className="text-[9px] font-semibold tracking-[0.08em] text-muted-foreground/60 uppercase px-3 pt-4 pb-1">
              {group.label}
            </p>
            {group.items.map(item => <NavButton key={item.path} item={item} />)}
          </div>
        ))}

        {/* Settings + utilities (kept inside nav, divided) */}
        <div className="border-t border-border/40 pt-2 mt-3 space-y-0.5">
          <NavButton item={{ path: '/admin/settings', icon: Settings, label: t('admin.settings') }} />
          <button
            onClick={() => { setAssistantOpen(true); setSidebarOpen(false); }}
            className="relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground/70 hover:text-foreground hover:bg-muted/40 transition-all duration-150"
          >
            <BotMessageSquare size={18} />
            <span className="font-body">Assistant</span>
          </button>
          <button
            onClick={toggle}
            className="relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground/70 hover:text-foreground hover:bg-muted/40 transition-all duration-150"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            <span className="font-body">{theme === 'light' ? t('admin.dark') : t('admin.light')}</span>
          </button>
          <button
            onClick={handleSignOut}
            className="relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground/70 hover:text-foreground hover:bg-muted/40 transition-all duration-150"
          >
            <LogOut size={18} />
            <span className="font-body">{t('admin.signOut')}</span>
          </button>
        </div>
      </nav>

      {/* Hotel card footer */}
      <div className="p-2">
        <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shrink-0">
            <span className="font-display font-bold text-[11px] text-white">{hotelInitials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground truncate">{hotel?.name || 'Roomly'}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              Admin · {user?.email?.split('@')[0]}
            </p>
          </div>
        </div>
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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
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
        <header className="h-14 border-b border-border/50 bg-card sticky top-0 z-20 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
              <Menu size={20} />
            </button>
            <h1 className="font-display font-bold text-base tracking-tight text-foreground">
              {currentPage?.label || t('admin.dashboard')}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Subtle search */}
            <div className="hidden md:flex items-center gap-2 bg-muted/60 border border-border/60 rounded-lg px-3 h-8 w-36 text-sm text-muted-foreground">
              <Search size={14} />
              <span className="text-xs">Search…</span>
            </div>
            {/* Notification icon button */}
            <button
              type="button"
              className="w-8 h-8 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Notifications"
            >
              <Bell size={15} />
            </button>
            {/* Theme toggle (mirror of sidebar) */}
            <button
              type="button"
              onClick={toggle}
              className="w-8 h-8 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-lg hover:bg-muted/60 transition-all duration-150">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{user?.email?.[0]?.toUpperCase() || 'A'}</span>
                  </div>
                  <span className="hidden md:block text-sm font-body">{user?.email?.split('@')[0]}</span>
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
