import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EmptyState } from '@/components/admin/EmptyState';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Plus, Download } from 'lucide-react';
import { toast } from 'sonner';

const AdminInvoices = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ reservation_id: '', amount: 0, status: 'draft' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [invRes, resRes] = await Promise.all([
      supabase.from('invoices').select('*, reservations(guest_name, reservation_code)').order('created_at', { ascending: false }),
      supabase.from('reservations').select('id, guest_name, reservation_code, total_price').order('created_at', { ascending: false }),
    ]);
    setInvoices(invRes.data || []);
    setReservations(resRes.data || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.reservation_id || !form.amount) { toast.error('Select reservation and amount'); return; }
    const hotel = (await supabase.from('hotels').select('id').limit(1).single()).data;
    const { error } = await supabase.from('invoices').insert({
      hotel_id: hotel?.id, ...form,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Invoice created');
    setShowCreate(false);
    setForm({ reservation_id: '', amount: 0, status: 'draft' });
    fetchData();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('invoices').update({ status }).eq('id', id);
    toast.success(`Invoice ${status}`);
    fetchData();
  };

  const handleDownload = (inv: any) => {
    // Placeholder: generate text receipt
    const content = `INVOICE ${inv.invoice_number}\n\nGuest: ${inv.reservations?.guest_name || '—'}\nReservation: ${inv.reservations?.reservation_code || '—'}\nAmount: $${Number(inv.amount)}\nStatus: ${inv.status}\nIssued: ${inv.issued_at?.split('T')[0]}\n\n--- Aurelia Grand ---`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${inv.invoice_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Invoice downloaded');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{invoices.length} invoices</p>
        <Button onClick={() => setShowCreate(true)} className="bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 font-body">
          <Plus size={16} className="mr-1" /> Create Invoice
        </Button>
      </div>

      {invoices.length === 0 ? (
        <EmptyState icon={FileText} title="No invoices" description="Create your first invoice from a reservation." />
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Invoice #</th>
                  <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Guest</th>
                  <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium hidden md:table-cell">Reservation</th>
                  <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Amount</th>
                  <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-b border-border/30 hover:bg-muted/10">
                    <td className="py-3 px-4 font-mono text-xs">{inv.invoice_number}</td>
                    <td className="py-3 px-4">{inv.reservations?.guest_name || '—'}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-muted-foreground font-mono text-xs">{inv.reservations?.reservation_code || '—'}</td>
                    <td className="py-3 px-4 font-semibold">${Number(inv.amount)}</td>
                    <td className="py-3 px-4"><StatusBadge status={inv.status} /></td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(inv)}>
                          <Download size={14} />
                        </Button>
                        {inv.status === 'draft' && (
                          <Button variant="ghost" size="sm" className="text-xs font-body" onClick={() => updateStatus(inv.id, 'sent')}>
                            Mark Sent
                          </Button>
                        )}
                        {inv.status === 'sent' && (
                          <Button variant="ghost" size="sm" className="text-xs font-body text-green-500" onClick={() => updateStatus(inv.id, 'paid')}>
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Create Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Reservation</Label>
              <Select value={form.reservation_id} onValueChange={v => {
                const res = reservations.find(r => r.id === v);
                setForm(f => ({...f, reservation_id: v, amount: Number(res?.total_price) || 0}));
              }}>
                <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Select reservation" /></SelectTrigger>
                <SelectContent>
                  {reservations.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.reservation_code} — {r.guest_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount</Label><Input type="number" min={0} value={form.amount} onChange={e => setForm(f => ({...f, amount: parseFloat(e.target.value) || 0}))} className="bg-muted/50" /></div>
            <Button onClick={handleCreate} className="w-full bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 font-body">Create Invoice</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminInvoices;
