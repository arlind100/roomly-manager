import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EmptyState } from '@/components/admin/EmptyState';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Users, Plus, Pencil, Trash2, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = { name: '', role: '', email: '', phone: '', is_active: true };

const AdminStaff = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchStaff(); }, []);

  const fetchStaff = async () => {
    const { data } = await supabase.from('staff').select('*').order('name');
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
    setSaving(true);
    const hotel = (await supabase.from('hotels').select('id').limit(1).single()).data;
    const payload = { hotel_id: hotel?.id, ...form };

    const { error } = editing
      ? await supabase.from('staff').update(payload).eq('id', editing)
      : await supabase.from('staff').insert(payload);

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? 'Staff updated' : 'Staff added');
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
    fetchStaff();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this staff member?')) return;
    await supabase.from('staff').delete().eq('id', id);
    toast.success('Staff removed');
    fetchStaff();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{staff.length} staff members</p>
        <Button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }} className="bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 font-body">
          <Plus size={16} className="mr-1" /> Add Staff
        </Button>
      </div>

      {staff.length === 0 ? (
        <EmptyState icon={Users} title="No staff" description="Add staff members to your directory." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {staff.map(s => (
            <div key={s.id} className="glass-card rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold text-sm">{s.name[0]}</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.role}</p>
                  </div>
                </div>
                <StatusBadge status={s.is_active ? 'active' : 'inactive'} />
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
                {s.email && <div className="flex items-center gap-1.5"><Mail size={12} /> {s.email}</div>}
                {s.phone && <div className="flex items-center gap-1.5"><Phone size={12} /> {s.phone}</div>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(s)} className="flex-1 font-body text-xs">
                  <Pencil size={12} className="mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(s.id)} className="text-destructive border-destructive/30 hover:bg-destructive/10 font-body text-xs">
                  <Trash2 size={12} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">{editing ? 'Edit' : 'Add'} Staff Member</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="bg-muted/50" /></div>
            <div><Label>Role / Job Title *</Label><Input value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))} className="bg-muted/50" placeholder="e.g. Front Desk Manager" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="bg-muted/50" /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} className="bg-muted/50" /></div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({...f, is_active: v}))} />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 font-body">
              {saving ? 'Saving...' : editing ? 'Update Staff' : 'Add Staff'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStaff;
