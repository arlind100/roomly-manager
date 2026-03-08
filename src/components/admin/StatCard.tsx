import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, trend, trendUp, className }: StatCardProps) {
  return (
    <div className={cn('glass-card rounded-xl p-5', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon size={18} className="text-primary" />
        </div>
        {trend && (
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            trendUp ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'
          )}>
            {trend}
          </span>
        )}
      </div>
      <p className="font-display text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
