import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useHotel } from '@/hooks/useHotel';
import { EmptyState } from '@/components/admin/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { DoorOpen, Plus, Pencil, Trash2, CheckCircle2, Droplets, Sparkles, Wrench, Ban, Search, Loader2 } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  available: { label: 'Available', color: 'bg-green-500/10 text-green-700 border-green-500/20 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20', icon: CheckCircle2 },
  occupied: { label: 'Occupied', color: 'bg-red-500/10 text-red-700 border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20', icon: DoorOpen },
  dirty: { label: 'Dirty', color: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20', icon: Droplets },
  cleaning: { label: 'Cleaning', color: 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20', icon: Sparkles },
  maintenance: { label: 'Maintenance', color: 'bg-orange-500/10 text-orange-700 border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20', icon: Wrench },
  out_of_service: { label: 'Out of Service', color: 'bg-muted text-muted-foreground border-border/60', icon: Ban },
};

const emptyForm = { room_number: '', floor: '', room_type_id: '', notes: '' };

const AdminRooms = () => {
  const { t } = useLanguage();
  const { hotel } = useHotel();
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkForm, setBulkForm] = useState({ room_type_id: '', prefix: '', start: 1, count: 5, floor: '' });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [roomRes, rtRes] = await Promise.all([
      supabase.from('rooms').select('*, room_types(name)').order('room_number'),
      supabase.from('room_types').select('*'),
    ]);
    setRooms(roomRes.data || []);
    setRoomTypes(rtRes.data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.room_number || !form.room_type_id) { toast.error('Room number and type required'); return; }
    setSaving(true);
    const h = hotel?.id || (await supabase.from('hotels').select('id').limit(1).single()).data?.id;
    const payload = { hotel_id: h, room_number: form.room_number, floor: form.floor || null, room_type_id: form.room_type_id, notes: form.notes || null };
    const { error } = editing
      ? await supabase.from('rooms').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing)
      : await supabase.from('rooms').insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? 'Room updated' : 'Room added');
    setShowForm(false); setEditing(null); setForm(emptyForm);
    fetchData();
  };

  const handleBulkAdd = async () => {
    if (!bulkForm.room_type_id || !bulkForm.count) { toast.error('Select room type and count'); return; }
    setSaving(true);
    const h = hotel?.id || (await supabase.from('hotels').select('id').limit(1).single()).data?.id;
    const roomsToInsert = Array.from({ length: bulkForm.count }, (_, i) => ({
      hotel_id: h,
      room_type_id: bulkForm.room_type_id,
      room_number: `${bulkForm.prefix}${bulkForm.start + i}`,
      floor: bulkForm.floor || null,
    }));
    const { error } = await supabase.from('rooms').insert(roomsToInsert);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${bulkForm.count} rooms added`);
    setShowBulkAdd(false);
    setBulkForm({ room_type_id: '', prefix: '', start: 1, count: 5, floor: '' });
    fetchData();
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingStatusId(id);
    const updateData: Record<string, any> = { operational_status: status, updated_at: new Date().toISOString() };
    if (status === 'cleaning') {
      const now = new Date();
      const duration = hotel?.cleaning_duration_minutes || 120;
      updateData.cleaning_started_at = now.toISOString();
      updateData.cleaning_expected_done_at = new Date(now.getTime() + duration * 60000).toISOString();
    } else if (status === 'available') {
      updateData.cleaning_started_at = null;
      updateData.cleaning_expected_done_at = null;
    }
    const { error } = await supabase.from('rooms').update(updateData).eq('id', id);
    setUpdatingStatusId(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Status → ${status}`);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('rooms').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Room deleted');
    setDeleteId(null);
    fetchData();
  };

  const filtered = rooms.filter(r => {
    const matchSearch = !search || r.room_number.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.operational_status === statusFilter;
    const matchType = typeFilter === 'all' || r.room_type_id === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  // Status counts
  const statusCounts = rooms.reduce<Record<string, number>>((acc, r) => {
    acc[r.operational_status] = (acc[r.operational_status] || 0) + 1;
    return acc;
  }, {});

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Status Summary */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
              className={cn(
                'rounded-[0.625rem] border p-3 text-center transition-all duration-200 hover:shadow-md',
                statusFilter === key ? 'ring-2 ring-primary shadow-md' : '',
                config.color
              )}
            >
              <Icon size={16} className="mx-auto mb-1" />
              <p className="text-lg font-semibold">{statusCounts[key] || 0}</p>
              <p className="text-[10px]">{config.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search rooms..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {roomTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBulkAdd(true)} className="gap-1.5">
            <Plus size={14} /> Bulk Add
          </Button>
          <Button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }} className="gap-1.5">
            <Plus size={14} /> Add Room
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} rooms</p>

      {filtered.length === 0 ? (
        <EmptyState icon={DoorOpen} title="No rooms found" description="Add individual rooms to enable room-level management, timeline view, and housekeeping." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(room => {
            const config = STATUS_CONFIG[room.operational_status] || STATUS_CONFIG.available;
            const Icon = config.icon;
            return (
              <div key={room.id} className={cn('rounded-[0.625rem] border p-4 transition-all duration-200 hover:shadow-md', config.color)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-background/80 flex items-center justify-center shadow-sm">
                      <Icon size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Room {room.room_number}</p>
                      {room.floor && <p className="text-[10px] text-muted-foreground">Floor {room.floor}</p>}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{room.room_types?.name || '—'}</p>

                {/* Status actions */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {room.operational_status === 'available' && (
                    <>
                      <Button size="sm" variant="outline" className="text-[10px] h-6 px-2" onClick={() => updateStatus(room.id, 'maintenance')}>Maintenance</Button>
                      <Button size="sm" variant="outline" className="text-[10px] h-6 px-2" onClick={() => updateStatus(room.id, 'out_of_service')}>Out of Service</Button>
                    </>
                  )}
                  {room.operational_status === 'dirty' && (
                    <Button size="sm" variant="outline" className="text-[10px] h-6 px-2 gap-1" onClick={() => updateStatus(room.id, 'cleaning')}>
                      <Sparkles size={10} /> Start Cleaning
                    </Button>
                  )}
                  {room.operational_status === 'cleaning' && (
                    <Button size="sm" variant="outline" className="text-[10px] h-6 px-2 gap-1 text-green-600" onClick={() => updateStatus(room.id, 'available')}>
                      <CheckCircle2 size={10} /> Mark Clean
                    </Button>
                  )}
                  {(room.operational_status === 'maintenance' || room.operational_status === 'out_of_service') && (
                    <Button size="sm" variant="outline" className="text-[10px] h-6 px-2 gap-1" onClick={() => updateStatus(room.id, 'available')}>
                      <CheckCircle2 size={10} /> Available
                    </Button>
                  )}
                </div>

                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="flex-1 text-[10px] h-7" onClick={() => { setEditing(room.id); setForm({ room_number: room.room_number, floor: room.floor || '', room_type_id: room.room_type_id, notes: room.notes || '' }); setShowForm(true); }}>
                    <Pencil size={10} className="mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30 text-[10px] h-7" onClick={() => setDeleteId(room.id)}>
                    <Trash2 size={10} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Room Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Edit Room' : 'Add Room'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Room Number *</Label><Input value={form.room_number} onChange={e => setForm(f => ({ ...f, room_number: e.target.value }))} placeholder="e.g. 101" /></div>
            <div><Label>Floor</Label><Input value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} placeholder="e.g. 1" /></div>
            <div>
              <Label>Room Type *</Label>
              <Select value={form.room_type_id} onValueChange={v => setForm(f => ({ ...f, room_type_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{roomTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Room'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={showBulkAdd} onOpenChange={setShowBulkAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Bulk Add Rooms</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Room Type *</Label>
              <Select value={bulkForm.room_type_id} onValueChange={v => setBulkForm(f => ({ ...f, room_type_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{roomTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Prefix</Label><Input value={bulkForm.prefix} onChange={e => setBulkForm(f => ({ ...f, prefix: e.target.value }))} placeholder="e.g. R" /></div>
              <div><Label>Start #</Label><Input type="number" min={1} value={bulkForm.start} onChange={e => setBulkForm(f => ({ ...f, start: parseInt(e.target.value) || 1 }))} /></div>
              <div><Label>Count</Label><Input type="number" min={1} max={50} value={bulkForm.count} onChange={e => setBulkForm(f => ({ ...f, count: parseInt(e.target.value) || 1 }))} /></div>
            </div>
            <div><Label>Floor</Label><Input value={bulkForm.floor} onChange={e => setBulkForm(f => ({ ...f, floor: e.target.value }))} /></div>
            <p className="text-xs text-muted-foreground">
              Will create: {Array.from({ length: Math.min(bulkForm.count, 5) }, (_, i) => `${bulkForm.prefix}${bulkForm.start + i}`).join(', ')}
              {bulkForm.count > 5 && ` ... (${bulkForm.count} total)`}
            </p>
            <Button onClick={handleBulkAdd} disabled={saving} className="w-full">{saving ? 'Adding...' : `Add ${bulkForm.count} Rooms`}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this room?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminRooms;
