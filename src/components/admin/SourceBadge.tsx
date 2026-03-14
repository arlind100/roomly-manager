import { cn } from '@/lib/utils';
import { Globe, Phone, Footprints, Plane, Monitor, Home } from 'lucide-react';

const sourceConfig: Record<string, { color: string; icon: any; label: string }> = {
  website: { color: 'bg-blue-50 text-blue-700 border-blue-200/60', icon: Monitor, label: 'Website' },
  'booking.com': { color: 'bg-indigo-50 text-indigo-700 border-indigo-200/60', icon: Globe, label: 'Booking.com' },
  booking_com: { color: 'bg-indigo-50 text-indigo-700 border-indigo-200/60', icon: Globe, label: 'Booking.com' },
  airbnb: { color: 'bg-pink-50 text-pink-700 border-pink-200/60', icon: Home, label: 'Airbnb' },
  'walk-in': { color: 'bg-green-50 text-green-700 border-green-200/60', icon: Footprints, label: 'Walk-in' },
  phone: { color: 'bg-amber-50 text-amber-700 border-amber-200/60', icon: Phone, label: 'Phone' },
  'travel-agency': { color: 'bg-purple-50 text-purple-700 border-purple-200/60', icon: Plane, label: 'Travel Agency' },
  direct: { color: 'bg-gray-50 text-gray-700 border-gray-200/60', icon: Monitor, label: 'Direct' },
};

export function SourceBadge({ source }: { source: string | null }) {
  const src = (source || 'direct').toLowerCase();
  const config = sourceConfig[src] || { color: 'bg-muted text-muted-foreground border-border/60', icon: Globe, label: source || 'Unknown' };
  const Icon = config.icon;

  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border shadow-sm',
      config.color
    )}>
      <Icon size={10} />
      {config.label}
    </span>
  );
}
