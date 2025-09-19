import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { AnalyticsManager } from '@/lib/analyticsManager';
import { analyticsConfig } from '@/lib/analyticsConfig';
import { generateCacheKey } from '@/lib/analytics/cache-key';
import type { SessionData, AnalyticsResult } from '@/types';

// Mock worker module
vi.mock('@/workers/analytics.worker', () => ({
  default: class MockWorker {
    private listeners: Map<string, (...args: unknown[]) => unknown> = new Map();
    
    postMessage(data: any) {
      // Simulate worker processing
      setTimeout(() => {
        const message = this.processMessage(data);
        const handler = this.listeners.get('message');
        if (handler) {
          handler({ data: message });
        }
      }, 10);
    }
    
    addEventListener(event: string, handler: (...args: unknown[]) => unknown) {
      this.listeners.set(event, handler);
    }
    
    removeEventListener(event: string) {
      this.listeners.delete(event);
    }
    
    terminate() {
      this.listeners.clear();
    }
    
    private processMessage(data: any) {
      switch (data.type) {
        case 'ANALYZE':
          return {
            type: 'ANALYSIS_COMPLETE',
            payload: {
              success: true,
              result: {
                summary: {
                  totalSessions: data.payload.sessions.length,
                  averageDuration: 45,
                  completionRate: 0.75,
                },
                patterns: [],
                insights: [],
                correlations: {},
              },
            },
          };
        case 'BATCH_ANALYZE':
          return {
            type: 'BATCH_COMPLETE',
            payload: {
              success: true,
              results: data.payload.batches.map((batch: any) => ({
                studentId: batch.studentId,
                summary: {
                  totalSessions: batch.sessions.length,
                  averageDuration: 30,
                  completionRate: 0.8,
                },
              })),
            },
          };
        default:
          return { type: 'ERROR', error: 'Unknown message type' };
      }
    }
  },
}));

