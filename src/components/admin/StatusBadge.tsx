import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  pending: 'bg-yellow-500/13 text-yellow-400 border border-yellow-500/20',
  confirmed: 'bg-green-500/15 text-green-400 border border-green-500/25',
  cancelled: 'bg-red-500/12 text-red-400 border border-red-500/20',
  completed: 'bg-primary/12 text-primary border border-primary/20',
  checked_in: 'bg-blue-500/13 text-blue-400 border border-blue-500/22',
  no_show: 'bg-purple-500/13 text-purple-400 border border-purple-500/20',
  paid: 'bg-green-500/15 text-green-400 border border-green-500/25',
  unpaid: 'bg-yellow-500/13 text-yellow-400 border border-yellow-500/20',
  refunded: 'bg-muted text-muted-foreground border border-border/50',
  partial: 'bg-orange-500/13 text-orange-400 border border-orange-500/20',
  draft: 'bg-muted text-muted-foreground border border-border/50',
  sent: 'bg-blue-500/13 text-blue-400 border border-blue-500/22',
  active: 'bg-green-500/15 text-green-400 border border-green-500/25',
  inactive: 'bg-muted text-muted-foreground border border-border/50',
  stored: 'bg-blue-500/13 text-blue-400 border border-blue-500/22',
  claimed: 'bg-green-500/15 text-green-400 border border-green-500/25',
  disposed: 'bg-muted text-muted-foreground border border-border/50',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'text-xs font-medium px-2.5 py-1 rounded-full capitalize inline-block transition-shadow duration-200',
      statusStyles[status] || 'bg-muted text-muted-foreground border border-border/50'
    )}>
      {status}
    </span>
  );
}
