import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useHotel } from '@/hooks/useHotel';
import { formatCurrency } from '@/lib/currency';
import { StatCard } from '@/components/admin/StatCard';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  CalendarDays, Clock, DollarSign, LogIn, LogOut as LogOutIcon, BarChart3, Users,
  Plus, BedDouble, CalendarRange, UserPlus, AlertTriangle, ArrowRight,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, addDays } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from 'recharts';

const COLORS = ['hsl(45,90%,50%)', 'hsl(142,70%,45%)', 'hsl(0,70%,50%)', 'hsl(220,70%,50%)'];
const SOURCE_COLORS = ['hsl(220,70%,50%)', 'hsl(45,90%,50%)', 'hsl(142,70%,45%)', 'hsl(0,70%,50%)'];

const AdminDashboard = () => {
  const { t } = useLanguage();
  const { hotel } = useHotel();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, pending: 0, revenue: 0, checkIns: 0, checkOuts: 0, occupancy: 0 });
  const [revenueToday, setRevenueToday] = useState(0);
  const [recentReservations, setRecentReservations] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [bookingChartData, setBookingChartData] = useState<any[]>([]);
  const [guestsChartData, setGuestsChartData] = useState<any[]>([]);
  const [occupancyChartData, setOccupancyChartData] = useState<any[]>([]);
  const [upcomingArrivals, setUpcomingArrivals] = useState<any[]>([]);
  const [upcomingDepartures, setUpcomingDepartures] = useState<any[]>([]);
  const [sourceData, setSourceData] = useState<any[]>([]);
  const [next7DaysOccupancy, setNext7DaysOccupancy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const [resResult, roomsResult] = await Promise.all([
      supabase.from('reservations').select('*, room_types(name, available_units)').order('created_at', { ascending: false }),
      supabase.from('room_types').select('available_units'),
    ]);

    const reservations = resResult.data || [];
    const totalUnits = (roomsResult.data || []).reduce((sum: number, r: any) => sum + (r.available_units || 0), 0);

    const pending = reservations.filter(r => r.status === 'pending').length;
    const confirmed = reservations.filter(r => r.status === 'confirmed').length;
    const cancelled = reservations.filter(r => r.status === 'cancelled').length;
    const completed = reservations.filter(r => r.status === 'completed').length;
    const monthRevenue = reservations
      .filter(r => r.status !== 'cancelled' && r.created_at >= monthStart && r.created_at <= monthEnd + 'T23:59:59')
      .reduce((sum, r) => sum + (Number(r.total_price) || 0), 0);
    const checkIns = reservations.filter(r => r.check_in === today && r.status === 'confirmed').length;
    const checkOuts = reservations.filter(r => r.check_out === today && r.status !== 'cancelled').length;
    const todayOccupied = reservations.filter(r => r.check_in <= today && r.check_out > today && r.status === 'confirmed').length;
    const occupancy = totalUnits > 0 ? Math.round((todayOccupied / totalUnits) * 100) : 0;

    // Revenue today
    const todayRevenue = reservations
      .filter(r => r.status === 'confirmed' && r.check_in <= today && r.check_out > today)
      .reduce((sum, r) => sum + (Number(r.total_price) || 0), 0);
    setRevenueToday(todayRevenue);

    setStats({ total: reservations.length, pending, revenue: monthRevenue, checkIns, checkOuts, occupancy });
    setRecentReservations(reservations.slice(0, 8));
    setStatusData([
      { name: t('admin.pending'), value: pending },
      { name: t('admin.confirmed'), value: confirmed },
      { name: t('admin.cancelled'), value: cancelled },
      { name: t('admin.completed'), value: completed },
    ].filter(d => d.value > 0));

    // Upcoming arrivals (today + tomorrow, confirmed/pending)
    const arrivals = reservations
      .filter(r => (r.check_in === today || r.check_in === tomorrow) && (r.status === 'confirmed' || r.status === 'pending'))
      .sort((a, b) => a.check_in.localeCompare(b.check_in))
      .slice(0, 5);
    setUpcomingArrivals(arrivals);

    // Upcoming departures (today + tomorrow)
    const departures = reservations
      .filter(r => (r.check_out === today || r.check_out === tomorrow) && r.status !== 'cancelled')
      .sort((a, b) => a.check_out.localeCompare(b.check_out))
      .slice(0, 5);
    setUpcomingDepartures(departures);

    // Booking source breakdown
    const sourceMap: Record<string, number> = {};
    reservations.filter(r => r.status !== 'cancelled').forEach(r => {
      const src = r.booking_source || 'direct';
      sourceMap[src] = (sourceMap[src] || 0) + 1;
    });
    setSourceData(Object.entries(sourceMap).map(([name, value]) => ({ name, value })));

    // Monthly booking chart (last 6 months)
    const monthlyBookings: { month: string; bookings: number }[] = [];
    const monthlyGuests: { month: string; guests: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const mStart = format(startOfMonth(d), 'yyyy-MM-dd');
      const mEnd = format(endOfMonth(d), 'yyyy-MM-dd') + 'T23:59:59';
      const label = format(d, 'MMM');
      const monthRes = reservations.filter(r => r.created_at >= mStart && r.created_at <= mEnd && r.status !== 'cancelled');
      monthlyBookings.push({ month: label, bookings: monthRes.length });
      monthlyGuests.push({ month: label, guests: monthRes.reduce((s, r) => s + (r.guests_count || 1), 0) });
    }
    setBookingChartData(monthlyBookings);
    setGuestsChartData(monthlyGuests);

    // Daily room occupancy for current month
    const now = new Date();
    const mStartDate = startOfMonth(now);
    const mEndDate = endOfMonth(now);
    const days = eachDayOfInterval({ start: mStartDate, end: mEndDate });
    const occupancyData = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const occupied = reservations.filter(r =>
        r.status === 'confirmed' && r.check_in <= dayStr && r.check_out > dayStr
      ).length;
      return { day: format(day, 'dd'), occupancy: totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0 };
    });
    setOccupancyChartData(occupancyData);

    // Occupancy next 7 days
    const next7 = eachDayOfInterval({ start: new Date(), end: addDays(new Date(), 6) });
    const next7Data = next7.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const occupied = reservations.filter(r =>
        r.status === 'confirmed' && r.check_in <= dayStr && r.check_out > dayStr
      ).length;
      return { day: format(day, 'EEE'), occupancy: totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0 };
    });
    setNext7DaysOccupancy(next7Data);

    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const cur = hotel?.currency || 'USD';
  const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px', color: 'hsl(var(--foreground))' };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMMM dd, yyyy')}</p>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label={t('admin.totalReservations')} value={stats.total} icon={CalendarDays} />
        <StatCard label={t('admin.pending')} value={stats.pending} icon={Clock} />
        <StatCard label={t('admin.revenueMonth')} value={formatCurrency(stats.revenue, cur)} icon={DollarSign} />
        <StatCard label={t('admin.checkInsToday')} value={stats.checkIns} icon={LogIn} />
        <StatCard label={t('admin.checkOutsToday')} value={stats.checkOuts} icon={LogOutIcon} />
        <StatCard label={t('admin.occupancy')} value={`${stats.occupancy}%`} icon={BarChart3} />
      </div>

      {/* Row: Pending Alert + Revenue Today + Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pending Alert */}
        <button
          onClick={() => navigate('/admin/reservations?status=pending')}
          className="bg-card rounded-lg border border-border p-5 flex items-center gap-4 hover:bg-muted/30 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">
              {stats.pending > 0 ? `${stats.pending} ${t('admin.pendingReservationsAlert')}` : t('admin.noPendingReservations')}
            </p>
          </div>
        </button>

        {/* Revenue Today */}
        <div className="bg-card rounded-lg border border-border p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <DollarSign size={20} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{formatCurrency(revenueToday, cur)}</p>
            <p className="text-xs text-muted-foreground">{t('admin.revenueToday')}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-lg border border-border p-5">
          <h3 className="text-sm font-semibold mb-3">{t('admin.quickActions')}</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="text-xs justify-start gap-1.5" onClick={() => navigate('/admin/front-desk')}>
              <UserPlus size={14} /> {t('admin.quickWalkIn')}
            </Button>
            <Button variant="outline" size="sm" className="text-xs justify-start gap-1.5" onClick={() => navigate('/admin/reservations')}>
              <Plus size={14} /> {t('admin.newReservation')}
            </Button>
            <Button variant="outline" size="sm" className="text-xs justify-start gap-1.5" onClick={() => navigate('/admin/availability')}>
              <CalendarRange size={14} /> {t('admin.blockDates')}
            </Button>
            <Button variant="outline" size="sm" className="text-xs justify-start gap-1.5" onClick={() => navigate('/admin/room-types')}>
              <BedDouble size={14} /> {t('admin.addRoomType')}
            </Button>
          </div>
        </div>
      </div>

      {/* Row: Upcoming Arrivals + Departures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Arrivals */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2"><LogIn size={14} /> {t('admin.upcomingArrivals')}</h3>
            <span className="text-xs text-muted-foreground">{t('admin.todayTomorrow')}</span>
          </div>
          {upcomingArrivals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('admin.noData')}</p>
          ) : (
            <div className="space-y-3">
              {upcomingArrivals.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{r.guest_name}</p>
                    <p className="text-xs text-muted-foreground">{r.room_types?.name || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{r.check_in}</p>
                    <p className="text-xs"><Users size={10} className="inline mr-1" />{r.guests_count}</p>
                  </div>
                </div>
              ))}
              <button onClick={() => navigate('/admin/reservations')} className="text-xs text-primary hover:underline flex items-center gap-1">
                {t('admin.viewAll')} <ArrowRight size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Departures */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2"><LogOutIcon size={14} /> {t('admin.upcomingDepartures')}</h3>
            <span className="text-xs text-muted-foreground">{t('admin.todayTomorrow')}</span>
          </div>
          {upcomingDepartures.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('admin.noData')}</p>
          ) : (
            <div className="space-y-3">
              {upcomingDepartures.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{r.guest_name}</p>
                    <p className="text-xs text-muted-foreground">{r.room_types?.name || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{r.check_out}</p>
                    <p className="text-xs"><Users size={10} className="inline mr-1" />{r.guests_count}</p>
                  </div>
                </div>
              ))}
              <button onClick={() => navigate('/admin/reservations')} className="text-xs text-primary hover:underline flex items-center gap-1">
                {t('admin.viewAll')} <ArrowRight size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 1: Bookings + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold">{t('admin.bookingsOverview')}</h3>
            <span className="text-xs text-muted-foreground">{t('admin.last6Months')}</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={bookingChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="bookings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-sm font-semibold mb-6">{t('admin.reservationStatus')}</h3>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {statusData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">{t('admin.noData')}</div>}
        </div>
      </div>

      {/* Charts Row 2: Guests + Occupancy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Users size={14} /> {t('admin.guestsOverview')}</h3>
            <span className="text-xs text-muted-foreground">{t('admin.last6Months')}</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={guestsChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="guests" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold flex items-center gap-2"><BarChart3 size={14} /> {t('admin.roomOccupancy')}</h3>
            <span className="text-xs text-muted-foreground">{format(new Date(), 'MMMM yyyy')}</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={occupancyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} interval={2} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} unit="%" domain={[0, 100]} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, 'Occupancy']} />
              <Area type="monotone" dataKey="occupancy" stroke="hsl(142,70%,45%)" fill="hsl(142,70%,45%)" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row: Booking Sources + Next 7 Days Occupancy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Source Breakdown */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-sm font-semibold mb-6">{t('admin.bookingSourceBreakdown')}</h3>
          {sourceData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart><Pie data={sourceData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {sourceData.map((_, i) => <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />)}
                </Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {sourceData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                    <span className="text-muted-foreground capitalize">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">{t('admin.noData')}</div>}
        </div>

        {/* Occupancy Next 7 Days */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold flex items-center gap-2"><BarChart3 size={14} /> {t('admin.occupancyNext7Days')}</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={next7DaysOccupancy}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} unit="%" domain={[0, 100]} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, 'Occupancy']} />
              <Bar dataKey="occupancy" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Reservations */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">{t('admin.recentReservations')}</h3>
          <a href="/admin/reservations" className="text-xs text-primary hover:underline">{t('admin.viewAll')}</a>
        </div>
        {recentReservations.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">{t('admin.noData')}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left py-2.5 px-2 text-xs text-muted-foreground font-medium">{t('admin.code')}</th>
                <th className="text-left py-2.5 px-2 text-xs text-muted-foreground font-medium">{t('admin.guest')}</th>
                <th className="text-left py-2.5 px-2 text-xs text-muted-foreground font-medium hidden md:table-cell">{t('admin.room')}</th>
                <th className="text-left py-2.5 px-2 text-xs text-muted-foreground font-medium hidden lg:table-cell">{t('admin.checkIn')}</th>
                <th className="text-left py-2.5 px-2 text-xs text-muted-foreground font-medium">{t('admin.status')}</th>
              </tr></thead>
              <tbody>{recentReservations.map(r => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-2 font-mono text-xs">{r.reservation_code}</td>
                  <td className="py-2.5 px-2">{r.guest_name}</td>
                  <td className="py-2.5 px-2 hidden md:table-cell text-muted-foreground">{r.room_types?.name || '—'}</td>
                  <td className="py-2.5 px-2 hidden lg:table-cell text-muted-foreground">{r.check_in}</td>
                  <td className="py-2.5 px-2"><StatusBadge status={r.status} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
