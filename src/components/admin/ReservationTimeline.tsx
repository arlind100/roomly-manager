import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { format, addDays, startOfDay, isSameDay, differenceInMinutes } from 'date-fns';
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

// Dark-theme aware reservation bar styles. Each uses a soft tinted fill,
// a saturated left "cap" that doubles as the status indicator, and a
// subtle ring instead of a hard border.
const STATUS_STYLES: Record<string, { fill: string; cap: string; text: string; ring: string }> = {
  pending: {
    fill: 'bg-amber-500/20 hover:bg-amber-500/28',
    cap: 'bg-amber-400',
    text: 'text-amber-100',
    ring: 'ring-1 ring-amber-400/30',
  },
  confirmed: {
    fill: 'bg-primary/22 hover:bg-primary/30',
    cap: 'bg-primary',
    text: 'text-primary-foreground',
    ring: 'ring-1 ring-primary/35',
  },
  checked_in: {
    fill: 'bg-emerald-500/22 hover:bg-emerald-500/30',
    cap: 'bg-emerald-400',
    text: 'text-emerald-50',
    ring: 'ring-1 ring-emerald-400/35',
  },
  completed: {
    fill: 'bg-muted/70 hover:bg-muted',
    cap: 'bg-muted-foreground/70',
    text: 'text-muted-foreground',
    ring: 'ring-1 ring-border/60',
  },
  cancelled: {
    fill: 'bg-red-500/12',
    cap: 'bg-red-400/60',
    text: 'text-red-300/70',
    ring: 'ring-1 ring-red-400/20',
  },
};

// Default check-in / check-out times when reservations don't carry them.
// Used for sub-day precision when positioning bars.
const DEFAULT_CHECKIN_HOUR = 14;   // 14:00
const DEFAULT_CHECKOUT_HOUR = 11;  // 11:00

