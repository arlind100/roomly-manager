import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Plus, Search, Eye } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  trial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const planColors: Record<string, string> = {
  starter: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  business: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  premium: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function SuperadminHotels() {
  const [hotels, setHotels] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => { fetchHotels(); }, []);

  const fetchHotels = async () => {
    const { data } = await supabase.from('hotels').select('*').order('created_at', { ascending: false });
    setHotels(data || []);
  };

  const filtered = hotels.filter(h => {
    if (search && !h.name.toLowerCase().includes(search.toLowerCase()) && !h.email?.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && h.subscription_status !== statusFilter) return false;
    if (planFilter !== 'all' && h.subscription_plan !== planFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold">Hotels</h2>
        <Button onClick={() => navigate('/superadmin/hotels/new')} className="bg-gradient-to-r from-[hsl(263,70%,50%)] to-[hsl(280,80%,60%)] hover:brightness-110">
          <Plus size={16} className="mr-2" /> Create Hotel
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Plan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="rounded-[0.625rem] border-border/60 shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left p-3 font-medium">Hotel</th>
                  <th className="text-left p-3 font-medium">Plan</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Monthly</th>
                  <th className="text-left p-3 font-medium hidden lg:table-cell">Last Login</th>
                  <th className="text-left p-3 font-medium hidden lg:table-cell">Created</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(h => (
                  <tr key={h.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{h.name}</p>
                        <p className="text-xs text-muted-foreground">{h.email || h.address || '—'}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planColors[h.subscription_plan] || planColors.starter}`}>
                        {(h.subscription_plan || 'starter').charAt(0).toUpperCase() + (h.subscription_plan || 'starter').slice(1)}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[h.subscription_status] || statusColors.inactive}`}>
                        {(h.subscription_status || 'trial').charAt(0).toUpperCase() + (h.subscription_status || 'trial').slice(1)}
                        {h.subscription_status === 'trial' && h.trial_ends_at && (
                          <span className="ml-1">({differenceInDays(parseISO(h.trial_ends_at), new Date())}d left)</span>
                        )}
                      </span>
                    </td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">€{Number(h.monthly_price || 89).toFixed(0)}</td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground text-xs">
                      {h.last_login_at ? format(parseISO(h.last_login_at), 'MMM dd, yyyy') : 'Never'}
                    </td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground text-xs">
                      {format(parseISO(h.created_at), 'MMM dd, yyyy')}
                    </td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/superadmin/hotels/${h.id}`)}>
                        <Eye size={14} className="mr-1" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No hotels found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
