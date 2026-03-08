import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useHotel } from '@/hooks/useHotel';
import { formatCurrency } from '@/lib/currency';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { EmptyState } from '@/components/admin/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CalendarDays, Search, Plus, Check, X, Eye, Pencil, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type ReservationForm = {
  guest_name: string; guest_email: string; guest_phone: string;
  room_type_id: string; check_in: string; check_out: string;
  guests_count: number; total_price: number; special_requests: string; notes: string;
};

const emptyForm: ReservationForm = { guest_name: '', guest_email: '', guest_phone: '', room_type_id: '', check_in: '', check_out: '', guests_count: 1, total_price: 0, special_requests: '', notes: '' };

interface FormFieldsProps {
  f: ReservationForm;
  setF: (fn: (prev: ReservationForm) => ReservationForm) => void;
  roomTypes: any[];
  t: (key: string) => string;
}

const FormFields = ({ f, setF, roomTypes, t }: FormFieldsProps) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2"><Label>{t('admin.guestName')} *</Label><Input value={f.guest_name} onChange={e => setF(p => ({...p, guest_name: e.target.value}))} /></div>
      <div><Label>{t('admin.guestEmail')}</Label><Input type="email" value={f.guest_email} onChange={e => setF(p => ({...p, guest_email: e.target.value}))} /></div>
      <div><Label>{t('admin.guestPhone')}</Label><Input value={f.guest_phone} onChange={e => setF(p => ({...p, guest_phone: e.target.value}))} /></div>
      <div><Label>{t('admin.roomType')}</Label>
        <Select value={f.room_type_id} onValueChange={v => setF(p => ({...p, room_type_id: v}))}>
          <SelectTrigger><SelectValue placeholder={t('admin.selectRoom')} /></SelectTrigger>
          <SelectContent>{roomTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>{t('admin.guests')}</Label><Input type="number" min={1} value={f.guests_count} onChange={e => setF(p => ({...p, guests_count: parseInt(e.target.value) || 1}))} /></div>
      <div><Label>{t('admin.checkIn')} *</Label><Input type="date" value={f.check_in} onChange={e => setF(p => ({...p, check_in: e.target.value}))} /></div>
      <div><Label>{t('admin.checkOut')} *</Label><Input type="date" value={f.check_out} onChange={e => setF(p => ({...p, check_out: e.target.value}))} /></div>
      <div><Label>{t('admin.totalPrice')}</Label><Input type="number" min={0} value={f.total_price} onChange={e => setF(p => ({...p, total_price: parseFloat(e.target.value) || 0}))} /></div>
    </div>
    <div><Label>{t('admin.specialRequests')}</Label><Textarea value={f.special_requests} onChange={e => setF(p => ({...p, special_requests: e.target.value}))} rows={2} /></div>
    <div><Label>{t('admin.notes')}</Label><Textarea value={f.notes} onChange={e => setF(p => ({...p, notes: e.target.value}))} rows={2} /></div>
  </div>
);

