import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
  /** Top accent color - 'primary' | 'green' | 'amber' | 'red' | 'blue' */
  accent?: 'primary' | 'green' | 'amber' | 'red' | 'blue';
}

const accentBorder: Record<string, string> = {
  primary: 'border-t-primary',
  green: 'border-t-emerald-500',
  amber: 'border-t-amber-500',
  red: 'border-t-red-500',
  blue: 'border-t-blue-500',
};

export function StatCard({ label, value, icon: Icon, trend, trendUp, className, accent = 'primary' }: StatCardProps) {
  return (
    <div className={cn(
      'bg-card rounded-xl border border-border/50 border-t-2 p-5 shadow-[var(--shadow-card)] transition-colors duration-200',
      accentBorder[accent],
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-full bg-primary/12 flex items-center justify-center">
          <Icon size={18} className="text-primary" />
        </div>
        {trend && (
          <span className={cn(
            'text-[10px] font-bold px-2 py-0.5 rounded-full',
            trendUp ? 'bg-green-500/15 text-green-400 border border-green-500/25' : 'bg-red-500/12 text-red-400 border border-red-500/20'
          )}>
            {trend}
          </span>
        )}
      </div>
      <p className="font-display font-bold text-2xl tracking-tight text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground font-medium tracking-wide mt-1.5">{label}</p>
    </div>
  );
}
