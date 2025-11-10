import { createLazyComponent } from './LazyLoadWrapper';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

const LoadingFallback = () => (
  <Card className="w-full">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Clock className="h-5 w-5 animate-pulse" />
        Loading Timeline Visualization...
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Timeline controls skeleton */}
      <div className="flex gap-2 items-center">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 flex-1" />
      </div>

      {/* Timeline visualization skeleton */}
      <div className="w-full bg-muted/50 rounded-lg p-6">
        <Skeleton className="h-32 w-full mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>

      {/* Data stream toggles skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
    </CardContent>
  </Card>
);

export const LazyTimelineVisualization = createLazyComponent(
  () => import('@/components/TimelineVisualization').then(module => ({
    default: module.TimelineVisualization
  })),
  <LoadingFallback />
);
