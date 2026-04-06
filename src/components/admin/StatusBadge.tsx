import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 shadow-sm',
  confirmed: 'bg-green-50 text-green-700 shadow-sm',
  cancelled: 'bg-red-50 text-red-600 shadow-sm',
  completed: 'bg-primary/10 text-primary shadow-sm',
  checked_in: 'bg-blue-50 text-blue-700 shadow-sm',
  no_show: 'bg-purple-50 text-purple-700 shadow-sm',
  paid: 'bg-green-50 text-green-700 shadow-sm',
  unpaid: 'bg-yellow-50 text-yellow-700 shadow-sm',
  refunded: 'bg-muted text-muted-foreground shadow-sm',
  partial: 'bg-orange-50 text-orange-700 shadow-sm',
  draft: 'bg-muted text-muted-foreground shadow-sm',
  sent: 'bg-blue-50 text-blue-600 shadow-sm',
  active: 'bg-green-50 text-green-700 shadow-sm',
  inactive: 'bg-muted text-muted-foreground shadow-sm',
  stored: 'bg-blue-50 text-blue-700 shadow-sm',
  claimed: 'bg-green-50 text-green-700 shadow-sm',
  disposed: 'bg-muted text-muted-foreground shadow-sm',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'text-xs font-medium px-2.5 py-1 rounded-full capitalize inline-block transition-shadow duration-200 hover:shadow-md',
      statusStyles[status] || 'bg-muted text-muted-foreground shadow-sm'
    )}>
      {status}
    </span>
  );
}
