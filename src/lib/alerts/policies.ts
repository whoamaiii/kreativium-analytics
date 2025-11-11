/**
 * AlertPolicies
 *
 * Governance and throttling policies for the alert lifecycle, including:
 * - Quiet hours
 * - Daily caps by severity
 * - Deduplication within a time window
 * - Exponential backoff throttling
 * - Snooze / "don't show again"
 * - Validation helpers and a bounded audit trail for policy decisions
 *
 * @remarks
 * Designed for high-volume read-mostly scenarios with lightweight storage and
 * predictable performance. All methods are pure with respect to inputs except
 * where explicitly noted (snooze, throttle attempts, audit trail).
 *
 * @example
 * // Calculate a dedupe key
 * const key = new AlertPolicies().calculateDedupeKey(alertEvent);
 *
 * @example
 * // Gate alert creation under current governance
 * const policies = new AlertPolicies();
 * const { allowed, status } = policies.canCreateAlert(alertEvent, settings);
 * // if allowed, persist and display; otherwise, it was suppressed by policy status
 *
 * @example
 * // Snooze a specific alert key for 24 hours and verify
 * policies.snooze(studentId, key, 24);
 * const isSnoozed = policies.isSnoozed(studentId, key);
 *
 * @example
 * // Apply caps/quiet hours/dedup over a batch
 * const withQuiet = policies.applyQuietHours(alerts, settings);
 * const withCaps = policies.enforceCapLimits(withQuiet, settings);
 * const deduped = policies.deduplicateAlerts(withCaps);
 */

import {
  AlertEvent,
  AlertSeverity,
  AlertSettings,
  AlertWithGovernance,
  GovernanceStatus,
} from '@/lib/alerts/types';
import { safeGet, safeSet } from '@/lib/storage';
import { logger } from '@/lib/logger';
import {
  DEDUPE_WINDOW_MS,
  MAX_THROTTLE_DELAY_MS,
  THROTTLE_BACKOFF_BASE,
} from '@/lib/alerts/constants';

