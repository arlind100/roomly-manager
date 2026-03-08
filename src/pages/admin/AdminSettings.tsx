import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const AdminSettings = () => {
  const [hotel, setHotel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchHotel(); }, []);

  const fetchHotel = async () => {
    const { data } = await supabase.from('hotels').select('*').limit(1).single();
    setHotel(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!hotel) return;
    setSaving(true);
    const { error } = await supabase.from('hotels').update({
      name: hotel.name,
      logo_url: hotel.logo_url,
      address: hotel.address,
      email: hotel.email,
      phone: hotel.phone,
      currency: hotel.currency,
      check_in_time: hotel.check_in_time,
      check_out_time: hotel.check_out_time,
      booking_policy: hotel.booking_policy,
      cancellation_policy: hotel.cancellation_policy,
      tax_percentage: hotel.tax_percentage,
      updated_at: new Date().toISOString(),
    }).eq('id', hotel.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Settings saved');
  };

  const update = (key: string, value: any) => setHotel((h: any) => ({ ...h, [key]: value }));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!hotel) return <div className="text-center text-muted-foreground py-12">No hotel configured.</div>;

  return (
    <div className="max-w-2xl space-y-8">
      {/* Hotel Info */}
      <section className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="font-display text-lg font-medium">Hotel Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Label>Hotel Name</Label><Input value={hotel.name} onChange={e => update('name', e.target.value)} className="bg-muted/50" /></div>
          <div className="sm:col-span-2"><Label>Logo URL</Label><Input value={hotel.logo_url || ''} onChange={e => update('logo_url', e.target.value)} className="bg-muted/50" placeholder="https://..." /></div>
          <div className="sm:col-span-2"><Label>Address</Label><Input value={hotel.address || ''} onChange={e => update('address', e.target.value)} className="bg-muted/50" /></div>
          <div><Label>Email</Label><Input type="email" value={hotel.email || ''} onChange={e => update('email', e.target.value)} className="bg-muted/50" /></div>
          <div><Label>Phone</Label><Input value={hotel.phone || ''} onChange={e => update('phone', e.target.value)} className="bg-muted/50" /></div>
        </div>
      </section>

      {/* Operations */}
      <section className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="font-display text-lg font-medium">Operations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><Label>Currency</Label><Input value={hotel.currency} onChange={e => update('currency', e.target.value)} className="bg-muted/50" /></div>
          <div><Label>Check-In Time</Label><Input type="time" value={hotel.check_in_time || ''} onChange={e => update('check_in_time', e.target.value)} className="bg-muted/50" /></div>
          <div><Label>Check-Out Time</Label><Input type="time" value={hotel.check_out_time || ''} onChange={e => update('check_out_time', e.target.value)} className="bg-muted/50" /></div>
        </div>
        <div><Label>Tax Percentage</Label><Input type="number" min={0} max={100} step={0.01} value={hotel.tax_percentage || 0} onChange={e => update('tax_percentage', parseFloat(e.target.value) || 0)} className="bg-muted/50 max-w-[200px]" /></div>
      </section>

      {/* Policies */}
      <section className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="font-display text-lg font-medium">Policies</h2>
        <div><Label>Booking Policy</Label><Textarea value={hotel.booking_policy || ''} onChange={e => update('booking_policy', e.target.value)} className="bg-muted/50" rows={3} /></div>
        <div><Label>Cancellation Policy</Label><Textarea value={hotel.cancellation_policy || ''} onChange={e => update('cancellation_policy', e.target.value)} className="bg-muted/50" rows={3} /></div>
      </section>

      <Button onClick={handleSave} disabled={saving} className="bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 font-body">
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
};

export default AdminSettings;
