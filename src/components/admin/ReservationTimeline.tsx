import { useMemo, useState, useRef, useCallback } from 'react';
import { format, addDays, differenceInDays, startOfDay, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

const COLORS = [
  'bg-blue-200/80 border-blue-300 text-blue-900',
  'bg-green-200/80 border-green-300 text-green-900',
  'bg-amber-200/80 border-amber-300 text-amber-900',
  'bg-purple-200/80 border-purple-300 text-purple-900',
  'bg-pink-200/80 border-pink-300 text-pink-900',
  'bg-teal-200/80 border-teal-300 text-teal-900',
  'bg-orange-200/80 border-orange-300 text-orange-900',
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-200/80 border-yellow-300 text-yellow-900',
  confirmed: 'bg-blue-200/80 border-blue-300 text-blue-900',
  checked_in: 'bg-green-200/80 border-green-300 text-green-900',
  completed: 'bg-gray-200/80 border-gray-300 text-gray-900',
  cancelled: 'bg-red-200/60 border-red-300 text-red-900 opacity-50 line-through',
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

  // Group rooms by room type
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

  // All rooms in order
  const allRooms = useMemo(() => groupedRooms.flatMap(g => g.rooms), [groupedRooms]);

  const getReservationsForRoom = useCallback((roomId: string, roomTypeId: string) => {
    return reservations.filter(r => {
      if (r.status === 'cancelled') return false;
      // Match by room_id if assigned, otherwise by room_type_id
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
  const ROW_HEIGHT = 40;
  const LABEL_WIDTH = 120;

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setStartDate(d => addDays(d, -7))}>
            <ChevronLeft size={14} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setStartDate(startOfDay(new Date()))}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => setStartDate(d => addDays(d, 7))}>
            <ChevronRight size={14} />
          </Button>
          <span className="text-xs text-muted-foreground ml-2">
            {format(startDate, 'MMM dd')} — {format(addDays(startDate, daysToShow - 1), 'MMM dd, yyyy')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setDaysToShow(d => Math.min(d + 7, 31))} disabled={daysToShow >= 31}>
            <ZoomOut size={14} />
          </Button>
          <span className="text-xs text-muted-foreground">{daysToShow}d</span>
          <Button variant="outline" size="sm" onClick={() => setDaysToShow(d => Math.max(d - 7, 7))} disabled={daysToShow <= 7}>
            <ZoomIn size={14} />
          </Button>
        </div>
      </div>

      {/* Timeline Grid */}
      <div ref={containerRef} className="relative bg-card rounded-[0.625rem] border border-border/60 shadow-card overflow-auto">
        <div style={{ minWidth: LABEL_WIDTH + COL_WIDTH * daysToShow }}>
          {/* Header row */}
          <div className="flex sticky top-0 z-10 bg-card border-b border-border/60">
            <div className="shrink-0 border-r border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground" style={{ width: LABEL_WIDTH }}>
              Room
            </div>
            {dates.map((date, i) => {
              const isToday = isSameDay(date, today);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              return (
                <div key={i} className={cn(
                  'shrink-0 border-r border-border/30 px-1 py-2 text-center',
                  isToday && 'bg-primary/10',
                  isWeekend && !isToday && 'bg-muted/30'
                )} style={{ width: COL_WIDTH }}>
                  <p className="text-[10px] text-muted-foreground">{format(date, 'EEE')}</p>
                  <p className={cn('text-xs font-medium', isToday && 'text-primary')}>{format(date, 'dd')}</p>
                </div>
              );
            })}
          </div>

          {/* Room rows */}
          {groupedRooms.map(({ roomType, rooms: groupRooms }) => (
            <div key={roomType.id}>
              {/* Room type header */}
              <div className="flex bg-muted/20 border-b border-border/40">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground" style={{ width: LABEL_WIDTH + COL_WIDTH * daysToShow }}>
                  {roomType.name}
                </div>
              </div>
              {groupRooms.map(room => {
                const roomRes = getReservationsForRoom(room.id, room.room_type_id);
                return (
                  <div key={room.id} className="flex border-b border-border/30 relative" style={{ height: ROW_HEIGHT }}>
                    <div className="shrink-0 border-r border-border/60 px-3 flex items-center" style={{ width: LABEL_WIDTH }}>
                      <span className="text-xs font-medium truncate">{room.room_number}</span>
                      {room.operational_status !== 'available' && room.operational_status !== 'occupied' && (
                        <span className={cn('ml-1.5 text-[8px] px-1 py-0 rounded-full',
                          room.operational_status === 'cleaning' ? 'bg-blue-100 text-blue-700' :
                          room.operational_status === 'dirty' ? 'bg-amber-100 text-amber-700' :
                          room.operational_status === 'maintenance' ? 'bg-red-100 text-red-700' :
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
                          'shrink-0 border-r border-border/20',
                          isSameDay(date, today) && 'bg-primary/5',
                          (date.getDay() === 0 || date.getDay() === 6) && !isSameDay(date, today) && 'bg-muted/20'
                        )} style={{ width: COL_WIDTH, height: ROW_HEIGHT }} />
                      ))}
                      {/* Reservation bars */}
                      {roomRes.map(res => {
                        const resStart = startOfDay(new Date(res.check_in));
                        const resEnd = startOfDay(new Date(res.check_out));
                        const timelineStart = startDate;
                        const timelineEnd = addDays(startDate, daysToShow);

                        // Calculate visible portion
                        const visStart = resStart < timelineStart ? timelineStart : resStart;
                        const visEnd = resEnd > timelineEnd ? timelineEnd : resEnd;
                        const offsetDays = differenceInDays(visStart, timelineStart);
                        const spanDays = differenceInDays(visEnd, visStart);

                        if (spanDays <= 0) return null;

                        const left = offsetDays * COL_WIDTH;
                        const width = spanDays * COL_WIDTH - 4;
                        const colorClass = STATUS_COLORS[res.status] || COLORS[0];

                        return (
                          <div
                            key={res.id}
                            className={cn(
                              'absolute top-1 rounded-md border px-1.5 flex items-center cursor-pointer transition-all duration-150 hover:shadow-md hover:z-10 hover:brightness-95 text-[10px] font-medium truncate',
                              colorClass
                            )}
                            style={{ left: left + 2, width: Math.max(width, 20), height: ROW_HEIGHT - 8 }}
                            onClick={() => onReservationClick?.(res)}
                            onMouseEnter={(e) => handleMouseEnter(res, e)}
                            onMouseLeave={() => setHoveredRes(null)}
                          >
                            {width > 60 && res.guest_name}
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
            className="absolute z-20 bg-card border border-border/60 rounded-lg shadow-elevated p-3 pointer-events-none max-w-[220px]"
            style={{ left: Math.min(tooltipPos.x, (containerRef.current?.clientWidth || 500) - 230), top: tooltipPos.y + 20 }}
          >
            <p className="text-sm font-medium">{hoveredRes.guest_name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {hoveredRes.check_in} → {hoveredRes.check_out}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <StatusBadge status={hoveredRes.status} />
              <SourceBadge source={hoveredRes.booking_source} />
            </div>
            {hoveredRes.check_in_time && (
              <p className="text-[10px] text-muted-foreground mt-1">Check-in: {hoveredRes.check_in_time}</p>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-yellow-200 border border-yellow-300" /> Pending</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-blue-200 border border-blue-300" /> Confirmed</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-green-200 border border-green-300" /> Checked In</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-gray-200 border border-gray-300" /> Completed</div>
      </div>
    </div>
  );
}
