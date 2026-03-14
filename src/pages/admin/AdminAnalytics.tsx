import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useHotel } from '@/hooks/useHotel';
import { displayPrice } from '@/lib/currency';
import { StatCard } from '@/components/admin/StatCard';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { SourceBadge } from '@/components/admin/SourceBadge';
import { DataExportButton } from '@/components/admin/DataExportButton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart3, TrendingUp, CalendarDays, DollarSign, BedDouble, Users,
  Hotel, Star, Clock, Download, FileSpreadsheet, CalendarIcon, ChevronDown,
  PieChart as PieChartIcon, Activity, Target, Award,
} from 'lucide-react';
import {
  format, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay,
  eachDayOfInterval, differenceInDays, parseISO, isWithinInterval,
} from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { cn } from '@/lib/utils';

const CHART_COLORS = [
  'hsl(221, 83%, 53%)', 'hsl(142, 70%, 45%)', 'hsl(45, 90%, 50%)',
  'hsl(0, 70%, 50%)', 'hsl(280, 70%, 55%)', 'hsl(190, 70%, 50%)',
];

type DatePreset = 'today' | '7days' | '30days' | 'month' | 'custom';

const AdminAnalytics = () => {
  const { t } = useLanguage();
  const { hotel } = useHotel();
  const cur = hotel?.currency || 'USD';

  const [preset, setPreset] = useState<DatePreset>('30days');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [reservations, setReservations] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportPage, setReportPage] = useState(0);
  const REPORT_PAGE_SIZE = 15;

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (preset) {
      case 'today': return { from: startOfDay(now), to: endOfDay(now) };
      case '7days': return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
      case '30days': return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
      case 'month': return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'custom': return {
        from: customFrom ? startOfDay(customFrom) : startOfDay(subDays(now, 29)),
        to: customTo ? endOfDay(customTo) : endOfDay(now),
      };
    }
  }, [preset, customFrom, customTo]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [resResult, roomResult] = await Promise.all([
      supabase.from('reservations').select('*, room_types(name, available_units, base_price)').order('created_at', { ascending: false }),
      supabase.from('room_types').select('*'),
    ]);
    setReservations(resResult.data || []);
    setRoomTypes(roomResult.data || []);
    setLoading(false);
  };

  // Filter reservations by date range (using check_in as reference)
  const filtered = useMemo(() => {
    const fromStr = format(dateRange.from, 'yyyy-MM-dd');
    const toStr = format(dateRange.to, 'yyyy-MM-dd');
    return reservations.filter(r => r.check_in >= fromStr && r.check_in <= toStr);
  }, [reservations, dateRange]);

  const nonCancelled = useMemo(() => filtered.filter(r => r.status !== 'cancelled'), [filtered]);
  const totalUnits = useMemo(() => roomTypes.reduce((s, rt) => s + (rt.available_units || 0), 0), [roomTypes]);
  const daysInRange = Math.max(1, differenceInDays(dateRange.to, dateRange.from) + 1);

  // ===== OVERVIEW METRICS =====
  const totalReservations = filtered.length;
  const confirmedRes = filtered.filter(r => r.status === 'confirmed').length;
  const cancelledRes = filtered.filter(r => r.status === 'cancelled').length;
  const totalRevenue = nonCancelled.reduce((s, r) => s + (Number(r.total_price) || 0), 0);
  const avgBookingValue = nonCancelled.length > 0 ? totalRevenue / nonCancelled.length : 0;
  const occupiedRoomDays = nonCancelled.reduce((s, r) => {
    const ci = r.check_in; const co = r.check_out;
    const fromStr = format(dateRange.from, 'yyyy-MM-dd');
    const toStr = format(dateRange.to, 'yyyy-MM-dd');
    const overlapStart = ci > fromStr ? ci : fromStr;
    const overlapEnd = co < toStr ? co : toStr;
    return s + Math.max(0, differenceInDays(parseISO(overlapEnd), parseISO(overlapStart)));
  }, 0);
  const totalRoomDays = totalUnits * daysInRange;
  const occupancyRate = totalRoomDays > 0 ? Math.round((occupiedRoomDays / totalRoomDays) * 100) : 0;

  // ===== CHARTS DATA =====
  const revenueChartData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    // Group by day or week depending on range
    if (days.length <= 31) {
      return days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const rev = nonCancelled.filter(r => r.check_in === dayStr).reduce((s, r) => s + (Number(r.total_price) || 0), 0);
        return { label: format(day, 'MMM dd'), revenue: rev };
      });
    }
    // Weekly buckets
    const buckets: { label: string; revenue: number }[] = [];
    for (let i = 0; i < days.length; i += 7) {
      const chunk = days.slice(i, i + 7);
      const rev = chunk.reduce((s, d) => {
        const dayStr = format(d, 'yyyy-MM-dd');
        return s + nonCancelled.filter(r => r.check_in === dayStr).reduce((a, r) => a + (Number(r.total_price) || 0), 0);
      }, 0);
      buckets.push({ label: format(chunk[0], 'MMM dd'), revenue: rev });
    }
    return buckets;
  }, [nonCancelled, dateRange]);

  const roomTypeBookings = useMemo(() => {
    const map: Record<string, number> = {};
    nonCancelled.forEach(r => {
      const name = r.room_types?.name || 'Unknown';
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [nonCancelled]);

  const sourceDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    nonCancelled.forEach(r => {
      const src = r.booking_source || 'direct';
      map[src] = (map[src] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [nonCancelled]);

  // ===== PERFORMANCE METRICS =====
  const adr = occupiedRoomDays > 0 ? totalRevenue / occupiedRoomDays : 0;
  const revpar = totalRoomDays > 0 ? totalRevenue / totalRoomDays : 0;
  const avgLengthOfStay = nonCancelled.length > 0
    ? nonCancelled.reduce((s, r) => s + Math.max(1, differenceInDays(parseISO(r.check_out), parseISO(r.check_in))), 0) / nonCancelled.length
    : 0;
  const mostPopularRoom = roomTypeBookings.sort((a, b) => b.count - a.count)[0]?.name || '—';
  const peakDay = useMemo(() => {
    const dayMap: Record<string, number> = {};
    nonCancelled.forEach(r => { dayMap[r.check_in] = (dayMap[r.check_in] || 0) + 1; });
    const sorted = Object.entries(dayMap).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? format(parseISO(sorted[0][0]), 'MMM dd, yyyy') : '—';
  }, [nonCancelled]);
  const cancellationRate = totalReservations > 0 ? Math.round((cancelledRes / totalReservations) * 100) : 0;

  // ===== REPORTS DATA =====
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const dailyArrivals = reservations.filter(r => r.check_in === todayStr && r.status !== 'cancelled');
  const dailyDepartures = reservations.filter(r => r.check_out === todayStr && r.status !== 'cancelled');
  const currentlyStaying = reservations.filter(r => r.check_in <= todayStr && r.check_out > todayStr && r.status === 'confirmed');
  const dailyRevenue = currentlyStaying.reduce((s, r) => s + (Number(r.total_price) || 0), 0);

  // Occupancy report by day
  const occupancyReportData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const booked = nonCancelled.filter(r => r.check_in <= dayStr && r.check_out > dayStr).length;
      return { date: format(day, 'yyyy-MM-dd'), booked, available: totalUnits - booked, rate: totalUnits > 0 ? Math.round((booked / totalUnits) * 100) : 0 };
    });
  }, [nonCancelled, dateRange, totalUnits]);

  // Reservation report paginated
  const reservationReportData = useMemo(() => nonCancelled, [nonCancelled]);
  const pagedReservations = reservationReportData.slice(reportPage * REPORT_PAGE_SIZE, (reportPage + 1) * REPORT_PAGE_SIZE);
  const totalPages = Math.ceil(reservationReportData.length / REPORT_PAGE_SIZE);

  // Revenue by room type
  const revenueByRoomType = useMemo(() => {
    const map: Record<string, number> = {};
    nonCancelled.forEach(r => {
      const name = r.room_types?.name || 'Unknown';
      map[name] = (map[name] || 0) + (Number(r.total_price) || 0);
    });
    return Object.entries(map).map(([name, revenue]) => ({ name, revenue }));
  }, [nonCancelled]);

  // Revenue by source
  const revenueBySource = useMemo(() => {
    const map: Record<string, number> = {};
    nonCancelled.forEach(r => {
      const src = r.booking_source || 'direct';
      map[src] = (map[src] || 0) + (Number(r.total_price) || 0);
    });
    return Object.entries(map).map(([name, revenue]) => ({ name, revenue }));
  }, [nonCancelled]);

  // Export data builder
  const buildExportData = useCallback((type: string) => {
    switch (type) {
      case 'reservations':
        return nonCancelled.map(r => ({
          Code: r.reservation_code, Guest: r.guest_name, Room: r.room_types?.name || '',
          'Check-In': r.check_in, 'Check-Out': r.check_out, Status: r.status,
          'Total Price': r.total_price || 0, Source: r.booking_source || 'direct',
        }));
      case 'occupancy':
        return occupancyReportData;
      case 'revenue':
        return revenueByRoomType.map(r => ({ ...r, revenue: Number(r.revenue.toFixed(2)) }));
      default:
        return [];
    }
  }, [nonCancelled, occupancyReportData, revenueByRoomType]);

  const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px', color: 'hsl(var(--foreground))' };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {([
            ['today', 'Today'],
            ['7days', 'Last 7 days'],
            ['30days', 'Last 30 days'],
            ['month', 'This month'],
            ['custom', 'Custom'],
          ] as [DatePreset, string][]).map(([key, label]) => (
            <Button
              key={key}
              variant={preset === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setPreset(key); setReportPage(0); }}
              className="text-xs"
            >
              {label}
            </Button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <CalendarIcon size={14} />
                  {customFrom ? format(customFrom, 'MMM dd, yyyy') : 'From'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-sm">→</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <CalendarIcon size={14} />
                  {customTo ? format(customTo, 'MMM dd, yyyy') : 'To'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customTo} onSelect={setCustomTo} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* TABS */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview" className="gap-1.5"><BarChart3 size={14} /> Overview</TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5"><FileSpreadsheet size={14} /> Reports</TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5"><Activity size={14} /> Performance</TabsTrigger>
        </TabsList>

        {/* ========== OVERVIEW TAB ========== */}
        <TabsContent value="overview" className="space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard label="Total Reservations" value={totalReservations} icon={CalendarDays} />
            <StatCard label="Confirmed" value={confirmedRes} icon={CalendarDays} />
            <StatCard label="Cancelled" value={cancelledRes} icon={CalendarDays} />
            <StatCard label="Total Revenue" value={displayPrice(totalRevenue, cur)} icon={DollarSign} />
            <StatCard label="Avg. Booking Value" value={displayPrice(avgBookingValue, cur)} icon={TrendingUp} />
            <StatCard label="Occupancy Rate" value={`${occupancyRate}%`} icon={BedDouble} />
          </div>

          {/* Revenue Trend */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><TrendingUp size={16} /> Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => displayPrice(v, cur)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => displayPrice(v, cur)} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Room Type Bookings + Source Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><BarChart3 size={16} /> Reservations per Room Type</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={roomTypeBookings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {roomTypeBookings.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><PieChartIcon size={16} /> Booking Source Distribution</h3>
              {sourceDistribution.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={sourceDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                        {sourceDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-3 mt-2 justify-center">
                    {sourceDistribution.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-muted-foreground">{d.name} ({d.value})</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">{t('admin.noData')}</div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ========== REPORTS TAB ========== */}
        <TabsContent value="reports" className="space-y-6">
          {/* Daily Report */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><CalendarDays size={16} /> Daily Report — {format(new Date(), 'MMM dd, yyyy')}</h3>
              <DataExportButton data={[
                { metric: 'Arrivals Today', value: dailyArrivals.length },
                { metric: 'Departures Today', value: dailyDepartures.length },
                { metric: 'Currently Staying', value: currentlyStaying.length },
                { metric: 'Revenue Today', value: dailyRevenue },
              ]} filename="daily-report" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Arrivals Today" value={dailyArrivals.length} icon={Users} />
              <StatCard label="Departures Today" value={dailyDepartures.length} icon={Users} />
              <StatCard label="Currently Staying" value={currentlyStaying.length} icon={Hotel} />
              <StatCard label="Revenue Today" value={displayPrice(dailyRevenue, cur)} icon={DollarSign} />
            </div>
          </div>

          {/* Occupancy Report */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><BedDouble size={16} /> Occupancy Report</h3>
              <DataExportButton data={occupancyReportData} filename="occupancy-report" />
            </div>
            <div className="overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Booked</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Occupancy Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {occupancyReportData.slice(0, 31).map(row => (
                    <TableRow key={row.date}>
                      <TableCell className="text-sm">{row.date}</TableCell>
                      <TableCell className="text-sm">{row.booked}</TableCell>
                      <TableCell className="text-sm">{row.available}</TableCell>
                      <TableCell className="text-sm font-medium">{row.rate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Revenue Report */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><DollarSign size={16} /> Revenue Report</h3>
              <DataExportButton data={revenueByRoomType} filename="revenue-report" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room Type</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueByRoomType.map(row => (
                    <TableRow key={row.name}>
                      <TableCell className="text-sm">{row.name}</TableCell>
                      <TableCell className="text-sm font-medium">{displayPrice(row.revenue, cur)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 border-border">
                    <TableCell className="text-sm font-semibold">Total</TableCell>
                    <TableCell className="text-sm font-semibold">{displayPrice(totalRevenue, cur)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => displayPrice(v, cur)} />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(142, 70%, 45%)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Reservation Report */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><CalendarDays size={16} /> Reservation Report</h3>
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => exportCSV(
                reservationReportData.map(r => ({
                  code: r.reservation_code, guest: r.guest_name, room: r.room_types?.name || '—',
                  check_in: r.check_in, check_out: r.check_out, status: r.status,
                  total_price: r.total_price || 0, source: r.booking_source || 'direct',
                })), 'reservation-report'
              )}>
                <Download size={14} /> Export CSV
              </Button>
            </div>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Room Type</TableHead>
                    <TableHead>Check-In</TableHead>
                    <TableHead>Check-Out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedReservations.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs font-mono">{r.reservation_code}</TableCell>
                      <TableCell className="text-sm">{r.guest_name}</TableCell>
                      <TableCell className="text-sm">{r.room_types?.name || '—'}</TableCell>
                      <TableCell className="text-sm">{r.check_in}</TableCell>
                      <TableCell className="text-sm">{r.check_out}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-sm">{displayPrice(Number(r.total_price) || 0, cur)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.booking_source || 'direct'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">Page {reportPage + 1} of {totalPages} ({reservationReportData.length} results)</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={reportPage === 0} onClick={() => setReportPage(p => p - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={reportPage >= totalPages - 1} onClick={() => setReportPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </div>

          {/* Cancellation Report */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Activity size={16} /> Cancellation Report</h3>
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => exportCSV(
                filtered.filter(r => r.status === 'cancelled').map(r => ({
                  code: r.reservation_code, guest: r.guest_name, room: r.room_types?.name || '—',
                  check_in: r.check_in, check_out: r.check_out, notes: r.notes || '—',
                })), 'cancellation-report'
              )}>
                <Download size={14} /> Export CSV
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <StatCard label="Cancelled Reservations" value={cancelledRes} icon={CalendarDays} />
              <StatCard label="Cancellation Rate" value={`${cancellationRate}%`} icon={Activity} />
              <StatCard label="Revenue Lost" value={displayPrice(
                filtered.filter(r => r.status === 'cancelled').reduce((s, r) => s + (Number(r.total_price) || 0), 0), cur
              )} icon={DollarSign} />
            </div>
            {cancelledRes > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Check-In</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.filter(r => r.status === 'cancelled').slice(0, 20).map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs font-mono">{r.reservation_code}</TableCell>
                      <TableCell className="text-sm">{r.guest_name}</TableCell>
                      <TableCell className="text-sm">{r.room_types?.name || '—'}</TableCell>
                      <TableCell className="text-sm">{r.check_in}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.notes || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ========== PERFORMANCE TAB ========== */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="bg-card rounded-lg border border-border p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><DollarSign size={18} className="text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">ADR (Average Daily Rate)</p>
                  <p className="text-xl font-semibold">{displayPrice(adr, cur)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Average revenue per occupied room per day</p>
            </div>

            <div className="bg-card rounded-lg border border-border p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><TrendingUp size={18} className="text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">RevPAR</p>
                  <p className="text-xl font-semibold">{displayPrice(revpar, cur)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Revenue per available room</p>
            </div>

            <div className="bg-card rounded-lg border border-border p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Clock size={18} className="text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg. Length of Stay</p>
                  <p className="text-xl font-semibold">{avgLengthOfStay.toFixed(1)} nights</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Average number of nights per booking</p>
            </div>

            <div className="bg-card rounded-lg border border-border p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Award size={18} className="text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Most Popular Room Type</p>
                  <p className="text-xl font-semibold">{mostPopularRoom}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Room type with most bookings</p>
            </div>

            <div className="bg-card rounded-lg border border-border p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Star size={18} className="text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Peak Booking Day</p>
                  <p className="text-xl font-semibold">{peakDay}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Day with highest number of reservations</p>
            </div>

            <div className="bg-card rounded-lg border border-border p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center"><Target size={18} className="text-destructive" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Cancellation Rate</p>
                  <p className="text-xl font-semibold">{cancellationRate}%</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Percentage of cancelled bookings</p>
            </div>
          </div>

          {/* Revenue by Room Type chart */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><DollarSign size={16} /> Revenue by Room Type</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueByRoomType}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => displayPrice(v, cur)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => displayPrice(v, cur)} />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {revenueByRoomType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAnalytics;
