import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { superadminFetch } from '@/lib/superadmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Check, Copy, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const plans = [
  { value: 'starter', label: 'Starter', price: 89 },
  { value: 'business', label: 'Business', price: 149 },
  { value: 'premium', label: 'Premium', price: 229 },
];

function generatePassword(): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "#@!$%";
  const all = upper + lower + digits + special;
  let pw = "";
  pw += upper[Math.floor(Math.random() * upper.length)];
  pw += lower[Math.floor(Math.random() * lower.length)];
  pw += digits[Math.floor(Math.random() * digits.length)];
  pw += special[Math.floor(Math.random() * special.length)];
  for (let i = 4; i < 8; i++) pw += all[Math.floor(Math.random() * all.length)];
  return pw.split("").sort(() => Math.random() - 0.5).join("");
}

export default function CreateHotel() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createdHotelId, setCreatedHotelId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Step 1
  const [hotelName, setHotelName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Step 2
  const [plan, setPlan] = useState('starter');
  const [monthlyPrice, setMonthlyPrice] = useState(89);
  const [subscriptionStatus, setSubscriptionStatus] = useState('trial');
  const [trialEndsAt, setTrialEndsAt] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('11:00');
  const [taxPercentage, setTaxPercentage] = useState(10);
  const [cleaningDuration, setCleaningDuration] = useState(30);

  // Step 3
  const [generatedPassword] = useState(generatePassword());
  const [copied, setCopied] = useState(false);

  const handlePlanChange = (v: string) => {
    setPlan(v);
    const p = plans.find(p => p.value === v);
    if (p) setMonthlyPrice(p.price);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await superadminFetch('create-hotel-account', {
        hotelName, city, country, contactEmail, phone, description, websiteUrl,
        plan, monthlyPrice, subscriptionStatus,
        trialEndsAt: trialEndsAt || null,
        currency, checkInTime, checkOutTime, taxPercentage, cleaningDuration,
        generatedPassword,
      });
      setCreatedHotelId(result.hotel_id);
      toast.success('Hotel created successfully!');
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  const copyCredentials = () => {
    navigator.clipboard.writeText(`URL: /admin/login\nEmail: ${contactEmail}\nPassword: ${generatedPassword}`);
    setCopied(true);
    toast.success('Credentials copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">Onboard New Hotel</h2>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= s ? 'bg-[hsl(263,70%,50%)] text-white' : 'bg-muted text-muted-foreground'
            }`}>{s}</div>
            {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-[hsl(263,70%,50%)]' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card className="rounded-[0.625rem] border-border/60 shadow-card">
          <CardHeader><CardTitle>Hotel Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Label>Hotel Name *</Label><Input value={hotelName} onChange={e => setHotelName(e.target.value)} placeholder="Grand Hotel" /></div>
              <div><Label>City *</Label><Input value={city} onChange={e => setCity(e.target.value)} placeholder="Athens" /></div>
              <div><Label>Country *</Label><Input value={country} onChange={e => setCountry(e.target.value)} placeholder="Greece" /></div>
              <div className="col-span-2"><Label>Contact Email *</Label><Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="admin@hotel.com" /></div>
              <div><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+30..." /></div>
              <div><Label>Website URL</Label><Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://..." /></div>
              <div className="col-span-2"><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description..." rows={3} /></div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!hotelName || !city || !contactEmail} className="bg-gradient-to-r from-[hsl(263,70%,50%)] to-[hsl(280,80%,60%)]">
                Next <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="rounded-[0.625rem] border-border/60 shadow-card">
          <CardHeader><CardTitle>Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Plan</Label>
                <Select value={plan} onValueChange={handlePlanChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {plans.map(p => <SelectItem key={p.value} value={p.value}>{p.label} (€{p.price})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Monthly Price (€)</Label><Input type="number" value={monthlyPrice} onChange={e => setMonthlyPrice(+e.target.value)} /></div>
              <div>
                <Label>Status</Label>
                <Select value={subscriptionStatus} onValueChange={setSubscriptionStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {subscriptionStatus === 'trial' && (
                <div><Label>Trial End Date</Label><Input type="date" value={trialEndsAt} onChange={e => setTrialEndsAt(e.target.value)} /></div>
              )}
              <div>
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Check-In Time</Label><Input type="time" value={checkInTime} onChange={e => setCheckInTime(e.target.value)} /></div>
              <div><Label>Check-Out Time</Label><Input type="time" value={checkOutTime} onChange={e => setCheckOutTime(e.target.value)} /></div>
              <div><Label>Tax %</Label><Input type="number" value={taxPercentage} onChange={e => setTaxPercentage(+e.target.value)} /></div>
              <div><Label>Cleaning Duration (min)</Label><Input type="number" value={cleaningDuration} onChange={e => setCleaningDuration(+e.target.value)} /></div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft size={16} className="mr-2" /> Back</Button>
              <Button onClick={() => setStep(3)} className="bg-gradient-to-r from-[hsl(263,70%,50%)] to-[hsl(280,80%,60%)]">
                Next <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && !createdHotelId && (
        <Card className="rounded-[0.625rem] border-border/60 shadow-card">
          <CardHeader><CardTitle>Account Setup</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border/60 space-y-2">
              <p className="text-sm font-medium">Login Credentials</p>
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">URL:</span> /admin/login</p>
                <p><span className="text-muted-foreground">Email:</span> {contactEmail}</p>
                <p><span className="text-muted-foreground">Password:</span> <code className="bg-card px-2 py-0.5 rounded text-xs">{generatedPassword}</code></p>
              </div>
              <Button size="sm" variant="outline" onClick={copyCredentials}>
                {copied ? <><Check size={14} className="mr-1" /> Copied</> : <><Copy size={14} className="mr-1" /> Copy All</>}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">⚠️ Share these credentials securely with the hotel owner.</p>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft size={16} className="mr-2" /> Back</Button>
              <Button onClick={handleSubmit} disabled={loading} className="bg-gradient-to-r from-[hsl(263,70%,50%)] to-[hsl(280,80%,60%)]">
                {loading ? <><Loader2 size={16} className="animate-spin mr-2" /> Creating...</> : 'Create Hotel'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && createdHotelId && (
        <Card className="rounded-[0.625rem] border-border/60 shadow-card">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
              <Check size={32} className="text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold">Hotel Created Successfully!</h3>
            <p className="text-sm text-muted-foreground">The hotel account is ready. Share the credentials with the hotel owner.</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => { setStep(1); setCreatedHotelId(null); setHotelName(''); setContactEmail(''); }}>Create Another</Button>
              <Button onClick={() => navigate(`/superadmin/hotels/${createdHotelId}`)} className="bg-gradient-to-r from-[hsl(263,70%,50%)] to-[hsl(280,80%,60%)]">View Hotel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
