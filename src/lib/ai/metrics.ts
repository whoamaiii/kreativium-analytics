import { logger } from '@/lib/logger';
import { STORAGE_KEYS } from '@/lib/storage/keys';

/**
 * Lightweight AI telemetry stored in localStorage for dev/exploration.
 * Tracks JSON validity rate, request outcomes, retries, and latency.
 */

export interface AiMetricsData {
  version: number;
  counts: {
    requests: number;
    successes: number;
    failures: number;
    retries: number;
    jsonValid: number;
    jsonParseErrors: number;
    jsonValidateErrors: number;
  };
  latenciesMs: number[]; // ring buffer (max 50)
  lastUpdated: string;
}

const MAX_LAT = 50;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function load(): AiMetricsData {
  try {
    const raw =
      typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.AI_METRICS) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as AiMetricsData;
      if (parsed && typeof parsed.version === 'number') return parsed;
    }
  } catch (e) {
    try {
      logger.warn('[aiMetrics] Failed to load metrics from localStorage', e as Error);
    } catch {}
  }
  return {
    version: 1,
    counts: {
      requests: 0,
      successes: 0,
      failures: 0,
      retries: 0,
      jsonValid: 0,
      jsonParseErrors: 0,
      jsonValidateErrors: 0,
    },
    latenciesMs: [],
    lastUpdated: new Date().toISOString(),
  };
}

function save(d: AiMetricsData) {
  try {
    if (typeof localStorage !== 'undefined')
      localStorage.setItem(STORAGE_KEYS.AI_METRICS, JSON.stringify(d));
  } catch (e) {
    try {
      logger.warn('[aiMetrics] Failed to save metrics to localStorage', e as Error);
    } catch {}
  }
}

function update(mutator: (d: AiMetricsData) => void) {
  const d = load();
  try {
    mutator(d);
  } catch (e) {
    try {
      logger.warn('[aiMetrics] Failed to update metrics', e as Error);
    } catch {}
  }
  d.lastUpdated = new Date().toISOString();
  save(d);
}

export const aiMetrics = {
  reset() {
    save({
      version: 1,
      counts: {
        requests: 0,
        successes: 0,
        failures: 0,
        retries: 0,
        jsonValid: 0,
        jsonParseErrors: 0,
        jsonValidateErrors: 0,
      },
      latenciesMs: [],
      lastUpdated: new Date().toISOString(),
    });
  },
  get(): AiMetricsData {
    return load();
  },
  recordRequestStart() {
    update((d) => {
      d.counts.requests += 1;
    });
  },
  recordSuccess(durationMs: number) {
    update((d) => {
      d.counts.successes += 1;
      if (Number.isFinite(durationMs)) {
        d.latenciesMs.push(Math.max(0, Math.round(durationMs)));
        if (d.latenciesMs.length > MAX_LAT) d.latenciesMs.splice(0, d.latenciesMs.length - MAX_LAT);
      }
    });
  },
  recordFailure() {
    update((d) => {
      d.counts.failures += 1;
    });
  },
  recordRetries(attempts: number) {
    if (Number.isFinite(attempts) && attempts > 1)
      update((d) => {
        d.counts.retries += attempts - 1;
      });
  },
  recordJsonValid() {
    update((d) => {
      d.counts.jsonValid += 1;
    });
  },
  recordJsonParseError() {
    update((d) => {
      d.counts.jsonParseErrors += 1;
    });
  },
  recordJsonValidateError() {
    update((d) => {
      d.counts.jsonValidateErrors += 1;
    });
  },
  summary() {
    const d = load();
    const totalJson = d.counts.jsonValid + d.counts.jsonParseErrors + d.counts.jsonValidateErrors;
    const jsonValidity = totalJson > 0 ? d.counts.jsonValid / totalJson : 0;
    const avgLatency = d.latenciesMs.length
      ? Math.round(d.latenciesMs.reduce((a, b) => a + b, 0) / d.latenciesMs.length)
      : 0;
    return { ...d.counts, avgLatency, jsonValidity, lastUpdated: d.lastUpdated };
  },
};
