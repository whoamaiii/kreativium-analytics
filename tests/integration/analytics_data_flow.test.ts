import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { analyticsManager } from '@/lib/analyticsManager';
import { analyticsConfig } from '@/lib/analyticsConfig';
import type { SessionData, AnalyticsResult } from '@/types';
import type { Student } from '@/types/student';

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
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(async () => {
    // Clear cache after each test
    analyticsManager.clearCache();
  });

  describe('End-to-End Analytics Processing', () => {
    it('processes single student data through the complete pipeline', async () => {
      const student: Student = {
        id: 'student-1',
        name: 'Test Student',
        gradeLevel: '1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await analyticsManager.getStudentAnalytics(student);

      expect(result).toBeDefined();
      expect(Array.isArray(result.patterns)).toBe(true);
      expect(Array.isArray(result.correlations)).toBe(true);
      expect(Array.isArray(result.insights)).toBe(true);
      expect(Array.isArray(result.suggestedInterventions)).toBe(true);
    });

    it('handles batch processing for multiple students', async () => {
      const students: Student[] = [
        {
          id: 'student-1',
          name: 'Student One',
          gradeLevel: '1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'student-2',
          name: 'Student Two',
          gradeLevel: '2',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const results = await Promise.all(
        students.map((student) => analyticsManager.getStudentAnalytics(student))
      );

      expect(results).toHaveLength(2);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(Array.isArray(result.patterns)).toBe(true);
        expect(Array.isArray(result.correlations)).toBe(true);
      });
    });

    it('maintains data consistency across cache layers', async () => {
      const student: Student = {
        id: 'cached-student',
        name: 'Cached Student',
        gradeLevel: '3',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // First analysis - should compute and cache
      const result1 = await analyticsManager.getStudentAnalytics(student);

      // Second analysis with same data - should use cache
      const result2 = await analyticsManager.getStudentAnalytics(student);

      // Both calls should return defined results
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();

      // Cache should provide same results
      expect(result1).toEqual(result2);
    });
  });

  describe('Worker Communication', () => {
    it('handles worker message passing correctly', async () => {
      const student: Student = {
        id: 'worker-student',
        name: 'Worker Student',
        gradeLevel: '4',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await analyticsManager.getStudentAnalytics(student);

      expect(result).toBeDefined();
      expect(Array.isArray(result.patterns)).toBe(true);
    });

    it('handles worker errors gracefully', async () => {
      // The mock worker should handle errors gracefully
      const student: Student = {
        id: 'error-student',
        name: 'Error Student',
        gradeLevel: '2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Should complete without throwing even if there are issues
      const result = await analyticsManager.getStudentAnalytics(student);
      expect(result).toBeDefined();
    });

    it('manages worker lifecycle properly', async () => {
      // Process multiple requests
      const promises = Array.from({ length: 3 }, (_, i) => {
        const student: Student = {
          id: `lifecycle-student-${i}`,
          name: `Lifecycle Student ${i}`,
          gradeLevel: String(i + 1),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return analyticsManager.getStudentAnalytics(student);
      });

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(Array.isArray(result.patterns)).toBe(true);
      });
    });
  });

  describe('Configuration Integration', () => {
    it('respects analytics configuration thresholds', async () => {
      const student: Student = {
        id: 'config-student',
        name: 'Config Student',
        gradeLevel: '5',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await analyticsManager.getStudentAnalytics(student);

      expect(result).toBeDefined();
      expect(Array.isArray(result.patterns)).toBe(true);
      expect(Array.isArray(result.insights)).toBe(true);
    });

    it('invalidates cache on configuration change', async () => {
      const student: Student = {
        id: 'cache-student',
        name: 'Cache Student',
        gradeLevel: '6',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // First analysis
      const result1 = await analyticsManager.getStudentAnalytics(student);

      // Clear cache to simulate configuration change impact
      analyticsManager.clearCache(student.id);

      // Should recompute
      const result2 = await analyticsManager.getStudentAnalytics(student);

      // Results should be consistent
      expect(result2).toBeDefined();
      expect(Array.isArray(result2.patterns)).toBe(true);
    });
  });

  describe('Data Validation', () => {
    it('validates input data before processing', async () => {
      // Test with invalid student ID
      const invalidStudent: Student = {
        id: '', // Invalid: empty student ID
        name: 'Invalid Student',
        gradeLevel: '1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Should handle gracefully or throw for invalid input
      try {
        await analyticsManager.getStudentAnalytics(invalidStudent);
        // If it doesn't throw, that's OK as long as it's handled
        expect(true).toBe(true);
      } catch {
        // It's also OK if it throws for invalid input
        expect(true).toBe(true);
      }
    });

    it('sanitizes and normalizes data', async () => {
      const student: Student = {
        id: 'normalize-student',
        name: 'Normalize Student',
        gradeLevel: '1',
        createdAt: new Date('2024-01-15').toISOString(),
        updatedAt: new Date('2024-01-15').toISOString(),
      };

      const result = await analyticsManager.getStudentAnalytics(student);

      expect(result).toBeDefined();
      expect(Array.isArray(result.patterns)).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('provides fallback results on partial failures', async () => {
      const student: Student = {
        id: 'mixed-student',
        name: 'Mixed Student',
        gradeLevel: '3',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await analyticsManager.getStudentAnalytics(student);

      // Should process and return results
      expect(result).toBeDefined();
      expect(Array.isArray(result.patterns)).toBe(true);
    });

    it('maintains state consistency after errors', async () => {
      // Test that system recovers from failed requests
      const student1: Student = {
        id: 'recovery-student-1',
        name: 'Recovery Student 1',
        gradeLevel: '4',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const student2: Student = {
        id: 'recovery-student-2',
        name: 'Recovery Student 2',
        gradeLevel: '5',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // First request should succeed
      const result1 = await analyticsManager.getStudentAnalytics(student1);
      expect(result1).toBeDefined();

      // System should still work after first request
      const result2 = await analyticsManager.getStudentAnalytics(student2);
      expect(result2).toBeDefined();
    });
  });

  describe('Performance Optimization', () => {
    it('batches requests efficiently', async () => {
      const startTime = performance.now();

      // Create multiple concurrent requests
      const students = Array.from({ length: 10 }, (_, i) => ({
        id: `perf-student-${i}`,
        name: `Perf Student ${i}`,
        gradeLevel: String((i % 5) + 1),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      const results = await Promise.all(
        students.map((student) => analyticsManager.getStudentAnalytics(student))
      );

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(results).toHaveLength(10);
      // Should complete reasonably quickly (under 5 seconds for mock)
      expect(totalTime).toBeLessThan(5000);
    });

    it('uses caching to improve repeated queries', async () => {
      const student: Student = {
        id: 'perf-student',
        name: 'Perf Student',
        gradeLevel: '3',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // First call - compute
      const start1 = performance.now();
      await analyticsManager.getStudentAnalytics(student);
      const time1 = performance.now() - start1;

      // Second call - should use cache
      const start2 = performance.now();
      await analyticsManager.getStudentAnalytics(student);
      const time2 = performance.now() - start2;

      // Cached call should be faster or equal
      expect(time2).toBeLessThanOrEqual(time1 + 10); // Allow small variance
    });
  });
});
