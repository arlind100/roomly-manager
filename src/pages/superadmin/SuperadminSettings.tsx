import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SuperadminSettings() {
  const [trialDays, setTrialDays] = useState(14);
  const [starterPrice, setStarterPrice] = useState(89);
  const [businessPrice, setBusinessPrice] = useState(149);
  const [premiumPrice, setPremiumPrice] = useState(229);
  const [defaultCheckIn, setDefaultCheckIn] = useState('14:00');
  const [defaultCheckOut, setDefaultCheckOut] = useState('11:00');
  const [defaultTax, setDefaultTax] = useState(10);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    // These are stored client-side as platform defaults (could be in a platform_settings table)
    localStorage.setItem('roomly_sa_defaults', JSON.stringify({
      trialDays, starterPrice, businessPrice, premiumPrice,
      defaultCheckIn, defaultCheckOut, defaultTax,
    }));
    setTimeout(() => {
      setSaving(false);
      toast.success('Platform defaults saved');
    }, 500);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold">Platform Settings</h2>

      <Card className="rounded-[0.625rem] border-border/60 shadow-card">
        <CardHeader><CardTitle className="text-base">Platform Defaults</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Default Trial Duration (days)</Label><Input type="number" value={trialDays} onChange={e => setTrialDays(+e.target.value)} /></div>
            <div />
            <div><Label>Starter Price (€)</Label><Input type="number" value={starterPrice} onChange={e => setStarterPrice(+e.target.value)} /></div>
            <div><Label>Business Price (€)</Label><Input type="number" value={businessPrice} onChange={e => setBusinessPrice(+e.target.value)} /></div>
            <div><Label>Premium Price (€)</Label><Input type="number" value={premiumPrice} onChange={e => setPremiumPrice(+e.target.value)} /></div>
            <div />
            <div><Label>Default Check-In Time</Label><Input type="time" value={defaultCheckIn} onChange={e => setDefaultCheckIn(e.target.value)} /></div>
            <div><Label>Default Check-Out Time</Label><Input type="time" value={defaultCheckOut} onChange={e => setDefaultCheckOut(e.target.value)} /></div>
            <div><Label>Default Tax %</Label><Input type="number" value={defaultTax} onChange={e => setDefaultTax(+e.target.value)} /></div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-[hsl(263,70%,50%)] to-[hsl(280,80%,60%)]">
            {saving ? <><Loader2 size={14} className="animate-spin mr-2" /> Saving...</> : 'Save Defaults'}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-[0.625rem] border-border/60 shadow-card">
        <CardHeader><CardTitle className="text-base">Security</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Superadmin credentials are stored as Supabase Edge Function secrets (SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD).
            To change them, update the secrets in the Supabase dashboard under Edge Functions settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
