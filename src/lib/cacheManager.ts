/**
 * @file src/lib/cacheManager.ts
 * Centralized cache manager service for coordinated cache clearing across the analytics system.
 *
 * Provides a unified interface for clearing caches across multiple subsystems:
 * - Analytics profiles
 * - Worker caches
 * - Hook performance caches
 * - Pattern analysis caches
 * - AI metrics
 */

import { logger } from '@/lib/logger';
import { analyticsManager } from '@/lib/analyticsManager';
import { storageSet } from '@/lib/storage/storageHelpers';

export interface CacheManagerResult {
  ok: boolean;
  message?: string;
  details?: Record<string, unknown>;
}

export interface CacheStatus {
  timestamp: number;
  services: string[];
  lastClearAll?: number;
  lastClearStudent?: { studentId: string; timestamp: number };
}

/**
 * Centralized cache manager service
 */
class CacheManagerService {
  private lastClearAll: number = 0;
  private lastClearStudent: { studentId: string; timestamp: number } | undefined;
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    // Initialize BroadcastChannel if available
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.broadcastChannel = new BroadcastChannel('analytics-cache');
      }
    } catch (e) {
      logger.warn('[cacheManager] BroadcastChannel not available', e as Error);
    }
  }

  /**
   * Clear all caches across the entire analytics system
   */
  async clearAllCaches(): Promise<CacheManagerResult> {
    try {
      logger.info('[cacheManager] Starting global cache clear');
      this.lastClearAll = Date.now();

      // Broadcast global cache clear event to all listeners
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('analytics:cache:clear'));
        } catch (e) {
          logger.warn('[cacheManager] Failed to broadcast cache clear event', e as Error);
        }
      }

      // Cross-tab broadcast via BroadcastChannel
      try {
        if (this.broadcastChannel) {
          this.broadcastChannel.postMessage({ type: 'clear' });
        }
      } catch (e) {
        logger.warn('[cacheManager] Failed to broadcast via BroadcastChannel', e as Error);
      }

      // Fallback cross-tab signal via localStorage
      try {
        storageSet('analytics:cache:signal', Date.now().toString(), {
          serialize: (value) => value,
        });
      } catch (e) {
        logger.warn('[cacheManager] Failed to set localStorage signal', e as Error);
      }

      // Coordinate with analytics manager (broadcast = false since we handle broadcasting here)
      const managerResult = await analyticsManager.clearAllAnalyticsCaches(false);

      logger.info('[cacheManager] Global cache clear completed', {
        managerResult,
        timestamp: this.lastClearAll,
      });

      return {
        ok: true,
        message: 'All caches cleared successfully',
        details: {
          timestamp: this.lastClearAll,
          managerResult,
        },
      };
    } catch (error) {
      logger.error('[cacheManager] Failed to clear all caches', error as Error);
      return {
        ok: false,
        message: 'Failed to clear all caches',
        details: { error: (error as Error).message },
      };
    }
  }

  /**
   * Clear caches for a specific student
   */
  async clearStudentCaches(studentId: string): Promise<CacheManagerResult> {
    if (!studentId || typeof studentId !== 'string') {
      return {
        ok: false,
        message: 'Invalid student ID provided',
      };
    }

    try {
      logger.info('[cacheManager] Starting student cache clear', { studentId });
      this.lastClearStudent = { studentId, timestamp: Date.now() };

      // Broadcast student-specific cache clear event
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(
            new CustomEvent('analytics:cache:clear:student', {
              detail: { studentId },
            }),
          );
        } catch (e) {
          logger.warn('[cacheManager] Failed to broadcast student cache clear event', e as Error);
        }
      }

      // Cross-tab broadcast via BroadcastChannel
      try {
        if (this.broadcastChannel) {
          this.broadcastChannel.postMessage({ type: 'clear-student', studentId });
        }
      } catch (e) {
        logger.warn(
          '[cacheManager] Failed to broadcast student clear via BroadcastChannel',
          e as Error,
        );
      }

      // Fallback cross-tab signal via localStorage
      try {
        storageSet('analytics:cache:signal:student', { studentId, timestamp: Date.now() });
      } catch (e) {
        logger.warn('[cacheManager] Failed to set localStorage student signal', e as Error);
      }

      // Coordinate with analytics manager
      const managerResult = await analyticsManager.clearStudentCaches(studentId);

      logger.info('[cacheManager] Student cache clear completed', {
        studentId,
        managerResult,
        timestamp: this.lastClearStudent.timestamp,
      });

      return {
        ok: true,
        message: `Student caches cleared for ${studentId}`,
        details: {
          studentId,
          timestamp: this.lastClearStudent.timestamp,
          managerResult,
        },
      };
    } catch (error) {
      logger.error('[cacheManager] Failed to clear student caches', error as Error);
      return {
        ok: false,
        message: `Failed to clear student caches for ${studentId}`,
        details: {
          studentId,
          error: (error as Error).message,
        },
      };
    }
  }

  /**
   * Clear caches by type (routes to clearAllAnalyticsCaches for now)
   */
  async clearCachesByType(cacheType: string): Promise<CacheManagerResult> {
    logger.info('[cacheManager] Clearing caches by type', { cacheType });

    // For now, route all type-specific clears to global clear
    // Future enhancement: implement type-specific clearing
    const result = await this.clearAllCaches();

    return {
      ...result,
      message: `Caches cleared for type: ${cacheType}`,
      details: {
        ...result.details,
        cacheType,
      },
    };
  }

  /**
   * Get current cache status
   */
  getCacheStatus(): CacheStatus {
    return {
      timestamp: Date.now(),
      services: [
        'analyticsManager',
        'analyticsProfiles',
        'workerCache',
        'performanceCache',
        'patternAnalysis',
      ],
      lastClearAll: this.lastClearAll || undefined,
      lastClearStudent: this.lastClearStudent,
    };
  }

  /**
   * Test connectivity to cache subsystems
   */
  async testCacheConnectivity(): Promise<{ [service: string]: boolean }> {
    const results: { [service: string]: boolean } = {};

    // Test analytics manager
    try {
      await analyticsManager.getCacheStatus?.();
      results.analyticsManager = true;
    } catch {
      results.analyticsManager = false;
    }

    // Test window event system
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cache:test'));
        results.windowEvents = true;
      } else {
        results.windowEvents = false;
      }
    } catch {
      results.windowEvents = false;
    }

    return results;
  }
}

// Export singleton instance
export const cacheManager = new CacheManagerService();

// Export types for external use
export type { CacheManagerService };
