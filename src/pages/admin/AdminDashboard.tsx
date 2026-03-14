import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useHotel } from '@/hooks/useHotel';
import { formatCurrency } from '@/lib/currency';
import { StatCard } from '@/components/admin/StatCard';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  CalendarDays, DollarSign, LogIn, LogOut as LogOutIcon, BarChart3, Users,
  BedDouble, UserPlus, Search, Eye, Plus, CalendarRange, Ban, AlertTriangle, Globe,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import roomStandard from '@/assets/room-standard.jpg';
import roomDeluxe from '@/assets/room-deluxe.jpg';
import roomSuite from '@/assets/room-suite.jpg';
import roomFamily from '@/assets/room-family.jpg';

// Fallback images by keyword matching
const FALLBACK_IMAGES: Record<string, string> = {
  standard: roomStandard,
  classic: roomStandard,
  single: roomStandard,
  double: roomStandard,
  deluxe: roomDeluxe,
  superior: roomDeluxe,
  premium: roomDeluxe,
  suite: roomSuite,
  presidential: roomSuite,
  executive: roomSuite,
  penthouse: roomSuite,
  family: roomFamily,
  twin: roomFamily,
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
  available: 'bg-green-50 text-green-700 border-green-200/60 shadow-sm',
  occupied: 'bg-red-50 text-red-700 border-red-200/60 shadow-sm',
  reserved: 'bg-yellow-50 text-yellow-700 border-yellow-200/60 shadow-sm',
  cleaning: 'bg-blue-50 text-blue-700 border-blue-200/60 shadow-sm',
  maintenance: 'bg-muted text-muted-foreground border-border/60 shadow-sm',
};

