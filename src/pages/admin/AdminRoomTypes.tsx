import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EmptyState } from '@/components/admin/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BedDouble, Plus, Pencil, Trash2, Users, Maximize } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = {
  name: '', description: '', max_guests: 2, base_price: 0, weekend_price: null as number | null,
  available_units: 1, amenities: '' as string, room_size: '', image_url: '',
};

const AdminRoomTypes = () => {
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchRoomTypes(); }, []);

  const fetchRoomTypes = async () => {
    const { data } = await supabase.from('room_types').select('*').order('base_price');
    setRoomTypes(data || []);
    setLoading(false);
  };

  const openEdit = (rt: any) => {
    setEditing(rt.id);
    setForm({
      name: rt.name, description: rt.description || '', max_guests: rt.max_guests,
      base_price: Number(rt.base_price), weekend_price: rt.weekend_price ? Number(rt.weekend_price) : null,
      available_units: rt.available_units, amenities: (rt.amenities || []).join(', '),
      room_size: rt.room_size || '', image_url: rt.image_url || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.base_price) { toast.error('Name and price required'); return; }
    setSaving(true);
    const hotel = (await supabase.from('hotels').select('id').limit(1).single()).data;
    const payload = {
      hotel_id: hotel?.id,
      name: form.name,
      description: form.description || null,
      max_guests: form.max_guests,
      base_price: form.base_price,
      weekend_price: form.weekend_price || null,
      available_units: form.available_units,
      amenities: form.amenities ? form.amenities.split(',').map(s => s.trim()).filter(Boolean) : [],
      room_size: form.room_size || null,
      image_url: form.image_url || null,
    };

    const { error } = editing
      ? await supabase.from('room_types').update(payload).eq('id', editing)
      : await supabase.from('room_types').insert(payload);

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? 'Room type updated' : 'Room type created');
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
    fetchRoomTypes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this room type?')) return;
    const { error } = await supabase.from('room_types').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Room type deleted');
    fetchRoomTypes();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{roomTypes.length} room types</p>
        <Button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }} className="bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 font-body">
          <Plus size={16} className="mr-1" /> Add Room Type
        </Button>
      </div>

      {roomTypes.length === 0 ? (
        <EmptyState icon={BedDouble} title="No room types" description="Add your first room type to get started." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {roomTypes.map(rt => (
            <div key={rt.id} className="glass-card rounded-xl overflow-hidden">
              {rt.image_url && (
                <div className="h-40 bg-muted">
                  <img src={rt.image_url} alt={rt.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-display text-lg font-medium">{rt.name}</h3>
                  <span className="text-primary font-semibold text-lg">${Number(rt.base_price)}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{rt.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><Users size={12} /> {rt.max_guests} guests</span>
                  {rt.room_size && <span className="flex items-center gap-1"><Maximize size={12} /> {rt.room_size}</span>}
                  <span>{rt.available_units} unit{rt.available_units !== 1 ? 's' : ''}</span>
                </div>
                {rt.amenities?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {rt.amenities.slice(0, 4).map((a: string) => (
                      <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{a}</span>
                    ))}
                    {rt.amenities.length > 4 && <span className="text-[10px] text-muted-foreground">+{rt.amenities.length - 4}</span>}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(rt)} className="flex-1 font-body text-xs">
                    <Pencil size={12} className="mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(rt.id)} className="text-destructive border-destructive/30 hover:bg-destructive/10 font-body text-xs">
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editing ? 'Edit' : 'New'} Room Type</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="bg-muted/50" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="bg-muted/50" rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Base Price *</Label><Input type="number" min={0} value={form.base_price} onChange={e => setForm(f => ({...f, base_price: parseFloat(e.target.value) || 0}))} className="bg-muted/50" /></div>
              <div><Label>Weekend Price</Label><Input type="number" min={0} value={form.weekend_price || ''} onChange={e => setForm(f => ({...f, weekend_price: parseFloat(e.target.value) || null}))} className="bg-muted/50" placeholder="Optional" /></div>
              <div><Label>Max Guests</Label><Input type="number" min={1} value={form.max_guests} onChange={e => setForm(f => ({...f, max_guests: parseInt(e.target.value) || 1}))} className="bg-muted/50" /></div>
              <div><Label>Available Units</Label><Input type="number" min={1} value={form.available_units} onChange={e => setForm(f => ({...f, available_units: parseInt(e.target.value) || 1}))} className="bg-muted/50" /></div>
              <div><Label>Room Size</Label><Input value={form.room_size} onChange={e => setForm(f => ({...f, room_size: e.target.value}))} className="bg-muted/50" placeholder="e.g. 45 m²" /></div>
              <div><Label>Image URL</Label><Input value={form.image_url} onChange={e => setForm(f => ({...f, image_url: e.target.value}))} className="bg-muted/50" placeholder="https://..." /></div>
            </div>
            <div><Label>Amenities (comma-separated)</Label><Input value={form.amenities} onChange={e => setForm(f => ({...f, amenities: e.target.value}))} className="bg-muted/50" placeholder="WiFi, Pool, Spa" /></div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 font-body">
              {saving ? 'Saving...' : editing ? 'Update Room Type' : 'Create Room Type'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRoomTypes;
