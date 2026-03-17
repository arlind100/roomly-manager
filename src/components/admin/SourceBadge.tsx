import { cn } from '@/lib/utils';
import { Globe, Phone, Footprints, Plane, Monitor, Home } from 'lucide-react';

const sourceConfig: Record<string, { color: string; icon: any; label: string }> = {
  website: { color: 'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/40', icon: Monitor, label: 'Website' },
  'booking.com': { color: 'bg-indigo-50 text-indigo-700 border-indigo-200/60 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800/40', icon: Globe, label: 'Booking.com' },
  booking_com: { color: 'bg-indigo-50 text-indigo-700 border-indigo-200/60 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800/40', icon: Globe, label: 'Booking.com' },
  airbnb: { color: 'bg-pink-50 text-pink-700 border-pink-200/60 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800/40', icon: Home, label: 'Airbnb' },
  'walk-in': { color: 'bg-green-50 text-green-700 border-green-200/60 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/40', icon: Footprints, label: 'Walk-in' },
  phone: { color: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/40', icon: Phone, label: 'Phone' },
  'travel-agency': { color: 'bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/40', icon: Plane, label: 'Agency' },
  direct: { color: 'bg-muted text-muted-foreground border-border/60', icon: Monitor, label: 'Direct' },
};

export function SourceBadge({ source }: { source: string | null }) {
  const src = (source || 'direct').toLowerCase();
  const config = sourceConfig[src] || { color: 'bg-muted text-muted-foreground border-border/60', icon: Globe, label: source || 'Unknown' };
  const Icon = config.icon;

  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border shadow-sm whitespace-nowrap',
      config.color
    )}>
      <Icon size={10} className="shrink-0" />
      {config.label}
    </span>
  );
}