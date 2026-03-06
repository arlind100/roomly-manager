import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  rooms,
  getReservations,
  updateReservation,
  getBlockedDates,
  toggleBlockedDate,
  Reservation,
} from '@/data/hotelData';
import { format } from 'date-fns';
import {
  CalendarDays,
  Check,
  X,
  Clock,
  Hotel,
  Users,
  LogOut,
  BarChart3,
  List,
  CalendarRange,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ADMIN_PIN = '1234';

const Dashboard = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'reservations' | 'calendar'>('overview');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState(rooms[0].id);
  const [refresh, setRefresh] = useState(0);

  const reservations = useMemo(() => getReservations(), [refresh]);
  const blockedDates = useMemo(() => getBlockedDates(), [refresh]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      setAuthenticated(true);
    } else {
      toast.error('Invalid PIN');
    }
  };

  const handleStatusChange = (id: string, status: Reservation['status']) => {
    updateReservation(id, { status });
    setRefresh(r => r + 1);
    toast.success(`Reservation ${status}`);
  };

  const handleToggleBlock = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    toggleBlockedDate(selectedRoom, dateStr);
    setRefresh(r => r + 1);
  };

  const stats = {
    total: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    cancelled: reservations.filter(r => r.status === 'cancelled').length,
  };

  const filteredReservations = statusFilter === 'all'
    ? reservations
    : reservations.filter(r => r.status === statusFilter);

  // Get reserved/blocked dates for calendar
  const roomReservedDates = reservations
    .filter(r => r.roomId === selectedRoom && r.status !== 'cancelled')
    .flatMap(r => {
      const dates: Date[] = [];
      const start = new Date(r.checkIn);
      const end = new Date(r.checkOut);
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
      return dates;
    });

  const roomBlockedDatesSet = blockedDates
    .filter(b => b.roomId === selectedRoom)
    .map(b => new Date(b.date));

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="glass-card rounded-2xl p-10 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <Lock size={24} className="text-primary" />
          </div>
          <h1 className="font-display text-2xl font-semibold mb-2">Manager Access</h1>
          <p className="text-muted-foreground text-sm mb-6">Enter your PIN to access the dashboard.</p>
          <Input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="Enter PIN"
            className="bg-muted/50 text-center text-lg tracking-widest mb-4"
            maxLength={6}
          />
          <Button type="submit" className="w-full bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 font-body">
            Sign In
          </Button>
          <p className="text-xs text-muted-foreground mt-4">Demo PIN: 1234</p>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border p-6 hidden lg:flex flex-col">
        <div className="mb-8">
          <span className="font-display text-lg font-semibold text-gradient-gold">Aurelia</span>{' '}
          <span className="font-display text-lg font-light">Admin</span>
        </div>

        <nav className="space-y-1 flex-1">
          {[
            { key: 'overview', icon: BarChart3, label: 'Overview' },
            { key: 'reservations', icon: List, label: 'Reservations' },
            { key: 'calendar', icon: CalendarRange, label: 'Availability' },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key as any)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all',
                activeTab === item.key ? 'bg-muted text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <button
          onClick={() => setAuthenticated(false)}
          className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </aside>

      {/* Mobile tabs */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-border flex">
        {[
          { key: 'overview', icon: BarChart3, label: 'Overview' },
          { key: 'reservations', icon: List, label: 'Bookings' },
          { key: 'calendar', icon: CalendarRange, label: 'Calendar' },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key as any)}
            className={cn(
              'flex-1 py-3 flex flex-col items-center gap-1 text-xs transition-colors',
              activeTab === item.key ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <main className="flex-1 p-6 lg:p-10 overflow-auto pb-24 lg:pb-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-semibold">
              {activeTab === 'overview' && 'Dashboard'}
              {activeTab === 'reservations' && 'Reservations'}
              {activeTab === 'calendar' && 'Availability Calendar'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{format(new Date(), 'EEEE, MMM dd, yyyy')}</p>
          </div>
          <Button
            onClick={() => setAuthenticated(false)}
            variant="outline"
            size="sm"
            className="hidden lg:hidden items-center gap-2"
          >
            <LogOut size={14} /> Sign Out
          </Button>
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Reservations', value: stats.total, icon: Hotel, color: 'text-primary' },
                { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-yellow-500' },
                { label: 'Confirmed', value: stats.confirmed, icon: Check, color: 'text-green-500' },
                { label: 'Cancelled', value: stats.cancelled, icon: X, color: 'text-destructive' },
              ].map(stat => (
                <div key={stat.label} className="glass-card rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <stat.icon size={20} className={stat.color} />
                  </div>
                  <p className="font-display text-2xl font-semibold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Recent reservations */}
            <div>
              <h3 className="font-display text-lg font-medium mb-4">Recent Bookings</h3>
              {reservations.length === 0 ? (
                <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
                  No reservations yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {reservations.slice(-5).reverse().map(r => {
                    const room = rooms.find(rm => rm.id === r.roomId);
                    return (
                      <div key={r.id} className="glass-card rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-sm font-medium">{r.guestName}</p>
                            <p className="text-xs text-muted-foreground">{room?.name} · {r.checkIn} → {r.checkOut}</p>
                          </div>
                        </div>
                        <span className={cn(
                          'text-xs px-3 py-1 rounded-full font-medium',
                          r.status === 'pending' && 'bg-yellow-500/20 text-yellow-500',
                          r.status === 'confirmed' && 'bg-green-500/20 text-green-500',
                          r.status === 'cancelled' && 'bg-destructive/20 text-destructive',
                        )}>
                          {r.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reservations */}
        {activeTab === 'reservations' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">{filteredReservations.length} results</span>
            </div>

            {filteredReservations.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">No reservations found.</div>
            ) : (
              <div className="space-y-3">
                {filteredReservations.map(r => {
                  const room = rooms.find(rm => rm.id === r.roomId);
                  return (
                    <div key={r.id} className="glass-card rounded-xl p-5">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <p className="font-display font-medium">{r.guestName}</p>
                            <span className={cn(
                              'text-xs px-2 py-0.5 rounded-full',
                              r.status === 'pending' && 'bg-yellow-500/20 text-yellow-500',
                              r.status === 'confirmed' && 'bg-green-500/20 text-green-500',
                              r.status === 'cancelled' && 'bg-destructive/20 text-destructive',
                            )}>
                              {r.status}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{r.guestEmail} · {r.guestPhone}</p>
                          <p className="text-sm text-muted-foreground">
                            <strong>{room?.name}</strong> · {r.checkIn} → {r.checkOut} · {r.guests} guest{r.guests > 1 ? 's' : ''}
                          </p>
                          {r.specialRequests && <p className="text-xs text-muted-foreground italic">"{r.specialRequests}"</p>}
                        </div>

                        {r.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleStatusChange(r.id, 'confirmed')} className="bg-green-600 hover:bg-green-700 text-foreground font-body text-xs">
                              <Check size={14} className="mr-1" /> Confirm
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleStatusChange(r.id, 'cancelled')} className="text-destructive border-destructive/30 hover:bg-destructive/10 font-body text-xs">
                              <X size={14} className="mr-1" /> Reject
                            </Button>
                          </div>
                        )}

                        {r.status === 'confirmed' && (
                          <Button size="sm" variant="outline" onClick={() => handleStatusChange(r.id, 'cancelled')} className="text-destructive border-destructive/30 hover:bg-destructive/10 font-body text-xs">
                            <X size={14} className="mr-1" /> Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Calendar */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Select Room</label>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger className="w-48 bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="glass-card rounded-xl p-6 inline-block">
              <Calendar
                mode="single"
                onSelect={(date) => date && handleToggleBlock(date)}
                modifiers={{
                  reserved: roomReservedDates,
                  blocked: roomBlockedDatesSet,
                }}
                modifiersClassNames={{
                  reserved: 'bg-yellow-500/30 text-yellow-200',
                  blocked: 'bg-destructive/30 text-destructive line-through',
                }}
                className="p-3 pointer-events-auto"
                numberOfMonths={2}
              />
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-yellow-500/30" /> Reserved</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-destructive/30" /> Blocked</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-muted" /> Available</div>
            </div>

            <p className="text-xs text-muted-foreground">Click a date to block/unblock it for the selected room.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
