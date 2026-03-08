import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { EmptyState } from '@/components/admin/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CalendarDays, Search, Plus, Check, X, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const AdminReservations = () => {
  const [reservations, setReservations] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRes, setSelectedRes] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    guest_name: '', guest_email: '', guest_phone: '',
    room_type_id: '', check_in: '', check_out: '',
    guests_count: 1, total_price: 0, special_requests: '', notes: '',
  });

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

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('reservations').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Reservation ${status}`);
    fetchData();
    if (selectedRes?.id === id) setSelectedRes(null);
  };

  const handleCreate = async () => {
    if (!form.guest_name || !form.check_in || !form.check_out) {
      toast.error('Please fill required fields');
      return;
    }
    setCreating(true);
    const hotel = (await supabase.from('hotels').select('id').limit(1).single()).data;
    const { error } = await supabase.from('reservations').insert({
      hotel_id: hotel?.id,
      ...form,
      room_type_id: form.room_type_id || null,
      status: 'confirmed',
    });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Reservation created');
    setShowCreate(false);
    setForm({ guest_name: '', guest_email: '', guest_phone: '', room_type_id: '', check_in: '', check_out: '', guests_count: 1, total_price: 0, special_requests: '', notes: '' });
    fetchData();
  };

  const filtered = reservations.filter(r => {
    const matchSearch = !search || [r.guest_name, r.guest_email, r.guest_phone, r.reservation_code]
      .some(f => f?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search guests..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-muted/50" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 bg-muted/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 font-body">
          <Plus size={16} className="mr-1" /> New Reservation
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} reservations</p>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No reservations" description="No reservations match your filters." />
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Code</th>
                  <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Guest</th>
                  <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium hidden md:table-cell">Room</th>
                  <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium hidden lg:table-cell">Check-In</th>
                  <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium hidden lg:table-cell">Check-Out</th>
                  <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-border/30 hover:bg-muted/10 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs">{r.reservation_code}</td>
                    <td className="py-3 px-4">
                      <div>{r.guest_name}</div>
                      <div className="text-xs text-muted-foreground">{r.guest_email}</div>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{r.room_types?.name || '—'}</td>
                    <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">{r.check_in}</td>
                    <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">{r.check_out}</td>
                    <td className="py-3 px-4"><StatusBadge status={r.status} /></td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedRes(r)}>
                          <Eye size={14} />
                        </Button>
                        {r.status === 'pending' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500" onClick={() => updateStatus(r.id, 'confirmed')}>
                              <Check size={14} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => updateStatus(r.id, 'cancelled')}>
                              <X size={14} />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedRes} onOpenChange={() => setSelectedRes(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display">Reservation Details</DialogTitle></DialogHeader>
          {selectedRes && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-muted-foreground block text-xs">Guest</span>{selectedRes.guest_name}</div>
                <div><span className="text-muted-foreground block text-xs">Code</span><span className="font-mono">{selectedRes.reservation_code}</span></div>
                <div><span className="text-muted-foreground block text-xs">Email</span>{selectedRes.guest_email || '—'}</div>
                <div><span className="text-muted-foreground block text-xs">Phone</span>{selectedRes.guest_phone || '—'}</div>
                <div><span className="text-muted-foreground block text-xs">Room</span>{selectedRes.room_types?.name || '—'}</div>
                <div><span className="text-muted-foreground block text-xs">Guests</span>{selectedRes.guests_count}</div>
                <div><span className="text-muted-foreground block text-xs">Check-In</span>{selectedRes.check_in}</div>
                <div><span className="text-muted-foreground block text-xs">Check-Out</span>{selectedRes.check_out}</div>
                <div><span className="text-muted-foreground block text-xs">Total Price</span>${selectedRes.total_price || '—'}</div>
                <div><span className="text-muted-foreground block text-xs">Payment</span><StatusBadge status={selectedRes.payment_status || 'unpaid'} /></div>
                <div><span className="text-muted-foreground block text-xs">Source</span>{selectedRes.booking_source}</div>
                <div><span className="text-muted-foreground block text-xs">Status</span><StatusBadge status={selectedRes.status} /></div>
              </div>
              {selectedRes.special_requests && (
                <div><span className="text-muted-foreground block text-xs mb-1">Special Requests</span><p className="text-muted-foreground italic">"{selectedRes.special_requests}"</p></div>
              )}
              {selectedRes.notes && (
                <div><span className="text-muted-foreground block text-xs mb-1">Notes</span><p>{selectedRes.notes}</p></div>
              )}
              <div className="flex gap-2 pt-2">
                {selectedRes.status === 'pending' && (
                  <>
                    <Button size="sm" onClick={() => updateStatus(selectedRes.id, 'confirmed')} className="bg-green-600 hover:bg-green-700 text-foreground font-body"><Check size={14} className="mr-1" /> Confirm</Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(selectedRes.id, 'cancelled')} className="text-destructive border-destructive/30"><X size={14} className="mr-1" /> Cancel</Button>
                  </>
                )}
                {selectedRes.status === 'confirmed' && (
                  <>
                    <Button size="sm" onClick={() => updateStatus(selectedRes.id, 'completed')} className="bg-primary text-primary-foreground font-body">Mark Completed</Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(selectedRes.id, 'cancelled')} className="text-destructive border-destructive/30"><X size={14} className="mr-1" /> Cancel</Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">New Reservation</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Label>Guest Name *</Label><Input value={form.guest_name} onChange={e => setForm(f => ({...f, guest_name: e.target.value}))} className="bg-muted/50" /></div>
              <div><Label>Email</Label><Input type="email" value={form.guest_email} onChange={e => setForm(f => ({...f, guest_email: e.target.value}))} className="bg-muted/50" /></div>
              <div><Label>Phone</Label><Input value={form.guest_phone} onChange={e => setForm(f => ({...f, guest_phone: e.target.value}))} className="bg-muted/50" /></div>
              <div><Label>Room Type</Label>
                <Select value={form.room_type_id} onValueChange={v => setForm(f => ({...f, room_type_id: v}))}>
                  <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Select room" /></SelectTrigger>
                  <SelectContent>{roomTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Guests</Label><Input type="number" min={1} value={form.guests_count} onChange={e => setForm(f => ({...f, guests_count: parseInt(e.target.value) || 1}))} className="bg-muted/50" /></div>
              <div><Label>Check-In *</Label><Input type="date" value={form.check_in} onChange={e => setForm(f => ({...f, check_in: e.target.value}))} className="bg-muted/50" /></div>
              <div><Label>Check-Out *</Label><Input type="date" value={form.check_out} onChange={e => setForm(f => ({...f, check_out: e.target.value}))} className="bg-muted/50" /></div>
              <div><Label>Total Price</Label><Input type="number" min={0} value={form.total_price} onChange={e => setForm(f => ({...f, total_price: parseFloat(e.target.value) || 0}))} className="bg-muted/50" /></div>
            </div>
            <div><Label>Special Requests</Label><Textarea value={form.special_requests} onChange={e => setForm(f => ({...f, special_requests: e.target.value}))} className="bg-muted/50" rows={2} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="bg-muted/50" rows={2} /></div>
            <Button onClick={handleCreate} disabled={creating} className="w-full bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 font-body">
              {creating ? 'Creating...' : 'Create Reservation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReservations;
