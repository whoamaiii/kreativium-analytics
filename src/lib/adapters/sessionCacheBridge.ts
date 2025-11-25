/**
 * @file Session cache bridge.
 *
 * Ensures analytics caches are invalidated whenever tracking sessions change.
 */

import { logger } from '@/lib/logger';
import { analyticsManager } from '@/lib/analyticsManager';
import { subscribeStorageEvent } from '@/lib/storage/storageEvents';

let unsubscribeSessions: (() => void) | null = null;

/**
 * Ensures analytics caches are invalidated whenever tracking sessions change.
 * This keeps the legacy analytics UI in sync with the new local-first session manager.
 */
export const ensureSessionAnalyticsBridge = (): void => {
  if (typeof window === 'undefined') return;
  if (unsubscribeSessions) return;

  unsubscribeSessions = subscribeStorageEvent('sessions', () => {
    try {
      analyticsManager.clearCache();
    } catch (error) {
      logger.debug('[sessionCacheBridge] Failed to clear analytics cache', { error });
    }
  });
};



