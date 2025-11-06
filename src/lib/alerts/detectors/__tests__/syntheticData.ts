import type { TrendPoint } from '@/lib/alerts/detectors/ewma';

// Deterministic PRNG (Mulberry32)
export function createRng(seed: number = 123456789): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalSample(rng: () => number): number {
  // Box-Muller transform
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  const r = Math.sqrt(-2 * Math.log(u1));
  const theta = 2 * Math.PI * u2;
  return r * Math.cos(theta);
}

export function generateStableBaseline(
  n: number,
  mean: number = 0,
  sigma: number = 1,
  seed: number = 42,
): number[] {
  const rng = createRng(seed);
  const out: number[] = new Array(n);
  for (let i = 0; i < n; i++) out[i] = mean + sigma * normalSample(rng);
  return out;
}

export function generateStepChange(
  n: number,
  changeIndex: number,
  shift: number,
  mean: number = 0,
  sigma: number = 1,
  seed: number = 7,
): number[] {
  const rng = createRng(seed);
  const out: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const mu = i >= changeIndex ? mean + shift : mean;
    out[i] = mu + sigma * normalSample(rng);
  }
  return out;
}

export function generateGradualTrend(
  n: number,
  start: number,
  slope: number,
  sigma: number = 1,
  seed: number = 99,
): number[] {
  const rng = createRng(seed);
  const out: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = (start + slope * i) + sigma * normalSample(rng);
  }
  return out;
}

export function generateSeasonal(
  n: number,
  mean: number,
  amplitude: number,
  period: number,
  sigma: number = 1,
  seed: number = 21,
): number[] {
  const rng = createRng(seed);
  const out: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = mean + amplitude * Math.sin((2 * Math.PI * i) / Math.max(1, period)) + sigma * normalSample(rng);
  }
  return out;
}

export function injectOutliers(values: number[], fraction: number = 0.01, magnitude: number = 6): number[] {
  const n = values.length;
  const rng = createRng(1234);
  const out = values.slice();
  const num = Math.max(1, Math.floor(fraction * n));
  for (let i = 0; i < num; i++) {
    const idx = Math.floor(rng() * n);
    const sign = rng() < 0.5 ? -1 : 1;
    out[idx] += sign * magnitude;
  }
  return out;
}

export function addMissing(values: number[], fraction: number = 0.02): number[] {
  const n = values.length;
  const rng = createRng(2222);
  const out = values.slice();
  const num = Math.max(1, Math.floor(fraction * n));
  for (let i = 0; i < num; i++) {
    const idx = Math.floor(rng() * n);
    out[idx] = Number.NaN as unknown as number;
  }
  return out;
}

export function toTrendSeries(values: number[], startMs: number = Date.UTC(2024, 0, 1), stepMs: number = 60_000): TrendPoint[] {
  const n = values.length;
  const series: TrendPoint[] = new Array(n);
  for (let i = 0; i < n; i++) {
    series[i] = { timestamp: startMs + i * stepMs, value: values[i] };
  }
  return series;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < values.length; i++) s += values[i];
  return s / values.length;
}

export function variance(values: number[]): number {
  const m = mean(values);
  let acc = 0;
  for (let i = 0; i < values.length; i++) {
    const d = values[i] - m;
    acc += d * d;
  }
  return values.length > 1 ? acc / (values.length - 1) : 0;
}

export function autocorrelation(values: number[], lag: number): number {
  if (lag <= 0 || lag >= values.length) return 0;
  const m = mean(values);
  let num = 0;
  let den = 0;
  for (let i = 0; i < values.length; i++) {
    const d = values[i] - m;
    den += d * d;
  }
  for (let i = lag; i < values.length; i++) {
    num += (values[i] - m) * (values[i - lag] - m);
  }
  return den > 0 ? num / den : 0;
}



// ---------------------------------------------
// New utilities for rate, association, and burst testing
// ---------------------------------------------

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

/** Sample a Binomial(trials, p) using inverse transform on Bernoulli draws */
function sampleBinomial(trials: number, p: number, rng: () => number): number {
  const T = Math.max(0, Math.floor(trials));
  const prob = clamp(p, 0, 1);
  let s = 0;
  for (let i = 0; i < T; i++) {
    if (rng() < prob) s += 1;
  }
  return s;
}

/**
 * Generate success/trial data with a controlled baseline rate and optional shift.
 * priorWeight controls how concentrated the baseline prior is around baselineRate.
 */
export function generateBetaRateData(params: {
  trials: number;
  baselineRate: number;
  shift?: number; // absolute shift to apply to the true rate for the sample
  priorWeight?: number; // pseudo-counts to construct prior around baselineRate
  seed?: number;
  jeffreys?: boolean; // if true, use Jeffreys(0.5,0.5) regardless of baselineRate
}): { successes: number; trials: number; baselinePrior: { alpha: number; beta: number }; delta: number; trueRate: number } {
  const seed = params.seed ?? 13579;
  const rng = createRng(seed);
  const baselineRate = clamp(params.baselineRate, 0, 1);
  const shift = params.shift ?? 0;
  const trueRate = clamp(baselineRate + shift, 0, 1);
  const successes = sampleBinomial(params.trials, trueRate, rng);

  // Construct a prior centered on baselineRate with given weight, or Jeffreys if requested
  if (params.jeffreys) {
    return {
      successes,
      trials: params.trials,
      baselinePrior: { alpha: 0.5, beta: 0.5 },
      delta: Math.abs(shift),
      trueRate,
    };
  }

  const w = Math.max(0, Math.floor(params.priorWeight ?? 50));
  const alpha = 0.5 + baselineRate * w;
  const beta = 0.5 + (1 - baselineRate) * w;
  return { successes, trials: params.trials, baselinePrior: { alpha, beta }, delta: Math.abs(shift), trueRate };
}

