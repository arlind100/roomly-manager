import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-500',
  confirmed: 'bg-green-500/15 text-green-500',
  cancelled: 'bg-destructive/15 text-destructive',
  completed: 'bg-primary/15 text-primary',
  checked_in: 'bg-blue-500/15 text-blue-500',
  paid: 'bg-green-500/15 text-green-500',
  unpaid: 'bg-yellow-500/15 text-yellow-500',
  refunded: 'bg-muted text-muted-foreground',
  partial: 'bg-orange-500/15 text-orange-500',
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-500/15 text-blue-400',
  active: 'bg-green-500/15 text-green-500',
  inactive: 'bg-muted text-muted-foreground',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'text-xs font-medium px-2.5 py-1 rounded-full capitalize inline-block',
      statusStyles[status] || 'bg-muted text-muted-foreground'
    )}>
      {status}
    </span>
  );
}
