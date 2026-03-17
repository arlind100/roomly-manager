import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useHotel } from '@/hooks/useHotel';
import { displayPrice } from '@/lib/currency';
import { EmptyState } from '@/components/admin/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BedDouble, Plus, Pencil, Trash2, Users, Maximize, Eye, EyeOff, Upload, X, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import roomStandard from '@/assets/room-standard.jpg';
import roomDeluxe from '@/assets/room-deluxe.jpg';
import roomSuite from '@/assets/room-suite.jpg';
import roomFamily from '@/assets/room-family.jpg';

const FALLBACK_MAP: Record<string, string> = {
  standard: roomStandard, classic: roomStandard, single: roomStandard, double: roomStandard,
  deluxe: roomDeluxe, superior: roomDeluxe, premium: roomDeluxe,
  suite: roomSuite, presidential: roomSuite, executive: roomSuite, penthouse: roomSuite,
  family: roomFamily, twin: roomFamily,
};

function getRoomFallbackImage(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, img] of Object.entries(FALLBACK_MAP)) {
    if (lower.includes(key)) return img;
  }
  return roomStandard;
}

const SUPABASE_URL = "https://qdxtmdyagsxtvtjaxqou.supabase.co";

const emptyForm = { name: '', description: '', max_guests: 2, base_price: 0, weekend_price: null as number | null, available_units: 1, amenities: '', room_size: '', image_url: '', show_on_website: true };

