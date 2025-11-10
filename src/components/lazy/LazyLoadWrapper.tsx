import React, { Suspense, lazy } from 'react';
import type { ComponentType } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { logger } from '@/lib/logger';

interface LazyLoadWrapperProps {
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  children: React.ReactNode;
}

const DefaultFallback = () => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-center space-y-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">Loading component...</p>
        </div>
      </div>
      <div className="space-y-3 mt-6">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-32 w-full" />
      </div>
    </CardContent>
  </Card>
);

const DefaultErrorFallback = () => (
  <Card className="border-destructive/20">
    <CardContent className="p-6">
      <div className="text-center">
        <p className="text-destructive font-medium">Failed to load component</p>
        <p className="text-sm text-muted-foreground mt-2">
          Please refresh the page or try again later.
        </p>
      </div>
    </CardContent>
  </Card>
);

export const LazyLoadWrapper = ({
  fallback = <DefaultFallback />,
  errorFallback = <DefaultErrorFallback />,
  children
}: LazyLoadWrapperProps) => {
  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

// Utility function to create lazy-loaded components with proper error handling
export function createLazyComponent<T extends ComponentType<unknown>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode,
  errorFallback?: React.ReactNode
): (props: React.ComponentProps<T>) => JSX.Element {
  const LazyComponent = lazy(importFunc);

  return function WrappedLazyComponent(props: React.ComponentProps<T>): JSX.Element {
    return (
      <LazyLoadWrapper fallback={fallback} errorFallback={errorFallback}>
        <LazyComponent {...props} />
      </LazyLoadWrapper>
    );
  };
}
