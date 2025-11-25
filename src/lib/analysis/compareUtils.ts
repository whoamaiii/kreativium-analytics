import type { AnalyticsResultsAI } from '@/lib/analysis/analysisEngine';
import type { AiIntervention as AiInterventionType } from '@/lib/analysis/aiSchema';
import type { PatternResult, CorrelationResult } from '@/lib/patternAnalysis';

// Local re-typed shapes to normalize across AI and heuristic forms
type Severity = 'low' | 'medium' | 'high';

export interface DeltaNumber {
  current: number | null;
  baseline: number | null;
  delta: number | null;
  deltaPct: number | null;
}

export interface SummaryDiff {
  counts: {
    patterns: DeltaNumber;
    correlations: DeltaNumber;
    insights: DeltaNumber;
    anomalies: DeltaNumber;
    predictive: DeltaNumber;
  };
  recencyMs?: DeltaNumber; // based on ai.createdAt if available
  balance?: DeltaNumber; // time-of-day balance percentage
  avgIntensity?: DeltaNumber; // average intensity if available
}

export interface NormalizedPattern {
  name: string;
  strength?: number; // 0-1
  impact?: Severity;
}

export interface PatternChange {
  key: string;
  baseline?: NormalizedPattern;
  current?: NormalizedPattern;
  deltaStrength?: number | null;
  impactChange?: { from?: Severity; to?: Severity } | null;
}

export interface PatternsDiffResult {
  added: NormalizedPattern[];
  removed: NormalizedPattern[];
  changed: PatternChange[];
}

export interface NormalizedCorrelation {
  key: string; // normalized variables key, e.g., "a|b"
  variables: [string, string];
  coefficient?: number; // -1..1
  direction?: 'positive' | 'negative';
  pValue?: number; // 0..1
}

export interface CorrelationChange {
  key: string;
  baseline?: NormalizedCorrelation;
  current?: NormalizedCorrelation;
  deltaCoefficient?: number | null;
  directionChanged?: boolean;
  significanceCrossed?: boolean; // crossed typical threshold (0.05)
}

export interface CorrelationsDiffResult {
  added: NormalizedCorrelation[];
  removed: NormalizedCorrelation[];
  changed: CorrelationChange[];
}

export interface NormalizedIntervention {
  title: string;
  confidenceOverall?: number; // 0-1
}

export interface InterventionsDiffResult {
  added: NormalizedIntervention[];
  removed: NormalizedIntervention[];
  changed: Array<{
    title: string;
    baseline?: NormalizedIntervention;
    current?: NormalizedIntervention;
    deltaConfidence?: number | null;
  }>;
}

export interface KeyFindingsDiffResult {
  added: string[];
  removed: string[];
  unchanged: string[];
}

function toDeltaNumber(current: number | null, baseline: number | null): DeltaNumber {
  if (current == null || baseline == null) {
    return { current, baseline, delta: null, deltaPct: null };
  }
  const delta = current - baseline;
  const pct = baseline === 0 ? null : (delta / baseline) * 100;
  return { current, baseline, delta, deltaPct: pct };
}

function normalizePattern(input: unknown): NormalizedPattern | undefined {
  const obj = input as any;
  if (!obj) return undefined;
  const name: string | undefined =
    typeof obj.name === 'string'
      ? obj.name
      : typeof obj.pattern === 'string'
        ? obj.pattern
        : undefined;
  if (!name) return undefined;
  const strength: number | undefined =
    typeof obj.strength === 'number'
      ? obj.strength
      : typeof obj.confidence === 'number'
        ? obj.confidence
        : undefined;
  const impact: Severity | undefined =
    typeof obj.impact === 'string'
      ? (obj.impact as Severity)
      : typeof obj.expectedImpact === 'string'
        ? (obj.expectedImpact as Severity)
        : undefined;
  return { name, strength, impact };
}

function keyForName(name: string): string {
  return name.trim().toLowerCase();
}

