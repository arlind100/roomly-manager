import { format } from 'date-fns';
import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Block {
  id: string;
  room_type_id: string;
  date: string;
  reason: string | null;
  room_types?: { name: string } | null;
}

interface BlockedDatesListProps {
  blocks: Block[];
  selectedRoom: string;
  deletingId: string | null;
  onDelete: (id: string) => void;
}

export function BlockedDatesList({ blocks, selectedRoom, deletingId, onDelete }: BlockedDatesListProps) {
  const filtered = blocks.filter(b => b.room_type_id === selectedRoom);

  return (
    <div className="bg-card rounded-lg border border-border/60 p-5 shadow-card">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Blocked Dates
      </h3>
      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No blocked dates for this room type</p>
      ) : (
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {filtered.map(b => (
            <div key={b.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-destructive/5 border border-destructive/10">
              <div>
                <p className="text-xs font-medium">{format(new Date(b.date + 'T00:00:00'), 'MMM dd, yyyy')}</p>
                {b.reason && <p className="text-[10px] text-muted-foreground">{b.reason}</p>}
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" disabled={deletingId === b.id} onClick={() => onDelete(b.id)}>
                {deletingId === b.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
