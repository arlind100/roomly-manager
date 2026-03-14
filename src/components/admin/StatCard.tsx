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
    <div className={cn(
      'group bg-card rounded-[0.625rem] border border-border/60 p-4 shadow-card transition-all duration-300 hover:shadow-card-hover hover:scale-[1.02] hover:-translate-y-0.5',
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-primary/8 backdrop-blur-sm flex items-center justify-center transition-all duration-300 group-hover:bg-primary/15 group-hover:shadow-sm">
          <Icon size={16} className="text-primary transition-colors duration-300" />
        </div>
        {trend && (
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full shadow-sm transition-shadow duration-200 hover:shadow-md',
            trendUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          )}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-semibold animate-count-up">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
