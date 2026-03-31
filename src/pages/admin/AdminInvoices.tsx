import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useHotel } from '@/hooks/useHotel';
import { displayPrice } from '@/lib/currency';
import { generateInvoicePdf } from '@/lib/generateInvoicePdf';
import { EmptyState } from '@/components/admin/EmptyState';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FileText, Plus, Download, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const AdminInvoices = () => {
  const { t } = useLanguage();
  const { hotel } = useHotel();
  const cur = hotel?.currency || 'USD';
  const [invoices, setInvoices] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [confirmResend, setConfirmResend] = useState<any>(null);
  const [form, setForm] = useState({ reservation_id: '', amount: 0, status: 'draft' });
  const [creatingInv, setCreatingInv] = useState(false);

  useEffect(() => { if (hotel?.id) fetchData(); }, [hotel?.id, page]);

  const fetchData = async () => {
    if (!hotel?.id) return;
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const [invRes, resRes] = await Promise.all([
      supabase.from('invoices').select('*, reservations(guest_name, guest_email, guest_phone, reservation_code, check_in, check_out, guests_count, room_type_id, room_id, room_types(name), rooms(room_number))', { count: 'exact' }).eq('hotel_id', hotel.id).order('created_at', { ascending: false }).range(from, to),
      supabase.from('reservations').select('id, guest_name, reservation_code, total_price').eq('hotel_id', hotel.id).order('created_at', { ascending: false }).limit(500),
    ]);
    setInvoices(invRes.data || []);
    setTotalCount(invRes.count || 0);
    setReservations(resRes.data || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.reservation_id || !form.amount) { toast.error('Select reservation and amount'); return; }
    if (!hotel?.id) { toast.error('Hotel not loaded'); return; }
    setCreatingInv(true);
    // Check for existing invoice on this reservation
    const { data: existing } = await supabase.from('invoices').select('id').eq('reservation_id', form.reservation_id).neq('status', 'cancelled').limit(1);
    if (existing && existing.length > 0) {
      toast.error('An invoice already exists for this reservation');
      setCreatingInv(false);
      return;
    }
    const { error } = await supabase.from('invoices').insert({ hotel_id: hotel.id, ...form });
    setCreatingInv(false);
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

  const buildInvoiceData = (inv: any) => ({
    invoiceNumber: inv.invoice_number,
    issuedAt: inv.issued_at || inv.created_at,
    dueAt: inv.due_at || '',
    hotelName: hotel?.name || 'Hotel',
    hotelAddress: hotel?.address || '',
    hotelEmail: hotel?.email || '',
    hotelPhone: hotel?.phone || '',
    hotelLogoUrl: hotel?.logo_url || '',
    guestName: inv.reservations?.guest_name || '—',
    guestEmail: inv.reservations?.guest_email || '',
    guestPhone: inv.reservations?.guest_phone || '',
    reservationCode: inv.reservations?.reservation_code || '',
    checkIn: inv.reservations?.check_in || '',
    checkOut: inv.reservations?.check_out || '',
    roomName: inv.reservations?.room_types?.name || '',
    roomNumber: inv.reservations?.rooms?.room_number || '',
    guestsCount: inv.reservations?.guests_count || 1,
    amount: Number(inv.amount),
    currency: cur,
    taxPercentage: hotel?.tax_percentage || 0,
    status: inv.status,
    cancellationPolicy: hotel?.cancellation_policy || '',
  });

  const handleDownload = (inv: any) => {
    const doc = generateInvoicePdf(buildInvoiceData(inv));
    doc.save(`${inv.invoice_number}.pdf`);
    toast.success(t('admin.invoiceDownloaded'));
  };

  const handleSendEmail = async (inv: any) => {
    const email = inv.reservations?.guest_email;
    if (!email) { toast.error('No guest email found'); return; }
    setSendingId(inv.id);
    try {
      const doc = generateInvoicePdf(buildInvoiceData(inv));
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const { error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          to_email: email,
          guest_name: inv.reservations?.guest_name || '',
          invoice_number: inv.invoice_number,
          amount: Number(inv.amount),
          currency: cur,
          hotel_name: hotel?.name || 'Hotel',
          pdf_base64: pdfBase64,
        },
      });
      if (error) throw error;
      toast.success(t('admin.invoiceSent'));
      if (inv.status === 'draft') updateStatus(inv.id, 'sent');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send email');
    }
    setSendingId(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">{totalCount} {t('admin.invoices').toLowerCase()}</p>
        <Button onClick={() => setShowCreate(true)}><Plus size={16} className="mr-1" /> {t('admin.createInvoice')}</Button>
      </div>

      {invoices.length === 0 ? (
        <EmptyState icon={FileText} title={t('admin.noInvoices')} description={t('admin.noInvoicesDesc')} />
      ) : (
        <div className="bg-card rounded-[0.625rem] border border-border/60 overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">{t('admin.invoiceNumber')}</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">{t('admin.guest')}</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium hidden md:table-cell">{t('admin.reservation')}</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">{t('admin.amount')}</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">{t('admin.status')}</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">{t('admin.actions')}</th>
              </tr></thead>
              <tbody>{invoices.map(inv => (
                <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-3 px-4 font-mono text-xs">{inv.invoice_number}</td>
                  <td className="py-3 px-4">{inv.reservations?.guest_name || '—'}</td>
                  <td className="py-3 px-4 hidden md:table-cell text-muted-foreground font-mono text-xs">{inv.reservations?.reservation_code || '—'}</td>
                  <td className="py-3 px-4 font-semibold">{displayPrice(Number(inv.amount), cur)}</td>
                  <td className="py-3 px-4"><StatusBadge status={inv.status} /></td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(inv)} title={t('admin.download')}><Download size={14} /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={sendingId === inv.id} onClick={() => {
                        if (inv.status === 'sent' || inv.status === 'paid') {
                          setConfirmResend(inv);
                        } else {
                          handleSendEmail(inv);
                        }
                      }} title={t('admin.sendEmail')}>
                        {sendingId === inv.id ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Send size={14} />}
                      </Button>
                      {inv.status === 'draft' && <Button variant="ghost" size="sm" className="text-xs" onClick={() => updateStatus(inv.id, 'sent')}>{t('admin.markSent')}</Button>}
                      {inv.status === 'sent' && <Button variant="ghost" size="sm" className="text-xs text-green-600" onClick={() => updateStatus(inv.id, 'paid')}>{t('admin.markPaid')}</Button>}
        </div>
        {totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
            <span className="text-xs text-muted-foreground">Page {page + 1} of {Math.ceil(totalCount / PAGE_SIZE)}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= totalCount} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('admin.createInvoice')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t('admin.reservation')}</Label>
              <Select value={form.reservation_id} onValueChange={v => {
                const res = reservations.find(r => r.id === v);
                setForm(f => ({...f, reservation_id: v, amount: Number(res?.total_price) || 0}));
              }}>
                <SelectTrigger><SelectValue placeholder={t('admin.selectReservation')} /></SelectTrigger>
                <SelectContent>{reservations.map(r => <SelectItem key={r.id} value={r.id}>{r.reservation_code} — {r.guest_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{t('admin.amount')}</Label><Input type="number" min={0} value={form.amount} onChange={e => setForm(f => ({...f, amount: parseFloat(e.target.value) || 0}))} /></div>
            <Button onClick={handleCreate} disabled={creatingInv} className="w-full gap-1.5">
              {creatingInv && <Loader2 size={14} className="animate-spin" />}
              {creatingInv ? 'Creating...' : t('admin.createInvoice')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminInvoices;
