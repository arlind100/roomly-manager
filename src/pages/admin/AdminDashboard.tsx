import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

import { useLanguage } from '@/hooks/useLanguage';
import { useHotel } from '@/hooks/useHotel';
import { displayPrice } from '@/lib/currency';
import { StatCard } from '@/components/admin/StatCard';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { SourceBadge } from '@/components/admin/SourceBadge';
import { HousekeepingBoard } from '@/components/admin/HousekeepingBoard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  CalendarDays, DollarSign, LogIn, LogOut as LogOutIcon, BarChart3, Users,
  BedDouble, UserPlus, Search, Eye, Plus, CalendarRange, Ban, AlertTriangle, Globe, Sparkles, Loader2,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import roomStandard from '@/assets/room-standard.jpg';
import roomDeluxe from '@/assets/room-deluxe.jpg';
import roomSuite from '@/assets/room-suite.jpg';
import roomFamily from '@/assets/room-family.jpg';

const FALLBACK_IMAGES: Record<string, string> = {
  standard: roomStandard, classic: roomStandard, single: roomStandard, double: roomStandard,
  deluxe: roomDeluxe, superior: roomDeluxe, premium: roomDeluxe,
  suite: roomSuite, presidential: roomSuite, executive: roomSuite, penthouse: roomSuite,
  family: roomFamily, twin: roomFamily,
};

function getRoomImage(rt: any): string {
  if (rt.image_url) return rt.image_url;
  const name = (rt.name || '').toLowerCase();
  for (const [key, img] of Object.entries(FALLBACK_IMAGES)) {
    if (name.includes(key)) return img;
  }
  return roomStandard;
}

const statusColor: Record<string, string> = {
  available: 'bg-green-500/10 text-green-700 border-green-500/20 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20 shadow-sm',
  occupied: 'bg-red-500/10 text-red-700 border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 shadow-sm',
  reserved: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20 shadow-sm',
  cleaning: 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 shadow-sm',
  maintenance: 'bg-muted text-muted-foreground border-border/60 shadow-sm',
};

