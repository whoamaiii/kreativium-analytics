/**
 * @file Low-level localStorage adapter with SSR safety and error handling.
 */

import { logger } from '@/lib/logger';

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export class LocalStorageAdapter {
  private readonly storage = getStorage();

  read<T>(key: string): T | null {
    if (!this.storage) return null;
    try {
      const raw = this.storage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  write<T>(key: string, value: T): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(key, JSON.stringify(value));
    } catch (error) {
      logger.warn('[LocalStorageAdapter] Failed to persist key', { key, error });
    }
  }

  remove(key: string): void {
    if (!this.storage) return;
    try {
      this.storage.removeItem(key);
    } catch (error) {
      logger.warn('[LocalStorageAdapter] Failed to remove key', { key, error });
    }
  }

  clearNamespace(prefix: string): void {
    if (!this.storage) return;
    try {
      const keys = Object.keys(this.storage).filter((key) => key.startsWith(prefix));
      keys.forEach((key) => this.storage?.removeItem(key));
    } catch (error) {
      logger.warn('[LocalStorageAdapter] Failed to clear namespace', { prefix, error });
    }
  }

  footprint(prefix: string): Array<{ key: string; bytes: number }> {
    if (!this.storage) return [];
    const entries: Array<{ key: string; bytes: number }> = [];
    try {
      for (let i = 0; i < this.storage.length; i += 1) {
        const key = this.storage.key(i);
        if (!key || !key.startsWith(prefix)) continue;
        const value = this.storage.getItem(key) ?? '';
        entries.push({ key, bytes: new Blob([value]).size });
      }
    } catch (error) {
      logger.warn('[LocalStorageAdapter] Failed to compute footprint', { error });
    }
    return entries;
  }
}



