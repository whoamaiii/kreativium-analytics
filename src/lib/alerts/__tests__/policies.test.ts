import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();

vi.mock('@/lib/storage', () => ({
  safeGet: (key: string) => store.get(key) ?? null,
  safeSet: (key: string, value: string) => { store.set(key, value); },
}));

import { AlertPolicies, validateAlertSettings, assertValidAlertSettings } from '@/lib/alerts/policies';
import type { AlertEvent, AlertSettings } from '@/lib/alerts/types';
import { AlertKind, AlertSeverity, AlertStatus } from '@/lib/alerts/types';
import { DEDUPE_WINDOW_MS, MAX_THROTTLE_DELAY_MS } from '@/lib/alerts/constants';

function baseAlert(overrides: Partial<AlertEvent> = {}): AlertEvent {
  const now = new Date();
  return {
    id: overrides.id ?? ('a-' + Math.random().toString(36).slice(2)),
    studentId: overrides.studentId ?? 's1',
    kind: overrides.kind ?? AlertKind.BehaviorSpike,
    severity: overrides.severity ?? AlertSeverity.Moderate,
    confidence: overrides.confidence ?? 0.7,
    createdAt: overrides.createdAt ?? now.toISOString(),
    status: overrides.status ?? AlertStatus.New,
    metadata: overrides.metadata,
    dedupeKey: overrides.dedupeKey,
    sources: overrides.sources,
    actions: overrides.actions,
  };
}

