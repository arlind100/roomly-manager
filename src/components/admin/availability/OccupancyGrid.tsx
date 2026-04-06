import { useMemo, useState } from 'react';
import { format, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isToday, isBefore } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
}

interface Block {
  id: string;
  room_type_id: string;
  date: string;
  reason: string | null;
}

interface OccupancyGridProps {
  roomTypes: RoomType[];
  reservations: Reservation[];
  blocks: Block[];
  onDateClick: (date: string) => void;
  selectedDate: string | null;
}

function getOccupancyColor(ratio: number, isBlocked: boolean) {
  if (isBlocked) return 'bg-destructive/20 text-destructive';
  if (ratio === 0) return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
  if (ratio < 0.5) return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400';
  if (ratio < 0.75) return 'bg-amber-500/20 text-amber-700 dark:text-amber-400';
  if (ratio < 1) return 'bg-orange-500/25 text-orange-700 dark:text-orange-400';
  return 'bg-red-500/25 text-red-700 dark:text-red-400';
}

export function OccupancyGrid({ roomTypes, reservations, blocks, onDateClick, selectedDate }: OccupancyGridProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // Build array of dates
  const dates = useMemo(() => {
    const d: Date[] = [];
    let cur = calStart;
    while (cur <= calEnd) {
      d.push(cur);
      cur = addDays(cur, 1);
    }
    return d;
  }, [calStart.getTime(), calEnd.getTime()]);

  const weeks = useMemo(() => {
    const w: Date[][] = [];
    for (let i = 0; i < dates.length; i += 7) {
      w.push(dates.slice(i, i + 7));
    }
    return w;
  }, [dates]);

  // Pre-compute occupancy per date
  const occupancyMap = useMemo(() => {
    const map: Record<string, { booked: number; blocked: boolean; total: number }> = {};
    const totalUnits = roomTypes.reduce((s, rt) => s + rt.available_units, 0);

    dates.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      let booked = 0;
      reservations.forEach(r => {
        if (r.check_in <= dateStr && r.check_out > dateStr) booked++;
      });
      const hasBlock = blocks.some(b => b.date === dateStr);
      map[dateStr] = { booked, blocked: hasBlock, total: totalUnits };
    });
    return map;
  }, [dates, reservations, blocks, roomTypes]);

  const prevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const goToday = () => setCurrentMonth(new Date());

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="bg-card rounded-lg border border-border/60 p-4 shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft size={16} />
          </Button>
          <h3 className="text-sm font-semibold min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight size={16} />
          </Button>
        </div>
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={goToday}>
          Today
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map(d => (
          <div key={d} className="text-[10px] font-semibold text-muted-foreground text-center py-1 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map(date => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const inMonth = isSameMonth(date, currentMonth);
              const today = isToday(date);
              const occ = occupancyMap[dateStr];
              const ratio = occ && occ.total > 0 ? occ.booked / occ.total : 0;
              const isSelected = selectedDate === dateStr;
              const isPast = isBefore(date, new Date()) && !today;

              return (
                <button
                  key={dateStr}
                  onClick={() => onDateClick(dateStr)}
                  className={cn(
                    'relative flex flex-col items-center justify-center rounded-md p-1 min-h-[52px] transition-all text-xs border',
                    inMonth ? '' : 'opacity-30',
                    today ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : '',
                    isSelected ? 'border-primary bg-primary/5' : 'border-transparent hover:border-border',
                    isPast && !today ? 'opacity-60' : '',
                    occ ? getOccupancyColor(ratio, occ.blocked) : ''
                  )}
                >
                  <span className={cn('text-[11px] font-medium', today ? 'text-primary font-bold' : '')}>
                    {format(date, 'd')}
                  </span>
                  {occ && inMonth && (
                    <span className="text-[9px] font-semibold mt-0.5">
                      {occ.blocked ? '✕' : `${occ.booked}/${occ.total}`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-500/15 border border-emerald-500/30" /> Available</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/30" /> Moderate</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-orange-500/25 border border-orange-500/30" /> High</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500/25 border border-red-500/30" /> Full</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-destructive/20 border border-destructive/30" /> Blocked</div>
      </div>
    </div>
  );
}
