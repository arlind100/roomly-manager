import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useHotel } from '@/hooks/useHotel';
import { displayPrice } from '@/lib/currency';
import { EmptyState } from '@/components/admin/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DollarSign, Plus, Trash2, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const AdminPricing = () => {
  const { t } = useLanguage();
  const { hotel } = useHotel();
  const cur = hotel?.currency || 'USD';
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEditPrice, setShowEditPrice] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [editPriceForm, setEditPriceForm] = useState({ base_price: 0, weekend_price: null as number | null });
  const [form, setForm] = useState({ room_type_id: '', start_date: '', end_date: '', price: 0, label: '' });
  const [addingSaving, setAddingSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => { if (hotel?.id) fetchData(); }, [hotel?.id]);

  const fetchData = async () => {
    if (!hotel?.id) return;
    const [rtRes, ovRes] = await Promise.all([
      supabase.from('room_types').select('*').eq('hotel_id', hotel.id).order('base_price'),
      supabase.from('pricing_overrides').select('*, room_types(name)').eq('hotel_id', hotel.id).order('start_date'),
    ]);
    setRoomTypes(rtRes.data || []);
    setOverrides(ovRes.data || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.room_type_id || !form.start_date || !form.end_date || !form.price) { toast.error('Fill all required fields'); return; }
    if (!hotel?.id) { toast.error('Hotel not loaded'); return; }
    setAddingSaving(true);
    // Check for overlapping active overrides
    const { data: overlapping } = await supabase.from('pricing_overrides')
      .select('id')
      .eq('hotel_id', hotel.id)
      .eq('room_type_id', form.room_type_id)
      .eq('is_active', true)
      .lte('start_date', form.end_date)
      .gte('end_date', form.start_date)
      .limit(1);
    if (overlapping && overlapping.length > 0) {
      toast.error('A pricing override already exists for this date range');
      setAddingSaving(false);
      return;
    }
    const { error } = await supabase.from('pricing_overrides').insert({ hotel_id: hotel.id, ...form });
    setAddingSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Pricing override added');
    setShowAdd(false);
    setForm({ room_type_id: '', start_date: '', end_date: '', price: 0, label: '' });
    fetchData();
  };

  const deleteOverride = async (id: string) => {
    setDeletingId(id);
    await supabase.from('pricing_overrides').delete().eq('id', id);
    setDeletingId(null);
    toast.success('Override removed');
    fetchData();
  };

  const toggleOverride = async (id: string, current: boolean) => {
    // If activating, check for overlapping active overrides
    if (!current) {
      const override = overrides.find(o => o.id === id);
      if (override) {
        const { data: overlapping } = await supabase.from('pricing_overrides')
          .select('id')
          .eq('hotel_id', hotel?.id)
          .eq('room_type_id', override.room_type_id)
          .eq('is_active', true)
          .neq('id', id)
          .lte('start_date', override.end_date)
          .gte('end_date', override.start_date)
          .limit(1);
        if (overlapping && overlapping.length > 0) {
          toast.error('Cannot activate — another override already covers this date range');
          return;
        }
      }
    }
    setTogglingId(id);
    await supabase.from('pricing_overrides').update({ is_active: !current }).eq('id', id);
    setTogglingId(null);
    toast.success(!current ? 'Override activated' : 'Override deactivated');
    fetchData();
  };

  const openEditPrice = (rt: any) => {
    setEditingRoom(rt);
    setEditPriceForm({ base_price: Number(rt.base_price), weekend_price: rt.weekend_price ? Number(rt.weekend_price) : null });
    setShowEditPrice(true);
  };

  const handleEditPrice = async () => {
    if (!editingRoom) return;
    setEditSaving(true);
    const { error } = await supabase.from('room_types').update({
      base_price: editPriceForm.base_price,
      weekend_price: editPriceForm.weekend_price,
    }).eq('id', editingRoom.id);
    setEditSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('admin.updatePrice'));
    setShowEditPrice(false);
    fetchData();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Base Pricing */}
      <div>
        <h2 className="text-sm font-semibold mb-4">{t('admin.basePricing')}</h2>
        {roomTypes.length === 0 ? (
          <EmptyState icon={DollarSign} title={t('admin.noRoomTypesTitle')} description={t('admin.noRoomTypesDesc')} />
        ) : (
          <div className="bg-card rounded-lg border border-border/60 overflow-hidden shadow-card">
            <table className="w-full text-sm table-zebra">
              <thead><tr className="border-b border-border bg-muted/60">
                <th className="text-left py-3.5 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t('admin.roomType')}</th>
                <th className="text-left py-3.5 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t('admin.basePrice')}</th>
                <th className="text-left py-3.5 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden md:table-cell">{t('admin.weekendPrice')}</th>
                <th className="text-left py-3.5 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden md:table-cell">{t('admin.availableUnits')}</th>
                <th className="text-right py-3.5 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t('admin.actions')}</th>
              </tr></thead>
              <tbody>{roomTypes.map(rt => (
                <tr key={rt.id} className="border-b border-border/30">
                  <td className="py-3 px-4 font-medium">{rt.name}</td>
                  <td className="py-3 px-4 text-primary font-semibold">{displayPrice(Number(rt.base_price), cur)}</td>
                  <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{rt.weekend_price ? displayPrice(Number(rt.weekend_price), cur) : '—'}</td>
                  <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{rt.available_units}</td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEditPrice(rt)}><Pencil size={14} className="mr-1" /> {t('admin.edit')}</Button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {/* Custom Overrides */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">{t('admin.dateRangeOverrides')}</h2>
          <Button variant="outline" onClick={() => setShowAdd(true)}><Plus size={16} className="mr-1" /> {t('admin.addOverride')}</Button>
        </div>
        {overrides.length === 0 ? (
          <div className="bg-card rounded-[0.625rem] border border-border/60 p-8 shadow-card text-center text-sm text-muted-foreground">{t('admin.noOverrides')}</div>
        ) : (
          <div className="bg-card rounded-lg border border-border/60 overflow-hidden shadow-card">
            <table className="w-full text-sm table-zebra">
              <thead><tr className="border-b border-border bg-muted/60">
                <th className="text-left py-3.5 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t('admin.room')}</th>
                <th className="text-left py-3.5 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t('admin.period')}</th>
                <th className="text-left py-3.5 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t('admin.totalPrice')}</th>
                <th className="text-left py-3.5 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden md:table-cell">{t('admin.label')}</th>
                <th className="text-center py-3.5 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t('admin.active')}</th>
                <th className="text-right py-3.5 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider"></th>
              </tr></thead>
              <tbody>{overrides.map(o => (
                <tr key={o.id} className={`border-b border-border/30 ${!o.is_active ? 'opacity-50' : ''}`}>
                  <td className="py-3 px-4">{o.room_types?.name}</td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {format(new Date(o.start_date + 'T00:00:00'), 'MMM dd, yyyy')} → {format(new Date(o.end_date + 'T00:00:00'), 'MMM dd, yyyy')}
                  </td>
                  <td className="py-3 px-4 text-primary font-semibold">{displayPrice(Number(o.price), cur)}</td>
                  <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{o.label || '—'}</td>
                  <td className="py-3 px-4 text-center"><Switch checked={o.is_active} disabled={togglingId === o.id} onCheckedChange={() => toggleOverride(o.id, o.is_active)} /></td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" disabled={deletingId === o.id} onClick={() => deleteOverride(o.id)}>
                      {deletingId === o.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </Button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Override Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('admin.addOverride')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t('admin.roomType')}</Label>
              <Select value={form.room_type_id} onValueChange={v => setForm(f => ({...f, room_type_id: v}))}>
                <SelectTrigger><SelectValue placeholder={t('admin.selectRoom')} /></SelectTrigger>
                <SelectContent>{roomTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t('admin.startDate')}</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} /></div>
              <div><Label>{t('admin.endDate')}</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} /></div>
            </div>
            <div><Label>{t('admin.overridePrice')}</Label><Input type="number" min={0} value={form.price} onChange={e => setForm(f => ({...f, price: parseFloat(e.target.value) || 0}))} /></div>
            <div><Label>{t('admin.labelOptional')}</Label><Input value={form.label} onChange={e => setForm(f => ({...f, label: e.target.value}))} placeholder="Peak season, holiday, etc." /></div>
            <Button onClick={handleAdd} disabled={addingSaving} className="w-full gap-1.5">
              {addingSaving && <Loader2 size={14} className="animate-spin" />}
              {addingSaving ? 'Adding...' : t('admin.addOverride')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Base Price Dialog */}
      <Dialog open={showEditPrice} onOpenChange={setShowEditPrice}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('admin.editPricing')} — {editingRoom?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t('admin.basePrice')}</Label><Input type="number" min={0} value={editPriceForm.base_price} onChange={e => setEditPriceForm(f => ({...f, base_price: parseFloat(e.target.value) || 0}))} /></div>
            <div><Label>{t('admin.weekendPrice')}</Label><Input type="number" min={0} value={editPriceForm.weekend_price || ''} onChange={e => setEditPriceForm(f => ({...f, weekend_price: parseFloat(e.target.value) || null}))} placeholder="Optional" /></div>
            <Button onClick={handleEditPrice} disabled={editSaving} className="w-full gap-1.5">
              {editSaving && <Loader2 size={14} className="animate-spin" />}
              {editSaving ? 'Saving...' : t('admin.updatePrice')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPricing;
