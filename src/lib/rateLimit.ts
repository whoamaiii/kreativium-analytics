/**
 * Simple once-per-key rate limiter for side effects like logging or toasts.
 * Ensures a given function runs at most once within ttlMs for a specific key.
 */
const onceWindow = new Map<string, number>();

export function doOnce(key: string, ttlMs: number, fn: () => void): void {
  const now = Date.now();
  const last = onceWindow.get(key) ?? 0;
  if (now - last > Math.max(0, ttlMs)) {
    onceWindow.set(key, now);
    try {
      fn();
    } catch {
      // noop
    }
  }
}