function readStorage<T>(key: string): T | null {
  try {
    const raw = safeGet(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (e) {
    try {
      logger.debug('[AlertPolicies] Failed to read storage key', { key, error: e as Error });
    } catch {}
    return null;
  }
}

function writeStorage<T>(key: string, value: T): void {
  try {
    const raw = JSON.stringify(value);
    safeSet(key, raw);
  } catch (e) {
    try {
      logger.debug('[AlertPolicies] Failed to write storage key', { key, error: e as Error });
    } catch {}
    // no-op
  }
}

const DEFAULT_BASE_BY_SEVERITY: Record<AlertSeverity, number> = {
  [AlertSeverity.Critical]: 1.3,
  [AlertSeverity.Important]: 1.6,
  [AlertSeverity.Moderate]: 2.0,
  [AlertSeverity.Low]: 2.5,
};

const DEFAULT_CAPS: Record<AlertSeverity, number> = {
  [AlertSeverity.Critical]: 1,
  [AlertSeverity.Important]: 2,
  [AlertSeverity.Moderate]: 4,
  [AlertSeverity.Low]: Number.MAX_SAFE_INTEGER,
};

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  [AlertSeverity.Critical]: 4,
  [AlertSeverity.Important]: 3,
  [AlertSeverity.Moderate]: 2,
  [AlertSeverity.Low]: 1,
};

/** An audit entry describing a single policy gate decision. */
export interface PolicyAuditEntry {
  alertId: string;
  studentId: string;
  dedupeKey: string;
  createdAt: string;
  governance: GovernanceStatus;
  allowed: boolean;
  reasons?: string[];
}

const AUDIT_MAX_ENTRIES = 200;

function mergeGovernance(a?: GovernanceStatus, b?: GovernanceStatus): GovernanceStatus {
  return {
    throttled: b?.throttled ?? a?.throttled ?? false,
    deduplicated: b?.deduplicated ?? a?.deduplicated ?? false,
    hasDuplicates: b?.hasDuplicates ?? a?.hasDuplicates ?? false,
    snoozed: b?.snoozed ?? a?.snoozed ?? false,
    quietHours: b?.quietHours ?? a?.quietHours ?? false,
    capExceeded: b?.capExceeded ?? a?.capExceeded ?? false,
    nextEligibleAt: b?.nextEligibleAt ?? a?.nextEligibleAt,
  };
}

function withinQuietHours(now: Date, start: string, end: string): boolean {
  const [sh, sm] = start.split(':').map((n) => parseInt(n, 10));
  const [eh, em] = end.split(':').map((n) => parseInt(n, 10));
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (startMin <= endMin) {
    return minutesNow >= startMin && minutesNow <= endMin;
  }
  return minutesNow >= startMin || minutesNow <= endMin; // crosses midnight
}

function hashKey(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return (h >>> 0).toString(36);
}

export class AlertPolicies {
  private namespace: string;

  constructor(namespace = '') {
    this.namespace = namespace;
  }

  private key(studentId: string, suffix: string): string {
    const ns = this.namespace ? `${this.namespace}:` : '';
    return `${ns}alerts:policy:${studentId}:${suffix}`;
  }

  private alertsListKey(studentId: string): string {
    const ns = this.namespace ? `${this.namespace}:` : '';
    return `${ns}alerts:list:${studentId}`;
  }
  /**
   * Compute per-severity counts of alerts created today for a student.
   * Optimized for read-mostly high-volume cases by a single pass filter.
   *
   * @param studentId - The target student identifier
   * @returns A map of `AlertSeverity` to number of alerts created today
   * @example
   * const counts = new AlertPolicies().getTodayCounts('s1');
   * console.log(counts.critical);
   */
  getTodayCounts(studentId: string): Record<AlertSeverity, number> {
    const counts: Record<AlertSeverity, number> = {
      [AlertSeverity.Critical]: 0,
      [AlertSeverity.Important]: 0,
      [AlertSeverity.Moderate]: 0,
      [AlertSeverity.Low]: 0,
    };
    try {
      const raw = readStorage<AlertEvent[]>(this.alertsListKey(studentId)) ?? [];
      const now = new Date();
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0,
      ).getTime();
      const end = start + 24 * 3600_000;
      for (let i = 0; i < raw.length; i += 1) {
        const createdMs = new Date(raw[i].createdAt).getTime();
        if (createdMs >= start && createdMs < end) {
          counts[raw[i].severity] = (counts[raw[i].severity] ?? 0) + 1;
        }
      }
    } catch {
      // ignore read errors
    }
    return counts;
  }

  /**
   * Calculate a stable deduplication key for an alert.
   *
   * @param alert - The alert event
   * @returns Hash-stable dedupe key based on student, kind, context, and UTC hour
   * @example
   * const key = new AlertPolicies().calculateDedupeKey(alert);
   */
  calculateDedupeKey(alert: AlertEvent): string {
    if (alert.dedupeKey) return alert.dedupeKey;
    const created = new Date(alert.createdAt);
    const hourKey = `${created.getUTCFullYear()}-${created.getUTCMonth()}-${created.getUTCDate()}-${created.getUTCHours()}`;
    const contextKey = String(
      (alert.metadata as any)?.contextKey ?? (alert.metadata as any)?.classPeriod ?? 'na',
    );
    const raw = `${alert.studentId}|${alert.kind}|${contextKey}|${hourKey}`;
    return hashKey(raw);
  }

  /**
   * Determine if a timestamp falls within quiet hours.
   *
   * Note: timezone field is accepted and passed through in settings but not applied here.
   * The reference implementation uses the local time where this function executes.
   *
   * @param studentId - Student identifier (for future multi-tenant policy stores)
   * @param settings - Alert settings (quietHours optional)
   * @param at - Timestamp to evaluate (default: now)
   */
  isInQuietHours(studentId: string, settings?: AlertSettings, at: Date = new Date()): boolean {
    const q = settings?.quietHours;
    if (!q) return false;
    const activeByTime = withinQuietHours(at, q.start, q.end);
    if (!activeByTime) return false;
    const hasDays = Array.isArray(q.daysOfWeek) && q.daysOfWeek.length > 0;
    if (!hasDays) return activeByTime;
    const [sh, sm] = q.start.split(':').map((n) => parseInt(n, 10));
    const [eh, em] = q.end.split(':').map((n) => parseInt(n, 10));
    const crossesMidnight = sh * 60 + sm > eh * 60 + em;
    const day = at.getDay();
    const prevDay = (day + 6) % 7;
    if (crossesMidnight) {
      return q.daysOfWeek!.includes(day) || q.daysOfWeek!.includes(prevDay);
    }
    return q.daysOfWeek!.includes(day);
  }

  /**
   * Compute exponential backoff delay from prior throttle attempts.
   *
   * delay = min(MAX_THROTTLE_DELAY_MS, THROTTLE_BACKOFF_BASE^attempts * 1000)
   *
   * @param studentId - Student identifier
   * @param dedupeKey - Dedupe key for the alert
   * @returns Delay in milliseconds
   */
  getThrottleDelay(studentId: string, dedupeKey: string): number {
    const throttles = readStorage<Record<string, number>>(this.key(studentId, 'throttle')) ?? {};
    const attempts = throttles[dedupeKey] ?? 0;
    const delay = Math.min(
      MAX_THROTTLE_DELAY_MS,
      THROTTLE_BACKOFF_BASE ** Math.min(10, attempts) * 1000,
    );
    return delay;
  }

  /**
   * Severity-aware delay using per-severity bases and caps from settings.
   */
  getThrottleDelayFor(alert: AlertEvent, settings?: AlertSettings): number {
    const studentId = alert.studentId;
    const dedupeKey = this.calculateDedupeKey(alert);
    const throttles = readStorage<Record<string, number>>(this.key(studentId, 'throttle')) ?? {};
    const attempts = throttles[dedupeKey] ?? 0;
    const baseBySeverity = settings?.throttle?.baseBySeverity ?? DEFAULT_BASE_BY_SEVERITY;
    const maxBySeverity = settings?.throttle?.maxDelayBySeverity ?? {};
    const base = baseBySeverity[alert.severity] ?? THROTTLE_BACKOFF_BASE;
    const perSeverityCap = (maxBySeverity as any)[alert.severity] as number | undefined;
    const cap = Math.min(
      MAX_THROTTLE_DELAY_MS,
      typeof perSeverityCap === 'number' && Number.isFinite(perSeverityCap) && perSeverityCap > 0
        ? perSeverityCap
        : MAX_THROTTLE_DELAY_MS,
    );
    const delay = Math.min(cap, base ** Math.min(10, attempts) * 1000);
    return delay;
  }

  /**
   * Record that a throttle decision was enforced for a dedupe key.
   *
   * @param studentId - Student identifier
   * @param dedupeKey - Dedupe key for the alert
   */
  recordThrottleAttempt(studentId: string, dedupeKey: string): void {
    const throttles = readStorage<Record<string, number>>(this.key(studentId, 'throttle')) ?? {};
    throttles[dedupeKey] = (throttles[dedupeKey] ?? 0) + 1;
    writeStorage(this.key(studentId, 'throttle'), throttles);
  }

  /**
   * Reset throttle attempts for a dedupe key.
   * Also clears scheduled eligibility if present.
   *
   * @param studentId - Student identifier
   * @param dedupeKey - Dedupe key for the alert
   */
  resetThrottle(studentId: string, dedupeKey: string): void {
    const throttles = readStorage<Record<string, number>>(this.key(studentId, 'throttle')) ?? {};
    delete throttles[dedupeKey];
    writeStorage(this.key(studentId, 'throttle'), throttles);
    const schedules =
      readStorage<Record<string, string>>(this.key(studentId, 'throttleSchedule')) ?? {};
    if (schedules[dedupeKey]) {
      delete schedules[dedupeKey];
      writeStorage(this.key(studentId, 'throttleSchedule'), schedules);
    }
    const meta = readStorage<Record<string, string>>(this.key(studentId, 'throttleMeta')) ?? {};
    if (meta[dedupeKey]) {
      delete meta[dedupeKey];
      writeStorage(this.key(studentId, 'throttleMeta'), meta);
    }
  }

  /**
   * Apply quiet hours governance over a batch of alerts.
   *
   * @param alerts - Input alerts (same student assumed)
   * @param settings - Alert settings
   * @returns Alerts annotated with `governance.quietHours`
   */
  applyQuietHours(alerts: AlertEvent[], settings?: AlertSettings): AlertWithGovernance[] {
    const studentId = alerts[0]?.studentId ?? '';
    return alerts.map((a) => {
      const inQ = this.isInQuietHours(studentId, settings, new Date(a.createdAt));
      const governance = mergeGovernance((a as AlertWithGovernance).governance, {
        quietHours: inQ,
      });
      return { ...a, governance };
    });
  }

  /**
   * Enforce per-severity daily caps for a batch while preserving input order.
   *
   * @param alerts - Input alerts
   * @param settings - Alert settings
   * @param existingTodayCounts - Optional precomputed counts to avoid storage reads
   * @returns Alerts annotated with `governance.capExceeded`
   */
  enforceCapLimits(
    alerts: AlertEvent[],
    settings?: AlertSettings,
    existingTodayCounts?: Partial<Record<AlertSeverity, number>>,
  ): AlertWithGovernance[] {
    if (alerts.length === 0) return [];
    const studentId = alerts[0].studentId;
    const persistedCounts = existingTodayCounts ?? this.getTodayCounts(studentId);
    const resolvedCaps: Record<AlertSeverity, number> = {
      [AlertSeverity.Critical]:
        settings?.dailyCaps?.critical ?? DEFAULT_CAPS[AlertSeverity.Critical],
      [AlertSeverity.Important]:
        settings?.dailyCaps?.important ?? DEFAULT_CAPS[AlertSeverity.Important],
      [AlertSeverity.Moderate]:
        settings?.dailyCaps?.moderate ?? DEFAULT_CAPS[AlertSeverity.Moderate],
      [AlertSeverity.Low]: settings?.dailyCaps?.low ?? DEFAULT_CAPS[AlertSeverity.Low],
    };
    const counts: Record<AlertSeverity, number> = {
      [AlertSeverity.Critical]: persistedCounts?.[AlertSeverity.Critical] ?? 0,
      [AlertSeverity.Important]: persistedCounts?.[AlertSeverity.Important] ?? 0,
      [AlertSeverity.Moderate]: persistedCounts?.[AlertSeverity.Moderate] ?? 0,
      [AlertSeverity.Low]: persistedCounts?.[AlertSeverity.Low] ?? 0,
    };

    const sorted = [...alerts].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const flagById = new Map<string, boolean>();

    sorted.forEach((alert) => {
      const max = resolvedCaps[alert.severity];
      const capExceeded = counts[alert.severity] >= max;
      flagById.set(alert.id, capExceeded);
      if (!capExceeded) {
        counts[alert.severity] += 1;
      }
    });

    return alerts.map((alert) => {
      const governance = mergeGovernance((alert as AlertWithGovernance).governance, {
        capExceeded: flagById.get(alert.id) ?? false,
      });
      return { ...alert, governance };
    });
  }

  /**
   * Deduplicate alerts within a time window, preferring higher severity and recency.
   *
   * @param alerts - Input alerts
   * @param windowMs - Time window in milliseconds (default: DEDUPE_WINDOW_MS)
   * @returns Deduplicated alerts with governance flags
   */
  deduplicateAlerts(alerts: AlertEvent[], windowMs = DEDUPE_WINDOW_MS): AlertWithGovernance[] {
    const sorted = [...alerts].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const results: AlertWithGovernance[] = [];
    const lastByKey = new Map<string, { index: number; alert: AlertWithGovernance }>();

    sorted.forEach((alert) => {
      const keyBase = this.calculateDedupeKey(alert);
      const current: AlertWithGovernance = {
        ...alert,
        governance: mergeGovernance((alert as AlertWithGovernance).governance, {
          deduplicated: false,
          hasDuplicates: false,
        }),
      };
      const previous = lastByKey.get(keyBase);
      if (!previous) {
        results.push(current);
        lastByKey.set(keyBase, { index: results.length - 1, alert: current });
        return;
      }

      const prevTime = new Date(previous.alert.createdAt).getTime();
      const currTime = new Date(alert.createdAt).getTime();
      if (Math.abs(currTime - prevTime) > windowMs) {
        results.push(current);
        lastByKey.set(keyBase, { index: results.length - 1, alert: current });
        return;
      }

      const prevRank = SEVERITY_RANK[previous.alert.severity];
      const currRank = SEVERITY_RANK[current.severity];
      const markWinnerHasDupes = (winner: AlertWithGovernance): AlertWithGovernance => ({
        ...winner,
        governance: mergeGovernance(winner.governance, {
          hasDuplicates: true,
          deduplicated: false,
        }),
      });

      if (currRank > prevRank || (currRank === prevRank && currTime > prevTime)) {
        const winner = markWinnerHasDupes(current);
        results[previous.index] = winner;
        lastByKey.set(keyBase, { index: previous.index, alert: winner });
      } else {
        const winner = markWinnerHasDupes(previous.alert);
        results[previous.index] = winner;
        lastByKey.set(keyBase, { index: previous.index, alert: winner });
      }
    });

    return results;
  }

  /**
   * Snooze a dedupe key for a number of hours (default 24h).
   *
   * @param studentId - Student identifier
   * @param dedupeKey - Dedupe key to snooze
   * @param hours - Hours to snooze (default 24)
   */
  snooze(studentId: string, dedupeKey: string, hours = 24): void {
    const snoozes = readStorage<Record<string, string>>(this.key(studentId, 'snooze')) ?? {};
    const until = new Date(Date.now() + hours * 3600_000).toISOString();
    snoozes[dedupeKey] = until;
    writeStorage(this.key(studentId, 'snooze'), snoozes);
  }

  /**
   * Do not show an alert for N days (default 7 days).
   *
   * @param studentId - Student identifier
   * @param dedupeKey - Dedupe key to hide
   * @param days - Number of days to hide (default 7)
   */
  dontShowForDays(studentId: string, dedupeKey: string, days = 7): void {
    this.snooze(studentId, dedupeKey, days * 24);
  }

  /**
   * Determine if a dedupe key is currently snoozed at a given time.
   *
   * @param studentId - Student identifier
   * @param dedupeKey - Dedupe key
   * @param at - Timestamp to check (default: now)
   */
  isSnoozed(studentId: string, dedupeKey: string, at: Date = new Date()): boolean {
    const snoozes = readStorage<Record<string, string>>(this.key(studentId, 'snooze')) ?? {};
    const until = snoozes[dedupeKey];
    if (!until) return false;
    return new Date(until).getTime() > at.getTime();
  }

  /**
   * Evaluate whether to throttle an alert based on exponential backoff history.
   * Returns whether throttled and - if throttled - the next eligible timestamp.
   *
   * @param alert - Alert event under evaluation
   * @param settings - Alert settings
   * @returns Throttle decision with optional `nextEligibleAt` ISO timestamp
   */
  shouldThrottle(
    alert: AlertEvent,
    settings?: AlertSettings,
  ): { throttled: boolean; nextEligibleAt?: string } {
    const dedupeKey = this.calculateDedupeKey(alert);
    const studentId = alert.studentId;
    const schedules =
      readStorage<Record<string, string>>(this.key(studentId, 'throttleSchedule')) ?? {};
    const scheduledIso = schedules[dedupeKey];
    const now = Date.now();
    if (scheduledIso) {
      const scheduledAt = new Date(scheduledIso).getTime();
      const stillThrottled = now < scheduledAt;
      if (stillThrottled) {
        return { throttled: true, nextEligibleAt: new Date(scheduledAt).toISOString() };
      }
      // Schedule elapsed: clear and allow
      this.resetThrottle(studentId, dedupeKey);
      return { throttled: false };
    }

    const delay = this.getThrottleDelayFor(alert, settings);
    const meta = readStorage<Record<string, string>>(this.key(studentId, 'throttleMeta')) ?? {};
    const lastEligibleAtMs = meta[dedupeKey] ? new Date(meta[dedupeKey]).getTime() : undefined;
    const base = Math.max(now, lastEligibleAtMs ?? 0);
    const nextEligibleAtMs = base + delay;
    if (now < nextEligibleAtMs) {
      const iso = new Date(nextEligibleAtMs).toISOString();
      schedules[dedupeKey] = iso;
      writeStorage(this.key(studentId, 'throttleSchedule'), schedules);
      const newMeta = { ...(meta ?? {}), [dedupeKey]: iso };
      writeStorage(this.key(studentId, 'throttleMeta'), newMeta);
      this.recordThrottleAttempt(studentId, dedupeKey);
      return { throttled: true, nextEligibleAt: schedules[dedupeKey] };
    }
    this.resetThrottle(studentId, dedupeKey);
    return { throttled: false };
  }

  /**
   * Core policy entrypoint: returns whether alert creation is allowed
   * and the composite governance status. Also writes an audit entry.
   *
   * @param alert - Alert event under evaluation
   * @param settings - Alert settings (validated/normalized internally)
   * @returns Allowed flag and governance status
   */
  canCreateAlert(
    alert: AlertEvent,
    settings?: AlertSettings,
    existingTodayCounts?: Partial<Record<AlertSeverity, number>>,
  ): { allowed: boolean; status: AlertWithGovernance['governance'] } {
    const validation = validateAlertSettings(settings);
    if (!validation.isValid) {
      try {
        logger.warn('[AlertPolicies] Invalid settings; using normalized defaults', {
          errors: validation.errors,
        });
      } catch {}
    }
    const normalized = validation.normalized;

    const dedupeKey = this.calculateDedupeKey(alert);
    const studentId = alert.studentId;
    const snoozed = this.isSnoozed(studentId, dedupeKey);
    const quietHours = this.isInQuietHours(studentId, normalized, new Date(alert.createdAt));
    const { throttled, nextEligibleAt } = this.shouldThrottle(alert, normalized);
    const resolvedCaps: Record<AlertSeverity, number> = {
      [AlertSeverity.Critical]:
        normalized?.dailyCaps?.critical ?? DEFAULT_CAPS[AlertSeverity.Critical],
      [AlertSeverity.Important]:
        normalized?.dailyCaps?.important ?? DEFAULT_CAPS[AlertSeverity.Important],
      [AlertSeverity.Moderate]:
        normalized?.dailyCaps?.moderate ?? DEFAULT_CAPS[AlertSeverity.Moderate],
      [AlertSeverity.Low]: normalized?.dailyCaps?.low ?? DEFAULT_CAPS[AlertSeverity.Low],
    };
    const todayCounts = existingTodayCounts ?? this.getTodayCounts(studentId);
    const capExceeded = (todayCounts[alert.severity] ?? 0) >= resolvedCaps[alert.severity];
    const governance = { snoozed, quietHours, throttled, nextEligibleAt, capExceeded };
    const allowed = !snoozed && !quietHours && !throttled && !capExceeded;
    const reasons: string[] = [];
    if (snoozed) reasons.push('snoozed');
    if (quietHours) reasons.push('quiet_hours');
    if (throttled) reasons.push('throttled');
    if (capExceeded) reasons.push('cap_exceeded');
    try {
      if (!allowed)
        logger.debug('[AlertPolicies] Alert blocked by policies', { alertId: alert.id, reasons });
      else logger.debug('[AlertPolicies] Alert allowed by policies', { alertId: alert.id });
    } catch {}
    this.auditPolicyDecision({ alert, dedupeKey, allowed, governance, reasons });
    return { allowed, status: governance };
  }

  // --------------------
  // Validation & Audit
  // --------------------

  /**
   * Write an audit entry for a policy decision (bounded length per student).
   */
  private auditPolicyDecision(params: {
    alert: AlertEvent;
    dedupeKey: string;
    allowed: boolean;
    governance: GovernanceStatus;
    reasons?: string[];
  }): void {
    const { alert, dedupeKey, allowed, governance, reasons } = params;
    const studentId = alert.studentId;
    const auditKey = this.key(studentId, 'audit');
    try {
      const entries = readStorage<PolicyAuditEntry[]>(auditKey) ?? [];
      entries.push({
        alertId: alert.id,
        studentId,
        dedupeKey,
        createdAt: alert.createdAt,
        governance,
        allowed,
        reasons,
      });
      const trimmed =
        entries.length > AUDIT_MAX_ENTRIES
          ? entries.slice(entries.length - AUDIT_MAX_ENTRIES)
          : entries;
      writeStorage(auditKey, trimmed);
    } catch (e) {
      try {
        logger.warn('[AlertPolicies] Failed to write policy audit entry', e as Error);
      } catch {}
    }
  }

  /** Retrieve recent audit entries for a student (most recent last). */
  getAuditTrail(studentId: string, limit = 100): PolicyAuditEntry[] {
    const auditKey = this.key(studentId, 'audit');
    const entries = readStorage<PolicyAuditEntry[]>(auditKey) ?? [];
    if (!Number.isFinite(limit) || limit <= 0) return entries;
    return entries.length > limit ? entries.slice(entries.length - limit) : entries;
  }

  /** Clear the audit trail for a student. */
  clearAuditTrail(studentId: string): void {
    writeStorage(this.key(studentId, 'audit'), [] as PolicyAuditEntry[]);
  }

  /**
   * Export the audit trail for a student as a JSON string.
   *
   * @param studentId - Student identifier
   * @param limit - Optional max number of entries to include
   * @returns JSON string of audit entries (most recent last)
   */
  exportAuditTrail(studentId: string, limit = 100): string {
    try {
      const entries = this.getAuditTrail(studentId, limit);
      return JSON.stringify(entries);
    } catch (e) {
      try {
        logger.warn('[AlertPolicies] Failed to export audit trail', e as Error);
      } catch {}
      return '[]';
    }
  }
}

