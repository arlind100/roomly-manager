import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useHotel } from '@/hooks/useHotel';
import { EmptyState } from '@/components/admin/EmptyState';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PackageSearch, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const emptyForm = {
  item_description: '', room_id: '', found_date: format(new Date(), 'yyyy-MM-dd'),
  found_by: '', storage_location: '', notes: '', reservation_id: '',
};

const AdminLostFound = () => {
  const { t } = useLanguage();
  const { hotel } = useHotel();
  const [items, setItems] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLog, setShowLog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('all');

  // Claim modal
  const [claimItem, setClaimItem] = useState<any>(null);
  const [claimForm, setClaimForm] = useState({ claimed_by: '', claimed_date: format(new Date(), 'yyyy-MM-dd') });
  const [claiming, setClaiming] = useState(false);

  // Dispose confirm
  const [disposeItem, setDisposeItem] = useState<any>(null);
  const [disposing, setDisposing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!hotel?.id) return;
    const [itemsRes, roomsRes] = await Promise.all([
      supabase.from('lost_found_items').select('*, rooms(room_number)').eq('hotel_id', hotel.id).order('created_at', { ascending: false }),
      supabase.from('rooms').select('id, room_number, room_type_id').eq('hotel_id', hotel.id).eq('is_active', true),
    ]);
    setItems(itemsRes.data || []);
    setRooms(roomsRes.data || []);
    setLoading(false);
  }, [hotel?.id]);

  useEffect(() => { if (hotel?.id) fetchData(); }, [hotel?.id, fetchData]);

  const handleLog = async () => {
    if (!form.item_description || !form.found_by) { toast.error('Description and found by are required'); return; }
    if (!hotel?.id) return;
    setSaving(true);
    const payload: any = {
      hotel_id: hotel.id,
      item_description: form.item_description,
      found_date: form.found_date,
      found_by: form.found_by,
      storage_location: form.storage_location || null,
      notes: form.notes || null,
      room_id: form.room_id || null,
      reservation_id: form.reservation_id || null,
    };
    const { error } = await supabase.from('lost_found_items').insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Item logged');
    setShowLog(false);
    setForm(emptyForm);
    fetchData();
  };

  const handleClaim = async () => {
    if (!claimForm.claimed_by || !claimForm.claimed_date) { toast.error('Claimed by and date are required'); return; }
    setClaiming(true);
    const { error } = await supabase.from('lost_found_items').update({
      status: 'claimed', claimed_by: claimForm.claimed_by, claimed_date: claimForm.claimed_date,
    }).eq('id', claimItem.id);
    setClaiming(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Item marked as claimed');
    setClaimItem(null);
    fetchData();
  };

  const handleDispose = async () => {
    if (!disposeItem) return;
    setDisposing(true);
    const { error } = await supabase.from('lost_found_items').update({ status: 'disposed' }).eq('id', disposeItem.id);
    setDisposing(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Item marked as disposed');
    setDisposeItem(null);
    fetchData();
  };

  // Auto-suggest last reservation for selected room
  const handleRoomChange = async (roomId: string) => {
    setForm(f => ({ ...f, room_id: roomId, reservation_id: '' }));
    if (!roomId || !hotel?.id) return;
    const { data } = await supabase.from('reservations')
      .select('id, guest_name, reservation_code')
      .eq('hotel_id', hotel.id)
      .eq('room_id', roomId)
      .eq('status', 'completed')
      .order('check_out', { ascending: false })
      .limit(1);
    if (data?.[0]) {
      setForm(f => ({ ...f, reservation_id: data[0].id }));
      toast.info(`Linked to last checkout: ${data[0].guest_name} (${data[0].reservation_code})`);
    }
  };

  const filtered = tab === 'all' ? items : items.filter(i => i.status === tab);
  const counts = {
    stored: items.filter(i => i.status === 'stored').length,
    claimed: items.filter(i => i.status === 'claimed').length,
    disposed: items.filter(i => i.status === 'disposed').length,
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{counts.stored} Stored</span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">{counts.claimed} Claimed</span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">{counts.disposed} Disposed</span>
        </div>
        <Button onClick={() => { setForm(emptyForm); setShowLog(true); }}><Plus size={16} className="mr-1" /> Log Item</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({items.length})</TabsTrigger>
          <TabsTrigger value="stored">Stored</TabsTrigger>
          <TabsTrigger value="claimed">Claimed</TabsTrigger>
          <TabsTrigger value="disposed">Disposed</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {filtered.length === 0 ? (
            <EmptyState icon={PackageSearch} title="No items found" description="No lost & found items in this category" />
          ) : (
            <div className="bg-card rounded-lg border border-border/60 overflow-hidden shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-zebra">
                  <thead><tr className="border-b border-border bg-muted/60">
                    <th className="text-left py-3.5 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Item</th>
                    <th className="text-left py-3.5 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden md:table-cell">Room</th>
                    <th className="text-left py-3.5 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden md:table-cell">Found Date</th>
                    <th className="text-left py-3.5 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden lg:table-cell">Found By</th>
                    <th className="text-left py-3.5 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden lg:table-cell">Storage</th>
                    <th className="text-left py-3.5 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Status</th>
                    <th className="text-right py-3.5 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Actions</th>
                  </tr></thead>
                  <tbody>{filtered.map(item => (
                    <tr key={item.id} className="border-b border-border/30 transition-colors">
                      <td className="py-3 px-4">{item.item_description}</td>
                      <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{item.rooms?.room_number || '—'}</td>
                      <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{format(new Date(item.found_date + 'T00:00:00'), 'MMM dd, yyyy')}</td>
                      <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">{item.found_by}</td>
                      <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">{item.storage_location || '—'}</td>
                      <td className="py-3 px-4"><StatusBadge status={item.status} /></td>
                      <td className="py-3 px-4 text-right">
                        {item.status === 'stored' && (
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="text-xs text-green-600" onClick={() => { setClaimItem(item); setClaimForm({ claimed_by: '', claimed_date: format(new Date(), 'yyyy-MM-dd') }); }}>Claim</Button>
                            <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => setDisposeItem(item)}>Dispose</Button>
                          </div>
                        )}
                        {item.status === 'claimed' && item.claimed_by && (
                          <span className="text-xs text-muted-foreground">By: {item.claimed_by}</span>
                        )}
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Log Item Modal */}
      <Dialog open={showLog} onOpenChange={setShowLog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Lost & Found Item</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Item Description *</Label><Input value={form.item_description} onChange={e => setForm(f => ({ ...f, item_description: e.target.value }))} placeholder="e.g. Black leather wallet" /></div>
            <div><Label>Room (optional)</Label>
              <Select value={form.room_id} onValueChange={handleRoomChange}>
                <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No room</SelectItem>
                  {rooms.map(r => <SelectItem key={r.id} value={r.id}>Room {r.room_number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Found Date *</Label><DatePickerInput value={form.found_date} onChange={v => setForm(f => ({ ...f, found_date: v }))} /></div>
              <div><Label>Found By *</Label><Input value={form.found_by} onChange={e => setForm(f => ({ ...f, found_by: e.target.value }))} placeholder="Staff name" /></div>
            </div>
            <div><Label>Storage Location</Label><Input value={form.storage_location} onChange={e => setForm(f => ({ ...f, storage_location: e.target.value }))} placeholder="Front desk safe, Storage room B" /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <Button onClick={handleLog} disabled={saving} className="w-full gap-1.5">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Logging...' : 'Log Item'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Claim Modal */}
      <Dialog open={!!claimItem} onOpenChange={v => { if (!v) setClaimItem(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark as Claimed</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Item: <strong>{claimItem?.item_description}</strong></p>
          <div className="space-y-4">
            <div><Label>Claimed By *</Label><Input value={claimForm.claimed_by} onChange={e => setClaimForm(f => ({ ...f, claimed_by: e.target.value }))} placeholder="Person's name" /></div>
            <div><Label>Claimed Date *</Label><DatePickerInput value={claimForm.claimed_date} onChange={v => setClaimForm(f => ({ ...f, claimed_date: v }))} /></div>
            <Button onClick={handleClaim} disabled={claiming} className="w-full gap-1.5">
              {claiming && <Loader2 size={14} className="animate-spin" />}
              {claiming ? 'Saving...' : 'Mark as Claimed'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dispose Confirmation */}
      <AlertDialog open={!!disposeItem} onOpenChange={v => { if (!v) setDisposeItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dispose Item?</AlertDialogTitle>
            <AlertDialogDescription>Mark <strong>{disposeItem?.item_description}</strong> as disposed? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDispose} disabled={disposing}>
              {disposing ? 'Disposing...' : 'Dispose'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminLostFound;
