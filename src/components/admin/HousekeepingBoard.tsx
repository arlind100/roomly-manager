import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Droplets, CheckCircle2, Wrench, Clock, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

interface Room {
  id: string;
  room_number: string;
  floor: string | null;
  operational_status: string;
  cleaning_started_at: string | null;
  cleaning_expected_done_at: string | null;
  room_type_id: string;
  notes: string | null;
}

interface HousekeepingBoardProps {
  rooms: Room[];
  roomTypes: any[];
  todayCheckouts: any[];
  cleaningDuration: number;
  onRefresh: () => void;
}

const statusIcons: Record<string, any> = {
  dirty: Droplets,
  cleaning: Sparkles,
  maintenance: Wrench,
  available: CheckCircle2,
};

const statusColors: Record<string, string> = {
  dirty: 'border-amber-500/20 bg-amber-500/10 dark:border-amber-500/20 dark:bg-amber-500/10',
  cleaning: 'border-blue-500/20 bg-blue-500/10 dark:border-blue-500/20 dark:bg-blue-500/10',
  maintenance: 'border-red-500/20 bg-red-500/10 dark:border-red-500/20 dark:bg-red-500/10',
  out_of_service: 'border-border bg-muted/30',
};

export function HousekeepingBoard({ rooms, roomTypes, todayCheckouts, cleaningDuration, onRefresh }: HousekeepingBoardProps) {
  const [updating, setUpdating] = useState<string | null>(null);

  const updateRoomStatus = async (roomId: string, newStatus: string) => {
    setUpdating(roomId);
    const updateData: Record<string, any> = {
      operational_status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === 'cleaning') {
      const now = new Date();
      updateData.cleaning_started_at = now.toISOString();
      updateData.cleaning_expected_done_at = new Date(now.getTime() + cleaningDuration * 60000).toISOString();
    } else if (newStatus === 'available') {
      updateData.cleaning_started_at = null;
      updateData.cleaning_expected_done_at = null;
    }

    const { error } = await supabase.from('rooms').update(updateData).eq('id', roomId);
    setUpdating(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Room status updated to ${newStatus}`);
    onRefresh();
  };

  const dirtyRooms = rooms.filter(r => r.operational_status === 'dirty');
  const cleaningRooms = rooms.filter(r => r.operational_status === 'cleaning');
  const maintenanceRooms = rooms.filter(r => r.operational_status === 'maintenance' || r.operational_status === 'out_of_service');

  // Rooms with checkouts today that haven't been marked dirty yet
  const checkoutRoomIds = new Set(todayCheckouts.map(r => r.room_id).filter(Boolean));
  const pendingCheckoutRooms = rooms.filter(r => checkoutRoomIds.has(r.id) && r.operational_status === 'occupied');

  const allTasks = [
    ...pendingCheckoutRooms.map(r => ({ ...r, taskType: 'checkout' as const })),
    ...dirtyRooms.map(r => ({ ...r, taskType: 'dirty' as const })),
    ...cleaningRooms.map(r => ({ ...r, taskType: 'cleaning' as const })),
    ...maintenanceRooms.map(r => ({ ...r, taskType: 'maintenance' as const })),
  ];

  const getRoomTypeName = (rtId: string) => roomTypes.find(rt => rt.id === rtId)?.name || '—';

  if (allTasks.length === 0) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 size={24} className="mx-auto mb-2 text-green-500 opacity-60" />
        <p className="text-sm text-muted-foreground">All rooms are clean and ready</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {allTasks.map(room => {
        const Icon = statusIcons[room.taskType] || Clock;
        const colorClass = statusColors[room.taskType] || statusColors.dirty;
        const isUpdating = updating === room.id;

        return (
          <div key={room.id} className={cn('rounded-lg border p-3 transition-all duration-200 hover:shadow-sm', colorClass)}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-background/80 flex items-center justify-center shadow-sm">
                  <Icon size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Room {room.room_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {getRoomTypeName(room.room_type_id)}
                    {room.taskType === 'checkout' && ' — Checkout today'}
                    {room.taskType === 'dirty' && ' — Needs cleaning'}
                    {room.taskType === 'cleaning' && room.cleaning_expected_done_at && (
                      <> — Done by {format(new Date(room.cleaning_expected_done_at), 'HH:mm')}</>
                    )}
                    {room.taskType === 'maintenance' && ' — Maintenance'}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {(room.taskType === 'checkout' || room.taskType === 'dirty') && (
                  <Button size="sm" variant="outline" className="text-xs h-7 px-2 gap-1" disabled={isUpdating}
                    onClick={() => updateRoomStatus(room.id, 'cleaning')}>
                    <Sparkles size={12} /> Clean
                  </Button>
                )}
                {room.taskType === 'cleaning' && (
                  <Button size="sm" variant="outline" className="text-xs h-7 px-2 gap-1 text-green-600" disabled={isUpdating}
                    onClick={() => updateRoomStatus(room.id, 'available')}>
                    <CheckCircle2 size={12} /> Done
                  </Button>
                )}
                {room.taskType === 'maintenance' && (
                  <Button size="sm" variant="outline" className="text-xs h-7 px-2 gap-1" disabled={isUpdating}
                    onClick={() => updateRoomStatus(room.id, 'available')}>
                    <CheckCircle2 size={12} /> Resolve
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