// --------------------
// Validation utilities
// --------------------

function isValidTimeString(s?: string): boolean {
  if (!s || typeof s !== 'string') return false;
  const parts = s.split(':');
  if (parts.length !== 2) return false;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  return Number.isInteger(h) && Number.isInteger(m) && h >= 0 && h < 24 && m >= 0 && m < 60;
}

function normalizeCaps(input?: AlertSettings['dailyCaps']): Required<AlertSettings['dailyCaps']> {
  const caps = input ?? { critical: 1, important: 2, moderate: 4, low: 999 };
  const clamp = (n: unknown, fallback: number) =>
    typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : fallback;
  return {
    critical: clamp(caps.critical, DEFAULT_CAPS[AlertSeverity.Critical]),
    important: clamp(caps.important, DEFAULT_CAPS[AlertSeverity.Important]),
    moderate: clamp(caps.moderate, DEFAULT_CAPS[AlertSeverity.Moderate]),
    low: clamp(caps.low, DEFAULT_CAPS[AlertSeverity.Low]),
  } as Required<AlertSettings['dailyCaps']>;
}

function normalizeQuietHours(
  input?: AlertSettings['quietHours'],
): AlertSettings['quietHours'] | undefined {
  if (!input) return undefined;
  const startOk = isValidTimeString(input.start);
  const endOk = isValidTimeString(input.end);
  if (!startOk || !endOk) return undefined;
  const days = Array.isArray(input.daysOfWeek)
    ? input.daysOfWeek.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    : undefined;
  return {
    start: input.start,
    end: input.end,
    timezone: input.timezone,
    daysOfWeek: days && days.length ? days : undefined,
  };
}

