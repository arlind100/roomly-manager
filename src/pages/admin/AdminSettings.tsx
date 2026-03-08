import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { languageNames, type Language } from '@/i18n/translations';
import { Sun, Moon } from 'lucide-react';

const currencies = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
];

const AdminSettings = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useAdminTheme();
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
      name: hotel.name, logo_url: hotel.logo_url, address: hotel.address, email: hotel.email,
      phone: hotel.phone, currency: hotel.currency, check_in_time: hotel.check_in_time,
      check_out_time: hotel.check_out_time, booking_policy: hotel.booking_policy,
      cancellation_policy: hotel.cancellation_policy, tax_percentage: hotel.tax_percentage,
      updated_at: new Date().toISOString(),
    }).eq('id', hotel.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('admin.settingsSaved'));
  };

  const update = (key: string, value: any) => setHotel((h: any) => ({ ...h, [key]: value }));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!hotel) return <div className="text-center text-muted-foreground py-12">No hotel configured.</div>;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Appearance */}
      <section className="bg-card rounded-lg border border-border p-6 space-y-4">
        <h2 className="text-sm font-semibold">{t('admin.appearance')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>{t('admin.language')}</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(languageNames) as [Language, string][]).map(([code, name]) => (
                  <SelectItem key={code} value={code}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('admin.theme')}</Label>
            <div className="flex gap-2 mt-1.5">
              <Button variant={theme === 'light' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('light')} className="flex-1">
                <Sun size={14} className="mr-1.5" /> {t('admin.light')}
              </Button>
              <Button variant={theme === 'dark' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('dark')} className="flex-1">
                <Moon size={14} className="mr-1.5" /> {t('admin.dark')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Hotel Info */}
      <section className="bg-card rounded-lg border border-border p-6 space-y-4">
        <h2 className="text-sm font-semibold">{t('admin.hotelInfo')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Label>{t('admin.hotelName')}</Label><Input value={hotel.name} onChange={e => update('name', e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>{t('admin.logoUrl')}</Label><Input value={hotel.logo_url || ''} onChange={e => update('logo_url', e.target.value)} placeholder="https://..." /></div>
          <div className="sm:col-span-2"><Label>{t('admin.address')}</Label><Input value={hotel.address || ''} onChange={e => update('address', e.target.value)} /></div>
          <div><Label>{t('admin.email')}</Label><Input type="email" value={hotel.email || ''} onChange={e => update('email', e.target.value)} /></div>
          <div><Label>{t('admin.phone')}</Label><Input value={hotel.phone || ''} onChange={e => update('phone', e.target.value)} /></div>
        </div>
      </section>

      {/* Operations */}
      <section className="bg-card rounded-lg border border-border p-6 space-y-4">
        <h2 className="text-sm font-semibold">{t('admin.operations')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>{t('admin.currency')}</Label>
            <Select value={hotel.currency} onValueChange={v => update('currency', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {currencies.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>{t('admin.checkInTime')}</Label><Input type="time" value={hotel.check_in_time || ''} onChange={e => update('check_in_time', e.target.value)} /></div>
          <div><Label>{t('admin.checkOutTime')}</Label><Input type="time" value={hotel.check_out_time || ''} onChange={e => update('check_out_time', e.target.value)} /></div>
        </div>
        <div><Label>{t('admin.taxPercentage')}</Label><Input type="number" min={0} max={100} step={0.01} value={hotel.tax_percentage || 0} onChange={e => update('tax_percentage', parseFloat(e.target.value) || 0)} className="max-w-[200px]" /></div>
      </section>

      {/* Policies */}
      <section className="bg-card rounded-lg border border-border p-6 space-y-4">
        <h2 className="text-sm font-semibold">{t('admin.policies')}</h2>
        <div><Label>{t('admin.bookingPolicy')}</Label><Textarea value={hotel.booking_policy || ''} onChange={e => update('booking_policy', e.target.value)} rows={3} /></div>
        <div><Label>{t('admin.cancellationPolicy')}</Label><Textarea value={hotel.cancellation_policy || ''} onChange={e => update('cancellation_policy', e.target.value)} rows={3} /></div>
      </section>

      <Button onClick={handleSave} disabled={saving}>{saving ? t('admin.saving') : t('admin.saveSettings')}</Button>
    </div>
  );
};

export default AdminSettings;
