import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { EmptyState } from '@/components/admin/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarRange, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const AdminAvailability = () => {
  const { t } = useLanguage();
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ room_type_id: '', date: '', reason: 'blocked' });
  const [blocking, setBlocking] = useState(false);
  const [addingBlock, setAddingBlock] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [rtRes, blockRes, resRes] = await Promise.all([
      supabase.from('room_types').select('*'),
      supabase.from('availability_blocks').select('*, room_types(name)').order('date'),
      supabase.from('reservations').select('*').neq('status', 'cancelled'),
    ]);
    setRoomTypes(rtRes.data || []);
    setBlocks(blockRes.data || []);
    setReservations(resRes.data || []);
    if (rtRes.data?.[0] && !selectedRoom) setSelectedRoom(rtRes.data[0].id);
    setLoading(false);
  };

  const handleBlock = async (date: Date) => {
    if (!selectedRoom) return;
    setBlocking(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    const existing = blocks.find(b => b.room_type_id === selectedRoom && b.date === dateStr);
    if (existing) {
      await supabase.from('availability_blocks').delete().eq('id', existing.id);
      toast.success('Date unblocked');
    } else {
      const hotel = (await supabase.from('hotels').select('id').limit(1).single()).data;
      await supabase.from('availability_blocks').insert({ hotel_id: hotel?.id, room_type_id: selectedRoom, date: dateStr, reason: 'blocked' });
      toast.success('Date blocked');
    }
    setBlocking(false);
    fetchData();
  };

  const handleAddBlock = async () => {
    if (!form.room_type_id || !form.date) { toast.error('Select room and date'); return; }
    setAddingBlock(true);
    const hotel = (await supabase.from('hotels').select('id').limit(1).single()).data;
    const { error } = await supabase.from('availability_blocks').insert({ hotel_id: hotel?.id, room_type_id: form.room_type_id, date: form.date, reason: form.reason });
    setAddingBlock(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Block added');
    setShowAdd(false);
    fetchData();
  };

  const deleteBlock = async (id: string) => {
    setDeletingId(id);
    await supabase.from('availability_blocks').delete().eq('id', id);
    setDeletingId(null);
    toast.success('Block removed');
    fetchData();
  };

  // Calculate per-room availability for today
  const today = format(new Date(), 'yyyy-MM-dd');
  const roomAvailability = roomTypes.map(rt => {
    const booked = reservations.filter(r => r.room_type_id === rt.id && r.check_in <= today && r.check_out > today).length;
    const blocked = blocks.filter(b => b.room_type_id === rt.id && b.date === today).length;
    const free = Math.max(0, rt.available_units - booked - blocked);
    return { ...rt, booked, blocked: blocked, free };
  });

  const roomBlocked = blocks.filter(b => b.room_type_id === selectedRoom).map(b => new Date(b.date));
  const roomReserved = reservations.filter(r => r.room_type_id === selectedRoom).flatMap(r => {
    const dates: Date[] = [];
    const start = new Date(r.check_in); const end = new Date(r.check_out);
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) dates.push(new Date(d));
    return dates;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Room Availability Overview */}
      <div>
        <h2 className="text-sm font-semibold mb-3">{t('admin.availOverview')}</h2>
        {roomTypes.length === 0 ? (
          <EmptyState icon={CalendarRange} title={t('admin.noRoomTypesAvail')} description={t('admin.noRoomTypesAvailDesc')} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {roomAvailability.map(ra => (
              <div key={ra.id} className={`bg-card rounded-lg border p-4 cursor-pointer transition-all ${selectedRoom === ra.id ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/50'}`} onClick={() => setSelectedRoom(ra.id)}>
                <h4 className="font-medium text-sm mb-2">{ra.name}</h4>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /><span>{ra.free} {t('admin.freeUnits')}</span></div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500" /><span>{ra.booked} {t('admin.bookedUnits')}</span></div>
                  <span className="text-muted-foreground">/ {ra.available_units}</span>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${ra.available_units > 0 ? (ra.booked / ra.available_units) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {roomTypes.length > 0 && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <Select value={selectedRoom} onValueChange={setSelectedRoom}>
              <SelectTrigger className="w-56"><SelectValue placeholder={t('admin.selectRoomType')} /></SelectTrigger>
              <SelectContent>{roomTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setShowAdd(true)}><Plus size={16} className="mr-1" /> {t('admin.blockDates')}</Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <p className="text-sm text-muted-foreground mb-4">{t('admin.clickToBlock')}</p>
              <Calendar
                mode="single"
                onSelect={(date) => date && handleBlock(date)}
                modifiers={{ reserved: roomReserved, blocked: roomBlocked }}
                modifiersClassNames={{ reserved: 'bg-yellow-500/30 text-yellow-700 dark:text-yellow-300', blocked: 'bg-destructive/30 text-destructive line-through' }}
                className="p-3"
              />
              <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-yellow-500/30" /> {t('admin.reserved')}</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-destructive/30" /> {t('admin.blocked')}</div>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="text-sm font-semibold mb-4">{t('admin.blockedDates')}</h3>
              {blocks.filter(b => b.room_type_id === selectedRoom).length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('admin.noBlockedDates')}</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {blocks.filter(b => b.room_type_id === selectedRoom).map(b => (
                    <div key={b.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50">
                      <div><p className="text-sm">{format(new Date(b.date + 'T00:00:00'), 'MMM dd, yyyy')}</p><p className="text-xs text-muted-foreground">{b.reason}</p></div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" disabled={deletingId === b.id} onClick={() => deleteBlock(b.id)}>
                        {deletingId === b.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('admin.blockDate')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t('admin.roomType')}</Label>
              <Select value={form.room_type_id} onValueChange={v => setForm(f => ({...f, room_type_id: v}))}>
                <SelectTrigger><SelectValue placeholder={t('admin.selectRoom')} /></SelectTrigger>
                <SelectContent>{roomTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{t('admin.date')}</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} /></div>
            <div><Label>{t('admin.reason')}</Label><Input value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} placeholder="Maintenance, holiday, etc." /></div>
            <Button onClick={handleAddBlock} disabled={addingBlock} className="w-full gap-1.5">
              {addingBlock && <Loader2 size={14} className="animate-spin" />}
              {addingBlock ? 'Blocking...' : t('admin.blockDate')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAvailability;
