/** @file Performance testing utilities for component renders and analytics */
import React, { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { performance } from 'perf_hooks';

/**
 * Performance measurement utilities for React component render optimization
 */
export interface RenderBenchmarkResult {
  componentName: string;
  averageRenderTime: number;
  minRenderTime: number;
  maxRenderTime: number;
  totalRenders: number;
  rerenderCount?: number;
}

export interface ComponentBenchmarkOptions {
  /** Number of render iterations to run */
  iterations?: number;
  /** Whether to include rerender testing */
  testRerenders?: boolean;
  /** Props to vary between renders (for rerender testing) */
  propVariations?: any[];
  /** Timeout per iteration in ms */
  timeoutMs?: number;
}

/**
 * Benchmark component render performance
 * @param componentName - Display name for the component
 * @param componentFactory - Function that returns the component to render
 * @param options - Benchmark configuration options
 */
export async function benchmarkComponentRender(
  componentName: string,
  componentFactory: () => ReactElement,
  options: ComponentBenchmarkOptions = {},
): Promise<RenderBenchmarkResult> {
  const {
    iterations = 100,
    testRerenders = false,
    propVariations = [],
    timeoutMs = 5000,
  } = options;

  const renderTimes: number[] = [];
  let rerenderCount = 0;

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Benchmark timeout after ${timeoutMs}ms`)), timeoutMs),
  );

  const benchmark = async () => {
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      const { rerender, unmount } = render(componentFactory());

      const renderTime = performance.now() - startTime;
      renderTimes.push(renderTime);

      // Test rerenders if requested
      if (testRerenders && propVariations.length > 0) {
        const rerenderStartTime = performance.now();
        const variation = propVariations[i % propVariations.length];

        // Create new component with varied props
        rerender(React.cloneElement(componentFactory(), variation));

        const rerenderTime = performance.now() - rerenderStartTime;
        renderTimes.push(rerenderTime);
        rerenderCount++;
      }

      unmount();

      // Yield to event loop
      if (i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  };

  try {
    await Promise.race([benchmark(), timeout]);
  } catch (error) {
    throw new Error(`Benchmark failed for ${componentName}: ${error}`);
  }

  const averageRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
  const minRenderTime = Math.min(...renderTimes);
  const maxRenderTime = Math.max(...renderTimes);

  return {
    componentName,
    averageRenderTime,
    minRenderTime,
    maxRenderTime,
    totalRenders: renderTimes.length,
    rerenderCount: testRerenders ? rerenderCount : undefined,
  };
}

/**
 * Measure render hotspots by comparing before/after optimization results
 */
export function calculateRenderImprovement(
  before: RenderBenchmarkResult,
  after: RenderBenchmarkResult,
): {
  improvementPercentage: number;
  avgRenderTimeReduction: number;
  significant: boolean;
} {
  const avgRenderTimeReduction = before.averageRenderTime - after.averageRenderTime;
  const improvementPercentage = (avgRenderTimeReduction / before.averageRenderTime) * 100;

  // Consider improvement significant if > 10% reduction
  const significant = improvementPercentage > 10;

  return {
    improvementPercentage,
    avgRenderTimeReduction,
    significant,
  };
}

/**
 * Legacy performance test function for analytics workloads
 */
export function trainToyModel(iterations = 5000): { avg: number; timeMs: number } {
  const start = performance.now();
  let sum = 0;
  for (let i = 1; i <= iterations; i++) {
    sum += Math.sin(i) * Math.cos(i / 2);
  }
  const timeMs = performance.now() - start;
  const avg = sum / iterations;
  return { avg, timeMs };
}
