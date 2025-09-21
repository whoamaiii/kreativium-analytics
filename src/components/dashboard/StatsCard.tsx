import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number;
  trendPercent?: number;
  trendLabel?: string;
  icon?: React.ReactNode;
  className?: string;
  animationDelay?: string;
}

export const StatsCard = ({ title, value, trendPercent, trendLabel, icon, className, animationDelay }: StatsCardProps) => {
  const isUp = (trendPercent ?? 0) >= 0;
  return (
    <Card className={cn('motion-safe:animate-fade-in', className)} data-animation-delay={animationDelay}>
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-medium text-muted-foreground">{title}</h3>
        <div className="icon-bg p-2 rounded-lg">{icon}</div>
      </div>
      <p className="text-5xl font-bold mt-6 text-foreground motion-safe:animate-number-pop" aria-live="polite">
        {value}
      </p>
      {typeof trendPercent === 'number' && trendLabel && (
        <div className="flex items-center text-sm mt-3">
          {isUp ? (
            <TrendingUp className="text-success h-4 w-4 mr-1" />
          ) : (
            <TrendingDown className="text-destructive h-4 w-4 mr-1" />
          )}
          <span className={cn(isUp ? 'text-success' : 'text-destructive')}>
            {Math.abs(trendPercent).toFixed(0)}%
          </span>
          <span className="ml-1 text-muted-foreground">{trendLabel}</span>
        </div>
      )}
    </Card>
  );
};



