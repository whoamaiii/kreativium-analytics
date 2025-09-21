/**
 * @fileoverview Performance monitoring hooks for React components
 * 
 * Provides utilities for tracking and optimizing component performance:
 * - Render time tracking
 * - Re-render counting
 * - Performance profiling integration
 * - Memory usage monitoring
 * 
 * @module hooks/usePerformanceMonitor
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { logger } from '@/lib/logger';

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  maxRenderTime: number;
  minRenderTime: number;
  totalRenderTime: number;
}

interface UsePerformanceMonitorOptions {
  /** Component name for logging */
  componentName: string;
  /** Threshold in ms to trigger warnings */
  warnThreshold?: number;
  /** Whether to log all renders (verbose mode) */
  verbose?: boolean;
  /** Whether to track memory usage */
  trackMemory?: boolean;
  /** Whether to send metrics to analytics */
  sendAnalytics?: boolean;
}

/**
 * Hook to monitor component render performance
 * 
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const metrics = usePerformanceMonitor({
 *     componentName: 'MyComponent',
 *     warnThreshold: 16, // Warn if render takes > 16ms (60 FPS)
 *   });
 * 
 *   return <div>...</div>;
 * };
 * ```
 */
export function usePerformanceMonitor(options: UsePerformanceMonitorOptions): PerformanceMetrics {
  const {
    componentName,
    warnThreshold = 16, // Default to 60 FPS threshold
    verbose = false,
    trackMemory = false,
    sendAnalytics = false,
  } = options;

  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);
  const lastRenderStart = useRef<number>(0);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    maxRenderTime: 0,
    minRenderTime: Infinity,
    totalRenderTime: 0,
  });

  // Track render start
  lastRenderStart.current = performance.now();

  useEffect(() => {
    renderCount.current++;
    const renderEnd = performance.now();
    const renderTime = renderEnd - lastRenderStart.current;
    renderTimes.current.push(renderTime);

    // Keep only last 100 render times to prevent memory leak
    if (renderTimes.current.length > 100) {
      renderTimes.current.shift();
    }

    // Calculate metrics
    const total = renderTimes.current.reduce((sum, time) => sum + time, 0);
    const average = total / renderTimes.current.length;
    const max = Math.max(...renderTimes.current);
    const min = Math.min(...renderTimes.current);

    const newMetrics: PerformanceMetrics = {
      renderCount: renderCount.current,
      lastRenderTime: renderTime,
      averageRenderTime: average,
      maxRenderTime: max,
      minRenderTime: min,
      totalRenderTime: total,
    };

    setMetrics(newMetrics);

    // Log warnings for slow renders
    if (renderTime > warnThreshold) {
      logger.warn(
        `[Performance] ${componentName} slow render detected`,
        {
          renderTime: renderTime.toFixed(2),
          renderCount: renderCount.current,
          threshold: warnThreshold,
        }
      );
    }

    // Verbose logging
    if (verbose) {
      logger.info(
        `[Performance] ${componentName} render #${renderCount.current}`,
        {
          renderTime: renderTime.toFixed(2),
          average: average.toFixed(2),
        }
      );
    }

    // Track memory usage if enabled
    if (trackMemory && 'memory' in performance) {
      const memory = (performance as any).memory;
      if (memory) {
        logger.info(`[Memory] ${componentName}`, {
          usedJSHeapSize: (memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
          totalJSHeapSize: (memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
          limit: (memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB',
        });
      }
    }

    // Cleanup function to log final stats
    return () => {
      if (renderCount.current > 10 && average > warnThreshold) {
        logger.warn(
          `[Performance Summary] ${componentName} performance issues detected`,
          {
            totalRenders: renderCount.current,
            averageRenderTime: average.toFixed(2),
            maxRenderTime: max.toFixed(2),
            recommendation: 'Consider optimizing with React.memo, useMemo, or useCallback',
          }
        );
      }
    };
  });

  return metrics;
}

/**
 * Hook to track why a component re-rendered
 * Useful for debugging unnecessary re-renders
 * 
 * @example
 * ```tsx
 * const MyComponent = ({ prop1, prop2, prop3 }) => {
 *   useWhyDidYouUpdate('MyComponent', { prop1, prop2, prop3 });
 *   return <div>...</div>;
 * };
 * ```
 */
export function useWhyDidYouUpdate(name: string, props: Record<string, any>) {
  const previousProps = useRef<Record<string, any>>();

  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, any> = {};

      allKeys.forEach((key) => {
        if (!Object.is(previousProps.current![key], props[key])) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length > 0) {
        logger.info(`[Why Update] ${name} re-rendered due to:`, changedProps);
      }
    }

    previousProps.current = props;
  });
}

/**
 * React Profiler callback for integration with React DevTools Profiler API
 * 
 * @example
 * ```tsx
 * import { Profiler } from 'react';
 * 
 * <Profiler id="MyComponent" onRender={onRenderCallback}>
 *   <MyComponent />
 * </Profiler>
 * ```
 */