const AdminRoomTypes = () => {
  const { t } = useLanguage();
  const { hotel } = useHotel();
  const cur = hotel?.currency || 'USD';
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchRoomTypes(); }, []);

  const fetchRoomTypes = async () => {
    const { data } = await supabase.from('room_types').select('*').order('base_price');
    setRoomTypes(data || []);
    setLoading(false);
  };

  const openEdit = (rt: any) => {
    setEditing(rt.id);
    setForm({ name: rt.name, description: rt.description || '', max_guests: rt.max_guests, base_price: Number(rt.base_price), weekend_price: rt.weekend_price ? Number(rt.weekend_price) : null, available_units: rt.available_units, amenities: (rt.amenities || []).join(', '), room_size: rt.room_size || '', image_url: rt.image_url || '', show_on_website: rt.show_on_website ?? true });
    setShowForm(true);
  };

  // Upload image to Supabase Storage
  const uploadImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = `room-types/${fileName}`;

    const { error } = await supabase.storage.from('room-images').upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

    setUploading(false);

    if (error) {
      toast.error('Upload failed: ' + error.message);
      return;
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/room-images/${filePath}`;
    setForm(f => ({ ...f, image_url: publicUrl }));
    toast.success('Image uploaded');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadImage(file);
  }, [uploadImage]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [uploadImage]);

  const removeImage = () => setForm(f => ({ ...f, image_url: '' }));

  const handleSave = async () => {
    if (!form.name || !form.base_price) { toast.error('Name and price required'); return; }
    setSaving(true);
    const h = (await supabase.from('hotels').select('id').limit(1).maybeSingle()).data;
    const payload = { hotel_id: h?.id, name: form.name, description: form.description || null, max_guests: form.max_guests, base_price: form.base_price, weekend_price: form.weekend_price || null, available_units: form.available_units, amenities: form.amenities ? form.amenities.split(',').map(s => s.trim()).filter(Boolean) : [], room_size: form.room_size || null, image_url: form.image_url || null, show_on_website: form.show_on_website };
    const { error } = editing ? await supabase.from('room_types').update(payload).eq('id', editing) : await supabase.from('room_types').insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? 'Room type updated' : 'Room type created');
    setShowForm(false); setEditing(null); setForm(emptyForm);
    fetchRoomTypes();
  };

  const toggleVisibility = async (id: string, current: boolean) => {
    const { error } = await supabase.from('room_types').update({ show_on_website: !current }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(!current ? t('admin.visibleOnWebsite') : t('admin.hiddenFromWebsite'));
    fetchRoomTypes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.deleteRoomType'))) return;
    const { error } = await supabase.from('room_types').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Room type deleted');
    fetchRoomTypes();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{roomTypes.length} {t('admin.roomTypes').toLowerCase()}</p>
        <Button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }}><Plus size={16} className="mr-1" /> {t('admin.addRoomType')}</Button>
      </div>

      {roomTypes.length === 0 ? (
        <EmptyState icon={BedDouble} title={t('admin.noRoomTypesTitle')} description={t('admin.noRoomTypesDesc')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {roomTypes.map(rt => (
            <div key={rt.id} className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="h-40 bg-muted relative">
                {(rt.image_url || getRoomFallbackImage(rt.name) !== roomStandard) ? (
                  <img src={rt.image_url || getRoomFallbackImage(rt.name)} alt={rt.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                    <BedDouble size={32} className="mb-1 opacity-40" />
                    <span className="text-xs opacity-50">No image</span>
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{rt.name}</h3>
                  <span className="text-primary font-semibold">{displayPrice(Number(rt.base_price), cur)}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{rt.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1"><Users size={12} /> {rt.max_guests} {t('admin.guests').toLowerCase()}</span>
                  {rt.room_size && <span className="flex items-center gap-1"><Maximize size={12} /> {rt.room_size}</span>}
                  <span>{rt.available_units} {rt.available_units !== 1 ? t('admin.units') : t('admin.unit')}</span>
                </div>
                <button onClick={() => toggleVisibility(rt.id, rt.show_on_website)} className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full mb-4 transition-colors ${rt.show_on_website ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                  {rt.show_on_website ? <Eye size={10} /> : <EyeOff size={10} />}
                  {rt.show_on_website ? t('admin.visibleOnWebsite') : t('admin.hiddenFromWebsite')}
                </button>
                {rt.amenities?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {rt.amenities.slice(0, 4).map((a: string) => <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{a}</span>)}
                    {rt.amenities.length > 4 && <span className="text-[10px] text-muted-foreground">+{rt.amenities.length - 4}</span>}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(rt)} className="flex-1 text-xs"><Pencil size={12} className="mr-1" /> {t('admin.edit')}</Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(rt.id)} className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"><Trash2 size={12} /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? t('admin.editRoomType') : t('admin.newRoomType')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t('admin.roomName')} *</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
            <div><Label>{t('admin.description')}</Label><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={3} /></div>
            
            {/* Image Upload - Drag & Drop */}
            <div>
              <Label className="mb-2 block">Room Image</Label>
              {form.image_url ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img src={form.image_url} alt="Room preview" className="w-full h-40 object-cover" />
                  <button
                    onClick={removeImage}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/90 border border-border shadow-sm flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'relative flex flex-col items-center justify-center h-36 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
                    dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30',
                    uploading && 'pointer-events-none opacity-60'
                  )}
                >
                  {uploading ? (
                    <>
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-xs text-muted-foreground">Uploading...</p>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-2">
                        <ImageIcon size={20} className="text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <span className="text-primary font-medium">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG, WebP up to 5MB</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t('admin.basePrice')} *</Label><Input type="number" min={0} value={form.base_price} onChange={e => setForm(f => ({...f, base_price: parseFloat(e.target.value) || 0}))} /></div>
              <div><Label>{t('admin.weekendPrice')}</Label><Input type="number" min={0} value={form.weekend_price || ''} onChange={e => setForm(f => ({...f, weekend_price: parseFloat(e.target.value) || null}))} placeholder="Optional" /></div>
              <div><Label>{t('admin.maxGuests')}</Label><Input type="number" min={1} value={form.max_guests} onChange={e => setForm(f => ({...f, max_guests: parseInt(e.target.value) || 1}))} /></div>
              <div><Label>{t('admin.availableUnits')}</Label><Input type="number" min={1} value={form.available_units} onChange={e => setForm(f => ({...f, available_units: parseInt(e.target.value) || 1}))} /></div>
              <div><Label>{t('admin.roomSize')}</Label><Input value={form.room_size} onChange={e => setForm(f => ({...f, room_size: e.target.value}))} placeholder="e.g. 45 m²" /></div>
            </div>
            <div><Label>{t('admin.amenitiesLabel')}</Label><Input value={form.amenities} onChange={e => setForm(f => ({...f, amenities: e.target.value}))} placeholder="WiFi, Pool, Spa" /></div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div><Label className="text-sm font-medium">{t('admin.showOnWebsite')}</Label><p className="text-xs text-muted-foreground">{t('admin.showOnWebsiteDesc')}</p></div>
              <Switch checked={form.show_on_website} onCheckedChange={v => setForm(f => ({...f, show_on_website: v}))} />
            </div>
            <Button onClick={handleSave} disabled={saving || uploading} className="w-full">{saving ? t('admin.saving') : editing ? t('admin.saveChanges') : t('admin.create')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRoomTypes;
