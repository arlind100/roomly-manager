import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EmptyState } from '@/components/admin/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DollarSign, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const AdminPricing = () => {
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ room_type_id: '', start_date: '', end_date: '', price: 0, label: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [rtRes, ovRes] = await Promise.all([
      supabase.from('room_types').select('*').order('base_price'),
      supabase.from('pricing_overrides').select('*, room_types(name)').order('start_date'),
    ]);
    setRoomTypes(rtRes.data || []);
    setOverrides(ovRes.data || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.room_type_id || !form.start_date || !form.end_date || !form.price) {
      toast.error('Fill all required fields'); return;
    }
    const hotel = (await supabase.from('hotels').select('id').limit(1).single()).data;
    const { error } = await supabase.from('pricing_overrides').insert({
      hotel_id: hotel?.id, ...form, price: form.price,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Pricing override added');
    setShowAdd(false);
    setForm({ room_type_id: '', start_date: '', end_date: '', price: 0, label: '' });
    fetchData();
  };

  const deleteOverride = async (id: string) => {
    await supabase.from('pricing_overrides').delete().eq('id', id);
    toast.success('Override removed');
    fetchData();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Base Pricing */}
      <div>
        <h2 className="font-display text-lg font-medium mb-4">Base Pricing</h2>
        {roomTypes.length === 0 ? (
          <EmptyState icon={DollarSign} title="No room types" description="Add room types to manage pricing." />
        ) : (
          <div className="glass-card rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Room Type</th>
                  <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Base Price</th>
                  <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium hidden md:table-cell">Weekend Price</th>
                  <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium hidden md:table-cell">Units</th>
                </tr>
              </thead>
              <tbody>
                {roomTypes.map(rt => (
                  <tr key={rt.id} className="border-b border-border/30">
                    <td className="py-3 px-4 font-medium">{rt.name}</td>
                    <td className="py-3 px-4 text-primary font-semibold">${Number(rt.base_price)}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{rt.weekend_price ? `$${Number(rt.weekend_price)}` : '—'}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{rt.available_units}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Custom Overrides */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-medium">Date Range Overrides</h2>
          <Button onClick={() => setShowAdd(true)} variant="outline" className="font-body">
            <Plus size={16} className="mr-1" /> Add Override
          </Button>
        </div>
        {overrides.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center text-sm text-muted-foreground">No pricing overrides set.</div>
        ) : (
          <div className="glass-card rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Room</th>
                  <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Period</th>
                  <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Price</th>
                  <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium hidden md:table-cell">Label</th>
                  <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {overrides.map(o => (
                  <tr key={o.id} className="border-b border-border/30">
                    <td className="py-3 px-4">{o.room_types?.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{o.start_date} → {o.end_date}</td>
                    <td className="py-3 px-4 text-primary font-semibold">${Number(o.price)}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{o.label || '—'}</td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteOverride(o.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Add Pricing Override</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Room Type</Label>
              <Select value={form.room_type_id} onValueChange={v => setForm(f => ({...f, room_type_id: v}))}>
                <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent>{roomTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} className="bg-muted/50" /></div>
              <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} className="bg-muted/50" /></div>
            </div>
            <div><Label>Override Price</Label><Input type="number" min={0} value={form.price} onChange={e => setForm(f => ({...f, price: parseFloat(e.target.value) || 0}))} className="bg-muted/50" /></div>
            <div><Label>Label (optional)</Label><Input value={form.label} onChange={e => setForm(f => ({...f, label: e.target.value}))} className="bg-muted/50" placeholder="Peak season, holiday, etc." /></div>
            <Button onClick={handleAdd} className="w-full bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 font-body">Add Override</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPricing;