describe('AlertPolicies', () => {
  beforeEach(() => {
    store.clear();
    vi.useRealTimers();
  });

  it('validates settings and normalizes invalid inputs', () => {
    const bad: AlertSettings = {
      studentId: 's1',
      quietHours: { start: '25:00', end: '99:99' },
      dailyCaps: { critical: -1, important: NaN as unknown as number, moderate: 4, low: -2 },
    } as unknown as AlertSettings;
    const res = validateAlertSettings(bad);
    expect(res.isValid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
    // Normalized should fall back to defaults
    expect(res.normalized.dailyCaps.critical).toBeGreaterThanOrEqual(0);
    expect(res.normalized.quietHours).toBeUndefined();
  });

  it('computes quiet hours with day-of-week and midnight crossover', () => {
    const policies = new AlertPolicies();
    const today = new Date();
    const settings: AlertSettings = {
      studentId: 's1',
      quietHours: { start: '22:00', end: '07:00', daysOfWeek: [today.getDay()] },
    };
    const late = new Date(today);
    late.setHours(23, 30, 0, 0);
    const early = new Date(today);
    early.setHours(6, 30, 0, 0);
    const noon = new Date(today);
    noon.setHours(12, 0, 0, 0);
    expect(policies.isInQuietHours('s1', settings, late)).toBe(true);
    expect(policies.isInQuietHours('s1', settings, early)).toBe(true);
    expect(policies.isInQuietHours('s1', settings, noon)).toBe(false);
  });

  it('enforces daily caps by severity using persisted counts', () => {
    const policies = new AlertPolicies();
    const studentId = 's1';
    const base = new Date();
    const alerts: AlertEvent[] = [
      baseAlert({ id: 'c1', studentId, severity: AlertSeverity.Critical, createdAt: new Date(base.getTime() + 1).toISOString() }),
      baseAlert({ id: 'c2', studentId, severity: AlertSeverity.Critical, createdAt: new Date(base.getTime() + 2).toISOString() }),
      baseAlert({ id: 'm1', studentId, severity: AlertSeverity.Moderate, createdAt: new Date(base.getTime() + 3).toISOString() }),
      baseAlert({ id: 'm2', studentId, severity: AlertSeverity.Moderate, createdAt: new Date(base.getTime() + 4).toISOString() }),
      baseAlert({ id: 'm3', studentId, severity: AlertSeverity.Moderate, createdAt: new Date(base.getTime() + 5).toISOString() }),
      baseAlert({ id: 'm4', studentId, severity: AlertSeverity.Moderate, createdAt: new Date(base.getTime() + 6).toISOString() }),
      baseAlert({ id: 'm5', studentId, severity: AlertSeverity.Moderate, createdAt: new Date(base.getTime() + 7).toISOString() }),
    ];
    const withCaps = policies.enforceCapLimits(alerts, {
      studentId,
      dailyCaps: { critical: 1, important: 2, moderate: 4, low: Number.MAX_SAFE_INTEGER },
    });
    const g = new Map(withCaps.map((a) => [a.id, a.governance?.capExceeded ?? false]));
    expect(g.get('c1')).toBe(false);
    expect(g.get('c2')).toBe(true);
    expect(g.get('m1')).toBe(false);
    expect(g.get('m2')).toBe(false);
    expect(g.get('m3')).toBe(false);
    expect(g.get('m4')).toBe(false);
    expect(g.get('m5')).toBe(true);
  });

  it('applies exponential backoff throttling and resets after eligibility', () => {
    const policies = new AlertPolicies();
    const studentId = 's1';
    const createdAt = new Date().toISOString();
    const alert = baseAlert({ id: 'a1', studentId, createdAt });

    vi.useFakeTimers();
    vi.setSystemTime(new Date(alert.createdAt));

    // First call: attempts=0 -> delay 1000ms; throttled because now < created + delay
    let result = policies.shouldThrottle(alert);
    expect(result.throttled).toBe(true);

    // Advance by 1000ms -> should become eligible and reset attempts
    vi.advanceTimersByTime(1000);
    result = policies.shouldThrottle(alert);
    expect(result.throttled).toBe(false);
  });

  it('deduplicates within a 1-hour window and prefers higher severity and recency', () => {
    const policies = new AlertPolicies();
    const studentId = 's1';
    const t0 = Date.now();
    const a1 = baseAlert({ id: 'x1', studentId, severity: AlertSeverity.Moderate, createdAt: new Date(t0).toISOString(), metadata: { contextKey: 'math' } });
    const a2 = baseAlert({ id: 'x2', studentId, severity: AlertSeverity.Important, createdAt: new Date(t0 + 30 * 60 * 1000).toISOString(), metadata: { contextKey: 'math' } });
    const a3 = baseAlert({ id: 'x3', studentId, severity: AlertSeverity.Low, createdAt: new Date(t0 + 61 * 60 * 1000).toISOString(), metadata: { contextKey: 'math' } });
    const out = policies.deduplicateAlerts([a1, a2, a3], 60 * 60 * 1000);
    // Within first hour, only one result should remain and be the Important severity
    const firstGroup = out.find((e) => e.id === 'x2');
    expect(firstGroup).toBeTruthy();
    // Third alert is outside the window, should be kept
    const third = out.find((e) => e.id === 'x3');
    expect(third).toBeTruthy();
  });

  it('supports snooze and dontShowForDays lifecycle', () => {
    const policies = new AlertPolicies();
    const studentId = 's1';
    const alert = baseAlert({ studentId });
    const key = policies.calculateDedupeKey(alert);
    expect(policies.isSnoozed(studentId, key)).toBe(false);
    policies.snooze(studentId, key, 1);
    expect(policies.isSnoozed(studentId, key)).toBe(true);
    // After 25 hours via fake timers, snooze should expire
    vi.useFakeTimers();
    vi.advanceTimersByTime(25 * 3600_000);
    expect(policies.isSnoozed(studentId, key)).toBe(false);
    // dontShowForDays uses hours under the hood
    policies.dontShowForDays(studentId, key, 1);
    expect(policies.isSnoozed(studentId, key)).toBe(true);
  });

  it('integrates policies in canCreateAlert and records governance status', () => {
    const policies = new AlertPolicies();
    const studentId = 's1';
    const alert = baseAlert({ id: 'g1', studentId });
    const settings: AlertSettings = {
      studentId,
      dailyCaps: { critical: 1, important: 1, moderate: 0, low: Number.MAX_SAFE_INTEGER },
    };
    const { allowed, status } = policies.canCreateAlert(alert, settings);
    expect(allowed).toBe(false);
    expect(status?.capExceeded).toBe(true);
  });

  it('property: deduplication yields at most one alert per key within a window', () => {
    const policies = new AlertPolicies();
    const studentId = 's1';
    // Align to top of UTC hour to ensure a single hourKey bucket
    const baseTime = Date.parse('2024-01-01T10:00:00.000Z');
    const alerts: AlertEvent[] = [];
    for (let i = 0; i < 10; i += 1) {
      alerts.push(baseAlert({ id: 'p' + i, studentId, severity: AlertSeverity.Low, createdAt: new Date(baseTime + i * 5 * 60 * 1000).toISOString(), metadata: { contextKey: 'ctx' } }));
    }
    const deduped = policies.deduplicateAlerts(alerts, 60 * 60 * 1000);
    // Only one for the same key in a 60-minute window
    expect(deduped.length).toBe(1);
  });

  it('uses default dedupe window when not provided', () => {
    const policies = new AlertPolicies();
    const studentId = 's1';
    const t0 = Date.now();
    const a1 = baseAlert({ id: 'd1', studentId, severity: AlertSeverity.Low, createdAt: new Date(t0).toISOString(), metadata: { contextKey: 'ctx' } });
    const a2 = baseAlert({ id: 'd2', studentId, severity: AlertSeverity.Low, createdAt: new Date(t0 + (DEDUPE_WINDOW_MS / 2)).toISOString(), metadata: { contextKey: 'ctx' } });
    const out = policies.deduplicateAlerts([a1, a2]);
    expect(out.length).toBe(1);
  });

  it('records audit trail entries and can export audit JSON', () => {
    const policies = new AlertPolicies();
    const studentId = 's1';
    const alert = baseAlert({ id: 'audit-1', studentId, severity: AlertSeverity.Moderate });
    const settings: AlertSettings = { studentId, dailyCaps: { critical: 0, important: 0, moderate: 0, low: 0 } } as any;
    const res = policies.canCreateAlert(alert, settings);
    expect(res.allowed).toBe(false);
    const trail = policies.getAuditTrail(studentId, 10);
    expect(trail.length).toBeGreaterThan(0);
    const json = policies.exportAuditTrail(studentId, 10);
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[parsed.length - 1]?.alertId).toBe('audit-1');
  });

  it('assertValidAlertSettings throws on invalid inputs and returns normalized on valid', () => {
    const bad: AlertSettings = {
      studentId: 's1',
      quietHours: { start: '99:00', end: '77:77' },
      dailyCaps: { critical: -1, important: -2, moderate: -3, low: -4 },
    } as unknown as AlertSettings;
    expect(() => assertValidAlertSettings(bad)).toThrowError();
    const ok = assertValidAlertSettings({ studentId: 's1' } as any);
    expect(ok.studentId).toBe('s1');
  });

  it('throttle delay grows with attempts but does not exceed MAX_THROTTLE_DELAY_MS', () => {
    const policies = new AlertPolicies();
    const studentId = 's1';
    const alert = baseAlert({ id: 'th-1', studentId });
    const key = policies.calculateDedupeKey(alert);
    // initial attempts 0
    let delay0 = policies.getThrottleDelay(studentId, key);
    // record a few attempts
    for (let i = 0; i < 8; i += 1) policies.recordThrottleAttempt(studentId, key);
    const delay1 = policies.getThrottleDelay(studentId, key);
    expect(delay1).toBeGreaterThanOrEqual(delay0);
    // many attempts saturate
    for (let i = 0; i < 20; i += 1) policies.recordThrottleAttempt(studentId, key);
    const delayMax = policies.getThrottleDelay(studentId, key);
    expect(delayMax).toBeLessThanOrEqual(MAX_THROTTLE_DELAY_MS);
  });

  describe('severity-based throttling', () => {
    function alertFor(sev: AlertSeverity): AlertEvent {
      const createdAt = '2024-01-01T10:10:00.000Z';
      return baseAlert({
        studentId: 's1',
        kind: AlertKind.BehaviorSpike,
        severity: sev,
        createdAt,
        metadata: { contextKey: 'room-101' },
      });
    }

    it('orders delays by severity using defaults (critical <= important <= moderate <= low)', () => {
      const policies = new AlertPolicies();
      const studentId = 's1';
      const aBase = alertFor(AlertSeverity.Moderate);
      const dedupeKey = policies.calculateDedupeKey(aBase);
      // Seed attempts for shared key
      for (let i = 0; i < 5; i += 1) policies.recordThrottleAttempt(studentId, dedupeKey);

      const dCrit = policies.getThrottleDelayFor(alertFor(AlertSeverity.Critical));
      const dImp = policies.getThrottleDelayFor(alertFor(AlertSeverity.Important));
      const dMod = policies.getThrottleDelayFor(alertFor(AlertSeverity.Moderate));
      const dLow = policies.getThrottleDelayFor(alertFor(AlertSeverity.Low));

      expect(dCrit).toBeLessThanOrEqual(dImp);
      expect(dImp).toBeLessThanOrEqual(dMod);
      expect(dMod).toBeLessThanOrEqual(dLow);
      // All under global cap
      expect(dLow).toBeLessThanOrEqual(MAX_THROTTLE_DELAY_MS);
    });

    it('applies per-severity maxDelay caps', () => {
      const policies = new AlertPolicies();
      const studentId = 's1';
      const aLow = alertFor(AlertSeverity.Low);
      const aMod = alertFor(AlertSeverity.Moderate);
      const key = policies.calculateDedupeKey(aLow);
      for (let i = 0; i < 10; i += 1) policies.recordThrottleAttempt(studentId, key);

      const settings = { studentId, throttle: { maxDelayBySeverity: { [AlertSeverity.Low]: 30_000 } } } as any;
      const dLow = policies.getThrottleDelayFor(aLow, settings);
      const dMod = policies.getThrottleDelayFor(aMod, settings);
      expect(dLow).toBeLessThanOrEqual(30_000);
      expect(dMod).toBeGreaterThan(30_000);
      expect(dMod).toBeLessThanOrEqual(MAX_THROTTLE_DELAY_MS);
    });

    it('shouldThrottle schedules earlier eligibility for higher severity given same attempts', () => {
      const policies = new AlertPolicies();
      const studentId = 's1';
      const now = Date.parse('2024-01-02T12:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(new Date(now));

      const aCrit = alertFor(AlertSeverity.Critical);
      const aLow = alertFor(AlertSeverity.Low);
      const key = policies.calculateDedupeKey(aCrit);

      // Critical
      policies.resetThrottle(studentId, key);
      for (let i = 0; i < 6; i += 1) policies.recordThrottleAttempt(studentId, key);
      const resCrit = policies.shouldThrottle(aCrit);
      expect(resCrit.throttled).toBe(true);
      const nextCrit = Date.parse(String(resCrit.nextEligibleAt));

      // Low
      policies.resetThrottle(studentId, key);
      for (let i = 0; i < 6; i += 1) policies.recordThrottleAttempt(studentId, key);
      const resLow = policies.shouldThrottle(aLow);
      expect(resLow.throttled).toBe(true);
      const nextLow = Date.parse(String(resLow.nextEligibleAt));

      expect(nextCrit).toBeLessThan(nextLow);
      expect(nextLow - now).toBeLessThanOrEqual(MAX_THROTTLE_DELAY_MS);
    });
  });

  it('namespaces storage keys to isolate state across namespaces', () => {
    const studentId = 's1';
    const pA = new AlertPolicies('nsA');
    const pB = new AlertPolicies('nsB');
    const createdAt = '2024-01-01T10:10:00.000Z';
    const alert = baseAlert({ studentId, createdAt, metadata: { contextKey: 'ctx' } });
    const key = pA.calculateDedupeKey(alert);

    // Attempts in nsA do not affect nsB
    for (let i = 0; i < 3; i += 1) pA.recordThrottleAttempt(studentId, key);
    const delayA = pA.getThrottleDelay(studentId, key);
    const delayB = pB.getThrottleDelay(studentId, key);
    expect(delayA).toBeGreaterThan(delayB); // nsB remains at initial attempts

    // Snooze in nsA should not affect nsB
    pA.snooze(studentId, key, 1);
    expect(pA.isSnoozed(studentId, key)).toBe(true);
    expect(pB.isSnoozed(studentId, key)).toBe(false);

    // Audit in nsA is not visible in nsB
    pA.canCreateAlert(alert as any, { studentId } as any);
    expect(pA.getAuditTrail(studentId).length).toBeGreaterThan(0);
    expect(pB.getAuditTrail(studentId).length).toBe(0);
  });
});


