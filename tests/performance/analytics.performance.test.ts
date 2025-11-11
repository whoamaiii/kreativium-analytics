import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { performance } from 'perf_hooks';
import { AnalyticsManager } from '@/lib/analyticsManager';
import { dataTransformations } from '@/lib/dataTransformations';
import { enhancedPatternAnalysis } from '@/lib/enhancedPatternAnalysis';
import type { SessionData } from '@/types';

// Performance thresholds from CI environment
const CI_PERF_THRESHOLD_MS = Number(process.env.CI_PERF_THRESHOLD_MS) || 1500;
const OPERATIONS_PER_SECOND_TARGET = 1000;
const MEMORY_THRESHOLD_MB = 50;

// Helper to measure execution time
async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T> | T,
): Promise<{ result: T; duration: number; memory: number }> {
  const startMemory = process.memoryUsage().heapUsed;
  const startTime = performance.now();

  const result = await fn();

  const endTime = performance.now();
  const endMemory = process.memoryUsage().heapUsed;

  return {
    result,
    duration: endTime - startTime,
    memory: (endMemory - startMemory) / 1024 / 1024, // Convert to MB
  };
}

// Generate test data
function generateLargeDataset(size: number): SessionData[] {
  return Array.from({ length: size }, (_, i) => ({
    id: `session-${i}`,
    studentId: `student-${i % 100}`,
    date: new Date(Date.now() - i * 86400000).toISOString(),
    duration: 30 + (i % 60),
    progress: Math.random(),
    tasks: Array.from({ length: 5 }, (_, j) => ({
      id: `task-${i}-${j}`,
      name: `Task ${j}`,
      completed: Math.random() > 0.5,
      score: Math.random() * 100,
    })),
  }));
}

