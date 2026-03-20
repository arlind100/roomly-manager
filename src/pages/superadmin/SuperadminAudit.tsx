import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function SuperadminAudit() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState('all');
  const [search, setSearch] = useState('');
  const pageSize = 50;

  useEffect(() => { fetchLogs(); }, [page, actionFilter]);

  const fetchLogs = async () => {
    let query = supabase.from('superadmin_audit_log').select('*', { count: 'exact' }).order('performed_at', { ascending: false });
    if (actionFilter !== 'all') query = query.eq('action', actionFilter);
    const { data, count } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
    setLogs(data || []);
    setTotal(count || 0);
  };

  const filtered = search
    ? logs.filter(l => l.target_hotel_name?.toLowerCase().includes(search.toLowerCase()) || l.action.includes(search.toLowerCase()))
    : logs;

  const actions = ['hotel_created', 'hotel_suspended', 'hotel_reactivated', 'hotel_deleted', 'hotel_settings_updated', 'password_reset', 'plan_changed', 'payment_recorded', 'superadmin_login', 'superadmin_logout'];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Audit Log</h2>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by hotel name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Action type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actions.map(a => <SelectItem key={a} value={a}>{a.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="rounded-[0.625rem] border-border/60 shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium">Action</th>
                  <th className="text-left p-3 font-medium">Hotel</th>
                  <th className="text-left p-3 font-medium">Details</th>
                  <th className="text-left p-3 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => (
                  <tr key={log.id} className="border-b border-border/40">
                    <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(263,70%,50%)/0.1] text-[hsl(263,70%,50%)] font-medium">{log.action.replace(/_/g, ' ')}</span></td>
                    <td className="p-3 font-medium">{log.target_hotel_name || '—'}</td>
                    <td className="p-3 text-muted-foreground text-xs max-w-[300px] truncate">{log.details ? JSON.stringify(log.details) : '—'}</td>
                    <td className="p-3 text-muted-foreground text-xs">{format(parseISO(log.performed_at), 'MMM dd, yyyy HH:mm')}</td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No audit entries found. Logs are written by superadmin edge functions and may be restricted by RLS.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /> Prev</Button>
            <Button size="sm" variant="outline" disabled={(page + 1) * pageSize >= total} onClick={() => setPage(p => p + 1)}>Next <ChevronRight size={14} /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
