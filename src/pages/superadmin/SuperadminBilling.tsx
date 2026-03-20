import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, CreditCard, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function SuperadminBilling() {
  const [hotels, setHotels] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    supabase.from('hotels').select('*').order('name').then(({ data }) => setHotels(data || []));
  }, []);

  const activeHotels = hotels.filter(h => h.subscription_status === 'active');
  const mrr = activeHotels.reduce((sum, h) => sum + (Number(h.monthly_price) || 0), 0);
  const trialCount = hotels.filter(h => h.subscription_status === 'trial').length;

  const filtered = hotels.filter(h => {
    if (filter === 'all') return true;
    if (filter === 'active') return h.subscription_status === 'active';
    if (filter === 'trial') return h.subscription_status === 'trial';
    if (filter === 'suspended') return h.subscription_status === 'suspended';
    return true;
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Billing Overview</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="rounded-[0.625rem] border-border/60 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><DollarSign size={16} className="text-[hsl(263,70%,50%)]" /><span className="text-xs text-muted-foreground">Current MRR</span></div>
            <p className="text-xl font-bold">€{mrr.toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[0.625rem] border-border/60 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><CreditCard size={16} className="text-emerald-500" /><span className="text-xs text-muted-foreground">Active Subscriptions</span></div>
            <p className="text-xl font-bold">{activeHotels.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[0.625rem] border-border/60 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><AlertTriangle size={16} className="text-blue-500" /><span className="text-xs text-muted-foreground">Trial Hotels</span></div>
            <p className="text-xl font-bold">{trialCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[0.625rem] border-border/60 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><AlertTriangle size={16} className="text-destructive" /><span className="text-xs text-muted-foreground">Suspended</span></div>
            <p className="text-xl font-bold">{hotels.filter(h => h.subscription_status === 'suspended').length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3 items-center">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Hotels</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="rounded-[0.625rem] border-border/60 shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium">Hotel</th>
                  <th className="text-left p-3 font-medium">Plan</th>
                  <th className="text-left p-3 font-medium">Monthly</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(h => (
                  <tr key={h.id} className="border-b border-border/40">
                    <td className="p-3 font-medium">{h.name}</td>
                    <td className="p-3 text-muted-foreground capitalize">{h.subscription_plan || 'starter'}</td>
                    <td className="p-3">€{Number(h.monthly_price || 89).toFixed(0)}</td>
                    <td className="p-3 capitalize">{h.subscription_status || 'trial'}</td>
                    <td className="p-3 text-muted-foreground text-xs">{format(parseISO(h.created_at), 'MMM dd, yyyy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
