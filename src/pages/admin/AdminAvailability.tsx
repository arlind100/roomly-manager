import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EmptyState } from '@/components/admin/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarRange, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const AdminAvailability = () => {
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ room_type_id: '', date: '', reason: 'blocked' });

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
    if (rtRes.data?.[0]) setSelectedRoom(rtRes.data[0].id);
    setLoading(false);
  };

  const handleBlock = async (date: Date) => {
    if (!selectedRoom) return;
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
    fetchData();
  };

  const handleAddBlock = async () => {
    if (!form.room_type_id || !form.date) { toast.error('Select room and date'); return; }
    const hotel = (await supabase.from('hotels').select('id').limit(1).single()).data;
    const { error } = await supabase.from('availability_blocks').insert({
      hotel_id: hotel?.id, room_type_id: form.room_type_id, date: form.date, reason: form.reason,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Block added');
    setShowAdd(false);
    fetchData();
  };

  const deleteBlock = async (id: string) => {
    await supabase.from('availability_blocks').delete().eq('id', id);
    toast.success('Block removed');
    fetchData();
  };

  const roomBlocked = blocks.filter(b => b.room_type_id === selectedRoom).map(b => new Date(b.date));
  const roomReserved = reservations
    .filter(r => r.room_type_id === selectedRoom)
    .flatMap(r => {
      const dates: Date[] = [];
      const start = new Date(r.check_in);
      const end = new Date(r.check_out);
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) dates.push(new Date(d));
      return dates;
    });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Select value={selectedRoom} onValueChange={setSelectedRoom}>
          <SelectTrigger className="w-56 bg-muted/50"><SelectValue placeholder="Select room type" /></SelectTrigger>
          <SelectContent>{roomTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={() => setShowAdd(true)} variant="outline" className="font-body">
          <Plus size={16} className="mr-1" /> Block Dates
        </Button>
      </div>

      {roomTypes.length === 0 ? (
        <EmptyState icon={CalendarRange} title="No room types" description="Create room types first to manage availability." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-xl p-6">
            <p className="text-sm text-muted-foreground mb-4">Click a date to block/unblock</p>
            <Calendar
              mode="single"
              onSelect={(date) => date && handleBlock(date)}
              modifiers={{ reserved: roomReserved, blocked: roomBlocked }}
              modifiersClassNames={{
                reserved: 'bg-yellow-500/30 text-yellow-200',
                blocked: 'bg-destructive/30 text-destructive line-through',
              }}
              className="p-3"
              numberOfMonths={1}
            />
            <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-yellow-500/30" /> Reserved</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-destructive/30" /> Blocked</div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6">
            <h3 className="font-display text-base font-medium mb-4">Blocked Dates</h3>
            {blocks.filter(b => b.room_type_id === selectedRoom).length === 0 ? (
              <p className="text-sm text-muted-foreground">No blocked dates for this room type.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {blocks.filter(b => b.room_type_id === selectedRoom).map(b => (
                  <div key={b.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm">{b.date}</p>
                      <p className="text-xs text-muted-foreground">{b.reason}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteBlock(b.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Block Date</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Room Type</Label>
              <Select value={form.room_type_id} onValueChange={v => setForm(f => ({...f, room_type_id: v}))}>
                <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent>{roomTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} className="bg-muted/50" /></div>
            <div><Label>Reason</Label><Input value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} className="bg-muted/50" placeholder="Maintenance, holiday, etc." /></div>
            <Button onClick={handleAddBlock} className="w-full bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 font-body">Block Date</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAvailability;
