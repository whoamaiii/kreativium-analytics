/**
 * Persistent Cache Module using IndexedDB
 *
 * @module analytics/persistentCache
 *
 * @description Provides a persistent caching layer using IndexedDB that survives
 * page reloads, worker restarts, and browser sessions. Designed for analytics
 * results that are expensive to compute.
 *
 * **Features**:
 * - Automatic IndexedDB initialization
 * - TTL-based expiration
 * - Tag-based invalidation
 * - Memory cache backed by persistent storage
 * - Graceful degradation to memory-only
 */

import { logger } from '@/lib/logger';
import { safeCatch } from '@/lib/errors/safeExecute';

const DB_NAME = 'kreativium-analytics-cache';
const DB_VERSION = 1;
const STORE_NAME = 'analytics-cache';

/**
 * Cache entry structure
 */
export interface PersistentCacheEntry<T = unknown> {
  key: string;
  data: T;
  expires: number;
  tags: string[];
  createdAt: number;
  accessCount: number;
  lastAccessedAt: number;
}

/**
 * Cache statistics
 */
export interface PersistentCacheStats {
  size: number;
  hits: number;
  misses: number;
  writes: number;
  evictions: number;
  hitRate: number;
  persistenceEnabled: boolean;
}

class PersistentCacheService {
  private db: IDBDatabase | null = null;
  private memoryCache: Map<string, PersistentCacheEntry> = new Map();
  private initPromise: Promise<boolean> | null = null;
  private persistenceEnabled = true;
  private stats = {
    hits: 0,
    misses: 0,
    writes: 0,
    evictions: 0,
  };

  constructor() {
    // Initialize lazily on first use
  }

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<boolean> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<boolean> {
    // Check for IndexedDB support
    if (typeof indexedDB === 'undefined') {
      logger.warn('[PersistentCache] IndexedDB not available, using memory-only mode');
      this.persistenceEnabled = false;
      return false;
    }

    try {
      return await new Promise<boolean>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          logger.warn('[PersistentCache] IndexedDB open failed', { error: request.error });
          this.persistenceEnabled = false;
          resolve(false);
        };

        request.onsuccess = () => {
          this.db = request.result;
          logger.info('[PersistentCache] IndexedDB initialized successfully');

          // Handle connection close
          this.db.onclose = () => {
            logger.warn('[PersistentCache] IndexedDB connection closed');
            this.db = null;
          };

          // Load existing entries into memory cache
          this.loadFromStorage().then(() => resolve(true));
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Create the object store with key path
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });

