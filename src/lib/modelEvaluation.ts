/**
 * Module: modelEvaluation
 *
 * Purpose
 * - Track and query model evaluation runs with metrics and cross-validation metadata
 * - Provide stable signatures for data/config to dedupe noisy writes
 *
 * Storage Strategy
 * - Primary: In-memory Map<ModelType, EvaluationRun[]> for fast reads
 * - Optional persistence: IndexedDB (db: 'model-eval', store: 'model-eval', keyPath: 'id')
 * - Fire-and-forget initialization and persistence; gracefully degrades to memory-only if IDB is unavailable
 * - Lightweight TTL+LRU in-process cache to avoid redundant records
 *
 * API (named exports)
 * - recordEvaluation(run: EvaluationRun): void
 * - getEvaluationHistory(modelType?: ModelType): EvaluationRun[]
 * - clearEvaluationHistory(modelType?: ModelType): void
 * - invalidateEvaluationCacheByTag(tag: string): void
 *
 * Notes
 * - Use logger for diagnostics (no console.*)
 * - Align schemaVersion with runtime analytics schema/versioning for forward compatibility
 */

import { logger } from '@/lib/logger';
import { createCacheKey, stableHash } from '@/lib/analytics/cache-key';
import type { ModelType } from '@/lib/mlModels';

// Types
export interface ClassificationMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  auc?: number;
  confusionMatrix?: number[][];
  perClass?: Record<string, { precision?: number; recall?: number; f1?: number; support?: number }>;
}

export interface RegressionMetrics {
  mae?: number;
  mse?: number;
  rmse?: number;
  r2?: number;
  mape?: number;
}

export interface Metrics {
  classification?: ClassificationMetrics;
  regression?: RegressionMetrics;
}

export interface CrossValidationMeta {
  strategy: 'k-fold' | 'time-series' | 'holdout' | string;
  folds?: number; // for k-fold
  horizon?: number; // for time-series CV
  windowSize?: number; // for rolling-window strategies
}

export interface EvaluationRun {
  id: string;
  modelType: ModelType;
  timestamp: number; // epoch ms
  dataSignature: string; // stable fingerprint of training/validation data
  configSignature: string; // stable fingerprint of the configuration used
  taskType: 'classification' | 'regression' | string;
  metrics: Metrics;
  cv?: CrossValidationMeta;
  notes?: string;
  schemaVersion: string; // align with runtime analytics schema/versioning
}

// In-memory store, indexed by modelType for fast filtering
const memoryStore: Map<ModelType, EvaluationRun[]> = new Map();

// Lightweight TTL + LRU cache to skip redundant recomputation/recording
// Aligns with vcQlb4XB*: include input hashes in keys; purge by TTL and LRU; avoid leaks
interface EvalCacheEntry {
  ts: number; // last seen timestamp (epoch ms)
  tags: string[]; // e.g., ['model-eval', modelType, taskType]
}

const EVAL_CACHE_NAMESPACE = 'model-eval';
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 300; // LRU cap to avoid unbounded growth

const evalCache: Map<string, EvalCacheEntry> = new Map();
let evalCacheTTL = DEFAULT_TTL_MS;

function setEvalCacheTTL(ttlMs: number): void {
  evalCacheTTL = Math.max(0, ttlMs);
}

function makeEvalCacheKey(
  run: Pick<
    EvaluationRun,
    'modelType' | 'taskType' | 'dataSignature' | 'configSignature' | 'schemaVersion'
  >,
): string {
  // Include signatures and identifiers; counts are embedded when createCacheKey is used with structured input
  return createCacheKey({
    namespace: EVAL_CACHE_NAMESPACE,
    input: {
      mt: run.modelType,
      task: run.taskType,
      dataSig: run.dataSignature,
      cfgSig: run.configSignature,
    },
    version: run.schemaVersion,
    normalizeArrayOrder: false,
  });
}

function touchEvalCache(key: string, tags: string[]): void {
  // LRU behavior: delete+set to move to insertion order end
  const now = Date.now();
  if (evalCache.has(key)) {
    evalCache.delete(key);
  }
  evalCache.set(key, { ts: now, tags });
  // Enforce LRU cap
  while (evalCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = evalCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    evalCache.delete(oldestKey);
  }
}

function isEvalCacheFresh(key: string): boolean {
  const entry = evalCache.get(key);
  if (!entry) return false;
  const age = Date.now() - entry.ts;
  if (age <= evalCacheTTL) return true;
  // expired: drop it eagerly to keep map tidy
  evalCache.delete(key);
  return false;
}

export function invalidateEvaluationCacheByTag(tag: string): void {
  // Remove any cache entries whose tag array contains the tag (exact match)
  for (const [k, v] of evalCache.entries()) {
    if (v.tags.includes(tag)) {
      evalCache.delete(k);
    }
  }
}

// IDB constants
const DB_NAME = 'model-eval';
const STORE_NAME = 'model-eval'; // single store with keyPath 'id'
const DB_VERSION = 1;

let idbAvailable = typeof indexedDB !== 'undefined';
let initStarted = false;

