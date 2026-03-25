import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useHotel } from '@/hooks/useHotel';
import { displayPrice } from '@/lib/currency';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { SourceBadge } from '@/components/admin/SourceBadge';
import { DataExportButton } from '@/components/admin/DataExportButton';
import { EmptyState } from '@/components/admin/EmptyState';
import { ReservationTimeline } from '@/components/admin/ReservationTimeline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, Search, Plus, Check, X, Eye, Pencil, AlertTriangle, Upload, LogIn, LogOut as LogOutIcon, Globe, List, CalendarRange } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ImportReservationsModal } from '@/components/admin/ImportReservationsModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const BOOKING_SOURCES = [
  { value: 'website', label: 'Website' },
  { value: 'booking.com', label: 'Booking.com' },
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'walk-in', label: 'Walk-in' },
  { value: 'phone', label: 'Phone' },
  { value: 'travel-agency', label: 'Travel Agency' },
  { value: 'other', label: 'Other' },
];

type ReservationForm = {
  guest_name: string; guest_email: string; guest_phone: string;
  room_type_id: string; room_id: string; check_in: string; check_out: string;
  check_in_time: string; check_out_time: string;
  guests_count: number; total_price: number; special_requests: string; notes: string;
  booking_source: string;
};

const emptyForm: ReservationForm = {
  guest_name: '', guest_email: '', guest_phone: '', room_type_id: '', room_id: '',
  check_in: '', check_out: '', check_in_time: '', check_out_time: '',
  guests_count: 1, total_price: 0, special_requests: '', notes: '',
  booking_source: 'direct',
};

interface FormFieldsProps {
  f: ReservationForm;
  setF: (fn: (prev: ReservationForm) => ReservationForm) => void;
  roomTypes: any[];
  rooms: any[];
  t: (key: string) => string;
}

