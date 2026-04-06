import { cn } from '@/lib/utils';

interface RoomType {
  id: string;
  name: string;
  available_units: number;
}

interface RoomAvailability extends RoomType {
  booked: number;
  blocked: number;
  free: number;
}

interface RoomTypeCardsProps {
  roomAvailability: RoomAvailability[];
  selectedRoom: string;
  onSelect: (id: string) => void;
}

export function RoomTypeCards({ roomAvailability, selectedRoom, onSelect }: RoomTypeCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
      {roomAvailability.map(ra => {
        const occupancy = ra.available_units > 0 ? ((ra.booked + ra.blocked) / ra.available_units) * 100 : 0;
        return (
          <button
            key={ra.id}
            onClick={() => onSelect(ra.id)}
            className={cn(
              'bg-card rounded-lg border p-3 text-left transition-all',
              selectedRoom === ra.id
                ? 'border-primary ring-1 ring-primary'
                : 'border-border hover:border-primary/50'
            )}
          >
            <h4 className="font-medium text-xs mb-1.5 truncate">{ra.name}</h4>
            <div className="flex items-baseline gap-1">
              <span className={cn(
                'text-lg font-bold',
                ra.free > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              )}>
                {ra.free}
              </span>
              <span className="text-[10px] text-muted-foreground">/ {ra.available_units} free</span>
            </div>
            <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  occupancy >= 100 ? 'bg-red-500' : occupancy >= 75 ? 'bg-orange-500' : occupancy >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                )}
                style={{ width: `${Math.min(100, occupancy)}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