/**
 * Generate a 2x2 contingency table with a target odds ratio (balanced margins).
 * Defaults to total=200 and OR=4 for a clear association.
 */
export function generateContingencyTable(params?: { total?: number; oddsRatio?: number; zeroCells?: boolean }): { a: number; b: number; c: number; d: number } {
  const total = Math.max(4, Math.floor(params?.total ?? 200));
  const half = Math.floor(total / 2);
  const or = Math.max(0.01, params?.oddsRatio ?? 4);
  const r = Math.sqrt(or);
  // With balanced margins and symmetry, a = d and b = c
  let a = Math.round((r / (1 + r)) * half);
  let b = half - a;
  let c = b;
  let d = a;

  // Protect against zeros if requested
  if (params?.zeroCells) {
    a = Math.max(0, a);
    b = Math.max(0, b);
    c = Math.max(0, c);
    d = Math.max(0, d);
  } else {
    a = Math.max(1, a);
    b = Math.max(1, b);
    c = Math.max(1, c);
    d = Math.max(1, d);
  }
  return { a, b, c, d };
}

/**
 * Generate event stream for burst detection. When cluster=true, creates a dense cluster
 * of events within the given window and sparse background elsewhere.
 */
export function generateBurstEvents(params?: {
  n?: number; // total events
  cluster?: boolean;
  windowMinutes?: number;
  startMs?: number;
  backgroundCount?: number;
  clusterCount?: number;
  clusterIntensity?: { mean?: number; sigma?: number };
  backgroundIntensity?: { mean?: number; sigma?: number };
  seed?: number;
  pairedCorrelation?: number; // correlation between value and pairedValue within cluster
}): Array<{ timestamp: number; value: number; pairedValue?: number }> {
  const n = Math.max(1, Math.floor(params?.n ?? 60));
  const windowMinutes = params?.windowMinutes ?? 15;
  const startMs = params?.startMs ?? Date.UTC(2024, 0, 1, 9, 0, 0);
  const stepMs = 60_000; // 1 minute grid
  const rng = createRng(params?.seed ?? 424242);
  const clusterCount = Math.min(n, Math.max(0, Math.floor(params?.clusterCount ?? Math.floor(n / 3))));
  const backgroundCount = Math.max(0, Math.min(n - clusterCount, Math.floor(params?.backgroundCount ?? (n - clusterCount))));

  const out: Array<{ timestamp: number; value: number; pairedValue?: number }> = [];

  const bgMean = params?.backgroundIntensity?.mean ?? 0.5;
  const bgSigma = params?.backgroundIntensity?.sigma ?? 0.2;
  const clMean = params?.clusterIntensity?.mean ?? 2.0;
  const clSigma = params?.clusterIntensity?.sigma ?? 0.5;
  const rho = clamp(params?.pairedCorrelation ?? 0.8, -0.99, 0.99);

  // Background events spread over 2*window outside the main window
  for (let i = 0; i < backgroundCount; i++) {
    const jitterMin = -2 * windowMinutes * stepMs;
    const jitterMax = 2 * windowMinutes * stepMs;
    const ts = startMs + Math.floor(jitterMin + (jitterMax - jitterMin) * rng());
    const v = Math.max(0, bgMean + bgSigma * normalSample(rng));
    out.push({ timestamp: ts, value: v });
  }

  // Clustered events tightly within window
  if (params?.cluster !== false) {
    const clusterStart = startMs + stepMs; // avoid exact start tie
    const clusterEnd = startMs + windowMinutes * stepMs - stepMs;
    for (let i = 0; i < clusterCount; i++) {
      const ts = Math.floor(clusterStart + (clusterEnd - clusterStart) * rng());
      const x = normalSample(rng);
      const z = normalSample(rng);
      const v = Math.max(0, clMean + clSigma * x);
      const paired = clMean + clSigma * (rho * x + Math.sqrt(1 - rho * rho) * z);
      out.push({ timestamp: ts, value: v, pairedValue: paired });
    }
  }

  // Ensure ordering
  out.sort((a, b) => a.timestamp - b.timestamp);
  // Limit to n events overall
  return out.slice(0, n);
}

/**
 * Generate two correlated series with target Pearson correlation rho.
 */
export function generateCorrelatedSeries(n: number, rho: number, seed: number = 2468): { x: number[]; y: number[] } {
  const rng = createRng(seed);
  const r = clamp(rho, -0.99, 0.99);
  const x: number[] = new Array(n);
  const y: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const xn = normalSample(rng);
    const zn = normalSample(rng);
    const yn = r * xn + Math.sqrt(1 - r * r) * zn;
    x[i] = xn;
    y[i] = yn;
  }
  return { x, y };
}

// Edge-case helpers
export function zeroRateCase(): { successes: number; trials: number; baselinePrior: { alpha: number; beta: number } } {
  return { successes: 0, trials: 10, baselinePrior: { alpha: 0.5, beta: 0.5 } };
}

export function perfectRateCase(): { successes: number; trials: number; baselinePrior: { alpha: number; beta: number } } {
  return { successes: 10, trials: 10, baselinePrior: { alpha: 0.5, beta: 0.5 } };
}

