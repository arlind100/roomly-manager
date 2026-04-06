import { useEffect, useState, useCallback } from 'react';
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
import { FileText, Plus, Download, Send, Loader2, Trash2, PlusCircle } from 'lucide-react';
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

  // Detail view
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [extras, setExtras] = useState<any[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(false);
  const [newExtra, setNewExtra] = useState({ description: '', quantity: 1, unit_price: 0 });
  const [addingExtra, setAddingExtra] = useState(false);
  const [deletingExtraId, setDeletingExtraId] = useState<string | null>(null);

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

  const fetchExtras = useCallback(async (invoiceId: string) => {
    if (!hotel?.id) return;
    setLoadingExtras(true);
    const { data } = await supabase.from('invoice_extras')
      .select('*')
      .eq('invoice_id', invoiceId)
      .eq('hotel_id', hotel.id)
      .order('created_at');
    setExtras(data || []);
    setLoadingExtras(false);
  }, [hotel?.id]);

  const openDetail = (inv: any) => {
    setSelectedInvoice(inv);
    fetchExtras(inv.id);
    setNewExtra({ description: '', quantity: 1, unit_price: 0 });
  };

  const handleAddExtra = async () => {
    if (!newExtra.description || !newExtra.unit_price) { toast.error('Description and price required'); return; }
    if (!hotel?.id || !selectedInvoice) return;
    setAddingExtra(true);
    const total = newExtra.quantity * newExtra.unit_price;
    const { error } = await supabase.from('invoice_extras').insert({
      hotel_id: hotel.id,
      invoice_id: selectedInvoice.id,
      description: newExtra.description,
      quantity: newExtra.quantity,
      unit_price: newExtra.unit_price,
      total,
    });
    setAddingExtra(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Extra added');
    setNewExtra({ description: '', quantity: 1, unit_price: 0 });
    fetchExtras(selectedInvoice.id);
    // Update invoice total
    await recalcInvoiceTotal(selectedInvoice.id);
  };

  const handleDeleteExtra = async (extraId: string) => {
    setDeletingExtraId(extraId);
    await supabase.from('invoice_extras').delete().eq('id', extraId);
    setDeletingExtraId(null);
    toast.success('Extra removed');
    if (selectedInvoice) {
      fetchExtras(selectedInvoice.id);
      await recalcInvoiceTotal(selectedInvoice.id);
    }
  };

  const recalcInvoiceTotal = async (invoiceId: string) => {
    if (!hotel?.id) return;
    // Get base reservation amount
    const inv = invoices.find(i => i.id === invoiceId) || selectedInvoice;
    const resPrice = Number(inv?.reservations?.total_price || inv?.amount || 0);
    // Get extras total
    const { data: extrasData } = await supabase.from('invoice_extras')
      .select('total')
      .eq('invoice_id', invoiceId);
    const extrasTotal = (extrasData || []).reduce((s: number, e: any) => s + Number(e.total), 0);
    const newTotal = resPrice + extrasTotal;
    await supabase.from('invoices').update({ amount: newTotal }).eq('id', invoiceId);
    // Update local state
    setInvoices(prev => prev.map(i => i.id === invoiceId ? { ...i, amount: newTotal } : i));
    if (selectedInvoice?.id === invoiceId) {
      setSelectedInvoice((prev: any) => prev ? { ...prev, amount: newTotal } : prev);
    }
  };

  const handleCreate = async () => {
    if (!form.reservation_id || !form.amount) { toast.error('Select reservation and amount'); return; }
    if (!hotel?.id) { toast.error('Hotel not loaded'); return; }
    setCreatingInv(true);
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

  const extrasTotal = extras.reduce((s, e) => s + Number(e.total), 0);
  const taxPercentage = hotel?.tax_percentage || 0;

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
        <div className="bg-card rounded-lg border border-border/60 overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-zebra">
              <thead><tr className="border-b border-border bg-muted/60">
                <th className="text-left py-3.5 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t('admin.invoiceNumber')}</th>
                <th className="text-left py-3.5 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t('admin.guest')}</th>
                <th className="text-left py-3.5 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden md:table-cell">{t('admin.reservation')}</th>
                <th className="text-left py-3.5 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t('admin.amount')}</th>
                <th className="text-left py-3.5 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t('admin.status')}</th>
                <th className="text-right py-3.5 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t('admin.actions')}</th>
              </tr></thead>
              <tbody>{invoices.map(inv => (
                <tr key={inv.id} className="border-b border-border/30 transition-colors cursor-pointer hover:bg-muted/30" onClick={() => openDetail(inv)}>
                  <td className="py-3 px-4 font-mono text-xs">{inv.invoice_number}</td>
                  <td className="py-3 px-4">{inv.reservations?.guest_name || '—'}</td>
                  <td className="py-3 px-4 hidden md:table-cell text-muted-foreground font-mono text-xs">{inv.reservations?.reservation_code || '—'}</td>
                  <td className="py-3 px-4 font-semibold">{displayPrice(Number(inv.amount), cur)}</td>
                  <td className="py-3 px-4"><StatusBadge status={inv.status} /></td>
                  <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
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
                      {(inv.status === 'sent' || inv.status === 'unpaid') && <Button variant="ghost" size="sm" className="text-xs text-green-600" onClick={() => updateStatus(inv.id, 'paid')}>{t('admin.markPaid')}</Button>}
                      {inv.status === 'paid' && <Button variant="ghost" size="sm" className="text-xs" onClick={() => updateStatus(inv.id, 'unpaid')}>Mark Unpaid</Button>}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
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
        </div>
      )}

      {/* Invoice Detail with Extras */}
      <Dialog open={!!selectedInvoice} onOpenChange={v => { if (!v) { setSelectedInvoice(null); setExtras([]); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Invoice {selectedInvoice?.invoice_number}</DialogTitle></DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-muted-foreground block">Guest</span>{selectedInvoice.reservations?.guest_name || '—'}</div>
                <div><span className="text-xs text-muted-foreground block">Reservation</span><span className="font-mono text-xs">{selectedInvoice.reservations?.reservation_code || '—'}</span></div>
                <div><span className="text-xs text-muted-foreground block">Status</span><StatusBadge status={selectedInvoice.status} /></div>
                <div><span className="text-xs text-muted-foreground block">Total</span><span className="font-semibold">{displayPrice(Number(selectedInvoice.amount), cur)}</span></div>
              </div>

              {/* Line Items */}
              <div className="border-t border-border pt-3">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">Line Items</h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30">
                    <span>Room charge</span>
                    <span className="font-medium">{displayPrice(Number(selectedInvoice.amount) - extrasTotal, cur)}</span>
                  </div>
                  {loadingExtras ? (
                    <div className="flex items-center gap-2 py-2 px-3"><Loader2 size={14} className="animate-spin" /> <span className="text-xs text-muted-foreground">Loading extras...</span></div>
                  ) : extras.map(extra => (
                    <div key={extra.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/20">
                      <div>
                        <span>{extra.description}</span>
                        {extra.quantity > 1 && <span className="text-xs text-muted-foreground ml-1">×{extra.quantity}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{displayPrice(Number(extra.total), cur)}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" disabled={deletingExtraId === extra.id} onClick={() => handleDeleteExtra(extra.id)}>
                          {deletingExtraId === extra.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Extra Inline */}
                <div className="mt-3 border border-dashed border-border/60 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><PlusCircle size={12} /> Add Extra Charge</p>
                  <div className="grid grid-cols-4 gap-2">
                    <Input className="col-span-2 h-8 text-xs" placeholder="Description" value={newExtra.description} onChange={e => setNewExtra(f => ({ ...f, description: e.target.value }))} />
                    <Input className="h-8 text-xs" type="number" min={1} placeholder="Qty" value={newExtra.quantity} onChange={e => setNewExtra(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} />
                    <Input className="h-8 text-xs" type="number" min={0} step={0.01} placeholder="Price" value={newExtra.unit_price || ''} onChange={e => setNewExtra(f => ({ ...f, unit_price: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  {newExtra.description && newExtra.unit_price > 0 && (
                    <p className="text-[10px] text-muted-foreground">Total: {displayPrice(newExtra.quantity * newExtra.unit_price, cur)}</p>
                  )}
                  <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1" onClick={handleAddExtra} disabled={addingExtra}>
                    {addingExtra ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    Add
                  </Button>
                </div>
              </div>

              {/* Tax Summary */}
              {taxPercentage > 0 && (
                <div className="border-t border-border pt-3 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{displayPrice(Number(selectedInvoice.amount), cur)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Tax ({taxPercentage}%)</span>
                    <span>{displayPrice(Number(selectedInvoice.amount) * taxPercentage / 100, cur)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Grand Total</span>
                    <span>{displayPrice(Number(selectedInvoice.amount) * (1 + taxPercentage / 100), cur)}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-1.5 flex-wrap pt-2">
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => handleDownload(selectedInvoice)}>
                  <Download size={12} /> Download PDF
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1" disabled={sendingId === selectedInvoice.id} onClick={() => handleSendEmail(selectedInvoice)}>
                  {sendingId === selectedInvoice.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send Email
                </Button>
                {selectedInvoice.status !== 'paid' && (
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1 text-green-600" onClick={() => { updateStatus(selectedInvoice.id, 'paid'); setSelectedInvoice((p: any) => p ? { ...p, status: 'paid' } : p); }}>
                    Mark Paid
                  </Button>
                )}
                {selectedInvoice.status === 'paid' && (
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => { updateStatus(selectedInvoice.id, 'unpaid'); setSelectedInvoice((p: any) => p ? { ...p, status: 'unpaid' } : p); }}>
                    Mark Unpaid
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

      {/* Resend Confirmation */}
      <AlertDialog open={!!confirmResend} onOpenChange={v => { if (!v) setConfirmResend(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              Invoice <strong>{confirmResend?.invoice_number}</strong> has already been sent. Are you sure you want to send it again?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { handleSendEmail(confirmResend); setConfirmResend(null); }}>Send Again</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminInvoices;
