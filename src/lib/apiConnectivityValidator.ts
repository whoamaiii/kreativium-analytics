/**
 * @file src/lib/apiConnectivityValidator.ts
 * Lightweight API connectivity validator for AI model availability.
 *
 * Performs a minimal request using OpenRouterClient with short timeouts to
 * verify connectivity and credentials. Results are cached for one hour in
 * localStorage keyed by model+key hash.
 */
import { logger } from '@/lib/logger';
import { openRouterClient, OpenRouterClient } from '@/lib/ai/openrouterClient';
import { storageUtils } from '@/lib/storageUtils';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { z } from 'zod';
import { ValidationResult } from '@/lib/validationTypes';

const ONE_HOUR_MS = 60 * 60 * 1000;

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

function readCache(): Record<string, { ok: boolean; ts: number; warnings?: string[]; errors?: string[] }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AI_CONNECTIVITY_CACHE);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || !parsed) return {};
    
    // Prune stale entries (older than 1 hour)
    const now = Date.now();
    const pruned: Record<string, { ok: boolean; ts: number; warnings?: string[]; errors?: string[] }> = {};
    let prunedCount = 0;
    
    for (const [key, entry] of Object.entries(parsed)) {
      if (typeof entry === 'object' && entry && typeof entry.ts === 'number') {
        if ((now - entry.ts) < ONE_HOUR_MS) {
          pruned[key] = entry;
        } else {
          prunedCount++;
        }
      }
    }
    
    // Cap to most recent 50 entries
    const entries = Object.entries(pruned);
    if (entries.length > 50) {
      entries.sort(([, a], [, b]) => b.ts - a.ts);
      const capped = Object.fromEntries(entries.slice(0, 50));
      if (entries.length > 50) {
        logger.debug('[apiConnectivityValidator] Cache capped', { kept: 50, removed: entries.length - 50 });
      }
      return capped;
    }
    
    if (prunedCount > 0) {
      logger.debug('[apiConnectivityValidator] Cache pruned', { removed: prunedCount, kept: entries.length });
    }
    
    return pruned;
  } catch {
    return {};
  }
}

function writeCache(map: Record<string, { ok: boolean; ts: number; warnings?: string[]; errors?: string[] }>) {
  try {
    storageUtils.safeSetItem(STORAGE_KEYS.AI_CONNECTIVITY_CACHE, JSON.stringify(map));
  } catch {
    // ignore cache write failures
  }
}

export async function testModelAvailability(modelName: string, apiKey: string): Promise<ValidationResult> {
  const keyHash = hashString(apiKey || '');
  const cacheId = `${modelName}::${keyHash}`;
  const cache = readCache();
  const now = Date.now();
  const entry = cache[cacheId];
  if (entry && (now - entry.ts) < ONE_HOUR_MS) {
    if (entry.ok) {
      logger.debug('[apiConnectivityValidator] Cache hit: OK');
      return { isValid: true, errors: [], warnings: entry.warnings ?? [] };
    } else {
      logger.debug('[apiConnectivityValidator] Cache hit: ERR');
      return { isValid: false, errors: entry.errors ?? ['Cached connectivity error'], warnings: entry.warnings ?? [] };
    }
  }

  // Minimal ping; do not use global facade to keep overrides predictable
  const client = new OpenRouterClient({ modelName, apiKey, timeoutMs: 7000, maxTokens: 8, temperature: 0 });

  try {
    // A harmless prompt that should produce a tiny response
    // Use suppressToasts to avoid user-facing toasts during background connectivity checks
    await client.chat('Return the single word OK.', undefined, { suppressToasts: true });
    logger.info('[apiConnectivityValidator] Connectivity OK for model');
    cache[cacheId] = { ok: true, ts: now };
    writeCache(cache);
    return { isValid: true, errors: [], warnings: [] };
  } catch (err: any) {
    const warnings: string[] = [];
    const errors: string[] = [];

    const msg = (err?.message || '').toString();
    const name = (err?.name || '').toString();

    // Classify common scenarios
    if (/quota|rate limit|429/i.test(msg) || /AI_RATE_LIMITED/.test(err?.code || '')) {
      warnings.push('Rate limited by AI provider (temporary)');
    } else if (/timeout|AbortError|ETIMEDOUT/i.test(msg)) {
      warnings.push('Connectivity timed out');
    } else if (/401|403|unauthorized|forbidden/i.test(msg) || /API key/i.test(msg)) {
      errors.push('Authentication failed (invalid or missing API key)');
    } else if (/404|model not found|unknown model/i.test(msg)) {
      errors.push('Model not found or not available');
    } else {
      warnings.push('Connectivity test failed with an unknown error');
    }

    if (errors.length === 0 && warnings.length > 0) {
      // Sanitize logs: include classification + short snippet, avoid full provider messages
      const snippet = msg.length > 120 ? msg.slice(0, 120) + '...' : msg;
      logger.warn('[apiConnectivityValidator] Connectivity warnings', { warnings, name, snippet });
      logger.debug('[apiConnectivityValidator] Full message (debug only)', { msg });
      cache[cacheId] = { ok: true, ts: now, warnings };
      writeCache(cache);
      return { isValid: true, errors: [], warnings };
    } else {
      // Sanitize logs: include classification + short snippet, avoid full provider messages
      const snippet = msg.length > 120 ? msg.slice(0, 120) + '...' : msg;
      logger.error('[apiConnectivityValidator] Connectivity failed', { errors, name, snippet });
      logger.debug('[apiConnectivityValidator] Full message (debug only)', { msg });
      cache[cacheId] = { ok: false, ts: now, errors, warnings };
      writeCache(cache);
      return { isValid: false, errors, warnings };
    }
  }
}
