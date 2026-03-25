import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useHotel } from '@/hooks/useHotel';
import { EmptyState } from '@/components/admin/EmptyState';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Users, Plus, Pencil, Trash2, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = { name: '', role: '', email: '', phone: '', is_active: true };

const AdminStaff = () => {
  const { t } = useLanguage();
  const { hotel } = useHotel();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { if (hotel?.id) fetchStaff(); }, [hotel?.id]);

  const fetchStaff = async () => {
    if (!hotel?.id) return;
    const { data } = await supabase.from('staff').select('*').eq('hotel_id', hotel.id).order('name');
    setStaff(data || []);
    setLoading(false);
  };

  const openEdit = (s: any) => {
    setEditing(s.id);
    setForm({ name: s.name, role: s.role, email: s.email || '', phone: s.phone || '', is_active: s.is_active });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.role) { toast.error('Name and role required'); return; }
    if (!hotel?.id) { toast.error('Hotel not loaded'); return; }
    setSaving(true);
    const { error } = editing
      ? await supabase.from('staff').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing)
      : await supabase.from('staff').insert({ hotel_id: hotel.id, ...form });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? 'Staff updated' : 'Staff added');
    setShowForm(false); setEditing(null); setForm(emptyForm);
    fetchStaff();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('staff').delete().eq('id', id);
    toast.success('Staff removed');
    setDeleteId(null);
    fetchStaff();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{staff.length} {t('admin.staffMembers')}</p>
        <Button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }}><Plus size={16} className="mr-1" /> {t('admin.addStaff')}</Button>
      </div>

      {staff.length === 0 ? (
        <EmptyState icon={Users} title={t('admin.noStaff')} description={t('admin.noStaffDesc')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {staff.map(s => (
            <div key={s.id} className="bg-card rounded-[0.625rem] border border-border/60 p-5 shadow-card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold text-sm">{s.name[0]}</span>
                  </div>
                  <div><p className="font-medium text-sm">{s.name}</p><p className="text-xs text-muted-foreground">{s.role}</p></div>
                </div>
                <StatusBadge status={s.is_active ? 'active' : 'inactive'} />
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
                {s.email && <div className="flex items-center gap-1.5"><Mail size={12} /> {s.email}</div>}
                {s.phone && <div className="flex items-center gap-1.5"><Phone size={12} /> {s.phone}</div>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(s)} className="flex-1 text-xs"><Pencil size={12} className="mr-1" /> {t('admin.edit')}</Button>
                <Button variant="outline" size="sm" onClick={() => setDeleteId(s.id)} className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"><Trash2 size={12} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? t('admin.editStaff') : t('admin.addStaff')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t('admin.staffName')} *</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
            <div><Label>{t('admin.role')} *</Label><Input value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))} placeholder="e.g. Front Desk Manager" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t('admin.email')}</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} /></div>
              <div><Label>{t('admin.phone')}</Label><Input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} /></div>
            </div>
            <div className="flex items-center justify-between"><Label>{t('admin.active')}</Label><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({...f, is_active: v}))} /></div>
            <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? t('admin.saving') : editing ? t('admin.updateStaff') : t('admin.addStaff')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this staff member?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminStaff;