/**
 * Validate and normalize alert policy settings.
 *
 * @param settings - Candidate settings (partial or full)
 * @returns Validation result with `isValid`, `errors`, and `normalized` settings
 * @example
 * const { isValid, errors, normalized } = validateAlertSettings(rawSettings);
 */
export function validateAlertSettings(settings?: AlertSettings): {
  isValid: boolean;
  errors: string[];
  normalized: AlertSettings;
} {
  const errors: string[] = [];
  const studentId = settings?.studentId ?? '__global__';
  const quietHours = normalizeQuietHours(settings?.quietHours);
  if (settings?.quietHours && !quietHours)
    errors.push('quietHours must have valid start/end times in HH:MM format');
  const dailyCaps = normalizeCaps(settings?.dailyCaps);
  if (settings?.dailyCaps) {
    (['critical', 'important', 'moderate', 'low'] as const).forEach((k) => {
      const v = (settings.dailyCaps as any)[k];
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0)
        errors.push(`dailyCaps.${k} must be a non-negative number`);
    });
  }
  const snoozePreferences = settings?.snoozePreferences ?? {};
  const defaultHours =
    typeof snoozePreferences.defaultHours === 'number' && snoozePreferences.defaultHours > 0
      ? snoozePreferences.defaultHours
      : 24;
  const dontShowAgainDays =
    typeof snoozePreferences.dontShowAgainDays === 'number' &&
    snoozePreferences.dontShowAgainDays > 0
      ? snoozePreferences.dontShowAgainDays
      : 7;
  const normalized: AlertSettings = {
    studentId,
    quietHours,
    dailyCaps,
    sensitivityByKind: settings?.sensitivityByKind,
    snoozePreferences: { defaultHours, dontShowAgainDays },
  };
  return { isValid: errors.length === 0, errors, normalized };
}

/**
 * Assert settings are valid and return normalized result, throwing on errors.
 *
 * @param settings - Candidate settings
 * @throws Error when validation fails (includes messages)
 * @returns Normalized `AlertSettings`
 */
export function assertValidAlertSettings(settings?: AlertSettings): AlertSettings {
  const res = validateAlertSettings(settings);
  if (!res.isValid) {
    throw new Error(`Invalid alert settings: ${res.errors.join(', ')}`);
  }
  return res.normalized;
}
