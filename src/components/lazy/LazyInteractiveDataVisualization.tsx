import { createLazyComponent } from './LazyLoadWrapper';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertCircle } from 'lucide-react';
import { logger } from '@/lib/logger';

const LoadingFallback = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Activity className="h-5 w-5 animate-pulse" />
        Loading Interactive Visualization...
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex gap-4 mb-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const ErrorFallback = () => (
  <Card className="border-destructive/20">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-destructive">
        <AlertCircle className="h-5 w-5" />
        Failed to load Interactive Visualization
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">
        The interactive data visualization component could not be loaded. 
        This might be due to missing dependencies or a temporary loading issue.
      </p>
      <p className="text-sm text-muted-foreground mt-2">
        Please refresh the page or contact support if the issue persists.
      </p>
    </CardContent>
  </Card>
);

export const LazyInteractiveDataVisualization = createLazyComponent(
  () => {
    logger.debug('[LazyInteractiveDataVisualization] Loading main component');
    return import('@/components/InteractiveDataVisualization').then((mod) => {
      if (!mod.InteractiveDataVisualization) {
        throw new Error('InteractiveDataVisualization export not found');
      }
      return { default: mod.InteractiveDataVisualization } as { default: React.ComponentType<unknown> };
    });
  },
  <LoadingFallback />,
  <ErrorFallback />
);
