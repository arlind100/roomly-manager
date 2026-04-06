import { format } from 'date-fns';
import { Users, Ban, BedDouble, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoomType {
  id: string;
  name: string;
  available_units: number;
}

interface Reservation {
  id: string;
  room_type_id: string;
  check_in: string;
  check_out: string;
  status: string;
  guest_name: string;
  booking_source?: string | null;
}

interface Block {
  id: string;
  room_type_id: string;
  date: string;
  reason: string | null;
}

interface DateDetailPanelProps {
  date: string;
  roomTypes: RoomType[];
  reservations: Reservation[];
  blocks: Block[];
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  checked_in: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  completed: 'bg-muted text-muted-foreground',
  no_show: 'bg-red-500/15 text-red-700 dark:text-red-400',
};

export function DateDetailPanel({ date, roomTypes, reservations, blocks }: DateDetailPanelProps) {
  const dateObj = new Date(date + 'T00:00:00');
  const dayReservations = reservations.filter(r => r.check_in <= date && r.check_out > date);
  const dayBlocks = blocks.filter(b => b.date === date);

  const totalUnits = roomTypes.reduce((s, rt) => s + rt.available_units, 0);
  const totalBooked = dayReservations.length;
  const totalBlocked = dayBlocks.length;
  const totalFree = Math.max(0, totalUnits - totalBooked - totalBlocked);

  return (
    <div className="bg-card rounded-lg border border-border/60 p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">{format(dateObj, 'EEEE, MMMM d, yyyy')}</h3>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="flex items-center gap-2 bg-emerald-500/10 rounded-lg px-3 py-2">
          <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{totalFree}</p>
            <p className="text-[10px] text-muted-foreground">Available</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-blue-500/10 rounded-lg px-3 py-2">
          <BedDouble size={14} className="text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{totalBooked}</p>
            <p className="text-[10px] text-muted-foreground">Booked</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-red-500/10 rounded-lg px-3 py-2">
          <Ban size={14} className="text-red-600 dark:text-red-400" />
          <div>
            <p className="text-lg font-bold text-red-700 dark:text-red-400">{totalBlocked}</p>
            <p className="text-[10px] text-muted-foreground">Blocked</p>
          </div>
        </div>
      </div>

      {/* Per room type breakdown */}
      <div className="space-y-3">
        {roomTypes.map(rt => {
          const rtRes = dayReservations.filter(r => r.room_type_id === rt.id);
          const rtBlocks = dayBlocks.filter(b => b.room_type_id === rt.id);
          const free = Math.max(0, rt.available_units - rtRes.length - rtBlocks.length);
          const occupancy = rt.available_units > 0 ? ((rtRes.length + rtBlocks.length) / rt.available_units) * 100 : 0;

          return (
            <div key={rt.id} className="border border-border/40 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold">{rt.name}</span>
                <span className={cn(
                  'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                  free > 0 ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/15 text-red-700 dark:text-red-400'
                )}>
                  {free}/{rt.available_units} free
                </span>
              </div>
              {/* Occupancy bar */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    occupancy >= 100 ? 'bg-red-500' : occupancy >= 75 ? 'bg-orange-500' : occupancy >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                  )}
                  style={{ width: `${Math.min(100, occupancy)}%` }}
                />
              </div>

              {/* Guest list */}
              {rtRes.length > 0 && (
                <div className="space-y-1">
                  {rtRes.map(r => (
                    <div key={r.id} className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-muted/50">
                      <div className="flex items-center gap-1.5">
                        <Users size={10} className="text-muted-foreground" />
                        <span className="font-medium">{r.guest_name}</span>
                      </div>
                      <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-semibold', statusColors[r.status] || 'bg-muted text-muted-foreground')}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Blocks */}
              {rtBlocks.map(b => (
                <div key={b.id} className="flex items-center gap-1.5 text-[11px] text-destructive px-2 py-1 rounded bg-destructive/10 mt-1">
                  <Ban size={10} />
                  <span>Blocked{b.reason ? `: ${b.reason}` : ''}</span>
                </div>
              ))}

              {rtRes.length === 0 && rtBlocks.length === 0 && (
                <p className="text-[10px] text-muted-foreground italic">No bookings</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
