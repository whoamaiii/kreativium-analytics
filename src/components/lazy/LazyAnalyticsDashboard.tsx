import React, { Suspense, lazy } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain } from 'lucide-react';
import { Student, TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';
import { useTranslation } from '@/hooks/useTranslation';

// Lazy load the heavy analytics dashboard component
const AnalyticsDashboard = lazy(() =>
  import('@/components/AnalyticsDashboard').then((m) => ({ default: m.AnalyticsDashboard })),
);

interface LazyAnalyticsDashboardProps {
  student: Student;
  filteredData: {
    entries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
  };
  useAI?: boolean;
}

const AnalyticsDashboardFallback = () => {
  const { tAnalytics, tCommon } = useTranslation();
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            {String(tAnalytics('dashboard.titleLoading'))}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content skeleton (single region to keep DOM minimal) */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-[300px] w-full" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const LazyAnalyticsDashboard: React.FC<LazyAnalyticsDashboardProps> = (props) => {
  return (
    <Suspense fallback={<AnalyticsDashboardFallback />}>
      <AnalyticsDashboard {...props} />
    </Suspense>
  );
};
