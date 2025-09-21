/* @unused-exports-keep: shared utility for migration guidance used by future deprecations */
import { logger } from '@/lib/logger';

/**
 * Tracks which deprecation warnings have been shown to avoid spam.
 */
const shownWarnings = new Set<string>();

/**
 * Emits a deprecation warning for a method, but only once per session to avoid spam.
 * @param methodName - The deprecated method name
 * @param replacement - Suggested replacement
 * @param additionalInfo - Additional migration guidance
 */
export function deprecate(
  methodName: string,
  replacement?: string,
  additionalInfo?: string
): void {
  const warningKey = methodName;
  if (shownWarnings.has(warningKey)) {
    return;
  }
  shownWarnings.add(warningKey);

  const replacementMsg = replacement ? ` Use ${replacement} instead.` : '';
  const additionalMsg = additionalInfo ? ` ${additionalInfo}` : '';
  
  logger.warn(
    `DEPRECATION WARNING: ${methodName} is deprecated.${replacementMsg}${additionalMsg}`
  );
}

/**
 * Clear all shown warnings (primarily for testing purposes).
 */
export function clearDeprecationWarnings(): void {
  shownWarnings.clear();
}
