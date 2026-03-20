import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { superadminFetch, getSuperadminToken } from '@/lib/superadmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Copy, Check, Building2, CalendarDays, CreditCard, ScrollText, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, differenceInDays } from 'date-fns';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  trial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export default function HotelDetail() {
  const { hotelId } = useParams();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState<any>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [billingRecords, setBillingRecords] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  // Dialogs
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteNameInput, setDeleteNameInput] = useState('');
  const [resetPwOpen, setResetPwOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [copied, setCopied] = useState(false);

  // Billing modal
  const [addBillingOpen, setAddBillingOpen] = useState(false);
  const [billingForm, setBillingForm] = useState({ payment_date: '', amount: '', currency: 'EUR', payment_method: 'Bank Transfer', period_start: '', period_end: '', status: 'paid', notes: '' });

  // Edit settings
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => { fetchAll(); }, [hotelId]);

  const fetchAll = async () => {
    setLoading(true);
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://qdxtmdyagsxtvtjaxqou.supabase.co";
    const [{ data: h }, { data: r }, { data: b }] = await Promise.all([
      supabase.from('hotels').select('*').eq('id', hotelId).single(),
      supabase.from('reservations').select('*, room_types(name)').eq('hotel_id', hotelId!).order('created_at', { ascending: false }).limit(50),
      supabase.from('billing_records').select('*').eq('hotel_id', hotelId!).order('payment_date', { ascending: false }),
    ]);

    // Fetch audit logs via edge function (bypasses RLS)
    let auditData: any[] = [];
    const token = getSuperadminToken();
    if (token) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/read-audit-log?hotelId=${hotelId}&limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        auditData = json.data || [];
      } catch { /* ignore */ }
    }

    setHotel(h);
    setReservations(r || []);
    setBillingRecords(b || []);
    setAuditLogs(auditData);
    if (h) {
      setEditData(h);
      setBillingForm(prev => ({ ...prev, amount: String(h.monthly_price || 89) }));
    }
    setLoading(false);
  };

  const handleSuspend = async () => {
    setActionLoading('suspend');
    try {
      await superadminFetch('suspend-hotel', { hotelId, reason: suspendReason });
      toast.success('Hotel suspended');
      setSuspendOpen(false);
      fetchAll();
    } catch (e: any) { toast.error(e.message); }
    setActionLoading('');
  };

  const handleReactivate = async () => {
    setActionLoading('reactivate');
    try {
      await superadminFetch('reactivate-hotel', { hotelId });
      toast.success('Hotel reactivated');
      setReactivateOpen(false);
      fetchAll();
    } catch (e: any) { toast.error(e.message); }
    setActionLoading('');
  };

  const handleDelete = async () => {
    setActionLoading('delete');
    try {
      await superadminFetch('delete-hotel', { hotelId, hotelName: hotel.name });
      toast.success('Hotel deleted');
      navigate('/superadmin/hotels');
    } catch (e: any) { toast.error(e.message); }
    setActionLoading('');
  };

  const handleResetPassword = async () => {
    setActionLoading('reset');
    try {
      const result = await superadminFetch('reset-hotel-password', { hotelId });
      setNewPassword(result.password);
      toast.success('Password reset');
    } catch (e: any) { toast.error(e.message); }
    setActionLoading('');
  };

  const handleSaveSettings = async () => {
    setActionLoading('save');
    try {
      const { id, created_at, updated_at, ical_token, ...updates } = editData;
      await superadminFetch('update-hotel-settings', { hotelId, updates });
      toast.success('Settings saved');
      setEditMode(false);
      fetchAll();
    } catch (e: any) { toast.error(e.message); }
    setActionLoading('');
  };

  const handleAddBilling = async () => {
    setActionLoading('billing');
    try {
      await superadminFetch('update-hotel-settings', {
        hotelId,
        updates: {} // We insert billing directly
      });
      // Use supabase directly with service role via edge fn would be ideal
      // For now insert billing record directly (RLS allows no client writes but we try)
      // Actually billing_records has no write policy for clients - we need an edge function
      // Let's use the update-hotel-settings edge function to also handle billing
      toast.info('Billing record feature requires dedicated edge function. Coming soon.');
      setAddBillingOpen(false);
    } catch (e: any) { toast.error(e.message); }
    setActionLoading('');
  };

  if (loading) return <div className="flex justify-center p-12"><div className="spinner" /></div>;
  if (!hotel) return <div className="text-center p-12 text-muted-foreground">Hotel not found</div>;

  const resCount = reservations.length;
  const thisMonthRes = reservations.filter(r => new Date(r.created_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate('/superadmin/hotels')}><ArrowLeft size={16} /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{hotel.name}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[hotel.subscription_status] || ''}`}>
              {hotel.subscription_status?.charAt(0).toUpperCase() + hotel.subscription_status?.slice(1)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{hotel.address || hotel.email}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {hotel.subscription_status === 'suspended' ? (
            <Button size="sm" onClick={() => setReactivateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">Reactivate</Button>
          ) : (
            <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => setSuspendOpen(true)}>Suspend</Button>
          )}
          <Button size="sm" variant="outline" onClick={() => { setResetPwOpen(true); setNewPassword(''); }}>Reset Password</Button>
          <Button size="sm" variant="destructive" onClick={() => setDeleteStep(1)}>Delete</Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview"><Building2 size={14} className="mr-1" /> Overview</TabsTrigger>
          <TabsTrigger value="settings"><Settings size={14} className="mr-1" /> Settings</TabsTrigger>
          <TabsTrigger value="billing"><CreditCard size={14} className="mr-1" /> Billing</TabsTrigger>
          <TabsTrigger value="activity"><CalendarDays size={14} className="mr-1" /> Activity</TabsTrigger>
          <TabsTrigger value="audit"><ScrollText size={14} className="mr-1" /> Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Reservations', value: resCount },
              { label: 'This Month', value: thisMonthRes },
              { label: 'Plan', value: (hotel.subscription_plan || 'starter').charAt(0).toUpperCase() + (hotel.subscription_plan || 'starter').slice(1) },
              { label: 'Monthly Price', value: `€${Number(hotel.monthly_price || 89).toFixed(0)}` },
            ].map(m => (
              <Card key={m.label} className="rounded-[0.625rem] border-border/60 shadow-card">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
                  <p className="text-xl font-bold">{m.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="rounded-[0.625rem] border-border/60 shadow-card">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm"><span className="text-muted-foreground">Created:</span> {format(parseISO(hotel.created_at), 'MMM dd, yyyy')}</p>
              <p className="text-sm"><span className="text-muted-foreground">Last Login:</span> {hotel.last_login_at ? format(parseISO(hotel.last_login_at), 'MMM dd, yyyy') : 'Never'}</p>
              <p className="text-sm"><span className="text-muted-foreground">Email:</span> {hotel.email || '—'}</p>
              <p className="text-sm"><span className="text-muted-foreground">Phone:</span> {hotel.phone || '—'}</p>
              {hotel.trial_ends_at && <p className="text-sm"><span className="text-muted-foreground">Trial Ends:</span> {format(parseISO(hotel.trial_ends_at), 'MMM dd, yyyy')}</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <Card className="rounded-[0.625rem] border-border/60 shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Hotel Settings</CardTitle>
              {!editMode ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={fetchAll}>Refresh</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>Edit</Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditMode(false); setEditData(hotel); }}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveSettings} disabled={actionLoading === 'save'} className="bg-gradient-to-r from-[hsl(263,70%,50%)] to-[hsl(280,80%,60%)]">
                    {actionLoading === 'save' ? <Loader2 size={14} className="animate-spin mr-1" /> : null} Save
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Hotel Profile */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">Hotel Profile</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Hotel Name</Label><Input disabled={!editMode} value={editData.name || ''} onChange={e => setEditData({ ...editData, name: e.target.value })} /></div>
                  <div><Label>Contact Email</Label><Input disabled={!editMode} value={editData.email || ''} onChange={e => setEditData({ ...editData, email: e.target.value })} /></div>
                  <div><Label>Phone</Label><Input disabled={!editMode} value={editData.phone || ''} onChange={e => setEditData({ ...editData, phone: e.target.value })} /></div>
                  <div><Label>Address</Label><Input disabled={!editMode} value={editData.address || ''} onChange={e => setEditData({ ...editData, address: e.target.value })} /></div>
                </div>
              </div>

              {/* Operations */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">Operations</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Currency</Label>
                    {editMode ? (
                      <Select value={editData.currency || 'EUR'} onValueChange={v => setEditData({ ...editData, currency: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD'].map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : <Input disabled value={editData.currency || 'EUR'} />}
                  </div>
                  <div><Label>Check-In Time</Label><Input disabled={!editMode} type={editMode ? 'time' : 'text'} value={editData.check_in_time || '14:00'} onChange={e => setEditData({ ...editData, check_in_time: e.target.value })} /></div>
                  <div><Label>Check-Out Time</Label><Input disabled={!editMode} type={editMode ? 'time' : 'text'} value={editData.check_out_time || '11:00'} onChange={e => setEditData({ ...editData, check_out_time: e.target.value })} /></div>
                  <div><Label>Tax %</Label><Input disabled={!editMode} type="number" value={editData.tax_percentage ?? 0} onChange={e => setEditData({ ...editData, tax_percentage: +e.target.value })} /></div>
                  <div><Label>Cleaning Duration (min)</Label><Input disabled={!editMode} type="number" value={editData.cleaning_duration_minutes ?? 120} onChange={e => setEditData({ ...editData, cleaning_duration_minutes: +e.target.value })} /></div>
                  <div>
                    <Label>Conflict Policy</Label>
                    {editMode ? (
                      <Select value={editData.conflict_policy || 'external_priority'} onValueChange={v => setEditData({ ...editData, conflict_policy: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="external_priority">External Priority</SelectItem>
                          <SelectItem value="website_priority">Website Priority</SelectItem>
                          <SelectItem value="first_booking">First Booking Wins</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : <Input disabled value={editData.conflict_policy || 'external_priority'} />}
                  </div>
                </div>
              </div>

              {/* Policies */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">Policies</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div><Label>Booking Policy</Label><Textarea disabled={!editMode} value={editData.booking_policy || ''} onChange={e => setEditData({ ...editData, booking_policy: e.target.value })} rows={2} /></div>
                  <div><Label>Cancellation Policy</Label><Textarea disabled={!editMode} value={editData.cancellation_policy || ''} onChange={e => setEditData({ ...editData, cancellation_policy: e.target.value })} rows={2} /></div>
                </div>
              </div>

              {/* Subscription (superadmin only) */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">Subscription</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Plan</Label>
                    {editMode ? (
                      <Select value={editData.subscription_plan || 'starter'} onValueChange={v => setEditData({ ...editData, subscription_plan: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="starter">Starter</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : <Input disabled value={editData.subscription_plan || 'starter'} />}
                  </div>
                  <div>
                    <Label>Status</Label>
                    {editMode ? (
                      <Select value={editData.subscription_status || 'trial'} onValueChange={v => setEditData({ ...editData, subscription_status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trial">Trial</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : <Input disabled value={editData.subscription_status || 'trial'} />}
                  </div>
                  <div><Label>Monthly Price (€)</Label><Input disabled={!editMode} type="number" value={editData.monthly_price ?? 89} onChange={e => setEditData({ ...editData, monthly_price: +e.target.value })} /></div>
                  <div><Label>Trial End Date</Label><Input disabled={!editMode} type={editMode ? 'date' : 'text'} value={editData.trial_ends_at ? editData.trial_ends_at.substring(0, 10) : ''} onChange={e => setEditData({ ...editData, trial_ends_at: e.target.value })} /></div>
                </div>
              </div>

              {/* Superadmin Notes */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">Internal Notes</h4>
                <Textarea disabled={!editMode} value={editData.superadmin_notes || ''} onChange={e => setEditData({ ...editData, superadmin_notes: e.target.value })} rows={3} placeholder="Internal notes about this hotel..." />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4 mt-4">
          <Card className="rounded-[0.625rem] border-border/60 shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {billingRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground">No billing records. Billing is managed via superadmin edge functions.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b"><th className="text-left p-2">Date</th><th className="text-left p-2">Amount</th><th className="text-left p-2">Status</th><th className="text-left p-2">Notes</th></tr></thead>
                  <tbody>
                    {billingRecords.map(b => (
                      <tr key={b.id} className="border-b border-border/40">
                        <td className="p-2">{format(parseISO(b.payment_date), 'MMM dd, yyyy')}</td>
                        <td className="p-2">€{Number(b.amount).toFixed(2)}</td>
                        <td className="p-2"><span className={`text-xs px-2 py-0.5 rounded-full ${b.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{b.status}</span></td>
                        <td className="p-2 text-muted-foreground">{b.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4 mt-4">
          <Card className="rounded-[0.625rem] border-border/60 shadow-card">
            <CardHeader><CardTitle className="text-base">Recent Reservations</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/30"><th className="text-left p-3">Guest</th><th className="text-left p-3">Room Type</th><th className="text-left p-3">Check-In</th><th className="text-left p-3">Check-Out</th><th className="text-left p-3">Status</th><th className="text-left p-3">Source</th></tr></thead>
                  <tbody>
                    {reservations.map(r => (
                      <tr key={r.id} className="border-b border-border/40">
                        <td className="p-3 font-medium">{r.guest_name}</td>
                        <td className="p-3 text-muted-foreground">{r.room_types?.name || '—'}</td>
                        <td className="p-3 text-muted-foreground">{format(parseISO(r.check_in), 'MMM dd, yyyy')}</td>
                        <td className="p-3 text-muted-foreground">{format(parseISO(r.check_out), 'MMM dd, yyyy')}</td>
                        <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-muted">{r.status}</span></td>
                        <td className="p-3 text-muted-foreground text-xs">{r.booking_source || '—'}</td>
                      </tr>
                    ))}
                    {reservations.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No reservations</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4 mt-4">
          <Card className="rounded-[0.625rem] border-border/60 shadow-card">
            <CardHeader><CardTitle className="text-base">Audit Log</CardTitle></CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No audit entries for this hotel. Logs are written by superadmin actions.</p>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map(log => (
                    <div key={log.id} className="flex items-start gap-3 p-2 border-b border-border/40">
                      <div className="w-2 h-2 rounded-full bg-[hsl(263,70%,50%)] mt-1.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{log.action.replace(/_/g, ' ')}</p>
                        {log.details && <p className="text-xs text-muted-foreground">{JSON.stringify(log.details)}</p>}
                        <p className="text-xs text-muted-foreground">{format(parseISO(log.performed_at), 'MMM dd, yyyy HH:mm')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Suspend Dialog */}
      <AlertDialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend Hotel Access</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately prevent {hotel.name} from logging in. Their data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div><Label>Reason *</Label><Textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="Reason for suspension..." /></div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSuspend} disabled={!suspendReason || actionLoading === 'suspend'} className="bg-destructive text-destructive-foreground">
              {actionLoading === 'suspend' ? <Loader2 size={14} className="animate-spin mr-1" /> : null} Suspend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Dialog */}
      <AlertDialog open={reactivateOpen} onOpenChange={setReactivateOpen}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate Hotel</AlertDialogTitle>
            <AlertDialogDescription>This will restore login access for {hotel.name}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivate} disabled={actionLoading === 'reactivate'} className="bg-emerald-600 text-white hover:bg-emerald-700">
              {actionLoading === 'reactivate' ? <Loader2 size={14} className="animate-spin mr-1" /> : null} Reactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Step 1 */}
      <AlertDialog open={deleteStep === 1} onOpenChange={v => !v && setDeleteStep(0)}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Hotel</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {hotel.name} and ALL their data including reservations, invoices, rooms, and staff. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteStep(0)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => setDeleteStep(2)} className="bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30">Continue to Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Step 2 */}
      <AlertDialog open={deleteStep === 2} onOpenChange={v => !v && setDeleteStep(0)}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Final Confirmation</AlertDialogTitle>
            <AlertDialogDescription>Type the hotel name to confirm deletion:</AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={deleteNameInput} onChange={e => setDeleteNameInput(e.target.value)} placeholder={hotel.name} />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeleteStep(0); setDeleteNameInput(''); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteNameInput !== hotel.name || actionLoading === 'delete'} className="bg-destructive text-destructive-foreground">
              {actionLoading === 'delete' ? <Loader2 size={14} className="animate-spin mr-1" /> : null} Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <AlertDialog open={resetPwOpen} onOpenChange={setResetPwOpen}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>{newPassword ? 'New Password Generated' : 'Reset Hotel Password'}</AlertDialogTitle>
            <AlertDialogDescription>
              {newPassword
                ? '⚠️ Show this password only once — it will not be displayed again.'
                : `Generate a new temporary password for ${hotel.name}. The previous password will stop working immediately.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {newPassword && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border/60 flex items-center justify-between">
              <code className="text-sm font-mono">{newPassword}</code>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(newPassword); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </Button>
            </div>
          )}
          <AlertDialogFooter>
            {!newPassword ? (
              <>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetPassword} disabled={actionLoading === 'reset'} className="bg-orange-500 text-white hover:bg-orange-600">
                  {actionLoading === 'reset' ? <Loader2 size={14} className="animate-spin mr-1" /> : null} Reset Password
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction onClick={() => setResetPwOpen(false)}>Done</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