const AdminDashboard = () => {
  const { t } = useLanguage();
  const { hotel } = useHotel();
  const navigate = useNavigate();
  const cur = hotel?.currency || 'USD';
  const today = format(new Date(), 'yyyy-MM-dd');

  const [stats, setStats] = useState<any>({ occupancy: 0, todayReservations: 0, todayRevenue: 0, available: 0, checkIns: 0, checkOuts: 0 });
  const [todayArrivals, setTodayArrivals] = useState<any[]>([]);
  const [todayDepartures, setTodayDepartures] = useState<any[]>([]);
  const [currentGuests, setCurrentGuests] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedRes, setSelectedRes] = useState<any>(null);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);

  // Confirmation dialogs
  const [confirmCheckIn, setConfirmCheckIn] = useState<any>(null);
  const [confirmCheckOut, setConfirmCheckOut] = useState<any>(null);

  // Room picker for check-in without room_id
  const [roomPickerRes, setRoomPickerRes] = useState<any>(null);
  const [pickedRoomId, setPickedRoomId] = useState('');

  const [walkIn, setWalkIn] = useState({
    guest_name: '', guest_phone: '', nights: 1, guests_count: 1,
    room_type_id: '', room_id: '', total_price: 0, payment_method: 'cash', notes: '',
    payment_received: false, check_in_now: true,
  });

  useSessionTimeout();

  const fetchData = useCallback(async () => {
    if (!hotel?.id) return;
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    const [statsResult, arrivalsResult, departuresResult, guestsResult, rtResult, roomResult] = await Promise.all([
      (supabase.rpc as any)('get_dashboard_stats', { p_hotel_id: hotel.id, p_today: today }),
      supabase.from('reservations').select('*, room_types(name, available_units)').eq('hotel_id', hotel.id).eq('check_in', today).in('status', ['confirmed', 'pending']).order('guest_name').limit(20),
      supabase.from('reservations').select('*, room_types(name, available_units)').eq('hotel_id', hotel.id).eq('check_out', today).in('status', ['confirmed', 'checked_in']).order('guest_name').limit(20),
      supabase.from('reservations').select('*, room_types(name, available_units)').eq('hotel_id', hotel.id).lte('check_in', today).gt('check_out', today).in('status', ['confirmed', 'checked_in']).order('guest_name').limit(30),
      supabase.from('room_types').select('*').eq('hotel_id', hotel.id),
      supabase.from('rooms').select('*, room_types(name)').eq('hotel_id', hotel.id).eq('is_active', true),
    ]);
    if (statsResult.data) {
      const s = statsResult.data;
      setStats({
        occupancy: Number(s.occupancy) || 0,
        todayReservations: Number(s.today_reservations) || 0,
        todayRevenue: Number(s.today_revenue) || 0,
        available: Number(s.available) || 0,
        checkIns: Number(s.check_ins) || 0,
        checkOuts: Number(s.check_outs) || 0,
      });
    }
    setTodayArrivals(arrivalsResult.data || []);
    setTodayDepartures(departuresResult.data || []);
    setCurrentGuests(guestsResult.data || []);
    setRoomTypes(rtResult.data || []);
    setRooms(roomResult.data || []);
    setLoading(false);
  }, [hotel?.id, today]);

  useEffect(() => { if (hotel?.id) fetchData(); }, [hotel?.id, fetchData]);

  useRealtimeSubscription({
    hotelId: hotel?.id,
    tables: ['reservations', 'rooms'],
    onUpdate: fetchData,
  });

  // Room status board from room_types + current guests count
  const roomStatusBoard = useMemo(() => {
    const guestsByType: Record<string, number> = {};
    currentGuests.forEach(r => {
      if (r.room_type_id) guestsByType[r.room_type_id] = (guestsByType[r.room_type_id] || 0) + 1;
    });
    const arrivalsByType: Record<string, number> = {};
    todayArrivals.forEach(r => {
      if (r.room_type_id) arrivalsByType[r.room_type_id] = (arrivalsByType[r.room_type_id] || 0) + 1;
    });
    return roomTypes.map(rt => {
      const occupiedCount = guestsByType[rt.id] || 0;
      const reservedCount = arrivalsByType[rt.id] || 0;
      let status: string = 'available';
      if (occupiedCount >= (rt.available_units || 1)) status = 'occupied';
      else if (reservedCount > 0) status = 'reserved';
      return { ...rt, status, occupiedCount, reservedCount, freeUnits: Math.max(0, (rt.available_units || 1) - occupiedCount) };
    });
  }, [currentGuests, todayArrivals, roomTypes]);

  // All loaded reservations for lookups (arrivals + departures + current guests, deduped)
  const allLoadedRes = useMemo(() => {
    const map = new Map<string, any>();
    [...todayArrivals, ...todayDepartures, ...currentGuests].forEach(r => map.set(r.id, r));
    return Array.from(map.values());
  }, [todayArrivals, todayDepartures, currentGuests]);

  const [searchResults, setSearchResults] = useState<any[]>([]);
  useEffect(() => {
    if (!searchQuery.trim() || !hotel?.id) { setSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      const q = `%${searchQuery.trim()}%`;
      const { data } = await supabase.from('reservations')
        .select('*, room_types(name)')
        .eq('hotel_id', hotel.id)
        .or(`guest_name.ilike.${q},guest_phone.ilike.${q},reservation_code.ilike.${q}`)
        .order('created_at', { ascending: false })
        .limit(10);
      setSearchResults(data || []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, hotel?.id]);

  const availableRooms = useMemo(() => {
    // Use currentGuests count per room type for availability
    const occupiedByType: Record<string, number> = {};
    currentGuests.forEach(r => {
      if (r.room_type_id) occupiedByType[r.room_type_id] = (occupiedByType[r.room_type_id] || 0) + 1;
    });
    return roomTypes.filter(rt => (occupiedByType[rt.id] || 0) < (rt.available_units || 1));
  }, [roomTypes, currentGuests]);

  // Physical rooms available for walk-in room picker (include dirty/cleaning)
  const walkInPhysicalRooms = useMemo(() => {
    return rooms.filter(r =>
      r.room_type_id === walkIn.room_type_id &&
      !['occupied', 'maintenance', 'out_of_service'].includes(r.operational_status)
    );
  }, [rooms, walkIn.room_type_id]);

  const handleRoomSelect = (roomTypeId: string) => {
    const rt = roomTypes.find(r => r.id === roomTypeId);
    setWalkIn(p => ({ ...p, room_type_id: roomTypeId, room_id: '', total_price: (rt?.base_price || 0) * walkIn.nights }));
  };

  const handleNightsChange = (nights: number) => {
    const rt = roomTypes.find(r => r.id === walkIn.room_type_id);
    setWalkIn(p => ({ ...p, nights, total_price: rt ? rt.base_price * nights : p.total_price }));
  };

  const handleWalkInSubmit = async () => {
    if (!walkIn.guest_name.trim()) { toast.error('Guest name is required'); return; }
    if (!walkIn.room_type_id) { toast.error('Room type is required'); return; }
    if (walkIn.check_in_now && !walkIn.room_id) { toast.error('Please assign a room for immediate check-in'); return; }
    if (!hotel?.id) { toast.error('Hotel not loaded'); return; }
    setCreating(true);
    const checkOut = format(addDays(new Date(), walkIn.nights), 'yyyy-MM-dd');
    const { data: reservationId, error } = await (supabase.rpc as any)('create_reservation_if_available', {
      p_hotel_id: hotel.id,
      p_room_type_id: walkIn.room_type_id,
      p_check_in: today,
      p_check_out: checkOut,
      p_guest_name: walkIn.guest_name,
      p_guest_email: null,
      p_guest_phone: walkIn.guest_phone || null,
      p_guests_count: walkIn.guests_count,
      p_total_price: walkIn.total_price,
      p_booking_source: 'walk-in',
      p_room_id: walkIn.room_id || null,
    });
    if (error) {
      const msg = error.message || '';
      if (msg.includes('exceeds room capacity')) toast.error('Guest count exceeds room capacity for this room type');
      else if (msg.includes('No availability')) toast.error('No rooms available for the selected dates');
      else toast.error(msg);
      setCreating(false);
      return;
    }
    // If check_in_now, update reservation status using returned ID
    if (walkIn.check_in_now && walkIn.room_id && reservationId) {
      const timeNow = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      await supabase.from('reservations').update({
        status: 'checked_in',
        check_in_time: timeNow,
        notes: walkIn.notes || null,
        payment_method: walkIn.payment_method || null,
        payment_status: walkIn.payment_received ? 'paid' : 'unpaid',
        updated_at: new Date().toISOString(),
      }).eq('id', reservationId);
    } else if (reservationId) {
      // Even if not checking in now, save notes/payment info
      await supabase.from('reservations').update({
        notes: walkIn.notes || null,
        payment_method: walkIn.payment_method || null,
        payment_status: walkIn.payment_received ? 'paid' : 'unpaid',
        updated_at: new Date().toISOString(),
      }).eq('id', reservationId);
    }
    setCreating(false);
    toast.success(walkIn.check_in_now ? 'Guest checked in successfully' : 'Walk-in reservation created');
    setShowWalkIn(false);
    setWalkIn({ guest_name: '', guest_phone: '', nights: 1, guests_count: 1, room_type_id: '', room_id: '', total_price: 0, payment_method: 'cash', notes: '', payment_received: false, check_in_now: true });
    fetchData();
  };

  const initiateCheckIn = (id: string) => {
    const res = allLoadedRes.find(r => r.id === id);
    if (!res) return;
    // Block early check-in
    if (today < res.check_in) {
      toast.error(`Cannot check in before scheduled date (${format(new Date(res.check_in + 'T00:00:00'), 'MMM dd, yyyy')})`);
      return;
    }
    if (!res.room_id) {
      setRoomPickerRes(res);
      setPickedRoomId('');
      return;
    }
    setConfirmCheckIn(res);
  };

  const handleCheckIn = async (id: string) => {
    setCheckingInId(id);
    setConfirmCheckIn(null);
    const res = allLoadedRes.find(r => r.id === id);
    const timeNow = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const { error } = await supabase.from('reservations').update({ status: 'checked_in', check_in_time: timeNow, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error(error.message); setCheckingInId(null); return; }
    if (res?.room_id) {
      await supabase.from('rooms').update({ operational_status: 'occupied', updated_at: new Date().toISOString() }).eq('id', res.room_id);
    }
    toast.success(t('admin.checkedIn'));
    setCheckingInId(null);
    fetchData();
  };

  const handleRoomPickerConfirm = async () => {
    if (!roomPickerRes || !pickedRoomId) { toast.error('Please select a room'); return; }
    // Assign room and check in
    const timeNow = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    await supabase.from('reservations').update({ room_id: pickedRoomId, status: 'checked_in', check_in_time: timeNow, updated_at: new Date().toISOString() }).eq('id', roomPickerRes.id);
    await supabase.from('rooms').update({ operational_status: 'occupied', updated_at: new Date().toISOString() }).eq('id', pickedRoomId);
    toast.success(t('admin.checkedIn'));
    setRoomPickerRes(null);
    fetchData();
  };

  const initiateCheckOut = (id: string) => {
    const res = allLoadedRes.find(r => r.id === id);
    setConfirmCheckOut(res);
  };

  const handleCheckOut = async (id: string) => {
    setCheckingOutId(id);
    setConfirmCheckOut(null);
    const timeNow = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const res = allLoadedRes.find(r => r.id === id);
    const { error } = await supabase.from('reservations').update({ status: 'completed', check_out_time: timeNow, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error(error.message); setCheckingOutId(null); return; }

    // Mark room as dirty on checkout
    if (res?.room_id) {
      await supabase.from('rooms').update({ operational_status: 'dirty', updated_at: new Date().toISOString() }).eq('id', res.room_id);
    } else if (res?.room_type_id) {
      const { data: occupiedRooms } = await supabase.from('rooms').select('id').eq('room_type_id', res.room_type_id).eq('operational_status', 'occupied').eq('is_active', true).limit(1);
      if (occupiedRooms && occupiedRooms.length > 0) {
        await supabase.from('rooms').update({ operational_status: 'dirty', updated_at: new Date().toISOString() }).eq('id', occupiedRooms[0].id);
      } else {
        const { data: availRooms } = await supabase.from('rooms').select('id').eq('room_type_id', res.room_type_id).eq('is_active', true).neq('operational_status', 'dirty').limit(1);
        if (availRooms && availRooms.length > 0) {
          await supabase.from('rooms').update({ operational_status: 'dirty', updated_at: new Date().toISOString() }).eq('id', availRooms[0].id);
        }
      }
    }

    // Auto-generate invoice via RPC
    try {
      const { data: invResult, error: invError } = await (supabase.rpc as any)('create_invoice_on_checkout', { p_reservation_id: id });
      if (invError) {
        console.error('Invoice creation error:', invError);
        toast.error('Checked out but invoice creation failed: ' + invError.message);
      } else if (invResult) {
        const inv = invResult;
        if (inv.already_existed) {
          toast.info(`Invoice ${inv.invoice_number} already exists`);
        } else {
          toast.success(`Reservation checked out & invoice ${inv.invoice_number} generated`);
        }
        // Conditional email: only auto-send for card/online payments
        if (res?.guest_email && res?.payment_method && ['card', 'online'].includes(res.payment_method)) {
          const nightsCount = Math.max(1, Math.ceil((new Date(res.check_out).getTime() - new Date(res.check_in).getTime()) / (1000 * 60 * 60 * 24)));
          try {
            await supabase.functions.invoke('send-checkout-email', {
              body: {
                to_email: res.guest_email, guest_name: res.guest_name,
                reservation_code: res.reservation_code, check_in: res.check_in, check_out: res.check_out,
                room_type_name: res.room_types?.name || '', guests_count: res.guests_count,
                total_price: res.total_price, currency: cur, check_out_time: timeNow,
                nights_count: nightsCount, invoice_number: inv.invoice_number || '',
                hotel_name: hotel?.name || 'Hotel', hotel_email: hotel?.email || '',
                hotel_phone: hotel?.phone || '', hotel_address: hotel?.address || '',
              },
            });
            toast.success('Invoice email sent automatically');
          } catch (e) { console.error('Email send error:', e); }
        }
      }
    } catch (e) { console.error('Invoice RPC error:', e); }

    setCheckingOutId(null);
    fetchData();
  };

  const conflictReservations = useMemo(() =>
    allLoadedRes.filter(r => r.is_conflict && r.status !== 'cancelled'),
  [allLoadedRes]);

  const resolveConflict = async (keepId: string, cancelId: string) => {
    const { error: e1 } = await supabase.from('reservations').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', cancelId);
    const { error: e2 } = await supabase.from('reservations').update({ is_conflict: false, conflict_with_reservation_id: null, conflict_reason: null, updated_at: new Date().toISOString() }).eq('id', keepId);
    if (e1 || e2) { toast.error('Failed to resolve conflict'); return; }
    toast.success('Conflict resolved');
    fetchData();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMMM dd, yyyy')}</p>

      {/* ===== CONFLICT WARNINGS ===== */}
      {conflictReservations.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200/60 dark:border-red-800/40 rounded-lg p-4 space-y-3 shadow-card">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-destructive">
            <AlertTriangle size={16} /> Reservation Conflicts ({conflictReservations.length})
          </h3>
          <div className="space-y-2">
            {conflictReservations.slice(0, 5).map(r => {
              const conflictWith = r.conflict_with_reservation_id ? allLoadedRes.find(x => x.id === r.conflict_with_reservation_id) : null;
              return (
                <div key={r.id} className="bg-card rounded-lg border border-red-200/60 dark:border-red-800/40 p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{r.guest_name}
                        {r.is_external && <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 gap-0.5"><Globe size={10} /> External</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">{r.room_types?.name || '—'} · {format(new Date(r.check_in + 'T00:00:00'), 'MMM dd, yyyy')} → {format(new Date(r.check_out + 'T00:00:00'), 'MMM dd, yyyy')}</p>
                      {conflictWith && (
                        <p className="text-xs text-destructive mt-1">⚡ Conflicts with: {conflictWith.guest_name} ({conflictWith.check_in} → {conflictWith.check_out})</p>
                      )}
                    </div>
                    {conflictWith && (
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => resolveConflict(r.id, conflictWith.id)}>Keep This</Button>
                        <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => resolveConflict(conflictWith.id, r.id)}>Keep Other</Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== TOP METRICS ===== */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label={t('admin.occupancy')} value={`${stats.occupancy}%`} icon={BarChart3} />
        <StatCard label={t('admin.totalReservations')} value={stats.todayReservations} icon={CalendarDays} />
        <StatCard label={t('admin.revenueToday')} value={displayPrice(stats.todayRevenue, cur)} icon={DollarSign} />
        <StatCard label={t('admin.availableRooms')} value={stats.available} icon={BedDouble} />
        <StatCard label={t('admin.checkInsToday')} value={stats.checkIns} icon={LogIn} />
        <StatCard label={t('admin.checkOutsToday')} value={stats.checkOuts} icon={LogOutIcon} />
      </div>

      {/* ===== QUICK ACTIONS ===== */}
      <div className="bg-card rounded-lg border border-border/60 p-5 shadow-card">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Users size={14} /> {t('admin.quickActions')}</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={t('admin.frontDeskSearch')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setShowWalkIn(true)} className="gap-1.5" size="sm"><UserPlus size={14} /> {t('admin.quickWalkIn')}</Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/admin/reservations')}><Plus size={14} /> {t('admin.newReservation')}</Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/admin/availability')}><Ban size={14} /> {t('admin.blockDates')}</Button>
          </div>
        </div>

        {searchQuery.trim() && (
          <div className="mt-4 border-t border-border/60 pt-4">
            <p className="text-xs text-muted-foreground mb-2">{t('admin.searchResults')} ({searchResults.length})</p>
            {searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">{t('admin.noData')}</p>
            ) : (
              <div className="space-y-1.5">
                {searchResults.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded-[0.5rem] hover:bg-muted/50 transition-all duration-200">
                    <div>
                      <p className="text-sm font-medium">{r.guest_name}</p>
                      <p className="text-xs text-muted-foreground">{r.reservation_code} · {r.room_types?.name || '—'} · {format(new Date(r.check_in + 'T00:00:00'), 'MMM dd')} → {format(new Date(r.check_out + 'T00:00:00'), 'MMM dd')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <SourceBadge source={r.booking_source} />
                      <StatusBadge status={r.status} />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedRes(r)}><Eye size={14} /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== TODAY ACTIVITY + HOUSEKEEPING ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Arrivals */}
        <div className="bg-card rounded-lg border border-border/60 p-4 shadow-card">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <LogIn size={14} className="text-green-600 dark:text-green-400" /> {t('admin.upcomingArrivals')}
            <span className="ml-auto text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">{todayArrivals.length}</span>
          </h3>
          {todayArrivals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('admin.noCheckInsToday')}</p>
          ) : (
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
              {todayArrivals.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 px-2.5 rounded-lg border border-border/40 bg-green-50/30 dark:bg-green-900/10 transition-all duration-200 hover:shadow-sm">
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="text-xs font-medium truncate">{r.guest_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{r.room_types?.name || '—'}</p>
                  </div>
                  <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-white text-[10px] h-6 px-2 shrink-0" disabled={checkingInId === r.id} onClick={() => initiateCheckIn(r.id)}>
                    {checkingInId === r.id ? <Loader2 size={10} className="animate-spin" /> : <LogIn size={10} />} {checkingInId === r.id ? 'Checking In...' : t('admin.checkInAction')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Departures */}
        <div className="bg-card rounded-lg border border-border/60 p-4 shadow-card">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <LogOutIcon size={14} className="text-amber-600 dark:text-amber-400" /> {t('admin.upcomingDepartures')}
            <span className="ml-auto text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">{todayDepartures.length}</span>
          </h3>
          {todayDepartures.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('admin.noCheckOutsToday')}</p>
          ) : (
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
              {todayDepartures.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 px-2.5 rounded-lg border border-border/40 bg-amber-50/30 dark:bg-amber-900/10 transition-all duration-200 hover:shadow-sm">
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="text-xs font-medium truncate">{r.guest_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{r.room_types?.name || '—'}</p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1 text-[10px] h-6 px-2 shrink-0" disabled={checkingOutId === r.id} onClick={() => initiateCheckOut(r.id)}>
                    {checkingOutId === r.id ? <Loader2 size={10} className="animate-spin" /> : <LogOutIcon size={10} />} {checkingOutId === r.id ? 'Checking Out...' : t('admin.checkOutAction')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current Guests */}
        <div className="bg-card rounded-lg border border-border/60 p-4 shadow-card">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Users size={14} className="text-primary" /> Current Guests
            <span className="ml-auto text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{currentGuests.length}</span>
          </h3>
          {currentGuests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('admin.noData')}</p>
          ) : (
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
              {currentGuests.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 px-2.5 rounded-lg border border-border/40 bg-muted/20 transition-all duration-200 hover:shadow-sm">
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="text-xs font-medium truncate">{r.guest_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{r.room_types?.name || '—'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground whitespace-nowrap">{format(new Date(r.check_out + 'T00:00:00'), 'MMM dd')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Housekeeping Board */}
        <div className="bg-card rounded-lg border border-border/60 p-4 shadow-card">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-blue-600 dark:text-blue-400" /> Housekeeping
            <span className="ml-auto text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
              {rooms.filter(r => r.operational_status !== 'available' && r.operational_status !== 'occupied').length}
            </span>
          </h3>
          {rooms.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">No rooms configured</p>
              <Button variant="link" size="sm" onClick={() => navigate('/admin/rooms')} className="mt-1 text-xs">Add rooms →</Button>
            </div>
          ) : (
            <HousekeepingBoard
              rooms={rooms}
              roomTypes={roomTypes}
              todayCheckouts={todayDepartures}
              cleaningDuration={hotel?.cleaning_duration_minutes || 120}
              onRefresh={fetchData}
            />
          )}
        </div>
      </div>

      {/* ===== ROOM STATUS OVERVIEW ===== */}
      <div className="bg-card rounded-lg border border-border/60 p-5 shadow-card">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><BedDouble size={14} /> {t('admin.roomStatusBoard')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {roomStatusBoard.map(rt => {
            const statusBg: Record<string, string> = {
              available: 'bg-green-50 border-l-green-500 dark:bg-green-950/30',
              occupied: 'bg-red-50 border-l-red-500 dark:bg-red-950/30',
              reserved: 'bg-yellow-50 border-l-yellow-500 dark:bg-yellow-950/30',
              cleaning: 'bg-blue-50 border-l-blue-500 dark:bg-blue-950/30',
              maintenance: 'bg-muted/50 border-l-muted-foreground',
            };
            return (
            <button
              key={rt.id}
              onClick={() => navigate('/admin/rooms')}
              className={cn('rounded-lg border border-border/60 border-l-[3px] p-4 transition-all duration-200 hover:shadow-card-hover text-left shadow-card', statusBg[rt.status] || 'bg-card')}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold truncate">{rt.name}</p>
                <span className={cn('text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full',
                  rt.status === 'available' ? 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/40' :
                  rt.status === 'occupied' ? 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/40' :
                  rt.status === 'reserved' ? 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/40' :
                  rt.status === 'cleaning' ? 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/40' :
                  'text-muted-foreground bg-muted'
                )}>{t(`admin.room_${rt.status}`)}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{rt.freeUnits}/{rt.available_units} {t('admin.free')}</span>
                <span>{rt.occupiedCount} {t('admin.occupied')}</span>
              </div>
            </button>
            );
          })}
        </div>
      </div>

      {/* ===== WALK-IN MODAL ===== */}
      <Dialog open={showWalkIn} onOpenChange={setShowWalkIn}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('admin.quickWalkIn')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t('admin.guestName')} *</Label><Input value={walkIn.guest_name} onChange={e => setWalkIn(p => ({ ...p, guest_name: e.target.value }))} placeholder="John Smith" /></div>
            <div><Label>{t('admin.guestPhone')}</Label><Input value={walkIn.guest_phone} onChange={e => setWalkIn(p => ({ ...p, guest_phone: e.target.value }))} placeholder="+1 555 0100" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('admin.nights')}</Label><Input type="number" min={1} value={walkIn.nights} onChange={e => handleNightsChange(parseInt(e.target.value) || 1)} /></div>
              <div><Label>{t('admin.guests')}</Label><Input type="number" min={1} value={walkIn.guests_count} onChange={e => setWalkIn(p => ({ ...p, guests_count: parseInt(e.target.value) || 1 }))} /></div>
            </div>
            <div>
              <Label>{t('admin.roomType')} *</Label>
              <Select value={walkIn.room_type_id} onValueChange={handleRoomSelect}>
                <SelectTrigger><SelectValue placeholder={t('admin.selectRoom')} /></SelectTrigger>
                <SelectContent>
                  {availableRooms.map(rt => (
                    <SelectItem key={rt.id} value={rt.id}>
                      <div className="flex items-center gap-2">
                        <img src={getRoomImage(rt)} alt="" className="w-6 h-6 rounded object-cover" />
                        {rt.name} — {displayPrice(rt.base_price, cur)}/night
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {walkIn.room_type_id && (
              <>
                <div className="flex items-center justify-between py-1">
                  <Label className="text-sm">Check-in immediately</Label>
                  <Switch checked={walkIn.check_in_now} onCheckedChange={v => setWalkIn(p => ({ ...p, check_in_now: v, room_id: v ? p.room_id : '' }))} />
                </div>
                <div>
                  <Label>{walkIn.check_in_now ? 'Assign Room *' : 'Assign Room (optional)'}</Label>
                  {walkInPhysicalRooms.length === 0 ? (
                    <p className="text-sm text-destructive py-1">No assignable rooms available for this type</p>
                  ) : (
                    <Select value={walkIn.room_id} onValueChange={v => setWalkIn(p => ({ ...p, room_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select a room" /></SelectTrigger>
                      <SelectContent>
                        {walkInPhysicalRooms.map(r => {
                          const statusLabel = r.operational_status === 'available' ? '✅ Ready'
                            : r.operational_status === 'dirty' ? '🟡 Dirty'
                            : r.operational_status === 'cleaning' ? '🔵 Cleaning' : r.operational_status;
                          return (
                            <SelectItem key={r.id} value={r.id}>Room {r.room_number} {r.floor ? `(Floor ${r.floor})` : ''} — {statusLabel}</SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('admin.totalPrice')}</Label><Input type="number" min={0} value={walkIn.total_price} onChange={e => setWalkIn(p => ({ ...p, total_price: parseFloat(e.target.value) || 0 }))} /></div>
              <div>
                <Label>{t('admin.paymentMethod')}</Label>
                <Select value={walkIn.payment_method} onValueChange={v => setWalkIn(p => ({ ...p, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t('admin.cash')}</SelectItem>
                    <SelectItem value="card">{t('admin.card')}</SelectItem>
                    <SelectItem value="other">{t('admin.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Payment received?</Label>
              <Switch checked={walkIn.payment_received} onCheckedChange={v => setWalkIn(p => ({ ...p, payment_received: v }))} />
            </div>
            <div><Label>{t('admin.notes')}</Label><Textarea value={walkIn.notes} onChange={e => setWalkIn(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="VIP, extra bed, late checkout..." /></div>
            <Button onClick={handleWalkInSubmit} disabled={creating} className="w-full gap-2">
              <UserPlus size={16} /> {creating ? t('admin.creating') : t('admin.createWalkIn')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== ROOM PICKER FOR CHECK-IN ===== */}
      <Dialog open={!!roomPickerRes} onOpenChange={v => { if (!v) setRoomPickerRes(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign Room for Check-in</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            No room assigned to <strong>{roomPickerRes?.guest_name}</strong>. Please select a room before checking in.
          </p>
          {(() => {
            const assignableRooms = rooms.filter(r =>
              r.room_type_id === roomPickerRes?.room_type_id &&
              !['occupied', 'maintenance', 'out_of_service'].includes(r.operational_status)
            );
            return assignableRooms.length === 0 ? (
              <p className="text-sm text-destructive py-2">No assignable rooms available for this type</p>
            ) : (
              <Select value={pickedRoomId} onValueChange={setPickedRoomId}>
                <SelectTrigger><SelectValue placeholder="Select a room" /></SelectTrigger>
                <SelectContent>
                  {assignableRooms.map(r => {
                    const statusLabel = r.operational_status === 'available' ? '✅ Ready'
                      : r.operational_status === 'dirty' ? '🟡 Dirty'
                      : r.operational_status === 'cleaning' ? '🔵 Cleaning' : r.operational_status;
                    return (
                      <SelectItem key={r.id} value={r.id}>
                        Room {r.room_number} {r.floor ? `(Floor ${r.floor})` : ''} — {statusLabel}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            );
          })()}
          <Button onClick={handleRoomPickerConfirm} disabled={!pickedRoomId} className="w-full gap-1.5">
            <LogIn size={14} /> Assign & Check In
          </Button>
        </DialogContent>
      </Dialog>

      {/* ===== RESERVATION DETAIL MODAL ===== */}
      <Dialog open={!!selectedRes} onOpenChange={() => setSelectedRes(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('admin.reservationDetails')}</DialogTitle></DialogHeader>
          {selectedRes && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">{t('admin.code')}</p><p className="font-mono">{selectedRes.reservation_code}</p></div>
                <div><p className="text-xs text-muted-foreground">{t('admin.status')}</p><StatusBadge status={selectedRes.status} /></div>
                <div><p className="text-xs text-muted-foreground">{t('admin.guestName')}</p><p className="font-medium">{selectedRes.guest_name}</p></div>
                <div><p className="text-xs text-muted-foreground">{t('admin.roomType')}</p><p>{selectedRes.room_types?.name || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">{t('admin.checkIn')}</p><p>{format(new Date(selectedRes.check_in + 'T00:00:00'), 'MMM dd, yyyy')} {selectedRes.check_in_time && <span className="text-muted-foreground">@ {selectedRes.check_in_time}</span>}</p></div>
                <div><p className="text-xs text-muted-foreground">{t('admin.checkOut')}</p><p>{format(new Date(selectedRes.check_out + 'T00:00:00'), 'MMM dd, yyyy')} {selectedRes.check_out_time && <span className="text-muted-foreground">@ {selectedRes.check_out_time}</span>}</p></div>
                <div><p className="text-xs text-muted-foreground">{t('admin.guests')}</p><p>{selectedRes.guests_count}</p></div>
                <div><p className="text-xs text-muted-foreground">{t('admin.totalPrice')}</p><p className="font-semibold">{displayPrice(Number(selectedRes.total_price) || 0, cur)}</p></div>
                <div><p className="text-xs text-muted-foreground">Source</p><SourceBadge source={selectedRes.booking_source} /></div>
              </div>
              {selectedRes.guest_email && <div><p className="text-xs text-muted-foreground">{t('admin.guestEmail')}</p><p>{selectedRes.guest_email}</p></div>}
              {selectedRes.notes && <div><p className="text-xs text-muted-foreground">{t('admin.notes')}</p><p>{selectedRes.notes}</p></div>}
              <div className="flex gap-2 pt-2">
                {selectedRes.status === 'confirmed' && (
                  <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white flex-1" onClick={() => { initiateCheckIn(selectedRes.id); setSelectedRes(null); }}>
                    <LogIn size={14} /> {t('admin.checkInAction')}
                  </Button>
                )}
                {(selectedRes.status === 'confirmed' || selectedRes.status === 'checked_in') && (
                  <Button size="sm" variant="outline" className="gap-1.5 flex-1" onClick={() => { initiateCheckOut(selectedRes.id); setSelectedRes(null); }}>
                    <LogOutIcon size={14} /> {t('admin.checkOutAction')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Check-In Confirmation */}
      <AlertDialog open={!!confirmCheckIn} onOpenChange={v => { if (!v) setConfirmCheckIn(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Check-In</AlertDialogTitle>
            <AlertDialogDescription>
              Check in <strong>{confirmCheckIn?.guest_name}</strong> for {confirmCheckIn?.room_types?.name || 'their room'}? This will mark the reservation as active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleCheckIn(confirmCheckIn?.id)} className="bg-green-600 hover:bg-green-700 text-white">Check In</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Check-Out Confirmation */}
      <AlertDialog open={!!confirmCheckOut} onOpenChange={v => { if (!v) setConfirmCheckOut(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Check-Out</AlertDialogTitle>
            <AlertDialogDescription>
              Check out <strong>{confirmCheckOut?.guest_name}</strong>? An invoice will be generated automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleCheckOut(confirmCheckOut?.id)} className="bg-blue-600 hover:bg-blue-700 text-white">Check Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;
