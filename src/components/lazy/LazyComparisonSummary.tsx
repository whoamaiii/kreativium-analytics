import { createLazyComponent } from './LazyLoadWrapper';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

const LoadingFallback = () => (
  <Card className="w-full">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 animate-pulse" />
        Loading Comparison Summary...
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-6">
      {/* Tabs skeleton */}
      <div className="flex gap-2 border-b pb-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Summary metrics skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>

      {/* Content area skeleton */}
      <div className="space-y-4">
        <div className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>

      {/* Action buttons skeleton */}
      <div className="flex gap-2 pt-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
    </CardContent>
  </Card>
);

export const LazyComparisonSummary = createLazyComponent(
  () => import('@/components/ComparisonSummary').then(module => ({
    default: module.ComparisonSummary
  })),
  <LoadingFallback />
);