function normalizeCorrelation(input: unknown): NormalizedCorrelation | undefined {
  const obj = input as any;
  if (!obj) return undefined;
  let v1: string | undefined;
  let v2: string | undefined;
  if (Array.isArray(obj.variables) && obj.variables.length === 2) {
    v1 = String(obj.variables[0] ?? '');
    v2 = String(obj.variables[1] ?? '');
  } else if (typeof obj.factor1 === 'string' && typeof obj.factor2 === 'string') {
    v1 = obj.factor1;
    v2 = obj.factor2;
  }
  if (!v1 || !v2) return undefined;
  const vars = [v1.trim(), v2.trim()].sort((a, b) => a.localeCompare(b)) as [string, string];
  const key = `${vars[0]}|${vars[1]}`.toLowerCase();
  const coefficient: number | undefined =
    typeof obj.coefficient === 'number'
      ? obj.coefficient
      : typeof obj.correlation === 'number'
        ? obj.correlation
        : undefined;
  const direction: 'positive' | 'negative' | undefined =
    typeof obj.direction === 'string'
      ? (obj.direction as any)
      : coefficient != null
        ? coefficient >= 0
          ? 'positive'
          : 'negative'
        : undefined;
  const pValue: number | undefined = typeof obj.pValue === 'number' ? obj.pValue : undefined;
  return { key, variables: vars, coefficient, direction, pValue };
}

function normalizeIntervention(input: unknown): NormalizedIntervention | undefined {
  const obj = input as any;
  if (!obj) return undefined;
  const title: string | undefined = typeof obj.title === 'string' ? obj.title : undefined;
  if (!title) return undefined;
  const confidenceOverall: number | undefined =
    typeof obj.confidence?.overall === 'number' ? obj.confidence.overall : undefined;
  return { title, confidenceOverall };
}

export function diffSummary(
  current: AnalyticsResultsAI,
  baseline: AnalyticsResultsAI,
  currentBalance?: number | null,
  baselineBalance?: number | null,
  currentAvgIntensity?: number | null,
  baselineAvgIntensity?: number | null,
): SummaryDiff {
  const counts = {
    patterns: toDeltaNumber(current?.patterns?.length ?? 0, baseline?.patterns?.length ?? 0),
    correlations: toDeltaNumber(
      current?.correlations?.length ?? 0,
      baseline?.correlations?.length ?? 0,
    ),
    insights: toDeltaNumber(
      (current as any)?.insights?.length ?? 0,
      (baseline as any)?.insights?.length ?? 0,
    ),
    anomalies: toDeltaNumber(
      (current as any)?.anomalies?.length ?? 0,
      (baseline as any)?.anomalies?.length ?? 0,
    ),
    predictive: toDeltaNumber(
      (current as any)?.predictiveInsights?.length ?? 0,
      (baseline as any)?.predictiveInsights?.length ?? 0,
    ),
  };

  const createdAtCurr = (current as any)?.ai?.createdAt
    ? Date.parse((current as any).ai.createdAt)
    : null;
  const createdAtBase = (baseline as any)?.ai?.createdAt
    ? Date.parse((baseline as any).ai.createdAt)
    : null;
  const recencyMs = toDeltaNumber(createdAtCurr, createdAtBase);

  const balance = toDeltaNumber(currentBalance ?? null, baselineBalance ?? null);
  const avgIntensity = toDeltaNumber(currentAvgIntensity ?? null, baselineAvgIntensity ?? null);

  return { counts, recencyMs, balance, avgIntensity };
}

export function diffPatterns(
  currentPatterns: Array<PatternResult>,
  baselinePatterns: Array<PatternResult>,
): PatternsDiffResult {
  const currentMap = new Map<string, NormalizedPattern>();
  for (const p of currentPatterns || []) {
    const n = normalizePattern(p);
    if (n) currentMap.set(keyForName(n.name), n);
  }
  const baselineMap = new Map<string, NormalizedPattern>();
  for (const p of baselinePatterns || []) {
    const n = normalizePattern(p);
    if (n) baselineMap.set(keyForName(n.name), n);
  }

  const added: NormalizedPattern[] = [];
  const removed: NormalizedPattern[] = [];
  const changed: PatternChange[] = [];

  const allKeys = new Set<string>([
    ...Array.from(currentMap.keys()),
    ...Array.from(baselineMap.keys()),
  ]);
  for (const key of allKeys) {
    const c = currentMap.get(key);
    const b = baselineMap.get(key);
    if (c && !b) {
      added.push(c);
    } else if (!c && b) {
      removed.push(b);
    } else if (c && b) {
      const deltaStrength =
        c.strength != null && b.strength != null ? c.strength - b.strength : null;
      const impactChange = c.impact !== b.impact ? { from: b.impact, to: c.impact } : null;
      const meaningfulStrengthChange = deltaStrength !== null && Math.abs(deltaStrength) > 1e-6;
      if (meaningfulStrengthChange || impactChange) {
        changed.push({ key, baseline: b, current: c, deltaStrength, impactChange });
      }
    }
  }

  return { added, removed, changed };
}