            // Create indexes for efficient queries
            store.createIndex('expires', 'expires', { unique: false });
            store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
            store.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });

            logger.info('[PersistentCache] Created IndexedDB object store');
          }
        };
      });
    } catch (error) {
      logger.warn('[PersistentCache] IndexedDB initialization failed', { error });
      this.persistenceEnabled = false;
      return false;
    }
  }

  /**
   * Load existing entries from IndexedDB into memory cache
   */
  private async loadFromStorage(): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const now = Date.now();

      const request = store.getAll();

      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          const entries = request.result as PersistentCacheEntry[];
          let loaded = 0;
          let expired = 0;

          for (const entry of entries) {
            if (entry.expires > now) {
              this.memoryCache.set(entry.key, entry);
              loaded++;
            } else {
              expired++;
              // Queue expired entry for deletion
              this.deleteFromStorage(entry.key).catch(safeCatch('persistentCache.loadFromStorage.deleteExpired'));
            }
          }

          logger.info('[PersistentCache] Loaded entries from IndexedDB', { loaded, expired });
          resolve();
        };

        request.onerror = () => {
          logger.warn('[PersistentCache] Failed to load from IndexedDB', { error: request.error });
          resolve(); // Continue with empty cache
        };
      });
    } catch (error) {
      logger.warn('[PersistentCache] Failed to load from storage', { error });
    }
  }

  /**
   * Get a cached value
   */
  async get<T>(key: string): Promise<T | undefined> {
    await this.init();

    const entry = this.memoryCache.get(key);
    const now = Date.now();

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    if (entry.expires <= now) {
      // Entry expired
      this.stats.misses++;
      this.memoryCache.delete(key);
      this.deleteFromStorage(key).catch(safeCatch('persistentCache.get.deleteExpired'));
      return undefined;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessedAt = now;
    this.stats.hits++;

    // Update in storage (non-blocking)
    this.saveToStorage(entry).catch(safeCatch('persistentCache.get.saveAccessStats'));

    return entry.data as T;
  }

  /**
   * Set a cached value
   */
  async set<T>(key: string, data: T, ttlMs: number, tags: string[] = []): Promise<void> {
    await this.init();

    const now = Date.now();
    const entry: PersistentCacheEntry<T> = {
      key,
      data,
      expires: now + ttlMs,
      tags,
      createdAt: now,
      accessCount: 0,
      lastAccessedAt: now,
    };

    this.memoryCache.set(key, entry as PersistentCacheEntry);
    this.stats.writes++;

    // Persist to IndexedDB (non-blocking)
    this.saveToStorage(entry).catch((error) => {
      logger.debug('[PersistentCache] Failed to persist entry', { key, error });
    });
  }

  /**
   * Check if a key exists and is not expired
   */
  async has(key: string): Promise<boolean> {
    await this.init();

    const entry = this.memoryCache.get(key);
    if (!entry) return false;

    if (entry.expires <= Date.now()) {
      this.memoryCache.delete(key);
      this.deleteFromStorage(key).catch(safeCatch('persistentCache.has.deleteExpired'));
      return false;
    }

    return true;
  }

  /**
   * Delete a cached value
   */
  async delete(key: string): Promise<boolean> {
    await this.init();

    const existed = this.memoryCache.has(key);
    this.memoryCache.delete(key);
    this.deleteFromStorage(key).catch(safeCatch('persistentCache.delete'));

    if (existed) {
      this.stats.evictions++;
    }

    return existed;
  }

  /**
   * Invalidate entries by tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    await this.init();

    let count = 0;
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.memoryCache) {
      if (entry.tags.includes(tag)) {
        keysToDelete.push(key);
        count++;
      }
    }

    for (const key of keysToDelete) {
      this.memoryCache.delete(key);
      this.deleteFromStorage(key).catch(safeCatch('persistentCache.invalidateByTag.delete'));
    }

    this.stats.evictions += count;
    logger.debug('[PersistentCache] Invalidated by tag', { tag, count });

    return count;
  }

  /**
   * Clear all entries
   */
  async clear(): Promise<void> {
    await this.init();

    const count = this.memoryCache.size;
    this.memoryCache.clear();
    this.stats.evictions += count;

    if (this.db) {
      try {
        const tx = this.db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();

        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });

        logger.info('[PersistentCache] Cleared all entries', { count });
      } catch (error) {
        logger.warn('[PersistentCache] Failed to clear IndexedDB', { error });
      }
    }
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<number> {
    await this.init();

    const now = Date.now();
    let count = 0;
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.memoryCache) {
      if (entry.expires <= now) {
        keysToDelete.push(key);
        count++;
      }
    }

    for (const key of keysToDelete) {
      this.memoryCache.delete(key);
      this.deleteFromStorage(key).catch(safeCatch('persistentCache.cleanup.deleteExpired'));
    }

    this.stats.evictions += count;
    logger.debug('[PersistentCache] Cleanup completed', { expiredCount: count });

    return count;
  }

  /**
   * Get cache statistics
   */
  getStats(): PersistentCacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      size: this.memoryCache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      writes: this.stats.writes,
      evictions: this.stats.evictions,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      persistenceEnabled: this.persistenceEnabled,
    };
  }

  /**
   * Get all keys (for debugging)
   */
  getKeys(): string[] {
    return Array.from(this.memoryCache.keys());
  }

  // Private helpers for IndexedDB operations

  private async saveToStorage(entry: PersistentCacheEntry): Promise<void> {
    if (!this.db || !this.persistenceEnabled) return;

    try {
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(entry);

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      logger.debug('[PersistentCache] Save to storage failed', { key: entry.key, error });
    }
  }

  private async deleteFromStorage(key: string): Promise<void> {
    if (!this.db || !this.persistenceEnabled) return;

    try {
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      logger.debug('[PersistentCache] Delete from storage failed', { key, error });
    }
  }
}

// Singleton instance
export const persistentCache = new PersistentCacheService();

/**
 * Create a scoped cache instance with a key prefix
 *
 * @param prefix - Prefix for all keys in this scope
 * @returns Scoped cache interface
 */
export function createScopedCache(prefix: string) {
  const scopedKey = (key: string) => `${prefix}:${key}`;

  return {
    async get<T>(key: string): Promise<T | undefined> {
      return persistentCache.get<T>(scopedKey(key));
    },

    async set<T>(key: string, data: T, ttlMs: number, tags: string[] = []): Promise<void> {
      return persistentCache.set(scopedKey(key), data, ttlMs, [prefix, ...tags]);
    },

    async has(key: string): Promise<boolean> {
      return persistentCache.has(scopedKey(key));
    },

    async delete(key: string): Promise<boolean> {
      return persistentCache.delete(scopedKey(key));
    },

    async invalidateAll(): Promise<number> {
      return persistentCache.invalidateByTag(prefix);
    },

    getStats(): PersistentCacheStats {
      return persistentCache.getStats();
    },
  };
}
