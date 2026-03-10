import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHotel } from '@/hooks/useHotel';
import { useLanguage } from '@/hooks/useLanguage';
import { formatCurrency } from '@/lib/currency';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { StatCard } from '@/components/admin/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  UserPlus, Search, LogIn, LogOut as LogOutIcon, BedDouble, Users,
  CalendarDays, DollarSign, Phone, Hash, Eye,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const AdminFrontDesk = () => {
  const { t } = useLanguage();
  const { hotel } = useHotel();
  const cur = hotel?.currency || 'USD';
  const today = format(new Date(), 'yyyy-MM-dd');

  const [reservations, setReservations] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRes, setSelectedRes] = useState<any>(null);

  // Walk-in form
  const [walkIn, setWalkIn] = useState({
    guest_name: '', guest_phone: '', nights: 1, guests_count: 1,
    room_type_id: '', total_price: 0, payment_method: 'cash', notes: '',
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [resResult, rtResult] = await Promise.all([
      supabase.from('reservations').select('*, room_types(name, available_units)').order('created_at', { ascending: false }),
      supabase.from('room_types').select('*'),
    ]);
    setReservations(resResult.data || []);
    setRoomTypes(rtResult.data || []);
    setLoading(false);
  };

  // --- Today stats ---
  const todayStats = useMemo(() => {
    const checkIns = reservations.filter(r => r.check_in === today && (r.status === 'confirmed')).length;
    const checkOuts = reservations.filter(r => r.check_out === today && (r.status === 'confirmed' || r.status === 'checked_in')).length;
    const occupied = reservations.filter(r => r.check_in <= today && r.check_out > today && (r.status === 'confirmed' || r.status === 'checked_in')).length;
    const totalUnits = roomTypes.reduce((s, rt) => s + (rt.available_units || 0), 0);
    const available = totalUnits - occupied;
    const newToday = reservations.filter(r => r.created_at?.startsWith(today)).length;
    return { checkIns, checkOuts, occupied, available: Math.max(0, available), newToday, totalUnits };
  }, [reservations, roomTypes, today]);

  // --- Room status board ---
  const roomStatusBoard = useMemo(() => {
    return roomTypes.map(rt => {
      const activeRes = reservations.filter(r =>
        r.room_type_id === rt.id && r.check_in <= today && r.check_out > today &&
        (r.status === 'confirmed' || r.status === 'checked_in')
      );
      const occupiedCount = activeRes.length;
      const reservedCount = reservations.filter(r =>
        r.room_type_id === rt.id && r.check_in > today && r.check_in <= format(addDays(new Date(), 1), 'yyyy-MM-dd') &&
        (r.status === 'confirmed' || r.status === 'pending')
      ).length;

      let status: 'available' | 'occupied' | 'reserved' | 'cleaning' = 'available';
      if (occupiedCount >= (rt.available_units || 1)) status = 'occupied';
      else if (reservedCount > 0) status = 'reserved';

      return { ...rt, status, occupiedCount, reservedCount, freeUnits: Math.max(0, (rt.available_units || 1) - occupiedCount) };
    });
  }, [reservations, roomTypes, today]);

  // --- Available rooms for walk-in ---
  const availableRooms = useMemo(() => {
    const checkOut = format(addDays(new Date(), walkIn.nights), 'yyyy-MM-dd');
    return roomTypes.filter(rt => {
      const overlapping = reservations.filter(r =>
        r.room_type_id === rt.id && r.status !== 'cancelled' &&
        r.check_in < checkOut && r.check_out > today
      ).length;
      return overlapping < (rt.available_units || 1);
    });
  }, [roomTypes, reservations, today, walkIn.nights]);

  // Auto-fill price when room selected
  const handleRoomSelect = (roomTypeId: string) => {
    const rt = roomTypes.find(r => r.id === roomTypeId);
    const price = (rt?.base_price || 0) * walkIn.nights;
    setWalkIn(p => ({ ...p, room_type_id: roomTypeId, total_price: price }));
  };

  const handleNightsChange = (nights: number) => {
    const rt = roomTypes.find(r => r.id === walkIn.room_type_id);
    const price = rt ? rt.base_price * nights : walkIn.total_price;
    setWalkIn(p => ({ ...p, nights, total_price: price }));
  };

  // --- Walk-in submit ---
  const handleWalkInSubmit = async () => {
    if (!walkIn.guest_name || !walkIn.room_type_id) { toast.error('Guest name and room are required'); return; }
    setCreating(true);
    const h = hotel?.id || (await supabase.from('hotels').select('id').limit(1).single()).data?.id;
    const checkOut = format(addDays(new Date(), walkIn.nights), 'yyyy-MM-dd');
    const { error } = await supabase.from('reservations').insert({
      hotel_id: h,
      guest_name: walkIn.guest_name,
      guest_phone: walkIn.guest_phone || null,
      room_type_id: walkIn.room_type_id,
      check_in: today,
      check_out: checkOut,
      guests_count: walkIn.guests_count,
      total_price: walkIn.total_price,
      payment_method: walkIn.payment_method,
      notes: walkIn.notes || null,
      status: 'checked_in',
      booking_source: 'walk-in',
    });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Walk-in reservation created');
    setShowWalkIn(false);
    setWalkIn({ guest_name: '', guest_phone: '', nights: 1, guests_count: 1, room_type_id: '', total_price: 0, payment_method: 'cash', notes: '' });
    fetchData();
  };

  // --- Check-in / Check-out ---
  const handleCheckIn = async (id: string) => {
    const { error } = await supabase.from('reservations').update({ status: 'checked_in', updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Guest checked in');
    fetchData();
    if (selectedRes?.id === id) setSelectedRes(null);
  };

  const handleCheckOut = async (id: string) => {
    const { error } = await supabase.from('reservations').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Guest checked out');
    fetchData();
    if (selectedRes?.id === id) setSelectedRes(null);
  };

  // --- Guest search ---
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return reservations.filter(r =>
      r.guest_name?.toLowerCase().includes(q) ||
      r.guest_phone?.toLowerCase().includes(q) ||
      r.reservation_code?.toLowerCase().includes(q) ||
      r.room_types?.name?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [searchQuery, reservations]);

  // --- Today's action list ---
  const todayCheckIns = useMemo(() =>
    reservations.filter(r => r.check_in === today && r.status === 'confirmed').slice(0, 10),
  [reservations, today]);

  const todayCheckOuts = useMemo(() =>
    reservations.filter(r => r.check_out === today && (r.status === 'confirmed' || r.status === 'checked_in')).slice(0, 10),
  [reservations, today]);

  const statusColor: Record<string, string> = {
    available: 'bg-green-500/15 text-green-600 border-green-500/30',
    occupied: 'bg-red-500/15 text-red-600 border-red-500/30',
    reserved: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
    cleaning: 'bg-muted text-muted-foreground border-border',
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Header with Walk-In + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('admin.frontDeskSearch')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowWalkIn(true)} className="gap-2">
          <UserPlus size={16} /> {t('admin.quickWalkIn')}
        </Button>
      </div>

      {/* Search Results */}
      {searchQuery.trim() && (
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">{t('admin.searchResults')} ({searchResults.length})</h3>
          {searchResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('admin.noData')}</p>
          ) : (
            <div className="space-y-2">
              {searchResults.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{r.guest_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.reservation_code} · {r.room_types?.name || '—'} · {r.check_in} → {r.check_out}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedRes(r)}><Eye size={14} /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Today Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label={t('admin.checkInsToday')} value={todayStats.checkIns} icon={LogIn} />
        <StatCard label={t('admin.checkOutsToday')} value={todayStats.checkOuts} icon={LogOutIcon} />
        <StatCard label={t('admin.occupiedRooms')} value={todayStats.occupied} icon={BedDouble} />
        <StatCard label={t('admin.availableRooms')} value={todayStats.available} icon={BedDouble} />
        <StatCard label={t('admin.newReservationsToday')} value={todayStats.newToday} icon={CalendarDays} />
      </div>

      {/* Today's Check-Ins and Check-Outs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Check-Ins */}
        <div className="bg-card rounded-lg border border-border p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><LogIn size={14} /> {t('admin.todayCheckIns')}</h3>
          {todayCheckIns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('admin.noCheckInsToday')}</p>
          ) : (
            <div className="space-y-2">
              {todayCheckIns.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded-lg border border-border/50 bg-muted/20">
                  <div>
                    <p className="text-sm font-medium">{r.guest_name}</p>
                    <p className="text-xs text-muted-foreground">{r.room_types?.name || '—'} · {r.guests_count} {t('admin.guests').toLowerCase()}</p>
                  </div>
                  <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleCheckIn(r.id)}>
                    <LogIn size={14} /> {t('admin.checkInAction')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Check-Outs */}
        <div className="bg-card rounded-lg border border-border p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><LogOutIcon size={14} /> {t('admin.todayCheckOuts')}</h3>
          {todayCheckOuts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('admin.noCheckOutsToday')}</p>
          ) : (
            <div className="space-y-2">
              {todayCheckOuts.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded-lg border border-border/50 bg-muted/20">
                  <div>
                    <p className="text-sm font-medium">{r.guest_name}</p>
                    <p className="text-xs text-muted-foreground">{r.room_types?.name || '—'} · {r.guests_count} {t('admin.guests').toLowerCase()}</p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleCheckOut(r.id)}>
                    <LogOutIcon size={14} /> {t('admin.checkOutAction')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Room Status Board */}
      <div className="bg-card rounded-lg border border-border p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><BedDouble size={14} /> {t('admin.roomStatusBoard')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {roomStatusBoard.map(rt => (
            <div key={rt.id} className={cn('rounded-lg border p-4 transition-colors', statusColor[rt.status])}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">{rt.name}</p>
                <span className="text-[10px] font-medium uppercase tracking-wider">{t(`admin.room_${rt.status}`)}</span>
              </div>
              <div className="flex items-center gap-3 text-xs opacity-80">
                <span>{rt.freeUnits}/{rt.available_units} {t('admin.free')}</span>
                <span>{rt.occupiedCount} {t('admin.occupied')}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-500/30" /> {t('admin.room_available')}</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-500/30" /> {t('admin.room_occupied')}</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-yellow-500/30" /> {t('admin.room_reserved')}</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-muted" /> {t('admin.room_cleaning')}</div>
        </div>
      </div>

      {/* Walk-In Modal */}
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
                    <SelectItem key={rt.id} value={rt.id}>{rt.name} — {formatCurrency(rt.base_price, cur)}/night</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <div><Label>{t('admin.notes')}</Label><Textarea value={walkIn.notes} onChange={e => setWalkIn(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="VIP, extra bed, late checkout..." /></div>
            <Button onClick={handleWalkInSubmit} disabled={creating} className="w-full gap-2">
              <UserPlus size={16} /> {creating ? t('admin.creating') : t('admin.createWalkIn')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Detail Dialog */}
      <Dialog open={!!selectedRes} onOpenChange={() => setSelectedRes(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t('admin.reservationDetails')}</DialogTitle></DialogHeader>
          {selectedRes && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-muted-foreground block text-xs">{t('admin.guest')}</span>{selectedRes.guest_name}</div>
                <div><span className="text-muted-foreground block text-xs">{t('admin.code')}</span><span className="font-mono">{selectedRes.reservation_code}</span></div>
                <div><span className="text-muted-foreground block text-xs">{t('admin.guestPhone')}</span>{selectedRes.guest_phone || '—'}</div>
                <div><span className="text-muted-foreground block text-xs">{t('admin.room')}</span>{selectedRes.room_types?.name || '—'}</div>
                <div><span className="text-muted-foreground block text-xs">{t('admin.checkIn')}</span>{selectedRes.check_in}</div>
                <div><span className="text-muted-foreground block text-xs">{t('admin.checkOut')}</span>{selectedRes.check_out}</div>
                <div><span className="text-muted-foreground block text-xs">{t('admin.totalPrice')}</span>{formatCurrency(selectedRes.total_price || 0, cur)}</div>
                <div><span className="text-muted-foreground block text-xs">{t('admin.status')}</span><StatusBadge status={selectedRes.status} /></div>
              </div>
              {selectedRes.notes && <div><span className="text-muted-foreground block text-xs mb-1">{t('admin.notes')}</span><p>{selectedRes.notes}</p></div>}
              <div className="flex gap-2 pt-2 flex-wrap">
                {selectedRes.status === 'confirmed' && selectedRes.check_in <= today && (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5" onClick={() => handleCheckIn(selectedRes.id)}>
                    <LogIn size={14} /> {t('admin.checkInAction')}
                  </Button>
                )}
                {(selectedRes.status === 'checked_in' || (selectedRes.status === 'confirmed' && selectedRes.check_out <= today)) && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleCheckOut(selectedRes.id)}>
                    <LogOutIcon size={14} /> {t('admin.checkOutAction')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFrontDesk;