export function onRenderCallback(
  id: string, // Component ID
  phase: 'mount' | 'update', // Mount or update phase
  actualDuration: number, // Time spent rendering
  baseDuration: number, // Estimated time without memoization
  startTime: number, // When React began rendering
  commitTime: number, // When React committed the update
  interactions: Set<any> // Interactions that triggered this update
) {
  const savings = baseDuration - actualDuration;
  const savingsPercent = (savings / baseDuration) * 100;

  if (actualDuration > 16) {
    logger.warn(`[Profiler] ${id} slow render`, {
      phase,
      actualDuration: actualDuration.toFixed(2),
      baseDuration: baseDuration.toFixed(2),
      memoizationSavings: savings > 0 ? `${savings.toFixed(2)}ms (${savingsPercent.toFixed(1)}%)` : 'None',
    });
  }

  // Log mount phase for initial load performance
  if (phase === 'mount') {
    logger.info(`[Profiler] ${id} mounted`, {
      mountTime: actualDuration.toFixed(2),
      startTime: startTime.toFixed(2),
      commitTime: commitTime.toFixed(2),
    });
  }
}

/**
 * Hook to measure and optimize expensive computations
 * 
 * @example
 * ```tsx
 * const MyComponent = ({ data }) => {
 *   const result = useComputationTimer(
 *     () => expensiveComputation(data),
 *     [data],
 *     'expensiveComputation'
 *   );
 *   return <div>{result}</div>;
 * };
 * ```
 */
export function useComputationTimer<T>(
  computation: () => T,
  deps: React.DependencyList,
  name: string
): T {
  const resultRef = useRef<T>();
  const computationTimeRef = useRef(0);

  // Check if dependencies changed
  const depsRef = useRef<React.DependencyList>();
  const depsChanged = !depsRef.current || 
    deps.length !== depsRef.current.length ||
    deps.some((dep, i) => !Object.is(dep, depsRef.current![i]));

  if (depsChanged) {
    const startTime = performance.now();
    resultRef.current = computation();
    const endTime = performance.now();
    computationTimeRef.current = endTime - startTime;
    depsRef.current = deps;

    if (computationTimeRef.current > 10) {
      logger.warn(`[Computation] ${name} took ${computationTimeRef.current.toFixed(2)}ms`);
    }
  }

  return resultRef.current as T;
}

/**
 * Hook to detect memory leaks in components
 * 
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   useMemoryLeakDetector('MyComponent');
 *   return <div>...</div>;
 * };
 * ```
 */
export function useMemoryLeakDetector(componentName: string) {
  const mountTime = useRef(Date.now());
  const updateCount = useRef(0);

  useEffect(() => {
    updateCount.current++;
  });

  useEffect(() => {
    const checkInterval = setInterval(() => {
      const lifetime = Date.now() - mountTime.current;
      const lifetimeMinutes = lifetime / 60000;

      // Warn if component has been alive for > 5 minutes with > 100 updates
      if (lifetimeMinutes > 5 && updateCount.current > 100) {
        logger.warn(`[Memory Leak?] ${componentName} potential memory leak detected`, {
          lifetime: `${lifetimeMinutes.toFixed(1)} minutes`,
          updateCount: updateCount.current,
          updatesPerMinute: (updateCount.current / lifetimeMinutes).toFixed(1),
        });
      }
    }, 60000); // Check every minute

    return () => {
      clearInterval(checkInterval);
      
      // Log component unmount stats
      const lifetime = Date.now() - mountTime.current;
      if (updateCount.current > 50) {
        logger.info(`[Unmount] ${componentName} unmounted`, {
          lifetime: `${(lifetime / 1000).toFixed(1)}s`,
          totalUpdates: updateCount.current,
        });
      }
    };
  }, [componentName]);
}

/**
 * Hook for batch performance monitoring across multiple components
 * Useful for tracking performance of component trees
 */
export function useBatchPerformanceMonitor() {
  const metricsMap = useRef<Map<string, PerformanceMetrics>>(new Map());

  const trackComponent = useCallback((componentName: string, metrics: PerformanceMetrics) => {
    metricsMap.current.set(componentName, metrics);
  }, []);

  const getReport = useCallback(() => {
    const report: Record<string, any> = {};
    let totalRenderTime = 0;
    let totalRenderCount = 0;

    metricsMap.current.forEach((metrics, name) => {
      report[name] = {
        renders: metrics.renderCount,
        avgTime: metrics.averageRenderTime.toFixed(2),
        maxTime: metrics.maxRenderTime.toFixed(2),
      };
      totalRenderTime += metrics.totalRenderTime;
      totalRenderCount += metrics.renderCount;
    });

    report.summary = {
      components: metricsMap.current.size,
      totalRenders: totalRenderCount,
      totalTime: totalRenderTime.toFixed(2),
      averageTime: (totalRenderTime / totalRenderCount).toFixed(2),
    };

    return report;
  }, []);

  const logReport = useCallback(() => {
    const report = getReport();
    logger.info('[Performance Report]', report);
  }, [getReport]);

  return {
    trackComponent,
    getReport,
    logReport,
  };
}

/**
 * Export all performance monitoring utilities
 */
// Intentionally remove default and aggregate exports per plan to reduce unused exports
