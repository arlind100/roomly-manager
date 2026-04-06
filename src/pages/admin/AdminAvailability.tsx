import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useHotel } from '@/hooks/useHotel';
import { EmptyState } from '@/components/admin/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { CalendarRange, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

import { OccupancyGrid } from '@/components/admin/availability/OccupancyGrid';
import { DateDetailPanel } from '@/components/admin/availability/DateDetailPanel';
import { RoomTypeCards } from '@/components/admin/availability/RoomTypeCards';
import { BlockedDatesList } from '@/components/admin/availability/BlockedDatesList';

const AdminAvailability = () => {
  const { t } = useLanguage();
  const { hotel } = useHotel();
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ room_type_id: '', startDate: '', endDate: '', reason: 'blocked' });
  const [addingBlock, setAddingBlock] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => { if (hotel?.id) fetchData(); }, [hotel?.id]);

  const fetchData = useCallback(async () => {
    if (!hotel?.id) return;
    const rangeStart = format(addDays(new Date(), -30), 'yyyy-MM-dd');
    const rangeEnd = format(addDays(new Date(), 120), 'yyyy-MM-dd');
    const [rtRes, blockRes, resRes] = await Promise.all([
      supabase.from('room_types').select('*').eq('hotel_id', hotel.id),
      supabase.from('availability_blocks').select('*, room_types(name)').eq('hotel_id', hotel.id).gte('date', rangeStart).order('date'),
      supabase.from('reservations').select('id, room_type_id, check_in, check_out, status, guest_name, booking_source').eq('hotel_id', hotel.id).neq('status', 'cancelled').lte('check_in', rangeEnd).gte('check_out', rangeStart),
    ]);
    setRoomTypes(rtRes.data || []);
    setBlocks(blockRes.data || []);
    setReservations(resRes.data || []);
    if (rtRes.data?.[0] && !selectedRoom) setSelectedRoom(rtRes.data[0].id);
    setLoading(false);
  }, [hotel?.id]);

  const handleAddBlock = async () => {
    if (!form.room_type_id || !form.startDate) { toast.error('Select room and date'); return; }
    if (!hotel?.id) return;
    setAddingBlock(true);

    const endDate = form.endDate || form.startDate;
    const dates: string[] = [];
    let cur = new Date(form.startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    while (cur <= end) {
      dates.push(format(cur, 'yyyy-MM-dd'));
      cur = addDays(cur, 1);
    }

    // Filter out already blocked dates
    const existing = new Set(blocks.filter(b => b.room_type_id === form.room_type_id).map(b => b.date));
    const newDates = dates.filter(d => !existing.has(d));

    if (newDates.length === 0) {
      toast.error('All selected dates are already blocked');
      setAddingBlock(false);
      return;
    }

    const rows = newDates.map(d => ({ hotel_id: hotel.id, room_type_id: form.room_type_id, date: d, reason: form.reason }));
    const { error } = await supabase.from('availability_blocks').insert(rows);
    setAddingBlock(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${newDates.length} date(s) blocked`);
    setShowAdd(false);
    setForm({ room_type_id: '', startDate: '', endDate: '', reason: 'blocked' });
    fetchData();
  };

  const deleteBlock = async (id: string) => {
    setDeletingId(id);
    await supabase.from('availability_blocks').delete().eq('id', id);
    setDeletingId(null);
    toast.success('Block removed');
    fetchData();
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  const roomAvailability = roomTypes.map(rt => {
    const booked = reservations.filter(r => r.room_type_id === rt.id && r.check_in <= today && r.check_out > today).length;
    const blocked = blocks.filter(b => b.room_type_id === rt.id && b.date === today).length;
    const free = Math.max(0, rt.available_units - booked - blocked);
    return { ...rt, booked, blocked, free };
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      {/* Today's snapshot */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Today's Availability</h2>
        {roomTypes.length === 0 ? (
          <EmptyState icon={CalendarRange} title={t('admin.noRoomTypesAvail')} description={t('admin.noRoomTypesAvailDesc')} />
        ) : (
          <RoomTypeCards roomAvailability={roomAvailability} selectedRoom={selectedRoom} onSelect={setSelectedRoom} />
        )}
      </div>

      {roomTypes.length > 0 && (
        <>
          {/* Actions */}
          <div className="flex items-center justify-between">
            <Select value={selectedRoom} onValueChange={setSelectedRoom}>
              <SelectTrigger className="w-52 h-8 text-xs">
                <SelectValue placeholder="Select room type" />
              </SelectTrigger>
              <SelectContent>{roomTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setShowAdd(true)}>
              <Plus size={14} /> Block Dates
            </Button>
          </div>

          {/* Main content: Grid + Detail */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3">
              <OccupancyGrid
                roomTypes={roomTypes}
                reservations={reservations}
                blocks={blocks}
                onDateClick={setSelectedDate}
                selectedDate={selectedDate}
              />
            </div>
            <div className="lg:col-span-2 space-y-4">
              {selectedDate ? (
                <DateDetailPanel
                  date={selectedDate}
                  roomTypes={roomTypes}
                  reservations={reservations}
                  blocks={blocks}
                />
              ) : (
                <div className="bg-card rounded-lg border border-border/60 p-6 shadow-card text-center text-sm text-muted-foreground">
                  Click a date on the calendar to see details
                </div>
              )}
              <BlockedDatesList
                blocks={blocks}
                selectedRoom={selectedRoom}
                deletingId={deletingId}
                onDelete={deleteBlock}
              />
            </div>
          </div>
        </>
      )}

      {/* Block dates dialog — now supports range */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Block Date Range</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Room Type</Label>
              <Select value={form.room_type_id} onValueChange={v => setForm(f => ({ ...f, room_type_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select room type" /></SelectTrigger>
                <SelectContent>{roomTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <DatePickerInput value={form.startDate} onChange={v => setForm(f => ({ ...f, startDate: v }))} placeholder="From" />
              </div>
              <div>
                <Label>End Date <span className="text-muted-foreground text-[10px]">(optional)</span></Label>
                <DatePickerInput value={form.endDate} onChange={v => setForm(f => ({ ...f, endDate: v }))} placeholder="To" />
              </div>
            </div>
            <div>
              <Label>Reason</Label>
              <Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Maintenance, holiday, etc." />
            </div>
            <Button onClick={handleAddBlock} disabled={addingBlock} className="w-full gap-1.5">
              {addingBlock && <Loader2 size={14} className="animate-spin" />}
              {addingBlock ? 'Blocking...' : 'Block Dates'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAvailability;
