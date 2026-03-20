import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { clearSuperadminToken } from '@/lib/superadmin';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Building2, CreditCard, ScrollText, Settings,
  LogOut, Menu, X, Sun, Moon, Shield,
} from 'lucide-react';

export default function SuperadminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggle } = useAdminTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/superadmin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: '/superadmin/hotels', icon: Building2, label: 'Hotels' },
    { path: '/superadmin/billing', icon: CreditCard, label: 'Billing' },
    { path: '/superadmin/audit', icon: ScrollText, label: 'Audit Log' },
    { path: '/superadmin/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path) && path !== '/superadmin';

  const isExactDashboard = location.pathname === '/superadmin';

  const currentPage = navItems.find(item =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path) && !item.exact
  );

  const handleLogout = () => {
    clearSuperadminToken();
    navigate('/superadmin/login');
  };

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[hsl(263,70%,50%)] to-[hsl(280,80%,60%)] flex items-center justify-center shadow-sm">
            <Shield size={15} className="text-white" />
          </div>
          <span className="text-base font-semibold text-foreground">Superadmin</span>
        </div>
        <div className="mt-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-destructive text-destructive-foreground">
            Superadmin Mode
          </span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <button
            key={item.path}
            onClick={() => { navigate(item.path); setSidebarOpen(false); }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200',
              (item.exact ? isExactDashboard : isActive(item.path))
                ? 'bg-[hsl(263,70%,50%)/0.12] text-[hsl(263,70%,50%)] font-medium shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-border/60 space-y-0.5">
        <button onClick={toggle} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200">
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        </button>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200">
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className={`min-h-screen flex admin-${theme}`}>
      <aside className="hidden lg:flex w-60 flex-col border-r border-border/60 bg-card fixed inset-y-0 left-0 z-30 shadow-card">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-foreground/20" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 inset-y-0 w-64 bg-card flex flex-col shadow-elevated border-r border-border/60">
            <div className="absolute right-3 top-3">
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground transition-colors"><X size={18} /></button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        <header className="h-14 border-b border-border/60 bg-card sticky top-0 z-20 flex items-center justify-between px-4 lg:px-6 shadow-card">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors">
              <Menu size={20} />
            </button>
            <h1 className="text-base font-semibold">{currentPage?.label || 'Dashboard'}</h1>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-destructive text-destructive-foreground">
            Superadmin
          </span>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto"><Outlet /></main>
      </div>
    </div>
  );
}