const AdminDashboard = () => {
  const { t } = useLanguage();
  const { hotel } = useHotel();
  const navigate = useNavigate();
  const cur = hotel?.currency || 'USD';
  const today = format(new Date(), 'yyyy-MM-dd');

  const [reservations, setReservations] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedRes, setSelectedRes] = useState<any>(null);

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

  // ===== METRICS =====
  const stats = useMemo(() => {
    const totalUnits = roomTypes.reduce((s, rt) => s + (rt.available_units || 0), 0);
    const occupied = reservations.filter(r =>
      r.check_in <= today && r.check_out > today && (r.status === 'confirmed' || r.status === 'checked_in')
    ).length;
    const checkIns = reservations.filter(r => r.check_in === today && r.status === 'confirmed').length;
    const checkOuts = reservations.filter(r => r.check_out === today && (r.status === 'confirmed' || r.status === 'checked_in')).length;
    const todayRevenue = reservations
      .filter(r => r.status !== 'cancelled' && r.check_in <= today && r.check_out > today)
      .reduce((s, r) => s + (Number(r.total_price) || 0), 0);
    const todayReservations = reservations.filter(r => r.created_at?.startsWith(today)).length;
    const occupancy = totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0;
    return { occupancy, todayReservations, todayRevenue, available: Math.max(0, totalUnits - occupied), checkIns, checkOuts };
  }, [reservations, roomTypes, today]);

  // ===== TODAY ACTIVITY =====
  const todayArrivals = useMemo(() =>
    reservations.filter(r => r.check_in === today && (r.status === 'confirmed' || r.status === 'pending')).slice(0, 10),
  [reservations, today]);

  const todayDepartures = useMemo(() =>
    reservations.filter(r => r.check_out === today && (r.status === 'confirmed' || r.status === 'checked_in')).slice(0, 10),
  [reservations, today]);

  const currentGuests = useMemo(() =>
    reservations.filter(r => r.check_in <= today && r.check_out > today && (r.status === 'confirmed' || r.status === 'checked_in')).slice(0, 15),
  [reservations, today]);

  // ===== ROOM STATUS BOARD =====
  const roomStatusBoard = useMemo(() => {
    return roomTypes.map(rt => {
      const activeRes = reservations.filter(r =>
        r.room_type_id === rt.id && r.check_in <= today && r.check_out > today &&
        (r.status === 'confirmed' || r.status === 'checked_in')
      );
      const occupiedCount = activeRes.length;
      const reservedCount = reservations.filter(r =>
        r.room_type_id === rt.id && r.check_in > today &&
        r.check_in <= format(addDays(new Date(), 1), 'yyyy-MM-dd') &&
        (r.status === 'confirmed' || r.status === 'pending')
      ).length;
      let status: string = 'available';
      if (occupiedCount >= (rt.available_units || 1)) status = 'occupied';
      else if (reservedCount > 0) status = 'reserved';
      return { ...rt, status, occupiedCount, reservedCount, freeUnits: Math.max(0, (rt.available_units || 1) - occupiedCount) };
    });
  }, [reservations, roomTypes, today]);

  // ===== SEARCH =====
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

  // ===== WALK-IN =====
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

  const handleRoomSelect = (roomTypeId: string) => {
    const rt = roomTypes.find(r => r.id === roomTypeId);
    setWalkIn(p => ({ ...p, room_type_id: roomTypeId, total_price: (rt?.base_price || 0) * walkIn.nights }));
  };

  const handleNightsChange = (nights: number) => {
    const rt = roomTypes.find(r => r.id === walkIn.room_type_id);
    setWalkIn(p => ({ ...p, nights, total_price: rt ? rt.base_price * nights : p.total_price }));
  };

  const handleWalkInSubmit = async () => {
    if (!walkIn.guest_name || !walkIn.room_type_id) { toast.error('Guest name and room are required'); return; }
    setCreating(true);
    const h = hotel?.id || (await supabase.from('hotels').select('id').limit(1).single()).data?.id;
    const checkOut = format(addDays(new Date(), walkIn.nights), 'yyyy-MM-dd');
    const { error } = await supabase.from('reservations').insert({
      hotel_id: h, guest_name: walkIn.guest_name, guest_phone: walkIn.guest_phone || null,
      room_type_id: walkIn.room_type_id, check_in: today, check_out: checkOut,
      guests_count: walkIn.guests_count, total_price: walkIn.total_price,
      payment_method: walkIn.payment_method, notes: walkIn.notes || null,
      status: 'checked_in', booking_source: 'walk-in',
    });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Walk-in reservation created');
    setShowWalkIn(false);
    setWalkIn({ guest_name: '', guest_phone: '', nights: 1, guests_count: 1, room_type_id: '', total_price: 0, payment_method: 'cash', notes: '' });
    fetchData();
  };

  const handleCheckIn = async (id: string) => {
    const { error } = await supabase.from('reservations').update({ status: 'checked_in', updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(t('admin.checkedIn'));
    fetchData();
  };

  const handleCheckOut = async (id: string) => {
    const { error } = await supabase.from('reservations').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Guest checked out');
    fetchData();
  };

  // ===== CONFLICTS =====
  const conflictReservations = useMemo(() =>
    reservations.filter(r => r.is_conflict && r.status !== 'cancelled'),
  [reservations]);

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
        <div className="bg-red-50 border border-red-200/60 rounded-[0.625rem] p-4 space-y-3 shadow-card">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-destructive">
            <AlertTriangle size={16} /> Reservation Conflicts Detected ({conflictReservations.length})
          </h3>
          <div className="space-y-2">
            {conflictReservations.slice(0, 5).map(r => {
              const conflictWith = r.conflict_with_reservation_id
                ? reservations.find(x => x.id === r.conflict_with_reservation_id)
                : null;
              return (
                <div key={r.id} className="bg-card rounded-[0.625rem] border border-red-200/60 p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{r.guest_name}
                        {r.is_external && <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 gap-0.5"><Globe size={10} /> External</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.room_types?.name || '—'} · {r.check_in} → {r.check_out}
                      </p>
                      {conflictWith && (
                        <p className="text-xs text-destructive mt-1">
                          ⚡ Conflicts with: {conflictWith.guest_name} ({conflictWith.check_in} → {conflictWith.check_out})
                          {conflictWith.booking_source && ` · ${conflictWith.booking_source}`}
                        </p>
                      )}
                      {r.conflict_reason && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">Reason: {r.conflict_reason.replace(/_/g, ' ')}</p>
                      )}
                    </div>
                    {conflictWith && (
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => resolveConflict(r.id, conflictWith.id)}>
                          Keep This
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => resolveConflict(conflictWith.id, r.id)}>
                          Keep Other
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {conflictReservations.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">+ {conflictReservations.length - 5} more conflicts</p>
            )}
          </div>
        </div>
      )}

      {/* ===== TOP METRICS ===== */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label={t('admin.occupancy')} value={`${stats.occupancy}%`} icon={BarChart3} />
        <StatCard label={t('admin.totalReservations')} value={stats.todayReservations} icon={CalendarDays} />
        <StatCard label={t('admin.revenueToday')} value={formatCurrency(stats.todayRevenue, cur)} icon={DollarSign} />
        <StatCard label={t('admin.availableRooms')} value={stats.available} icon={BedDouble} />
        <StatCard label={t('admin.checkInsToday')} value={stats.checkIns} icon={LogIn} />
        <StatCard label={t('admin.checkOutsToday')} value={stats.checkOuts} icon={LogOutIcon} />
      </div>

      {/* ===== QUICK ACTIONS ===== */}
      <div className="bg-card rounded-[0.625rem] border border-border/60 p-5 shadow-card">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Users size={14} /> {t('admin.quickActions')}</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('admin.frontDeskSearch')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setShowWalkIn(true)} className="gap-1.5" size="sm">
              <UserPlus size={14} /> {t('admin.quickWalkIn')}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/admin/reservations')}>
              <Plus size={14} /> {t('admin.newReservation')}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/admin/availability')}>
              <Ban size={14} /> {t('admin.blockDates')}
            </Button>
          </div>
        </div>

        {/* Search Results */}
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
                      <p className="text-xs text-muted-foreground">{r.reservation_code} · {r.room_types?.name || '—'} · {r.check_in} → {r.check_out}</p>
                    </div>
                    <div className="flex items-center gap-2">
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

      {/* ===== TODAY ACTIVITY ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Arrivals Today */}
        <div className="bg-card rounded-[0.625rem] border border-border/60 p-5 shadow-card">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <LogIn size={14} className="text-green-600" /> {t('admin.upcomingArrivals')}
            <span className="ml-auto text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full shadow-sm">{todayArrivals.length}</span>
          </h3>
          {todayArrivals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('admin.noCheckInsToday')}</p>
          ) : (
            <div className="space-y-2">
              {todayArrivals.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded-[0.5rem] border border-border/40 bg-green-50/30 transition-all duration-200 hover:shadow-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{r.guest_name}</p>
                    <p className="text-xs text-muted-foreground">{r.room_types?.name || '—'} · <StatusBadge status={r.status} /></p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2">
                    <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-primary-foreground text-xs h-7 px-2 shadow-sm" onClick={() => handleCheckIn(r.id)}>
                      <LogIn size={12} /> {t('admin.checkInAction')}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedRes(r)}><Eye size={12} /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Departures Today */}
        <div className="bg-card rounded-[0.625rem] border border-border/60 p-5 shadow-card">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <LogOutIcon size={14} className="text-amber-600" /> {t('admin.upcomingDepartures')}
            <span className="ml-auto text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full shadow-sm">{todayDepartures.length}</span>
          </h3>
          {todayDepartures.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('admin.noCheckOutsToday')}</p>
          ) : (
            <div className="space-y-2">
              {todayDepartures.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded-[0.5rem] border border-border/40 bg-amber-50/30 transition-all duration-200 hover:shadow-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{r.guest_name}</p>
                    <p className="text-xs text-muted-foreground">{r.room_types?.name || '—'}</p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1 text-xs h-7 px-2 ml-2 shadow-sm" onClick={() => handleCheckOut(r.id)}>
                    <LogOutIcon size={12} /> {t('admin.checkOutAction')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current Guests */}
        <div className="bg-card rounded-[0.625rem] border border-border/60 p-5 shadow-card">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <Users size={14} className="text-primary" /> Current Guests
            <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full shadow-sm">{currentGuests.length}</span>
          </h3>
          {currentGuests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('admin.noData')}</p>
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {currentGuests.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded-[0.5rem] border border-border/40 bg-muted/30 transition-all duration-200 hover:shadow-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{r.guest_name}</p>
                    <p className="text-xs text-muted-foreground">{r.room_types?.name || '—'}</p>
                  </div>
                  <div className="text-right ml-2">
                    <p className="text-[10px] text-muted-foreground">{r.check_in} → {r.check_out}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== ROOM STATUS OVERVIEW ===== */}
      <div className="bg-card rounded-[0.625rem] border border-border/60 p-5 shadow-card">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><BedDouble size={14} /> {t('admin.roomStatusBoard')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {roomStatusBoard.map(rt => (
            <button
              key={rt.id}
              onClick={() => navigate('/admin/room-types')}
              className={cn('rounded-[0.625rem] border p-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5 text-left', statusColor[rt.status])}
            >
              <div className="flex items-center gap-3 mb-2">
                <img src={getRoomImage(rt)} alt={rt.name} className="w-12 h-12 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{rt.name}</p>
                  <span className="text-[10px] font-medium uppercase tracking-wider">{t(`admin.room_${rt.status}`)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs opacity-80">
                <span>{rt.freeUnits}/{rt.available_units} {t('admin.free')}</span>
                <span>{rt.occupiedCount} {t('admin.occupied')}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-500/30" /> {t('admin.room_available')}</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-500/30" /> {t('admin.room_occupied')}</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-yellow-500/30" /> {t('admin.room_reserved')}</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-500/30" /> {t('admin.room_cleaning')}</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-muted" /> Maintenance</div>
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
                        {rt.name} — {formatCurrency(rt.base_price, cur)}/night
                      </div>
                    </SelectItem>
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
                <div><p className="text-xs text-muted-foreground">{t('admin.checkIn')}</p><p>{selectedRes.check_in}</p></div>
                <div><p className="text-xs text-muted-foreground">{t('admin.checkOut')}</p><p>{selectedRes.check_out}</p></div>
                <div><p className="text-xs text-muted-foreground">{t('admin.guests')}</p><p>{selectedRes.guests_count}</p></div>
                <div><p className="text-xs text-muted-foreground">{t('admin.totalPrice')}</p><p className="font-semibold">{formatCurrency(Number(selectedRes.total_price) || 0, cur)}</p></div>
              </div>
              {selectedRes.guest_email && <div><p className="text-xs text-muted-foreground">{t('admin.guestEmail')}</p><p>{selectedRes.guest_email}</p></div>}
              {selectedRes.guest_phone && <div><p className="text-xs text-muted-foreground">{t('admin.guestPhone')}</p><p>{selectedRes.guest_phone}</p></div>}
              {selectedRes.notes && <div><p className="text-xs text-muted-foreground">{t('admin.notes')}</p><p>{selectedRes.notes}</p></div>}
              <div className="flex gap-2 pt-2">
                {selectedRes.status === 'confirmed' && (
                  <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white flex-1" onClick={() => { handleCheckIn(selectedRes.id); setSelectedRes(null); }}>
                    <LogIn size={14} /> {t('admin.checkInAction')}
                  </Button>
                )}
                {(selectedRes.status === 'confirmed' || selectedRes.status === 'checked_in') && (
                  <Button size="sm" variant="outline" className="gap-1.5 flex-1" onClick={() => { handleCheckOut(selectedRes.id); setSelectedRes(null); }}>
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

export default AdminDashboard;