const FormFields = ({ f, setF, roomTypes, rooms, t }: FormFieldsProps) => {
  const availableRooms = rooms.filter(r =>
    r.room_type_id === f.room_type_id &&
    (r.operational_status === 'available' || r.operational_status === 'reserved')
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><Label>{t('admin.guestName')} *</Label><Input value={f.guest_name} onChange={e => setF(p => ({...p, guest_name: e.target.value}))} /></div>
        <div><Label>{t('admin.guestEmail')}</Label><Input type="email" value={f.guest_email} onChange={e => setF(p => ({...p, guest_email: e.target.value}))} /></div>
        <div><Label>{t('admin.guestPhone')}</Label><Input value={f.guest_phone} onChange={e => setF(p => ({...p, guest_phone: e.target.value}))} /></div>
        <div><Label>{t('admin.roomType')}</Label>
          <Select value={f.room_type_id} onValueChange={v => setF(p => ({...p, room_type_id: v, room_id: ''}))}>
            <SelectTrigger><SelectValue placeholder={t('admin.selectRoom')} /></SelectTrigger>
            <SelectContent>{roomTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Assign Room</Label>
          <Select value={f.room_id} onValueChange={v => setF(p => ({...p, room_id: v}))}>
            <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No specific room</SelectItem>
              {availableRooms.map(r => (
                <SelectItem key={r.id} value={r.id}>Room {r.room_number} {r.floor ? `(Floor ${r.floor})` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div><Label>{t('admin.guests')}</Label><Input type="number" min={1} value={f.guests_count} onChange={e => setF(p => ({...p, guests_count: parseInt(e.target.value) || 1}))} /></div>
        <div><Label>{t('admin.checkIn')} *</Label><Input type="date" value={f.check_in} onChange={e => setF(p => ({...p, check_in: e.target.value}))} /></div>
        <div><Label>{t('admin.checkOut')} *</Label><Input type="date" value={f.check_out} onChange={e => setF(p => ({...p, check_out: e.target.value}))} /></div>
        <div><Label>Check-in Time</Label><Input type="time" value={f.check_in_time} onChange={e => setF(p => ({...p, check_in_time: e.target.value}))} /></div>
        <div><Label>Check-out Time</Label><Input type="time" value={f.check_out_time} onChange={e => setF(p => ({...p, check_out_time: e.target.value}))} /></div>
        <div><Label>{t('admin.totalPrice')}</Label><Input type="number" min={0} value={f.total_price} onChange={e => setF(p => ({...p, total_price: parseFloat(e.target.value) || 0}))} /></div>
        <div><Label>Booking Source</Label>
          <Select value={f.booking_source} onValueChange={v => setF(p => ({...p, booking_source: v}))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{BOOKING_SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>{t('admin.specialRequests')}</Label><Textarea value={f.special_requests} onChange={e => setF(p => ({...p, special_requests: e.target.value}))} rows={2} /></div>
      <div><Label>{t('admin.notes')}</Label><Textarea value={f.notes} onChange={e => setF(p => ({...p, notes: e.target.value}))} rows={2} /></div>
    </div>
  );
};

const ITEMS_PER_PAGE = 25;

const AdminReservations = () => {
  const { t } = useLanguage();
  const { hotel } = useHotel();
  const cur = hotel?.currency || 'USD';
  const [reservations, setReservations] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedRes, setSelectedRes] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ReservationForm>(emptyForm);
  const [editForm, setEditForm] = useState<ReservationForm>(emptyForm);
  const [currentPage, setCurrentPage] = useState(0);
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null);
  // Room picker for check-in
  const [roomPickerRes, setRoomPickerRes] = useState<any>(null);
  const [pickedRoomId, setPickedRoomId] = useState('');

  useEffect(() => { if (hotel?.id) fetchData(); }, [hotel?.id, currentPage, search, statusFilter, sourceFilter]);

  const fetchData = async () => {
    if (!hotel?.id) return;
    setLoading(true);
    const from = currentPage * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase.from('reservations').select('*, room_types(name)', { count: 'exact' })
      .eq('hotel_id', hotel.id)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`guest_name.ilike.%${search}%,guest_email.ilike.%${search}%,guest_phone.ilike.%${search}%,reservation_code.ilike.%${search}%`);
    }
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (sourceFilter !== 'all') query = query.eq('booking_source', sourceFilter);

    query = query.range(from, to);

    const [resResult, rtResult, roomResult] = await Promise.all([
      query,
      supabase.from('room_types').select('*').eq('hotel_id', hotel.id),
      supabase.from('rooms').select('*, room_types(name)').eq('hotel_id', hotel.id).eq('is_active', true),
    ]);
    setReservations(resResult.data || []);
    setTotalCount(resResult.count || 0);
    setRoomTypes(rtResult.data || []);
    setRooms(roomResult.data || []);
    setLoading(false);
  };

  const checkAvailability = async (roomTypeId: string, checkIn: string, checkOut: string, excludeId?: string) => {
    let query = supabase.from('reservations').select('*', { count: 'exact', head: true })
      .eq('room_type_id', roomTypeId).neq('status', 'cancelled')
      .lt('check_in', checkOut).gt('check_out', checkIn);
    if (excludeId) query = query.neq('id', excludeId);
    const { count } = await query;
    const rt = roomTypes.find(r => r.id === roomTypeId);
    return (count || 0) < (rt?.available_units || 1);
  };

  const confirmAndUpdateStatus = (id: string, status: string) => {
    const res = reservations.find(r => r.id === id);
    // For check-in: if no room_id, show room picker instead
    if (status === 'checked_in' && res && !res.room_id) {
      setRoomPickerRes(res);
      setPickedRoomId('');
      return;
    }
    const labels: Record<string, string> = {
      cancelled: 'Cancel this reservation',
      confirmed: 'Confirm this reservation',
      checked_in: 'Check in this guest',
      completed: 'Check out this guest',
    };
    setConfirmAction({
      title: labels[status] || `Change status to ${status}`,
      description: 'Are you sure? This action cannot be undone.',
      onConfirm: () => { updateStatus(id, status); setConfirmAction(null); },
    });
  };

  const handleRoomPickerConfirm = async () => {
    if (!roomPickerRes || !pickedRoomId) { toast.error('Please select a room'); return; }
    // Assign room_id to reservation, then check in
    await supabase.from('reservations').update({ room_id: pickedRoomId, updated_at: new Date().toISOString() }).eq('id', roomPickerRes.id);
    // Update local state so updateStatus finds room_id
    const updatedRes = { ...roomPickerRes, room_id: pickedRoomId };
    setReservations(prev => prev.map(r => r.id === updatedRes.id ? updatedRes : r));
    setRoomPickerRes(null);
    await updateStatus(roomPickerRes.id, 'checked_in', pickedRoomId);
  };

  const markRoomDirty = async (res: any) => {
    const now = new Date().toISOString();
    if (res?.room_id) {
      await supabase.from('rooms').update({ operational_status: 'dirty', updated_at: now }).eq('id', res.room_id);
    } else if (res?.room_type_id) {
      const { data: occupiedRooms } = await supabase.from('rooms').select('id').eq('room_type_id', res.room_type_id).eq('operational_status', 'occupied').eq('is_active', true).limit(1);
      if (occupiedRooms && occupiedRooms.length > 0) {
        await supabase.from('rooms').update({ operational_status: 'dirty', updated_at: now }).eq('id', occupiedRooms[0].id);
      } else {
        const { data: availRooms } = await supabase.from('rooms').select('id').eq('room_type_id', res.room_type_id).eq('is_active', true).neq('operational_status', 'dirty').limit(1);
        if (availRooms && availRooms.length > 0) {
          await supabase.from('rooms').update({ operational_status: 'dirty', updated_at: now }).eq('id', availRooms[0].id);
        }
      }
    }
  };

  const updateStatus = async (id: string, status: string, overrideRoomId?: string) => {
    const now = new Date().toISOString();
    const timeNow = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const updateData: Record<string, any> = { status, updated_at: now };
    if (status === 'checked_in') updateData.check_in_time = timeNow;
    if (status === 'completed') updateData.check_out_time = timeNow;

    const { error } = await supabase.from('reservations').update(updateData).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Reservation ${status.replace('_', ' ')}`);

    const res = reservations.find(r => r.id === id);
    const effectiveRoomId = overrideRoomId || res?.room_id;

    // Mark room occupied on check-in
    if (status === 'checked_in' && effectiveRoomId) {
      await supabase.from('rooms').update({ operational_status: 'occupied', updated_at: now }).eq('id', effectiveRoomId);
    }

    // Mark room dirty on checkout
    if (status === 'completed') {
      const resWithRoom = effectiveRoomId ? { ...res, room_id: effectiveRoomId } : res;
      await markRoomDirty(resWithRoom);
    }

    if (status === 'confirmed' && res?.guest_email) {
      try {
        await supabase.functions.invoke('send-confirmation-email', {
          body: {
            to_email: res.guest_email, guest_name: res.guest_name,
            reservation_code: res.reservation_code, check_in: res.check_in, check_out: res.check_out,
            room_type_name: res.room_types?.name || '', guests_count: res.guests_count,
            total_price: res.total_price, currency: cur,
            hotel_name: hotel?.name || 'Hotel', hotel_email: hotel?.email || '',
            hotel_phone: hotel?.phone || '', hotel_address: hotel?.address || '',
          },
        });
        toast.success('Confirmation email sent');
      } catch (e) { console.error('Email error:', e); }
    }

    if (status === 'checked_in' && res?.guest_email) {
      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: {
            to_email: res.guest_email, guest_name: res.guest_name,
            reservation_code: res.reservation_code, check_in: res.check_in, check_out: res.check_out,
            room_type_name: res.room_types?.name || '', guests_count: res.guests_count,
            check_in_time: timeNow,
            hotel_name: hotel?.name || 'Hotel', hotel_email: hotel?.email || '',
            hotel_phone: hotel?.phone || '', hotel_address: hotel?.address || '',
          },
        });
        toast.success('Welcome email sent');
      } catch (e) { console.error('Email error:', e); }
    }

    if (status === 'completed' && res) {
      const nightsCount = Math.max(1, Math.ceil((new Date(res.check_out).getTime() - new Date(res.check_in).getTime()) / (1000 * 60 * 60 * 24)));
      try {
        const { data: invoice, error: invError } = await supabase.from('invoices').insert({
          hotel_id: hotel!.id, reservation_id: res.id, amount: res.total_price || 0, status: 'sent', issued_at: now,
        }).select().single();
        if (!invError) toast.success('Invoice ' + (invoice?.invoice_number || '') + ' generated');

        if (res.guest_email) {
          await supabase.functions.invoke('send-checkout-email', {
            body: {
              to_email: res.guest_email, guest_name: res.guest_name,
              reservation_code: res.reservation_code, check_in: res.check_in, check_out: res.check_out,
              room_type_name: res.room_types?.name || '', guests_count: res.guests_count,
              total_price: res.total_price, currency: cur, check_out_time: timeNow,
              nights_count: nightsCount, invoice_number: invoice?.invoice_number || '',
              hotel_name: hotel?.name || 'Hotel', hotel_email: hotel?.email || '',
              hotel_phone: hotel?.phone || '', hotel_address: hotel?.address || '',
            },
          });
          toast.success('Checkout email sent');
        }
      } catch (e) { console.error('Checkout error:', e); }
    }

    fetchData();
    if (selectedRes?.id === id) setSelectedRes(null);
  };

  const handleCreate = async () => {
    if (!form.guest_name || !form.check_in || !form.check_out) { toast.error('Please fill required fields'); return; }
    if (!hotel?.id) { toast.error('Hotel not loaded'); return; }
    if (form.room_type_id) {
      setCreating(true);
      const avail = await checkAvailability(form.room_type_id, form.check_in, form.check_out);
      if (!avail) { toast.error('Room not available'); setCreating(false); return; }
    }
    setCreating(true);
    const roomId = form.room_id && form.room_id !== 'none' ? form.room_id : null;
    const { error } = await supabase.from('reservations').insert({
      hotel_id: hotel.id, ...form, room_type_id: form.room_type_id || null,
      room_id: roomId,
      status: 'confirmed',
      check_in_time: form.check_in_time || null, check_out_time: form.check_out_time || null,
      booking_source: form.booking_source || 'direct',
    });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Reservation created');
    setShowCreate(false); setForm(emptyForm); fetchData();
  };

  const openEdit = (r: any) => {
    setEditForm({
      guest_name: r.guest_name, guest_email: r.guest_email || '', guest_phone: r.guest_phone || '',
      room_type_id: r.room_type_id || '', room_id: r.room_id || '',
      check_in: r.check_in, check_out: r.check_out,
      check_in_time: r.check_in_time || '', check_out_time: r.check_out_time || '',
      guests_count: r.guests_count, total_price: Number(r.total_price) || 0,
      special_requests: r.special_requests || '', notes: r.notes || '',
      booking_source: r.booking_source || 'direct',
    });
    setSelectedRes(r); setShowEdit(true);
  };

  const handleEditSave = async () => {
    if (!selectedRes) return;
    if (editForm.room_type_id && (editForm.room_type_id !== selectedRes.room_type_id || editForm.check_in !== selectedRes.check_in || editForm.check_out !== selectedRes.check_out)) {
      setSaving(true);
      const avail = await checkAvailability(editForm.room_type_id, editForm.check_in, editForm.check_out, selectedRes.id);
      if (!avail) { toast.error('Room not available'); setSaving(false); return; }
    }
    setSaving(true);
    const roomId = editForm.room_id && editForm.room_id !== 'none' ? editForm.room_id : null;
    const { error } = await supabase.from('reservations').update({
      guest_name: editForm.guest_name, guest_email: editForm.guest_email, guest_phone: editForm.guest_phone,
      room_type_id: editForm.room_type_id || null, room_id: roomId,
      check_in: editForm.check_in, check_out: editForm.check_out,
      check_in_time: editForm.check_in_time || null, check_out_time: editForm.check_out_time || null,
      guests_count: editForm.guests_count, total_price: editForm.total_price,
      special_requests: editForm.special_requests, notes: editForm.notes,
      booking_source: editForm.booking_source, updated_at: new Date().toISOString(),
    }).eq('id', selectedRes.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('admin.saveChanges'));
    setShowEdit(false); setSelectedRes(null); fetchData();
  };

  const getConflictIds = () => {
    const conflictSet = new Set<string>();
    const active = reservations.filter(r => r.status !== 'cancelled' && r.room_type_id);
    for (let i = 0; i < active.length; i++) {
      const a = active[i];
      const rt = roomTypes.find(r => r.id === a.room_type_id);
      const maxUnits = rt?.available_units || 1;
      const overlapping = active.filter(b =>
        b.id !== a.id && b.room_type_id === a.room_type_id &&
        b.check_in < a.check_out && b.check_out > a.check_in
      );
      if (overlapping.length >= maxUnits) {
        conflictSet.add(a.id);
        overlapping.forEach(b => conflictSet.add(b.id));
      }
    }
    return conflictSet;
  };
  const conflictIds = getConflictIds();

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Export data
  const exportData = reservations.map(r => ({
    Code: r.reservation_code,
    Guest: r.guest_name,
    Email: r.guest_email || '',
    Phone: r.guest_phone || '',
    Room: r.room_types?.name || '',
    'Check-In': r.check_in,
    'Check-In Time': r.check_in_time || '',
    'Check-Out': r.check_out,
    'Check-Out Time': r.check_out_time || '',
    Guests: r.guests_count,
    'Total Price': r.total_price || 0,
    Status: r.status,
    'Payment Status': r.payment_status || '',
    Source: r.booking_source || 'direct',
  }));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={t('admin.searchGuests')} value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(0); }} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setCurrentPage(0); }}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.allStatus')}</SelectItem>
              <SelectItem value="pending">{t('admin.pending')}</SelectItem>
              <SelectItem value="confirmed">{t('admin.confirmed')}</SelectItem>
              <SelectItem value="checked_in">{t('admin.checkedIn')}</SelectItem>
              <SelectItem value="cancelled">{t('admin.cancelled')}</SelectItem>
              <SelectItem value="completed">{t('admin.completed')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={v => { setSourceFilter(v); setCurrentPage(0); }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All Sources" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {BOOKING_SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <DataExportButton data={exportData} filename="reservations" hotelName={hotel?.name} />
          <Button variant="outline" onClick={() => setShowImport(true)}><Upload size={16} className="mr-1" /> {t('admin.importReservations')}</Button>
          <Button onClick={() => setShowCreate(true)}><Plus size={16} className="mr-1" /> {t('admin.newReservation')}</Button>
        </div>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list" className="gap-1.5"><List size={14} /> List</TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5"><CalendarRange size={14} /> Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 mt-4">
          <p className="text-xs text-muted-foreground">{totalCount} {t('admin.reservations').toLowerCase()}</p>
          {reservations.length === 0 ? (
            <EmptyState icon={CalendarDays} title={t('admin.noReservations')} description={t('admin.noReservationsDesc')} />
          ) : (
            <div className="bg-card rounded-[0.625rem] border border-border/60 overflow-hidden shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">{t('admin.code')}</th>
                    <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">{t('admin.guest')}</th>
                    <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium hidden md:table-cell">{t('admin.room')}</th>
                    <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium hidden lg:table-cell">{t('admin.checkIn')}</th>
                    <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium hidden lg:table-cell">{t('admin.checkOut')}</th>
                    <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium hidden xl:table-cell">Source</th>
                    <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">{t('admin.status')}</th>
                    <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">{t('admin.actions')}</th>
                  </tr></thead>
                  <tbody>{reservations.map(r => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs">
                        {r.reservation_code}
                        {r.is_external && <Badge variant="outline" className="ml-1.5 text-[10px] px-1.5 py-0 gap-0.5"><Globe size={9} /> External</Badge>}
                      </td>
                      <td className="py-3 px-4"><div>{r.guest_name}</div><div className="text-xs text-muted-foreground">{r.guest_email}</div></td>
                      <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{r.room_types?.name || '—'}</td>
                      <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">
                        {format(new Date(r.check_in + 'T00:00:00'), 'MMM dd, yyyy')}
                        {r.check_in_time && <span className="text-[10px] ml-1 text-muted-foreground">@ {r.check_in_time}</span>}
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">
                        {format(new Date(r.check_out + 'T00:00:00'), 'MMM dd, yyyy')}
                        {r.check_out_time && <span className="text-[10px] ml-1 text-muted-foreground">@ {r.check_out_time}</span>}
                      </td>
                      <td className="py-3 px-4 hidden xl:table-cell"><SourceBadge source={r.booking_source} /></td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={r.status} />
                          {conflictIds.has(r.id) && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-0.5"><AlertTriangle size={10} /> {t('admin.conflict')}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedRes(r)}><Eye size={14} /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}><Pencil size={14} /></Button>
                          {r.status === 'pending' && <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => confirmAndUpdateStatus(r.id, 'confirmed')}><Check size={14} /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => confirmAndUpdateStatus(r.id, 'cancelled')}><X size={14} /></Button>
                          </>}
                          {r.status === 'confirmed' && (
                            <Button variant="ghost" size="sm" className="h-8 text-xs text-blue-600 gap-1" onClick={() => confirmAndUpdateStatus(r.id, 'checked_in')}>
                              <LogIn size={14} /> {t('admin.checkInAction')}
                            </Button>
                          )}
                          {r.status === 'checked_in' && (
                            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => confirmAndUpdateStatus(r.id, 'completed')}>
                              <LogOutIcon size={14} /> {t('admin.checkOutAction')}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Showing {currentPage * ITEMS_PER_PAGE + 1}–{Math.min((currentPage + 1) * ITEMS_PER_PAGE, totalCount)} of {totalCount} reservations
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="text-xs" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" className="text-xs" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <ReservationTimeline
            rooms={rooms}
            roomTypes={roomTypes}
            reservations={reservations}
            currency={cur}
            onReservationClick={setSelectedRes}
          />
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRes && !showEdit} onOpenChange={() => setSelectedRes(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t('admin.reservationDetails')}</DialogTitle></DialogHeader>
          {selectedRes && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-muted-foreground block text-xs">{t('admin.guest')}</span>{selectedRes.guest_name}</div>
                <div><span className="text-muted-foreground block text-xs">{t('admin.code')}</span><span className="font-mono">{selectedRes.reservation_code}</span></div>
                <div><span className="text-muted-foreground block text-xs">{t('admin.guestEmail')}</span>{selectedRes.guest_email || '—'}</div>
                <div><span className="text-muted-foreground block text-xs">{t('admin.guestPhone')}</span>{selectedRes.guest_phone || '—'}</div>
                <div><span className="text-muted-foreground block text-xs">{t('admin.room')}</span>{selectedRes.room_types?.name || '—'}</div>
                <div><span className="text-muted-foreground block text-xs">{t('admin.guests')}</span>{selectedRes.guests_count}</div>
                <div><span className="text-muted-foreground block text-xs">{t('admin.checkIn')}</span>{format(new Date(selectedRes.check_in + 'T00:00:00'), 'MMM dd, yyyy')} {selectedRes.check_in_time && <span className="text-muted-foreground">@ {selectedRes.check_in_time}</span>}</div>
                <div><span className="text-muted-foreground block text-xs">{t('admin.checkOut')}</span>{format(new Date(selectedRes.check_out + 'T00:00:00'), 'MMM dd, yyyy')} {selectedRes.check_out_time && <span className="text-muted-foreground">@ {selectedRes.check_out_time}</span>}</div>
                <div><span className="text-muted-foreground block text-xs">{t('admin.totalPrice')}</span>{displayPrice(selectedRes.total_price || 0, cur)}</div>
                <div><span className="text-muted-foreground block text-xs">{t('admin.payment')}</span><StatusBadge status={selectedRes.payment_status || 'unpaid'} /></div>
                <div><span className="text-muted-foreground block text-xs">{t('admin.source')}</span><SourceBadge source={selectedRes.booking_source} /></div>
                <div><span className="text-muted-foreground block text-xs">{t('admin.status')}</span><StatusBadge status={selectedRes.status} /></div>
              </div>
              {selectedRes.special_requests && <div><span className="text-muted-foreground block text-xs mb-1">{t('admin.specialRequests')}</span><p className="text-muted-foreground italic">"{selectedRes.special_requests}"</p></div>}
              {selectedRes.notes && <div><span className="text-muted-foreground block text-xs mb-1">{t('admin.notes')}</span><p>{selectedRes.notes}</p></div>}
              <div className="flex gap-2 pt-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => openEdit(selectedRes)}><Pencil size={14} className="mr-1" /> {t('admin.edit')}</Button>
                {selectedRes.status === 'pending' && <>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => confirmAndUpdateStatus(selectedRes.id, 'confirmed')}><Check size={14} className="mr-1" /> {t('admin.confirm')}</Button>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => confirmAndUpdateStatus(selectedRes.id, 'cancelled')}><X size={14} className="mr-1" /> {t('admin.cancel')}</Button>
                </>}
                {selectedRes.status === 'confirmed' && <>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1" onClick={() => confirmAndUpdateStatus(selectedRes.id, 'checked_in')}><LogIn size={14} /> {t('admin.checkInAction')}</Button>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => confirmAndUpdateStatus(selectedRes.id, 'cancelled')}><X size={14} className="mr-1" /> {t('admin.cancel')}</Button>
                </>}
                {selectedRes.status === 'checked_in' && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => confirmAndUpdateStatus(selectedRes.id, 'completed')}><LogOutIcon size={14} /> {t('admin.checkOutAction')}</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={v => { if (!v) { setShowEdit(false); setSelectedRes(null); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('admin.editReservation')}</DialogTitle></DialogHeader>
          <FormFields f={editForm} setF={setEditForm} roomTypes={roomTypes} rooms={rooms} t={t} />
          <Button onClick={handleEditSave} disabled={saving} className="w-full">{saving ? t('admin.saving') : t('admin.saveChanges')}</Button>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('admin.newReservation')}</DialogTitle></DialogHeader>
          <FormFields f={form} setF={setForm} roomTypes={roomTypes} rooms={rooms} t={t} />
          <Button onClick={handleCreate} disabled={creating} className="w-full">{creating ? t('admin.creating') : t('admin.createReservation')}</Button>
        </DialogContent>
      </Dialog>

      {/* Room Picker Dialog for Check-in */}
      <Dialog open={!!roomPickerRes} onOpenChange={v => { if (!v) setRoomPickerRes(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign Room for Check-in</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            No room assigned to <strong>{roomPickerRes?.guest_name}</strong>. Please select a room before checking in.
          </p>
          <Select value={pickedRoomId} onValueChange={setPickedRoomId}>
            <SelectTrigger><SelectValue placeholder="Select a room" /></SelectTrigger>
            <SelectContent>
              {rooms.filter(r =>
                r.room_type_id === roomPickerRes?.room_type_id &&
                (r.operational_status === 'available' || r.operational_status === 'reserved')
              ).map(r => (
                <SelectItem key={r.id} value={r.id}>Room {r.room_number} {r.floor ? `(Floor ${r.floor})` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleRoomPickerConfirm} disabled={!pickedRoomId} className="w-full gap-1.5">
            <LogIn size={14} /> Assign & Check In
          </Button>
        </DialogContent>
      </Dialog>

      <ImportReservationsModal open={showImport} onOpenChange={setShowImport} roomTypes={roomTypes} hotelId={hotel?.id || reservations[0]?.hotel_id || ''} onImported={fetchData} />

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={v => { if (!v) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmAction?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmAction?.onConfirm()}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminReservations;
