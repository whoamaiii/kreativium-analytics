import React, { Suspense, lazy } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye } from 'lucide-react';
import { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';

// Lazy load the heavy 3D component
const Visualization3D = lazy(() => import('@/components/Visualization3D').then(m => ({ default: m.Visualization3D })));

interface LazyVisualization3DProps {
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  trackingEntries: TrackingEntry[];
  correlationData?: {
    x: string;
    y: string;
    z: string;
    correlation: number;
  }[];
}

const Visualization3DFallback = () => (
  <Card className="w-full">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Eye className="h-5 w-5" />
        3D Correlation Visualization
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {/* Controls skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        
        {/* 3D visualization skeleton */}
        <div className="relative w-full h-[600px] bg-muted/50 rounded-lg overflow-hidden flex items-center justify-center" role="status" aria-live="polite">
          <div className="text-center space-y-2">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-sm text-muted-foreground">Loading 3D visualization...</p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const LazyVisualization3D: React.FC<LazyVisualization3DProps> = (props) => {
  return (
    <Suspense fallback={<Visualization3DFallback />}>
      <Visualization3D {...props} />
    </Suspense>
  );
};