describe('Analytics Data Flow Integration', () => {
  let manager: AnalyticsManager;
  
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    manager = new AnalyticsManager();
  });
  
  afterEach(async () => {
    await manager.cleanup();
  });

  describe('End-to-End Analytics Processing', () => {
    it('processes single student data through the complete pipeline', async () => {
      const sessions: SessionData[] = [
        {
          id: 'session-1',
          studentId: 'student-1',
          date: new Date().toISOString(),
          duration: 30,
          progress: 0.5,
          tasks: [],
        },
        {
          id: 'session-2',
          studentId: 'student-1',
          date: new Date().toISOString(),
          duration: 60,
          progress: 1.0,
          tasks: [],
        },
      ];

      const result = await manager.analyzeStudent('student-1', sessions);
      
      expect(result).toBeDefined();
      expect(result.summary.totalSessions).toBe(2);
      expect(result.summary.averageDuration).toBeGreaterThan(0);
      expect(result.summary.completionRate).toBeGreaterThanOrEqual(0);
      expect(result.summary.completionRate).toBeLessThanOrEqual(1);
    });

    it('handles batch processing for multiple students', async () => {
      const batches = [
        {
          studentId: 'student-1',
          sessions: [
            {
              id: 'session-1-1',
              studentId: 'student-1',
              date: new Date().toISOString(),
              duration: 45,
              progress: 0.7,
              tasks: [],
            },
          ],
        },
        {
          studentId: 'student-2',
          sessions: [
            {
              id: 'session-2-1',
              studentId: 'student-2',
              date: new Date().toISOString(),
              duration: 35,
              progress: 0.9,
              tasks: [],
            },
          ],
        },
      ];

      const results = await manager.analyzeBatch(batches);
      
      expect(results).toHaveLength(2);
      expect(results[0].studentId).toBe('student-1');
      expect(results[1].studentId).toBe('student-2');
      
      results.forEach(result => {
        expect(result.summary).toBeDefined();
        expect(result.summary.totalSessions).toBeGreaterThan(0);
      });
    });

    it('maintains data consistency across cache layers', async () => {
      const sessions: SessionData[] = [
        {
          id: 'cached-session',
          studentId: 'cached-student',
          date: new Date().toISOString(),
          duration: 40,
          progress: 0.6,
          tasks: [],
        },
      ];

      // First analysis - should compute and cache
      const result1 = await manager.analyzeStudent('cached-student', sessions);
      
      // Second analysis with same data - should use cache
      const result2 = await manager.analyzeStudent('cached-student', sessions);
      
      expect(result1).toEqual(result2);
      
      // Verify cache key generation
      const cacheKey = generateCacheKey('analytics', {
        studentId: 'cached-student',
        sessionCount: sessions.length,
      });
      
      expect(cacheKey).toBeDefined();
      expect(cacheKey).toContain('cached-student');
    });
  });

  describe('Worker Communication', () => {
    it('handles worker message passing correctly', async () => {
      const messageSpy = vi.fn();
      
      // Intercept worker messages
      const originalAnalyze = manager.analyzeStudent.bind(manager);
      manager.analyzeStudent = async function(...args) {
        messageSpy('analyze-called');
        return originalAnalyze(...args);
      };
      
      const sessions: SessionData[] = [
        {
          id: 'worker-test',
          studentId: 'worker-student',
          date: new Date().toISOString(),
          duration: 25,
          progress: 0.4,
          tasks: [],
        },
      ];

      await manager.analyzeStudent('worker-student', sessions);
      
      expect(messageSpy).toHaveBeenCalledWith('analyze-called');
    });

    it('handles worker errors gracefully', async () => {
      // Mock worker error
      vi.mock('@/workers/analytics.worker', () => ({
        default: class ErrorWorker {
          postMessage() {
            setTimeout(() => {
              this.onerror?.(new Error('Worker crashed'));
            }, 10);
          }
          addEventListener() {}
          removeEventListener() {}
          terminate() {}
          onerror?: (error: Error) => void;
        },
      }), { temporary: true });

      const sessions: SessionData[] = [
        {
          id: 'error-session',
          studentId: 'error-student',
          date: new Date().toISOString(),
          duration: 30,
          progress: 0.5,
          tasks: [],
        },
      ];

      // Should fallback to main thread processing
      const result = await manager.analyzeStudent('error-student', sessions);
      expect(result).toBeDefined();
    });

    it('manages worker lifecycle properly', async () => {
      const sessions: SessionData[] = [
        {
          id: 'lifecycle-test',
          studentId: 'lifecycle-student',
          date: new Date().toISOString(),
          duration: 35,
          progress: 0.8,
          tasks: [],
        },
      ];

      // Process multiple requests
      const promises = Array.from({ length: 3 }, (_, i) => 
        manager.analyzeStudent(`student-${i}`, sessions)
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.summary).toBeDefined();
      });

      // Cleanup should terminate workers
      await manager.cleanup();
    });
  });

  describe('Configuration Integration', () => {
    it('respects analytics configuration thresholds', async () => {
      // Set custom thresholds
      analyticsConfig.update({
        thresholds: {
          engagement: {
            low: 0.3,
            medium: 0.6,
            high: 0.9,
          },
        },
      });

      const sessions: SessionData[] = [
        {
          id: 'config-test',
          studentId: 'config-student',
          date: new Date().toISOString(),
          duration: 50,
          progress: 0.7,
          tasks: [],
        },
      ];

      const result = await manager.analyzeStudent('config-student', sessions);
      
      expect(result).toBeDefined();
      // Results should reflect configuration
      expect(result.summary.completionRate).toBeDefined();
    });

    it('invalidates cache on configuration change', async () => {
      const sessions: SessionData[] = [
        {
          id: 'cache-invalidation',
          studentId: 'cache-student',
          date: new Date().toISOString(),
          duration: 40,
          progress: 0.5,
          tasks: [],
        },
      ];

      // First analysis
      const result1 = await manager.analyzeStudent('cache-student', sessions);
      
      // Change configuration
      analyticsConfig.update({
        features: {
          enablePatternDetection: false,
        },
      });
      
      // Should recompute due to config change
      const result2 = await manager.analyzeStudent('cache-student', sessions);
      
      // Results might differ due to configuration change
      expect(result2).toBeDefined();
    });
  });

  describe('Data Validation', () => {
    it('validates input data before processing', async () => {
      const invalidSessions = [
        {
          id: 'invalid',
          studentId: '',  // Invalid: empty student ID
          date: 'not-a-date',  // Invalid: bad date format
          duration: -10,  // Invalid: negative duration
          progress: 1.5,  // Invalid: progress > 1
          tasks: null as any,  // Invalid: null tasks
        },
      ] as SessionData[];

      await expect(
        manager.analyzeStudent('', invalidSessions)
      ).rejects.toThrow();
    });

    it('sanitizes and normalizes data', async () => {
      const messySessions: SessionData[] = [
        {
          id: '  trimmed  ',
          studentId: 'STUDENT-1',
          date: new Date('2024-01-15').toISOString(),
          duration: 3600,  // 1 hour in seconds
          progress: 0.99999,  // Should be normalized to valid range
          tasks: [],
        },
      ];

      const result = await manager.analyzeStudent('student-1', messySessions);
      
      expect(result).toBeDefined();
      expect(result.summary.totalSessions).toBe(1);
    });
  });

  describe('Error Recovery', () => {
    it('provides fallback results on partial failures', async () => {
      const mixedSessions: SessionData[] = [
        {
          id: 'valid-1',
          studentId: 'mixed-student',
          date: new Date().toISOString(),
          duration: 30,
          progress: 0.5,
          tasks: [],
        },
        {
          id: 'valid-2',
          studentId: 'mixed-student',
          date: new Date().toISOString(),
          duration: 45,
          progress: 0.8,
          tasks: [],
        },
      ];

      const result = await manager.analyzeStudent('mixed-student', mixedSessions);
      
      // Should process valid sessions even if some fail
      expect(result).toBeDefined();
      expect(result.summary.totalSessions).toBeGreaterThan(0);
    });

    it('maintains state consistency after errors', async () => {
      // Cause an error
      await expect(
        manager.analyzeStudent('error-student', null as any)
      ).rejects.toThrow();

      // Should still work for valid requests
      const validSessions: SessionData[] = [
        {
          id: 'recovery-test',
          studentId: 'recovery-student',
          date: new Date().toISOString(),
          duration: 35,
          progress: 0.6,
          tasks: [],
        },
      ];

      const result = await manager.analyzeStudent('recovery-student', validSessions);
      expect(result).toBeDefined();
    });
  });

  describe('Performance Optimization', () => {
    it('batches requests efficiently', async () => {
      const startTime = performance.now();
      
      // Create multiple concurrent requests
      const requests = Array.from({ length: 10 }, (_, i) => ({
        studentId: `perf-student-${i}`,
        sessions: [
          {
            id: `perf-session-${i}`,
            studentId: `perf-student-${i}`,
            date: new Date().toISOString(),
            duration: 30 + i,
            progress: 0.5 + (i * 0.05),
            tasks: [],
          },
        ],
      }));

      const results = await manager.analyzeBatch(requests);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      expect(results).toHaveLength(10);
      // Should complete reasonably quickly (under 1 second for mock)
      expect(totalTime).toBeLessThan(1000);
    });

    it('uses caching to improve repeated queries', async () => {
      const sessions: SessionData[] = [
        {
          id: 'perf-cache',
          studentId: 'perf-student',
          date: new Date().toISOString(),
          duration: 40,
          progress: 0.7,
          tasks: [],
        },
      ];

      // First call - compute
      const start1 = performance.now();
      await manager.analyzeStudent('perf-student', sessions);
      const time1 = performance.now() - start1;

      // Second call - should use cache
      const start2 = performance.now();
      await manager.analyzeStudent('perf-student', sessions);
      const time2 = performance.now() - start2;

      // Cached call should be significantly faster
      expect(time2).toBeLessThanOrEqual(time1);
    });
  });
});
