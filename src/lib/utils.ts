import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { logger } from '@/lib/logger';
import type { TrackingEntry } from '@/types/student';

/**
 * A utility function that merges Tailwind CSS classes with clsx for conditional class handling.
 *
 * This function is a common pattern in projects that use shadcn/ui. It allows you to
 * conditionally apply classes and merge them with existing Tailwind classes without
 * conflicts.
 *
 * @param inputs - An array of class values to be merged.
 * @returns The merged class string.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(...inputs));
}

/**
 * Creates a downloadable link for a Blob and triggers the download.
 * This helper prevents memory leaks by revoking the object URL after the download.
 *
 * @param blob - The Blob object to download.
 * @param filename - The name of the file to be downloaded.
 */
export const downloadBlob = (blob: Blob, filename: string) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    logger.error('downloadBlob called in a non-browser environment');
    return;
  }

  const safeName = (filename ?? '').trim() || 'download';
  let url: string | undefined;

  try {
    url = window.URL.createObjectURL(blob);
    logger.debug('[BLOB_URL] Created URL', { url, filename: safeName, blobSize: blob.size });
    const link = document.createElement('a');
    link.href = url;
    link.download = safeName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    logger.error('downloadBlob failed', err);
  } finally {
    if (url) {
      // Defer revocation to avoid timing races in some browsers
      setTimeout(() => {
        URL.revokeObjectURL(url!);
        logger.debug('[BLOB_URL] Revoked URL', { url, filename: safeName });
      }, 0);
    }
  }
};

// -----------------------------------------------------------------------------
// Tiny analytics utilities
// -----------------------------------------------------------------------------

// Clamp a number to the [0,1] range
export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

// Round to 2 decimal places
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Get the timestamp (ms since epoch) of the last tracking entry; null if none
export function getLastTimestamp(entries: readonly TrackingEntry[]): number | null {
  if (!entries || entries.length === 0) return null;
  const last = entries[entries.length - 1];
  return last && last.timestamp ? new Date(last.timestamp).getTime() : null;
}

// Check whether a given fromTs is within N days of nowTs.
// Inclusive behavior: difference in days <= days
export function isWithinDays(fromTs: number, days: number, nowTs: number = Date.now()): boolean {
  if (!Number.isFinite(fromTs) || !Number.isFinite(days) || days < 0) return false;
  const msDiff = nowTs - fromTs;
  if (msDiff < 0) return false; // future timestamps are not within past days
  const daysDiff = msDiff / (1000 * 60 * 60 * 24);
  return daysDiff <= days;
}