function parseTimeToMinutes(t: string | null | undefined, fallbackHour: number): number {
  if (!t || typeof t !== 'string') return fallbackHour * 60;
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return fallbackHour * 60;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function ReservationTimeline({ rooms, roomTypes, reservations, currency, onReservationClick }: TimelineProps) {
  const [startDate, setStartDate] = useState(() => startOfDay(new Date()));
  const [daysToShow, setDaysToShow] = useState(14);
  const [hoveredRes, setHoveredRes] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Re-render every minute so the "now" indicator stays accurate.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const dates = useMemo(() =>
    Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i)),
  [startDate, daysToShow]);

  const today = startOfDay(now);

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

  const COL_WIDTH = daysToShow <= 7 ? 96 : daysToShow <= 14 ? 64 : 44;
  const ROW_HEIGHT = 44;
  const LABEL_WIDTH = 140;
  const MINUTES_PER_DAY = 1440;

  // Convert any datetime → pixel offset from the timeline start, with sub-day precision.
  const timelineStartMs = startDate.getTime();
  const minutesToPx = (minutes: number) => (minutes / MINUTES_PER_DAY) * COL_WIDTH;
  const dateToPx = (d: Date) => minutesToPx((d.getTime() - timelineStartMs) / 60_000);

  const totalWidth = COL_WIDTH * daysToShow;
  const nowOffsetPx = dateToPx(now);
  const nowVisible = nowOffsetPx >= 0 && nowOffsetPx <= totalWidth;

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setStartDate(d => addDays(d, -7))} className="h-8 w-8 p-0">
            <ChevronLeft size={14} />
          </Button>
          <Button variant="outline" size="sm" className="h-8 font-medium" onClick={() => setStartDate(startOfDay(new Date()))}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => setStartDate(d => addDays(d, 7))} className="h-8 w-8 p-0">
            <ChevronRight size={14} />
          </Button>
          <span className="text-xs text-muted-foreground ml-3 font-medium font-body">
            {format(startDate, 'MMM dd')} — {format(addDays(startDate, daysToShow - 1), 'MMM dd, yyyy')}
          </span>
        </div>
        <div className="flex items-center gap-1 bg-muted/60 border border-border/60 rounded-lg px-1.5 py-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-muted" onClick={() => setDaysToShow(d => Math.min(d + 7, 31))} disabled={daysToShow >= 31}>
            <ZoomOut size={13} />
          </Button>
          <span className="text-[11px] font-semibold text-foreground w-7 text-center font-body">{daysToShow}d</span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-muted" onClick={() => setDaysToShow(d => Math.max(d - 7, 7))} disabled={daysToShow <= 7}>
            <ZoomIn size={13} />
          </Button>
        </div>
      </div>

      {/* Timeline Grid */}
      <div ref={containerRef} className="relative bg-card rounded-xl border border-border/50 shadow-[var(--shadow-card)] overflow-auto">
        <div style={{ minWidth: LABEL_WIDTH + COL_WIDTH * daysToShow }}>
          {/* Header row */}
          <div className="flex sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border/60">
            <div
              className="shrink-0 border-r border-border/50 px-3 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em] font-body"
              style={{ width: LABEL_WIDTH }}
            >
              Room
            </div>
            {dates.map((date, i) => {
              const isToday = isSameDay(date, today);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              return (
                <div
                  key={i}
                  className={cn(
                    'shrink-0 border-r border-border/30 px-1 py-2 text-center transition-colors',
                    isToday && 'bg-primary/8',
                    isWeekend && !isToday && 'bg-muted/25'
                  )}
                  style={{ width: COL_WIDTH }}
                >
                  <p className={cn(
                    'text-[10px] uppercase font-semibold tracking-wider font-body',
                    isToday ? 'text-primary' : 'text-muted-foreground/70'
                  )}>
                    {format(date, 'EEE')}
                  </p>
                  <p className={cn(
                    'font-display text-sm font-bold mt-0.5',
                    isToday ? 'text-primary' : 'text-foreground'
                  )}>
                    {format(date, 'dd')}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Room rows */}
          {groupedRooms.map(({ roomType, rooms: groupRooms }) => (
            <div key={roomType.id}>
              {/* Room type header */}
              <div className="flex border-b border-border/40 bg-muted/30">
                <div
                  className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/80 font-body flex items-center gap-2"
                  style={{ width: LABEL_WIDTH + COL_WIDTH * daysToShow }}
                >
                  <span className="w-1 h-1 rounded-full bg-primary/60" />
                  {roomType.name}
                  <span className="text-[10px] font-normal text-muted-foreground/60 normal-case tracking-normal">
                    · {groupRooms.length} room{groupRooms.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              {groupRooms.map((room) => {
                const roomRes = getReservationsForRoom(room.id, room.room_type_id);
                return (
                  <div
                    key={room.id}
                    className="flex border-b border-border/20 relative group hover:bg-muted/15 transition-colors"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <div
                      className="shrink-0 border-r border-border/40 px-3 flex items-center gap-2"
                      style={{ width: LABEL_WIDTH }}
                    >
                      <span className="font-display text-xs font-semibold text-foreground">{room.room_number}</span>
                      {room.operational_status !== 'available' && room.operational_status !== 'occupied' && (
                        <span className={cn(
                          'text-[9px] px-1.5 py-0.5 rounded-full font-medium border',
                          room.operational_status === 'cleaning' ? 'bg-blue-500/13 text-blue-400 border-blue-500/22' :
                          room.operational_status === 'dirty' ? 'bg-amber-500/13 text-amber-400 border-amber-500/22' :
                          room.operational_status === 'maintenance' ? 'bg-red-500/12 text-red-400 border-red-500/20' :
                          'bg-muted text-muted-foreground border-border/50'
                        )}>
                          {room.operational_status}
                        </span>
                      )}
                    </div>
                    {/* Day cells */}
                    <div className="flex flex-1 relative">
                      {dates.map((date, i) => (
                        <div
                          key={i}
                          className={cn(
                            'shrink-0 border-r border-border/15',
                            isSameDay(date, today) && 'bg-primary/5',
                            (date.getDay() === 0 || date.getDay() === 6) && !isSameDay(date, today) && 'bg-muted/10'
                          )}
                          style={{ width: COL_WIDTH, height: ROW_HEIGHT }}
                        />
                      ))}

                      {/* Reservation bars — sub-day precision */}
                      {roomRes.map(res => {
                        const checkInDay = startOfDay(new Date(res.check_in));
                        const checkOutDay = startOfDay(new Date(res.check_out));
                        const checkInMin = parseTimeToMinutes(res.check_in_time, DEFAULT_CHECKIN_HOUR);
                        const checkOutMin = parseTimeToMinutes(res.check_out_time, DEFAULT_CHECKOUT_HOUR);

                        const resStart = new Date(checkInDay.getTime() + checkInMin * 60_000);
                        const resEnd = new Date(checkOutDay.getTime() + checkOutMin * 60_000);

                        const timelineStart = startDate;
                        const timelineEnd = addDays(startDate, daysToShow);
                        if (resEnd <= timelineStart || resStart >= timelineEnd) return null;

                        const visStart = resStart < timelineStart ? timelineStart : resStart;
                        const visEnd = resEnd > timelineEnd ? timelineEnd : resEnd;

                        const left = dateToPx(visStart);
                        const rawWidth = dateToPx(visEnd) - left;
                        if (rawWidth <= 0) return null;

                        const styles = STATUS_STYLES[res.status] || STATUS_STYLES.confirmed;
                        const startsHere = resStart >= timelineStart;
                        const endsHere = resEnd <= timelineEnd;

                        return (
                          <div
                            key={res.id}
                            className={cn(
                              'absolute top-1.5 flex items-stretch overflow-hidden cursor-pointer transition-all duration-150 hover:z-10 hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)] hover:scale-[1.01]',
                              styles.fill,
                              styles.ring,
                              startsHere && endsHere ? 'rounded-md' :
                              startsHere ? 'rounded-l-md' :
                              endsHere ? 'rounded-r-md' :
                              'rounded-none'
                            )}
                            style={{
                              left: left + 1,
                              width: Math.max(rawWidth - 2, 8),
                              height: ROW_HEIGHT - 12,
                            }}
                            onClick={() => onReservationClick?.(res)}
                            onMouseEnter={(e) => handleMouseEnter(res, e)}
                            onMouseLeave={() => setHoveredRes(null)}
                          >
                            {/* Saturated left cap = status indicator */}
                            {startsHere && (
                              <div className={cn('w-[3px] shrink-0 rounded-l-md', styles.cap)} />
                            )}
                            {rawWidth > 44 && (
                              <span className={cn(
                                'truncate text-[10px] font-semibold font-body px-2 self-center text-foreground/90',
                              )}>
                                {res.guest_name}
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {/* "Now" indicator — precise to the current minute */}
                      {nowVisible && (
                        <div
                          className="absolute top-0 bottom-0 w-[2px] bg-destructive z-[6] pointer-events-none"
                          style={{
                            left: nowOffsetPx,
                            boxShadow: '0 0 8px hsl(var(--destructive) / 0.6)',
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {allRooms.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground font-body">
              No rooms configured. Add rooms from the Rooms page.
            </div>
          )}
        </div>

        {/* Top "Now" cap (sits over the header) */}
        {nowVisible && (
          <div
            className="absolute z-20 pointer-events-none flex flex-col items-center"
            style={{ left: LABEL_WIDTH + nowOffsetPx - 22, top: 4 }}
          >
            <span className="text-[9px] font-bold tracking-wider uppercase bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-md shadow-[0_2px_8px_rgba(0,0,0,0.4)] font-body">
              {format(now, 'HH:mm')}
            </span>
          </div>
        )}

        {/* Tooltip */}
        {hoveredRes && (
          <div
            className="absolute z-30 bg-popover border border-border/60 rounded-xl shadow-[var(--shadow-card-hover)] p-4 pointer-events-none max-w-[260px] backdrop-blur-md"
            style={{ left: Math.min(tooltipPos.x, (containerRef.current?.clientWidth || 500) - 280), top: tooltipPos.y + 24 }}
          >
            <p className="font-display text-sm font-bold text-foreground">{hoveredRes.guest_name}</p>
            <p className="text-xs text-muted-foreground mt-1.5 font-body">
              {format(new Date(hoveredRes.check_in), 'MMM dd')}
              {hoveredRes.check_in_time ? ` · ${hoveredRes.check_in_time.slice(0,5)}` : ''}
              <span className="mx-1.5 text-border">→</span>
              {format(new Date(hoveredRes.check_out), 'MMM dd, yyyy')}
              {hoveredRes.check_out_time ? ` · ${hoveredRes.check_out_time.slice(0,5)}` : ''}
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <StatusBadge status={hoveredRes.status} />
              <SourceBadge source={hoveredRes.booking_source} />
            </div>
            {hoveredRes.guests_count && (
              <p className="text-[10px] text-muted-foreground mt-2 font-body">
                {hoveredRes.guests_count} guest{hoveredRes.guests_count > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground px-1 font-body">
        {Object.entries(STATUS_STYLES).filter(([k]) => k !== 'cancelled').map(([status, styles]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={cn('flex h-3 w-6 rounded-sm overflow-hidden', styles.ring, styles.fill)}>
              <div className={cn('w-[2px]', styles.cap)} />
            </div>
            <span className="capitalize font-medium">{status.replace('_', ' ')}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-[2px] h-3 bg-destructive rounded-full shadow-[0_0_6px_hsl(var(--destructive)/0.6)]" />
          <span className="font-medium">Now</span>
        </div>
      </div>
    </div>
  );
}
