import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/components/admin/StatCard';
import { StatusBadge } from '@/components/admin/StatusBadge';
import {
  CalendarDays,
  Clock,
  DollarSign,
  LogIn,
  LogOut as LogOutIcon,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['hsl(38,65%,52%)', 'hsl(142,70%,45%)', 'hsl(0,70%,50%)', 'hsl(220,70%,50%)'];

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    revenue: 0,
    checkIns: 0,
    checkOuts: 0,
    occupancy: 0,
  });
  const [recentReservations, setRecentReservations] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const [resResult, roomsResult] = await Promise.all([
      supabase.from('reservations').select('*, room_types(name)').order('created_at', { ascending: false }),
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

    const todayOccupied = reservations.filter(
      r => r.check_in <= today && r.check_out > today && r.status === 'confirmed'
    ).length;
    const occupancy = totalUnits > 0 ? Math.round((todayOccupied / totalUnits) * 100) : 0;

    setStats({ total: reservations.length, pending, revenue: monthRevenue, checkIns, checkOuts, occupancy });
    setRecentReservations(reservations.slice(0, 8));
    setStatusData([
      { name: 'Pending', value: pending },
      { name: 'Confirmed', value: confirmed },
      { name: 'Cancelled', value: cancelled },
      { name: 'Completed', value: completed },
    ].filter(d => d.value > 0));
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Mock monthly data for chart
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const bookingChartData = months.map(m => ({
    month: m,
    bookings: Math.floor(Math.random() * 40) + 10,
    revenue: Math.floor(Math.random() * 30000) + 5000,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMMM dd, yyyy')}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Reservations" value={stats.total} icon={CalendarDays} trend="+12%" trendUp />
        <StatCard label="Pending" value={stats.pending} icon={Clock} />
        <StatCard label="Revenue (Month)" value={`$${stats.revenue.toLocaleString()}`} icon={DollarSign} trend="+8%" trendUp />
        <StatCard label="Check-Ins Today" value={stats.checkIns} icon={LogIn} />
        <StatCard label="Check-Outs Today" value={stats.checkOuts} icon={LogOutIcon} />
        <StatCard label="Occupancy" value={`${stats.occupancy}%`} icon={BarChart3} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bookings Chart */}
        <div className="lg:col-span-2 glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-base font-medium">Bookings Overview</h3>
            <span className="text-xs text-muted-foreground">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={bookingChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,8%,18%)" />
              <XAxis dataKey="month" stroke="hsl(30,10%,55%)" fontSize={12} />
              <YAxis stroke="hsl(30,10%,55%)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(30,8%,10%)',
                  border: '1px solid hsl(30,8%,18%)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="bookings" fill="hsl(38,65%,52%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Pie */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-display text-base font-medium mb-6">Reservation Status</h3>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(30,8%,10%)',
                      border: '1px solid hsl(30,8%,18%)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
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
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">No data yet</div>
          )}
        </div>
      </div>

      {/* Recent Reservations */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-base font-medium">Recent Reservations</h3>
          <a href="/admin/reservations" className="text-xs text-primary hover:underline">View All</a>
        </div>
        {recentReservations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No reservations yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-2 text-xs text-muted-foreground font-medium">Code</th>
                  <th className="text-left py-3 px-2 text-xs text-muted-foreground font-medium">Guest</th>
                  <th className="text-left py-3 px-2 text-xs text-muted-foreground font-medium hidden md:table-cell">Room</th>
                  <th className="text-left py-3 px-2 text-xs text-muted-foreground font-medium hidden lg:table-cell">Check-In</th>
                  <th className="text-left py-3 px-2 text-xs text-muted-foreground font-medium hidden lg:table-cell">Check-Out</th>
                  <th className="text-left py-3 px-2 text-xs text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentReservations.map(r => (
                  <tr key={r.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-2 font-mono text-xs">{r.reservation_code}</td>
                    <td className="py-3 px-2">{r.guest_name}</td>
                    <td className="py-3 px-2 hidden md:table-cell text-muted-foreground">{r.room_types?.name || '—'}</td>
                    <td className="py-3 px-2 hidden lg:table-cell text-muted-foreground">{r.check_in}</td>
                    <td className="py-3 px-2 hidden lg:table-cell text-muted-foreground">{r.check_out}</td>
                    <td className="py-3 px-2"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