export function diffCorrelations(
  current: Array<CorrelationResult>,
  baseline: Array<CorrelationResult>,
): CorrelationsDiffResult {
  const currentMap = new Map<string, NormalizedCorrelation>();
  for (const c of current || []) {
    const n = normalizeCorrelation(c);
    if (n) currentMap.set(n.key, n);
  }
  const baselineMap = new Map<string, NormalizedCorrelation>();
  for (const c of baseline || []) {
    const n = normalizeCorrelation(c);
    if (n) baselineMap.set(n.key, n);
  }

  const added: NormalizedCorrelation[] = [];
  const removed: NormalizedCorrelation[] = [];
  const changed: CorrelationChange[] = [];

  const allKeys = new Set<string>([
    ...Array.from(currentMap.keys()),
    ...Array.from(baselineMap.keys()),
  ]);
  for (const key of allKeys) {
    const c = currentMap.get(key);
    const b = baselineMap.get(key);
    if (c && !b) {
      added.push(c);
    } else if (!c && b) {
      removed.push(b);
    } else if (c && b) {
      const deltaCoefficient =
        c.coefficient != null && b.coefficient != null ? c.coefficient - b.coefficient : null;
      const directionChanged = c.direction !== b.direction;
      const significanceCrossed = (() => {
        const thr = 0.05;
        if (typeof c.pValue === 'number' && typeof b.pValue === 'number') {
          const bSig = b.pValue <= thr;
          const cSig = c.pValue <= thr;
          return bSig !== cSig;
        }
        return false;
      })();
      const meaningfulCoefficientChange =
        deltaCoefficient !== null && Math.abs(deltaCoefficient) > 1e-6;
      if (meaningfulCoefficientChange || directionChanged || significanceCrossed) {
        changed.push({
          key,
          baseline: b,
          current: c,
          deltaCoefficient,
          directionChanged,
          significanceCrossed,
        });
      }
    }
  }

  return { added, removed, changed };
}

export function diffInterventions(
  current: Array<AiInterventionType | any>,
  baseline: Array<AiInterventionType | any>,
): InterventionsDiffResult {
  const currentMap = new Map<string, NormalizedIntervention>();
  for (const i of current || []) {
    const n = normalizeIntervention(i);
    if (n) currentMap.set(n.title.toLowerCase(), n);
  }
  const baselineMap = new Map<string, NormalizedIntervention>();
  for (const i of baseline || []) {
    const n = normalizeIntervention(i);
    if (n) baselineMap.set(n.title.toLowerCase(), n);
  }

  const added: NormalizedIntervention[] = [];
  const removed: NormalizedIntervention[] = [];
  const changed: Array<{
    title: string;
    baseline?: NormalizedIntervention;
    current?: NormalizedIntervention;
    deltaConfidence?: number | null;
  }> = [];

  const allTitles = new Set<string>([
    ...Array.from(currentMap.keys()),
    ...Array.from(baselineMap.keys()),
  ]);
  for (const key of allTitles) {
    const c = currentMap.get(key);
    const b = baselineMap.get(key);
    if (c && !b) {
      added.push(c);
    } else if (!c && b) {
      removed.push(b);
    } else if (c && b) {
      const deltaConfidence =
        c.confidenceOverall != null && b.confidenceOverall != null
          ? c.confidenceOverall - b.confidenceOverall
          : null;
      if (deltaConfidence !== null && Math.abs(deltaConfidence) > 0) {
        changed.push({ title: c.title, baseline: b, current: c, deltaConfidence });
      }
    }
  }

  return { added, removed, changed };
}

export function diffKeyFindings(
  current: string[] = [],
  baseline: string[] = [],
): KeyFindingsDiffResult {
  const currentSet = new Set(current.map((s) => s.trim()));
  const baselineSet = new Set(baseline.map((s) => s.trim()));
  const added = Array.from(currentSet).filter((s) => !baselineSet.has(s));
  const removed = Array.from(baselineSet).filter((s) => !currentSet.has(s));
  const unchanged = Array.from(currentSet).filter((s) => baselineSet.has(s));
  return { added, removed, unchanged };
}