const AdminReservations = () => {
  const { t } = useLanguage();
  const { hotel } = useHotel();
  const cur = hotel?.currency || 'USD';
  const [reservations, setReservations] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRes, setSelectedRes] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<ReservationForm>(emptyForm);
  const [editForm, setEditForm] = useState<ReservationForm>(emptyForm);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [resResult, rtResult] = await Promise.all([
      supabase.from('reservations').select('*, room_types(name)').order('created_at', { ascending: false }),
      supabase.from('room_types').select('*'),
    ]);
    setReservations(resResult.data || []);
    setRoomTypes(rtResult.data || []);
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

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('reservations').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Reservation ${status}`);

    if (status === 'confirmed') {
      const res = reservations.find(r => r.id === id);
      if (res?.guest_email) {
        try {
          const { error: emailError } = await supabase.functions.invoke('send-confirmation-email', {
            body: {
              to_email: res.guest_email, guest_name: res.guest_name,
              reservation_code: res.reservation_code, check_in: res.check_in, check_out: res.check_out,
              room_type_name: res.room_types?.name || '', guests_count: res.guests_count,
              total_price: res.total_price, currency: cur,
              hotel_name: hotel?.name || 'Hotel', hotel_email: hotel?.email || '',
              hotel_phone: hotel?.phone || '', hotel_address: hotel?.address || '',
            },
          });
          if (emailError) { console.error('Email error:', emailError); toast.error('Reservation confirmed but email failed'); }
          else toast.success('Confirmation email sent to ' + res.guest_email);
        } catch (e) { console.error('Email send error:', e); }
      }
    }
    fetchData();
    if (selectedRes?.id === id) setSelectedRes(null);
  };

  const handleCreate = async () => {
    if (!form.guest_name || !form.check_in || !form.check_out) { toast.error('Please fill required fields'); return; }
    if (form.room_type_id) {
      setCreating(true);
      const avail = await checkAvailability(form.room_type_id, form.check_in, form.check_out);
      if (!avail) { toast.error('Room not available for selected dates'); setCreating(false); return; }
    }
    setCreating(true);
    const h = (await supabase.from('hotels').select('id').limit(1).single()).data;
    const { error } = await supabase.from('reservations').insert({ hotel_id: h?.id, ...form, room_type_id: form.room_type_id || null, status: 'confirmed' });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Reservation created');
    setShowCreate(false);
    setForm(emptyForm);
    fetchData();
  };

  const openEdit = (r: any) => {
    setEditForm({
      guest_name: r.guest_name, guest_email: r.guest_email || '', guest_phone: r.guest_phone || '',
      room_type_id: r.room_type_id || '', check_in: r.check_in, check_out: r.check_out,
      guests_count: r.guests_count, total_price: Number(r.total_price) || 0,
      special_requests: r.special_requests || '', notes: r.notes || '',
    });
    setSelectedRes(r);
    setShowEdit(true);
  };

  const handleEditSave = async () => {
    if (!selectedRes) return;
    if (editForm.room_type_id && (editForm.room_type_id !== selectedRes.room_type_id || editForm.check_in !== selectedRes.check_in || editForm.check_out !== selectedRes.check_out)) {
      setSaving(true);
      const avail = await checkAvailability(editForm.room_type_id, editForm.check_in, editForm.check_out, selectedRes.id);
      if (!avail) { toast.error('Room not available for selected dates'); setSaving(false); return; }
    }
    setSaving(true);
    const { error } = await supabase.from('reservations').update({
      guest_name: editForm.guest_name, guest_email: editForm.guest_email, guest_phone: editForm.guest_phone,
      room_type_id: editForm.room_type_id || null, check_in: editForm.check_in, check_out: editForm.check_out,
      guests_count: editForm.guests_count, total_price: editForm.total_price,
      special_requests: editForm.special_requests, notes: editForm.notes,
      updated_at: new Date().toISOString(),
    }).eq('id', selectedRes.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('admin.saveChanges'));
    setShowEdit(false);
    setSelectedRes(null);
    fetchData();
  };

  // Detect conflicts: reservations with same room_type that overlap dates
  const getConflictIds = () => {
    const conflictSet = new Set<string>();
    const active = reservations.filter(r => r.status !== 'cancelled' && r.room_type_id);
    for (let i = 0; i < active.length; i++) {
      const a = active[i];
      const rt = roomTypes.find(r => r.id === a.room_type_id);
      const maxUnits = rt?.available_units || 1;
      // Count how many overlap with this reservation's dates
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

  const filtered = reservations.filter(r => {
    const matchSearch = !search || [r.guest_name, r.guest_email, r.guest_phone, r.reservation_code].some(f => f?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={t('admin.searchGuests')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.allStatus')}</SelectItem>
              <SelectItem value="pending">{t('admin.pending')}</SelectItem>
              <SelectItem value="confirmed">{t('admin.confirmed')}</SelectItem>
              <SelectItem value="cancelled">{t('admin.cancelled')}</SelectItem>
              <SelectItem value="completed">{t('admin.completed')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus size={16} className="mr-1" /> {t('admin.newReservation')}</Button>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} {t('admin.reservations').toLowerCase()}</p>

      {filtered.length === 0 ? (
        <EmptyState icon={CalendarDays} title={t('admin.noReservations')} description={t('admin.noReservationsDesc')} />
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">{t('admin.code')}</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">{t('admin.guest')}</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium hidden md:table-cell">{t('admin.room')}</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium hidden lg:table-cell">{t('admin.checkIn')}</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium hidden lg:table-cell">{t('admin.checkOut')}</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">{t('admin.status')}</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">{t('admin.actions')}</th>
              </tr></thead>
              <tbody>{filtered.map(r => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs">{r.reservation_code}</td>
                  <td className="py-3 px-4"><div>{r.guest_name}</div><div className="text-xs text-muted-foreground">{r.guest_email}</div></td>
                  <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{r.room_types?.name || '—'}</td>
                  <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">{r.check_in}</td>
                  <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">{r.check_out}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={r.status} />
                      {conflictIds.has(r.id) && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-0.5">
                          <AlertTriangle size={10} /> {t('admin.conflict')}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedRes(r)}><Eye size={14} /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}><Pencil size={14} /></Button>
                      {r.status === 'pending' && <>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => updateStatus(r.id, 'confirmed')}><Check size={14} /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => updateStatus(r.id, 'cancelled')}><X size={14} /></Button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

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
                <div><span className="text-muted-foreground block text-xs">{t('admin.checkIn')}</span>{selectedRes.check_in}</div>
                <div><span className="text-muted-foreground block text-xs">{t('admin.checkOut')}</span>{selectedRes.check_out}</div>
                <div><span className="text-muted-foreground block text-xs">{t('admin.totalPrice')}</span>{formatCurrency(selectedRes.total_price || 0, cur)}</div>
                <div><span className="text-muted-foreground block text-xs">{t('admin.payment')}</span><StatusBadge status={selectedRes.payment_status || 'unpaid'} /></div>
                <div><span className="text-muted-foreground block text-xs">{t('admin.source')}</span>{selectedRes.booking_source}</div>
                <div><span className="text-muted-foreground block text-xs">{t('admin.status')}</span><StatusBadge status={selectedRes.status} /></div>
              </div>
              {selectedRes.special_requests && <div><span className="text-muted-foreground block text-xs mb-1">{t('admin.specialRequests')}</span><p className="text-muted-foreground italic">"{selectedRes.special_requests}"</p></div>}
              {selectedRes.notes && <div><span className="text-muted-foreground block text-xs mb-1">{t('admin.notes')}</span><p>{selectedRes.notes}</p></div>}
              <div className="flex gap-2 pt-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => openEdit(selectedRes)}><Pencil size={14} className="mr-1" /> {t('admin.edit')}</Button>
                {selectedRes.status === 'pending' && <>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => updateStatus(selectedRes.id, 'confirmed')}><Check size={14} className="mr-1" /> {t('admin.confirm')}</Button>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => updateStatus(selectedRes.id, 'cancelled')}><X size={14} className="mr-1" /> {t('admin.cancel')}</Button>
                </>}
                {selectedRes.status === 'confirmed' && <>
                  <Button size="sm" onClick={() => updateStatus(selectedRes.id, 'completed')}>{t('admin.markCompleted')}</Button>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => updateStatus(selectedRes.id, 'cancelled')}><X size={14} className="mr-1" /> {t('admin.cancel')}</Button>
                </>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={v => { if (!v) { setShowEdit(false); setSelectedRes(null); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('admin.editReservation')}</DialogTitle></DialogHeader>
          <FormFields f={editForm} setF={setEditForm} roomTypes={roomTypes} t={t} />
          <Button onClick={handleEditSave} disabled={saving} className="w-full">{saving ? t('admin.saving') : t('admin.saveChanges')}</Button>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('admin.newReservation')}</DialogTitle></DialogHeader>
          <FormFields f={form} setF={setForm} roomTypes={roomTypes} t={t} />
          <Button onClick={handleCreate} disabled={creating} className="w-full">{creating ? t('admin.creating') : t('admin.createReservation')}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReservations;