function openDB(): Promise<IDBDatabase> {
  if (!idbAvailable) return Promise.reject(new Error('IndexedDB not available'));
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        } catch (err) {
          logger.error('[modelEvaluation] onupgradeneeded failed', err);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

async function loadAllFromIDB(): Promise<void> {
  if (!idbAvailable) return;

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction([STORE_NAME], 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.openCursor();
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const cursor = req.result as IDBCursorWithValue | null;
          if (cursor) {
            const run = cursor.value as EvaluationRun;
            if (run && run.modelType) {
              const list = memoryStore.get(run.modelType) ?? [];
              list.push(run);
              memoryStore.set(run.modelType, list);
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
      } catch (err) {
        reject(err);
      }
    });
    // Normalize: sort each list by timestamp desc
    for (const [mt, list] of memoryStore.entries()) {
      list.sort((a, b) => b.timestamp - a.timestamp);
      memoryStore.set(mt, list);
    }
  } catch (error) {
    idbAvailable = false; // fallback to memory only
    logger.warn(
      '[modelEvaluation] Failed to initialize from IndexedDB. Falling back to memory only.',
      error,
    );
  }
}

function ensureInit(): void {
  if (initStarted) return;
  initStarted = true;
  // Fire-and-forget initialization; memory store remains usable
  loadAllFromIDB().catch((err) => {
    logger.warn('[modelEvaluation] Initialization load failed', err);
  });
}

// Persistence helpers (fire-and-forget)
async function persistRun(run: EvaluationRun): Promise<void> {
  if (!idbAvailable) return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(run);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    logger.warn('[modelEvaluation] persistRun failed', error);
  }
}

async function deleteRuns(modelType?: ModelType): Promise<void> {
  if (!idbAvailable) return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      if (!modelType) {
        // Clear all
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        return;
      }

      // Delete only matching modelType (no index, iterate)
      const cursorReq = store.openCursor();
      cursorReq.onerror = () => reject(cursorReq.error);
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result as IDBCursorWithValue | null;
        if (!cursor) {
          resolve();
          return;
        }
        const val = cursor.value as EvaluationRun;
        if (val?.modelType === modelType) {
          (cursor as IDBCursorWithValue).delete();
        }
        cursor.continue();
      };
    });
  } catch (error) {
    logger.warn('[modelEvaluation] deleteRuns failed', error);
  }
}

// Signature utilities (internal)
function computeStableSignature(namespace: string, input: unknown, version?: string): string {
  try {
    return createCacheKey({ namespace, input, version });
  } catch {
    // Fallback minimal stable hash if createCacheKey throws (e.g., cyclic input)
    try {
      const hash = stableHash(input);
      return [namespace, version ? `v${version}` : undefined, hash].filter(Boolean).join(':');
    } catch (err) {
      logger.warn('[modelEvaluation] computeStableSignature failed; returning placeholder', err);
      return `${namespace}:unknown`;
    }
  }
}

// Public API
export function recordEvaluation(run: EvaluationRun): void {
  ensureInit();

  if (!run || !run.id || !run.modelType || !run.timestamp) {
    logger.warn('[modelEvaluation] recordEvaluation called with invalid run payload', {
      hasRun: !!run,
    });
    return;
  }

  // Ensure signatures are present; attempt to construct placeholders if missing
  if (!run.dataSignature) {
    const placeholder = computeStableSignature(
      'model-eval:data',
      { id: run.id, ts: run.timestamp, mt: run.modelType },
      run.schemaVersion,
    );
    run = { ...run, dataSignature: placeholder };
  }
  if (!run.configSignature) {
    const placeholder = computeStableSignature(
      'model-eval:config',
      { id: run.id, task: run.taskType, mt: run.modelType },
      run.schemaVersion,
    );
    run = { ...run, configSignature: placeholder };
  }

  // Optional de-duplication: skip if an equivalent evaluation was just recorded within TTL
  try {
    const key = makeEvalCacheKey({
      modelType: run.modelType,
      taskType: run.taskType,
      dataSignature: run.dataSignature,
      configSignature: run.configSignature,
      schemaVersion: run.schemaVersion,
    });
    if (isEvalCacheFresh(key)) {
      logger.debug('[modelEvaluation] Skipping redundant evaluation record (cache fresh)', {
        key,
        ttlMs: evalCacheTTL,
      });
      return;
    }
    const tags = [EVAL_CACHE_NAMESPACE, String(run.modelType), String(run.taskType)];
    touchEvalCache(key, tags);
  } catch (err) {
    // Never fail the caller on cache errors; just log and proceed
    logger.warn('[modelEvaluation] eval cache key/touch failed; proceeding without skip', err);
  }

  // Insert into memory store (keep newest first)
  const list = memoryStore.get(run.modelType) ?? [];
  const existingIdx = list.findIndex((r) => r.id === run.id);
  if (existingIdx >= 0) {
    list[existingIdx] = run;
  } else {
    list.push(run);
  }
  list.sort((a, b) => b.timestamp - a.timestamp);
  memoryStore.set(run.modelType, list);

  // Persist asynchronously
  void persistRun(run);
}

export function getEvaluationHistory(modelType?: ModelType): EvaluationRun[] {
  ensureInit();
  if (!modelType) {
    // Aggregate all
    const all: EvaluationRun[] = [];
    for (const arr of memoryStore.values()) all.push(...arr);
    return all.sort((a, b) => b.timestamp - a.timestamp);
  }
  const list = memoryStore.get(modelType);
  return (list ? [...list] : []).sort((a, b) => b.timestamp - a.timestamp);
}

export function clearEvaluationHistory(modelType?: ModelType): void {
  ensureInit();
  if (!modelType) {
    memoryStore.clear();
    // Also clear cache entries for model-eval namespace
    invalidateEvaluationCacheByTag(EVAL_CACHE_NAMESPACE);
  } else {
    memoryStore.delete(modelType);
    // Invalidate cache entries for this model type
    invalidateEvaluationCacheByTag(String(modelType));
  }
  // Fire-and-forget persistence clearing
  void deleteRuns(modelType);
}
