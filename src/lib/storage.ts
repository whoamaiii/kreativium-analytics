import { storageUtils } from '@/lib/storageUtils';

export function safeGet(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    } else {
      storageUtils.safeSetItem(key, value);
    }
  } catch {
    // no-op
  }
}
