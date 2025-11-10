/**
 * StatCard Component
 * Displays a statistic card with icon, title, and value
 */

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  loading?: boolean;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  loading = false,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-6 shadow-sm',
        loading && 'animate-pulse',
        className
      )}
      data-testid="stat-card"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1 flex-1">
          <p className="text-sm font-medium text-muted-foreground" data-testid="stat-title">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            {loading ? (
              <div className="h-8 w-24 bg-muted rounded" />
            ) : (
              <p className="text-3xl font-bold tracking-tight" data-testid="stat-value">
                {value}
              </p>
            )}
          </div>
          {description && !loading && (
            <p className="text-xs text-muted-foreground" data-testid="stat-description">
              {description}
            </p>
          )}
          {trend && !loading && (
            <div
              className={cn(
                'text-xs font-medium',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}
              data-testid="stat-trend"
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </div>
          )}
        </div>
        <div className={cn('rounded-full p-3', loading ? 'bg-muted' : 'bg-primary/10')}>
          <Icon
            className={cn('h-6 w-6', loading ? 'text-muted-foreground' : 'text-primary')}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
