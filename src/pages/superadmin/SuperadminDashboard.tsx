import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, TrendingUp, Clock, AlertTriangle, DollarSign, Plus } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';

export default function SuperadminDashboard() {
  const [hotels, setHotels] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [totalReservationsThisMonth, setTotalReservationsThisMonth] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: h } = await supabase.from('hotels').select('*');
    setHotels(h || []);

    // Fetch audit log (we use service key via edge fn, but for read we can try direct)
    // Since RLS blocks client, we'll show what we can
    const { data: logs } = await supabase.from('superadmin_audit_log').select('*').order('performed_at', { ascending: false }).limit(10);
    setAuditLog(logs || []);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const { count } = await supabase.from('reservations').select('*', { count: 'exact', head: true }).gte('created_at', monthStart);
    setTotalReservationsThisMonth(count || 0);
  };

  const activeHotels = hotels.filter(h => h.subscription_status === 'active');
  const trialHotels = hotels.filter(h => h.subscription_status === 'trial');
  const suspendedHotels = hotels.filter(h => h.subscription_status === 'suspended');
  const mrr = activeHotels.reduce((sum, h) => sum + (Number(h.monthly_price) || 0), 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const newThisMonth = hotels.filter(h => new Date(h.created_at) >= monthStart);

  const atRisk = hotels.filter(h => {
    if (h.subscription_status === 'suspended') return true;
    if (h.subscription_status === 'trial' && h.trial_ends_at) {
      const daysLeft = differenceInDays(parseISO(h.trial_ends_at), now);
      return daysLeft <= 7 && daysLeft >= 0;
    }
    if (h.last_login_at && differenceInDays(now, parseISO(h.last_login_at)) > 30) return true;
    return false;
  });

  const metrics = [
    { label: 'Total Hotels', value: hotels.length, icon: Building2, color: 'hsl(263,70%,50%)' },
    { label: 'Active Hotels', value: activeHotels.length, icon: Building2, color: 'hsl(142,71%,45%)' },
    { label: 'Trial Hotels', value: trialHotels.length, icon: Clock, color: 'hsl(217,91%,60%)' },
    { label: 'Suspended', value: suspendedHotels.length, icon: AlertTriangle, color: 'hsl(0,84%,60%)' },
    { label: 'Total MRR', value: `€${mrr.toFixed(0)}`, icon: DollarSign, color: 'hsl(263,70%,50%)' },
    { label: 'New This Month', value: newThisMonth.length, icon: Plus, color: 'hsl(142,71%,45%)' },
    { label: 'Reservations This Month', value: totalReservationsThisMonth, icon: TrendingUp, color: 'hsl(217,91%,60%)' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Platform Overview</h2>
        <Button onClick={() => navigate('/superadmin/hotels/new')} className="bg-gradient-to-r from-[hsl(263,70%,50%)] to-[hsl(280,80%,60%)] hover:brightness-110">
          <Plus size={16} className="mr-2" /> Onboard Hotel
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {metrics.map(m => (
          <Card key={m.label} className="rounded-[0.625rem] border-border/60 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <m.icon size={16} style={{ color: m.color }} />
                <span className="text-xs text-muted-foreground">{m.label}</span>
              </div>
              <p className="text-xl font-bold">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* At Risk */}
        <Card className="rounded-[0.625rem] border-border/60 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle size={16} className="text-destructive" /> Hotels at Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            {atRisk.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hotels at risk</p>
            ) : (
              <div className="space-y-2">
                {atRisk.map(h => (
                  <div key={h.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/40">
                    <div>
                      <p className="text-sm font-medium">{h.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {h.subscription_status === 'suspended' ? 'Suspended' :
                         h.subscription_status === 'trial' && h.trial_ends_at ? `Trial ends ${format(parseISO(h.trial_ends_at), 'MMM dd')}` :
                         'Inactive (no login 30+ days)'}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/superadmin/hotels/${h.id}`)}>View</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="rounded-[0.625rem] border-border/60 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {auditLog.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet. Audit logs are written by superadmin edge functions.</p>
            ) : (
              <div className="space-y-2">
                {auditLog.map(log => (
                  <div key={log.id} className="flex items-start gap-3 p-2">
                    <div className="w-2 h-2 rounded-full bg-[hsl(263,70%,50%)] mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{log.action.replace(/_/g, ' ')}</p>
                      {log.target_hotel_name && <p className="text-xs text-muted-foreground">{log.target_hotel_name}</p>}
                      <p className="text-xs text-muted-foreground">{format(parseISO(log.performed_at), 'MMM dd, yyyy HH:mm')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
