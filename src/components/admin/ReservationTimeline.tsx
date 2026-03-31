import { useMemo, useState, useRef, useCallback } from 'react';
import { format, addDays, differenceInDays, startOfDay, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { SourceBadge } from '@/components/admin/SourceBadge';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineProps {
  rooms: any[];
  roomTypes: any[];
  reservations: any[];
  currency: string;
  onReservationClick?: (res: any) => void;
}

const STATUS_COLORS: Record<string, { bar: string; dot: string }> = {
  pending:    { bar: 'bg-amber-400/80 border-amber-500 text-amber-950', dot: 'bg-amber-400' },
  confirmed:  { bar: 'bg-blue-400/80 border-blue-500 text-blue-950', dot: 'bg-blue-400' },
  checked_in: { bar: 'bg-emerald-400/80 border-emerald-500 text-emerald-950', dot: 'bg-emerald-400' },
  completed:  { bar: 'bg-slate-300/80 border-slate-400 text-slate-700', dot: 'bg-slate-400' },
  cancelled:  { bar: 'bg-red-300/50 border-red-400 text-red-800 opacity-50', dot: 'bg-red-400' },
};

export function ReservationTimeline({ rooms, roomTypes, reservations, currency, onReservationClick }: TimelineProps) {
  const [startDate, setStartDate] = useState(() => startOfDay(new Date()));
  const [daysToShow, setDaysToShow] = useState(14);
  const [hoveredRes, setHoveredRes] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const dates = useMemo(() =>
    Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i)),
  [startDate, daysToShow]);

  const today = startOfDay(new Date());

  const groupedRooms = useMemo(() => {
    const groups: { roomType: any; rooms: any[] }[] = [];
    roomTypes.forEach(rt => {
      const rtRooms = rooms.filter(r => r.room_type_id === rt.id && r.is_active);
      if (rtRooms.length > 0) {
        groups.push({ roomType: rt, rooms: rtRooms.sort((a, b) => a.room_number.localeCompare(b.room_number)) });
      }
    });
    return groups;
  }, [rooms, roomTypes]);

  const allRooms = useMemo(() => groupedRooms.flatMap(g => g.rooms), [groupedRooms]);

  const getReservationsForRoom = useCallback((roomId: string, roomTypeId: string) => {
    return reservations.filter(r => {
      if (r.status === 'cancelled') return false;
      if (r.room_id) return r.room_id === roomId;
      return r.room_type_id === roomTypeId;
    });
  }, [reservations]);

  const handleMouseEnter = (res: any, e: React.MouseEvent) => {
    setHoveredRes(res);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const COL_WIDTH = daysToShow <= 7 ? 80 : daysToShow <= 14 ? 60 : 40;
  const ROW_HEIGHT = 44;
  const LABEL_WIDTH = 130;

  // Find today column index for the red line
  const todayIndex = dates.findIndex(d => isSameDay(d, today));

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setStartDate(d => addDays(d, -7))}>
            <ChevronLeft size={14} />
          </Button>
          <Button variant="outline" size="sm" className="font-medium" onClick={() => setStartDate(startOfDay(new Date()))}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => setStartDate(d => addDays(d, 7))}>
            <ChevronRight size={14} />
          </Button>
          <span className="text-xs text-muted-foreground ml-3 font-medium">
            {format(startDate, 'MMM dd')} — {format(addDays(startDate, daysToShow - 1), 'MMM dd, yyyy')}
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-muted/60 rounded-lg px-2 py-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDaysToShow(d => Math.min(d + 7, 31))} disabled={daysToShow >= 31}>
            <ZoomOut size={14} />
          </Button>
          <span className="text-xs font-semibold text-foreground w-6 text-center">{daysToShow}d</span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDaysToShow(d => Math.max(d - 7, 7))} disabled={daysToShow <= 7}>
            <ZoomIn size={14} />
          </Button>
        </div>
      </div>

      {/* Timeline Grid */}
      <div ref={containerRef} className="relative bg-card rounded-lg border border-border/60 shadow-card overflow-auto">
        <div style={{ minWidth: LABEL_WIDTH + COL_WIDTH * daysToShow }}>
          {/* Header row */}
          <div className="flex sticky top-0 z-10 border-b-2 border-border/60">
            <div className="shrink-0 border-r border-border/60 px-3 py-2.5 text-xs font-semibold text-primary-foreground bg-primary/85 uppercase tracking-wider" style={{ width: LABEL_WIDTH }}>
              Room
            </div>
            {dates.map((date, i) => {
              const isToday = isSameDay(date, today);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              return (
                <div key={i} className={cn(
                  'shrink-0 border-r border-border/30 px-1 py-2 text-center',
                  isToday && 'bg-primary/15',
                  isWeekend && !isToday && 'bg-muted/40'
                )} style={{ width: COL_WIDTH }}>
                  <p className={cn('text-[10px] uppercase font-medium', isWeekend ? 'text-destructive/60' : 'text-muted-foreground')}>{format(date, 'EEE')}</p>
                  <p className={cn('text-xs font-bold mt-0.5', isToday ? 'text-primary' : 'text-foreground')}>{format(date, 'dd')}</p>
                  {isToday && <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-0.5" />}
                </div>
              );
            })}
          </div>

          {/* Room rows */}
          {groupedRooms.map(({ roomType, rooms: groupRooms }) => (
            <div key={roomType.id}>
              {/* Room type header */}
              <div className="flex border-b border-border/40 bg-muted/50">
                <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-foreground/70" style={{ width: LABEL_WIDTH + COL_WIDTH * daysToShow }}>
                  {roomType.name}
                  <span className="ml-2 text-[10px] font-normal text-muted-foreground">({groupRooms.length} rooms)</span>
                </div>
              </div>
              {groupRooms.map((room, roomIdx) => {
                const roomRes = getReservationsForRoom(room.id, room.room_type_id);
                return (
                  <div key={room.id} className={cn(
                    'flex border-b border-border/20 relative group',
                    roomIdx % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                  )} style={{ height: ROW_HEIGHT }}>
                    <div className="shrink-0 border-r border-border/40 px-3 flex items-center gap-2 group-hover:bg-muted/30 transition-colors" style={{ width: LABEL_WIDTH }}>
                      <span className="text-xs font-semibold text-foreground">{room.room_number}</span>
                      {room.operational_status !== 'available' && room.operational_status !== 'occupied' && (
                        <span className={cn('text-[8px] px-1.5 py-0.5 rounded-full font-medium',
                          room.operational_status === 'cleaning' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                          room.operational_status === 'dirty' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                          room.operational_status === 'maintenance' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                          'bg-muted text-muted-foreground'
                        )}>
                          {room.operational_status}
                        </span>
                      )}
                    </div>
                    {/* Day cells */}
                    <div className="flex flex-1 relative">
                      {dates.map((date, i) => (
                        <div key={i} className={cn(
                          'shrink-0 border-r border-border/10',
                          isSameDay(date, today) && 'bg-primary/5',
                          (date.getDay() === 0 || date.getDay() === 6) && !isSameDay(date, today) && 'bg-muted/15'
                        )} style={{ width: COL_WIDTH, height: ROW_HEIGHT }} />
                      ))}

                      {/* Today vertical line */}
                      {todayIndex >= 0 && (
                        <div
                          className="absolute top-0 bottom-0 w-[2px] bg-primary/60 z-[5] pointer-events-none"
                          style={{ left: todayIndex * COL_WIDTH + COL_WIDTH / 2 }}
                        />
                      )}

                      {/* Reservation bars */}
                      {roomRes.map(res => {
                        const resStart = startOfDay(new Date(res.check_in));
                        const resEnd = startOfDay(new Date(res.check_out));
                        const timelineStart = startDate;
                        const timelineEnd = addDays(startDate, daysToShow);

                        const visStart = resStart < timelineStart ? timelineStart : resStart;
                        const visEnd = resEnd > timelineEnd ? timelineEnd : resEnd;
                        const offsetDays = differenceInDays(visStart, timelineStart);
                        const spanDays = differenceInDays(visEnd, visStart);

                        if (spanDays <= 0) return null;

                        const left = offsetDays * COL_WIDTH;
                        const width = spanDays * COL_WIDTH - 6;
                        const colors = STATUS_COLORS[res.status] || STATUS_COLORS.confirmed;
                        const startsHere = resStart >= timelineStart;
                        const endsHere = resEnd <= timelineEnd;

                        return (
                          <div
                            key={res.id}
                            className={cn(
                              'absolute top-[6px] border flex items-center gap-1 cursor-pointer transition-all duration-150 hover:shadow-lg hover:z-10 hover:brightness-95 text-[10px] font-semibold truncate px-2',
                              colors.bar,
                              startsHere && endsHere ? 'rounded-md' :
                              startsHere ? 'rounded-l-md rounded-r-none' :
                              endsHere ? 'rounded-r-md rounded-l-none' :
                              'rounded-none'
                            )}
                            style={{ left: left + 3, width: Math.max(width, 20), height: ROW_HEIGHT - 12 }}
                            onClick={() => onReservationClick?.(res)}
                            onMouseEnter={(e) => handleMouseEnter(res, e)}
                            onMouseLeave={() => setHoveredRes(null)}
                          >
                            {startsHere && <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', colors.dot)} />}
                            {width > 50 && <span className="truncate">{res.guest_name}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {allRooms.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No rooms configured. Add rooms from the Rooms page.
            </div>
          )}
        </div>

        {/* Tooltip */}
        {hoveredRes && (
          <div
            className="absolute z-20 bg-card border border-border rounded-xl shadow-lg p-4 pointer-events-none max-w-[240px]"
            style={{ left: Math.min(tooltipPos.x, (containerRef.current?.clientWidth || 500) - 250), top: tooltipPos.y + 24 }}
          >
            <p className="text-sm font-bold text-foreground">{hoveredRes.guest_name}</p>
            <p className="text-xs text-muted-foreground mt-1.5">
              {format(new Date(hoveredRes.check_in), 'MMM dd')} → {format(new Date(hoveredRes.check_out), 'MMM dd, yyyy')}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={hoveredRes.status} />
              <SourceBadge source={hoveredRes.booking_source} />
            </div>
            {hoveredRes.guests_count && (
              <p className="text-[10px] text-muted-foreground mt-1.5">{hoveredRes.guests_count} guest{hoveredRes.guests_count > 1 ? 's' : ''}</p>
            )}
            {hoveredRes.check_in_time && (
              <p className="text-[10px] text-muted-foreground">Check-in: {hoveredRes.check_in_time}</p>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground px-1">
        {Object.entries(STATUS_COLORS).filter(([k]) => k !== 'cancelled').map(([status, colors]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={cn('w-3 h-2.5 rounded-sm border', colors.bar)} />
            <span className="capitalize font-medium">{status.replace('_', ' ')}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-[2px] h-3 bg-primary/60 rounded-full" />
          <span className="font-medium">Today</span>
        </div>
      </div>
    </div>
  );
}