describe('Analytics Performance Tests', () => {
  let manager: AnalyticsManager;

  beforeEach(() => {
    manager = new AnalyticsManager();
  });

  afterEach(async () => {
    await manager.cleanup();
  });

  describe('Data Processing Performance', () => {
    it('processes small dataset within threshold', async () => {
      const data = generateLargeDataset(100);

      const { duration, memory } = await measurePerformance('small-dataset', () =>
        manager.analyzeStudent('student-1', data),
      );

      expect(duration).toBeLessThan(CI_PERF_THRESHOLD_MS / 10);
      expect(memory).toBeLessThan(MEMORY_THRESHOLD_MB / 10);
    });

    it('processes medium dataset within threshold', async () => {
      const data = generateLargeDataset(1000);

      const { duration, memory } = await measurePerformance('medium-dataset', () =>
        manager.analyzeStudent('student-1', data),
      );

      expect(duration).toBeLessThan(CI_PERF_THRESHOLD_MS / 2);
      expect(memory).toBeLessThan(MEMORY_THRESHOLD_MB / 2);
    });

    it('processes large dataset within threshold', async () => {
      const data = generateLargeDataset(5000);

      const { duration, memory } = await measurePerformance('large-dataset', () =>
        manager.analyzeStudent('student-1', data),
      );

      expect(duration).toBeLessThan(CI_PERF_THRESHOLD_MS);
      expect(memory).toBeLessThan(MEMORY_THRESHOLD_MB);
    });

    it('handles concurrent processing efficiently', async () => {
      const datasets = Array.from({ length: 10 }, (_, i) => generateLargeDataset(500));

      const startTime = performance.now();

      const promises = datasets.map((data, i) => manager.analyzeStudent(`student-${i}`, data));

      await Promise.all(promises);

      const totalDuration = performance.now() - startTime;

      // Concurrent processing should be faster than sequential
      expect(totalDuration).toBeLessThan(CI_PERF_THRESHOLD_MS * 3);
    });
  });

  describe('Data Transformation Performance', () => {
    it('normalizes data efficiently', async () => {
      const data = generateLargeDataset(10000);

      const { duration } = await measurePerformance('normalization', () =>
        dataTransformations.normalize(data),
      );

      const operationsPerSecond = (data.length / duration) * 1000;
      expect(operationsPerSecond).toBeGreaterThan(OPERATIONS_PER_SECOND_TARGET);
    });

    it('aggregates data efficiently', async () => {
      const data = generateLargeDataset(10000);

      const { duration } = await measurePerformance('aggregation', () =>
        dataTransformations.aggregate(data, 'daily'),
      );

      expect(duration).toBeLessThan(CI_PERF_THRESHOLD_MS / 2);
    });

    it('filters data efficiently', async () => {
      const data = generateLargeDataset(10000);

      const { duration } = await measurePerformance('filtering', () =>
        dataTransformations.filter(data, {
          dateRange: {
            start: new Date(Date.now() - 30 * 86400000),
            end: new Date(),
          },
          minProgress: 0.5,
        }),
      );

      const operationsPerSecond = (data.length / duration) * 1000;
      expect(operationsPerSecond).toBeGreaterThan(OPERATIONS_PER_SECOND_TARGET * 2);
    });
  });

  describe('Pattern Analysis Performance', () => {
    it('detects patterns in reasonable time', async () => {
      const data = generateLargeDataset(2000);

      const { duration, memory } = await measurePerformance('pattern-detection', () =>
        enhancedPatternAnalysis.detectPatterns(data),
      );

      expect(duration).toBeLessThan(CI_PERF_THRESHOLD_MS);
      expect(memory).toBeLessThan(MEMORY_THRESHOLD_MB);
    });

    it('identifies correlations efficiently', async () => {
      const data = generateLargeDataset(1000);

      const { duration } = await measurePerformance('correlation-analysis', () =>
        enhancedPatternAnalysis.findCorrelations(data),
      );

      expect(duration).toBeLessThan(CI_PERF_THRESHOLD_MS / 2);
    });

    it('generates insights quickly', async () => {
      const data = generateLargeDataset(1500);

      const { duration } = await measurePerformance('insight-generation', () =>
        enhancedPatternAnalysis.generateInsights(data),
      );

      expect(duration).toBeLessThan(CI_PERF_THRESHOLD_MS / 3);
    });
  });

  describe('Memory Management', () => {
    it('releases memory after processing', async () => {
      const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;

      // Process large dataset
      const data = generateLargeDataset(5000);
      await manager.analyzeStudent('student-1', data);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Wait a bit for cleanup
      await new Promise((resolve) => setTimeout(resolve, 100));

      const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal after cleanup
      expect(memoryIncrease).toBeLessThan(10);
    });

    it('handles memory pressure gracefully', async () => {
      const datasets = Array.from({ length: 50 }, () => generateLargeDataset(1000));

      let processedCount = 0;
      let errorCount = 0;

      for (const data of datasets) {
        try {
          await manager.analyzeStudent(`student-${processedCount}`, data);
          processedCount++;
        } catch (error) {
          errorCount++;
        }
      }

      // Should process most datasets without errors
      expect(processedCount).toBeGreaterThan(45);
      expect(errorCount).toBeLessThan(5);
    });
  });

  describe('Cache Performance', () => {
    it('cache lookups are fast', async () => {
      const data = generateLargeDataset(1000);

      // First call - compute
      await manager.analyzeStudent('cached-student', data);

      // Second call - should use cache
      const { duration } = await measurePerformance('cache-lookup', () =>
        manager.analyzeStudent('cached-student', data),
      );

      // Cache lookup should be very fast
      expect(duration).toBeLessThan(10);
    });

    it('cache invalidation is efficient', async () => {
      const datasets = Array.from({ length: 100 }, (_, i) => ({
        id: `student-${i}`,
        data: generateLargeDataset(100),
      }));

      // Fill cache
      for (const { id, data } of datasets) {
        await manager.analyzeStudent(id, data);
      }

      const { duration } = await measurePerformance('cache-invalidation', () =>
        manager.clearCache(),
      );

      // Clearing cache should be fast
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Worker Performance', () => {
    it('worker initialization is fast', async () => {
      const { duration } = await measurePerformance('worker-init', () =>
        manager.initializeWorker(),
      );

      expect(duration).toBeLessThan(100);
    });

    it('worker communication has low overhead', async () => {
      const data = generateLargeDataset(500);

      // Measure with worker
      const { duration: withWorker } = await measurePerformance('with-worker', () =>
        manager.analyzeStudent('worker-test', data),
      );

      // Measure without worker (fallback)
      manager.disableWorker();
      const { duration: withoutWorker } = await measurePerformance('without-worker', () =>
        manager.analyzeStudent('fallback-test', data),
      );

      // Worker overhead should be minimal
      const overhead = withWorker - withoutWorker;
      expect(Math.abs(overhead)).toBeLessThan(50);
    });
  });

  describe('Scalability Tests', () => {
    it('scales linearly with data size', async () => {
      const sizes = [100, 500, 1000, 2000];
      const durations: number[] = [];

      for (const size of sizes) {
        const data = generateLargeDataset(size);
        const { duration } = await measurePerformance(`scale-${size}`, () =>
          manager.analyzeStudent('scale-test', data),
        );
        durations.push(duration);
      }

      // Check if scaling is roughly linear
      for (let i = 1; i < sizes.length; i++) {
        const sizeRatio = sizes[i] / sizes[i - 1];
        const durationRatio = durations[i] / durations[i - 1];

        // Allow some deviation from linear scaling
        expect(durationRatio).toBeGreaterThan(sizeRatio * 0.7);
        expect(durationRatio).toBeLessThan(sizeRatio * 1.5);
      }
    });

    it('handles edge cases efficiently', async () => {
      const edgeCases = [
        { name: 'empty', data: [] },
        { name: 'single', data: generateLargeDataset(1) },
        { name: 'duplicates', data: Array(1000).fill(generateLargeDataset(1)[0]) },
        { name: 'sparse', data: generateLargeDataset(100).filter((_, i) => i % 10 === 0) },
      ];

      for (const { name, data } of edgeCases) {
        const { duration } = await measurePerformance(`edge-${name}`, () =>
          manager.analyzeStudent(`edge-${name}`, data),
        );

        // Edge cases should be handled quickly
        expect(duration).toBeLessThan(100);
      }
    });
  });

  describe('Benchmark Suite', () => {
    it('comprehensive benchmark', async () => {
      const results = {
        smallDataset: 0,
        mediumDataset: 0,
        largeDataset: 0,
        patternDetection: 0,
        concurrentProcessing: 0,
        cachePerformance: 0,
      };

      // Small dataset
      const small = await measurePerformance('benchmark-small', () =>
        manager.analyzeStudent('bench-1', generateLargeDataset(100)),
      );
      results.smallDataset = small.duration;

      // Medium dataset
      const medium = await measurePerformance('benchmark-medium', () =>
        manager.analyzeStudent('bench-2', generateLargeDataset(1000)),
      );
      results.mediumDataset = medium.duration;

      // Large dataset
      const large = await measurePerformance('benchmark-large', () =>
        manager.analyzeStudent('bench-3', generateLargeDataset(5000)),
      );
      results.largeDataset = large.duration;

      // Pattern detection
      const patterns = await measurePerformance('benchmark-patterns', () =>
        enhancedPatternAnalysis.detectPatterns(generateLargeDataset(2000)),
      );
      results.patternDetection = patterns.duration;

      // Concurrent processing
      const concurrent = await measurePerformance('benchmark-concurrent', () =>
        Promise.all(
          Array.from({ length: 5 }, (_, i) =>
            manager.analyzeStudent(`concurrent-${i}`, generateLargeDataset(500)),
          ),
        ),
      );
      results.concurrentProcessing = concurrent.duration;

      // Cache performance
      const cacheData = generateLargeDataset(1000);
      await manager.analyzeStudent('cache-test', cacheData);
      const cache = await measurePerformance('benchmark-cache', () =>
        manager.analyzeStudent('cache-test', cacheData),
      );
      results.cachePerformance = cache.duration;

      // Log benchmark results
      console.log('Performance Benchmark Results:', results);

      // Verify all benchmarks pass thresholds
      expect(results.smallDataset).toBeLessThan(CI_PERF_THRESHOLD_MS / 10);
      expect(results.mediumDataset).toBeLessThan(CI_PERF_THRESHOLD_MS / 2);
      expect(results.largeDataset).toBeLessThan(CI_PERF_THRESHOLD_MS);
      expect(results.patternDetection).toBeLessThan(CI_PERF_THRESHOLD_MS);
      expect(results.concurrentProcessing).toBeLessThan(CI_PERF_THRESHOLD_MS * 2);
      expect(results.cachePerformance).toBeLessThan(10);
    });
  });
});
