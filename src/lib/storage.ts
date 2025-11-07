import { storageUtils } from '@/lib/storageUtils';
import { safeLocalStorageGet, safeLocalStorageSet } from '@/lib/utils/errorHandling';

export function safeGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return safeLocalStorageGet(key, null as any, 'storage.safeGet') as string | null;
}

export function safeSet(key: string, value: string): void {
  if (typeof window !== 'undefined') {
    safeLocalStorageSet(key, value, 'storage.safeSet');
  } else {
    storageUtils.safeSetItem(key, value);
  }
}
