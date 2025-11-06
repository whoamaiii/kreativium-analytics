import { DEFAULT_ALERT_SETTINGS } from '@/lib/alerts/constants';
import type { AlertSettings, AlertEvent, AlertSeverity } from '@/lib/alerts/types';
import { validateAlertSettings } from '@/lib/alerts/policies';
import { safeGet, safeSet } from '@/lib/storage';
import { logger } from '@/lib/logger';

type PartialSettings = Partial<AlertSettings>;

function deepMerge<T extends Record<string, any>>(base: T, overrides?: Record<string, any>): T {
  if (!overrides) return base;
  const result: Record<string, any> = Array.isArray(base) ? [...(base as any)] : { ...base };
  Object.keys(overrides).forEach((k) => {
    const v = (overrides as any)[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      (result as any)[k] = deepMerge((base as any)[k] ?? {}, v);
    } else {
      (result as any)[k] = v;
    }
  });
  return result as T;
}

function readStorage<T>(key: string): T | null {
  try {
    const raw = safeGet(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStorage<T>(key: string, value: T): void {
  try {
    const raw = JSON.stringify(value);
    safeSet(key, raw);
  } catch {
    // no-op
  }
}

export type PolicyPreset = 'elementary' | 'middle' | 'highschool' | 'special_needs';

const PRESETS: Record<PolicyPreset, AlertSettings> = {
  elementary: deepMerge(DEFAULT_ALERT_SETTINGS, {
    dailyCaps: { critical: 1, important: 2, moderate: 3, low: 6 },
    quietHours: { start: '19:00', end: '07:00' },
  }),
  middle: deepMerge(DEFAULT_ALERT_SETTINGS, {
    dailyCaps: { critical: 1, important: 2, moderate: 4, low: 8 },
    quietHours: { start: '21:00', end: '07:00' },
  }),
  highschool: deepMerge(DEFAULT_ALERT_SETTINGS, {
    dailyCaps: { critical: 1, important: 2, moderate: 5, low: 10 },
    quietHours: { start: '22:00', end: '07:00' },
  }),
  special_needs: deepMerge(DEFAULT_ALERT_SETTINGS, {
    dailyCaps: { critical: 1, important: 2, moderate: 3, low: 4 },
    quietHours: { start: '18:00', end: '08:00' },
    snoozePreferences: { defaultHours: 36, dontShowAgainDays: 10 },
  }),
};

export interface PolicyConfigMetrics {
  validateCalls: number;
  mergeCalls: number;
  lastValidateMs?: number;
  lastMergeMs?: number;
}

export class PolicyConfigManager {
  private metrics: PolicyConfigMetrics = { validateCalls: 0, mergeCalls: 0 };

  constructor(private readonly storageKey: string = 'alerts:policyConfig:audit') {}

  getDefaultSettings(): AlertSettings {
    return { ...DEFAULT_ALERT_SETTINGS };
  }

  getPreset(preset: PolicyPreset): AlertSettings {
    return { ...PRESETS[preset] };
  }

  validateSettings(settings?: PartialSettings | AlertSettings): ReturnType<typeof validateAlertSettings> {
    const started = Date.now();
    const result = validateAlertSettings(settings as AlertSettings);
    this.metrics.validateCalls += 1;
    this.metrics.lastValidateMs = Date.now() - started;
    if (!result.isValid) {
      this.audit('validateSettings', { errors: result.errors });
      try { logger.warn('[PolicyConfigManager] Validation produced errors', { errors: result.errors }); } catch {}
    }
    return result;
  }

  mergeSettings(base: AlertSettings, overrides?: PartialSettings): AlertSettings {
    const started = Date.now();
    const merged = deepMerge(base, overrides ?? {});
    const { normalized } = validateAlertSettings(merged);
    this.metrics.mergeCalls += 1;
    this.metrics.lastMergeMs = Date.now() - started;
    this.audit('mergeSettings', { overrides, result: normalized });
    return normalized;
  }

  exportSettings(settings: AlertSettings): string {
    try {
      const json = JSON.stringify(settings, null, 2);
      this.audit('exportSettings', { size: json.length });
      return json;
    } catch (e) {
      try { logger.error('[PolicyConfigManager] Failed to export settings', e as Error); } catch {}
      return '{}';
    }
  }

  migrateSettings(input: Record<string, any>): AlertSettings {
    // Minimal migration example: map legacy keys -> new schema
    const legacyCaps = (input as any).caps ?? (input as any).dailyCaps;
    const dailyCaps = legacyCaps ? {
      critical: Number(legacyCaps.critical ?? legacyCaps.CRIT ?? 1),
      important: Number(legacyCaps.important ?? legacyCaps.IMP ?? 2),
      moderate: Number(legacyCaps.moderate ?? legacyCaps.MOD ?? 4),
      low: Number(legacyCaps.low ?? legacyCaps.LOW ?? 999),
    } : undefined;
    const next: PartialSettings = {
      studentId: input.studentId ?? '__global__',
      quietHours: input.quietHours,
      dailyCaps,
      snoozePreferences: input.snoozePreferences,
    };
    const { normalized } = validateAlertSettings(deepMerge(DEFAULT_ALERT_SETTINGS, next));
    this.audit('migrateSettings', { inputKeys: Object.keys(input ?? {}), result: normalized });
    return normalized;
  }

  getMetrics(): PolicyConfigMetrics { return { ...this.metrics }; }

  getPolicyExplanation(settings: AlertSettings): string {
    const parts: string[] = [];
    if (settings.quietHours) parts.push(`Quiet hours from ${settings.quietHours.start} to ${settings.quietHours.end}.`);
    if (settings.dailyCaps) {
      const c = settings.dailyCaps;
      parts.push(`Daily caps – critical: ${c.critical}, important: ${c.important}, moderate: ${c.moderate}, low: ${c.low}.`);
    }
    if (settings.snoozePreferences) parts.push(`Default snooze: ${settings.snoozePreferences.defaultHours ?? 24}h; Don't show again: ${settings.snoozePreferences.dontShowAgainDays ?? 7} days.`);
    return parts.join(' ');
  }

  simulatePolicyDecisions(alerts: AlertEvent[], settings?: AlertSettings, fn: (result: { allowed: boolean; reasons: string[]; severity: AlertSeverity }) => void = () => {}): void {
    // Lightweight simulator intended for testing tools; implementation remains minimal here.
    try { this.audit('simulatePolicyDecisions', { count: alerts.length }); } catch {}
    // Defer heavy simulations to dedicated tests
  }

  private audit(action: string, payload?: Record<string, unknown>): void {
    try {
      const key = this.storageKey;
      const entries = readStorage<Array<{ at: string; action: string; payload?: Record<string, unknown> }>>(key) ?? [];
      entries.push({ at: new Date().toISOString(), action, payload });
      const trimmed = entries.length > 200 ? entries.slice(entries.length - 200) : entries;
      writeStorage(key, trimmed);
    } catch {
      // ignore
    }
  }
}

export default PolicyConfigManager;


