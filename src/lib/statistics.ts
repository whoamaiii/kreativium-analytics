/**
 * Robust Statistics Module
 * 
 * This module provides statistical functions to replace inline implementations
 * currently in src/lib/enhancedPatternAnalysis.ts:
 * - calculatePearsonCorrelation() -> pearsonCorrelation()
 * - calculatePValue() with studentTCDF -> pValueForCorrelation()
 * - Mean/std z-scores in detectAnomalies() -> zScoresMedian()
 * - OLS slope in analyzeTrendsWithStatistics() -> huberRegression()
 * 
 * Follow-up task: Replace inline implementations with imports from this module.
 */

// ------------------------------
// Internal helpers (not exported)
// ------------------------------

function safeArray(values: number[]): number[] {
  if (!Array.isArray(values)) return [];
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (typeof v === 'number' && Number.isFinite(v)) out.push(v);
  }
  return out;
}

function sum(values: number[]): number {
  if (values.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < values.length; i++) s += values[i];
  return s;
}

function mean(values: number[]): number {
  const v = safeArray(values);
  if (v.length === 0) return 0;
  return sum(v) / v.length;
}

function variance(values: number[], isSample: boolean = true): number {
  const v = safeArray(values);
  const n = v.length;
  if (n === 0) return 0;
  if (n === 1) return 0;
  const m = mean(v);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const d = v[i] - m;
    acc += d * d;
  }
  const denom = isSample ? (n - 1) : n;
  if (denom <= 0) return 0;
  return acc / denom;
}

function clamp(value: number, min: number, max: number): number {
  if (min > max) [min, max] = [max, min];
  if (!Number.isFinite(value)) return value > 0 ? max : min;
  return Math.min(Math.max(value, min), max);
}

// Lanczos approximation for log-gamma with reflection for z < 0.5
function logGamma(z: number): number {
  // Coefficients for Lanczos approximation (g=7, n=9)
  const p = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];

  if (z < 0.5) {
    // Reflection formula: Γ(z)Γ(1-z) = π / sin(πz)
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  }

  z -= 1;
  let x = p[0];
  for (let i = 1; i < p.length; i++) {
    x += p[i] / (z + i);
  }
  const t = z + p.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

// Continued fraction for incomplete beta using Lentz's method
function betacf(a: number, b: number, x: number): number {
  // Increased precision and iteration cap for better numerical stability
  const MAX_IT = 10000;
  const EPS = 1e-12;
  const FPMIN = 1e-300;

  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;

  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= MAX_IT; m++) {
    const m2 = 2 * m;
    // even step
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;

    // odd step
    aa = -((a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;

    if (Math.abs(del - 1.0) < EPS) break;
  }
  return h;
}

// ------------------------------
// Exported APIs
// ------------------------------

export interface HuberRegressionResult {
  slope: number;
  intercept: number;
  iterations: number;
  converged: boolean;
  weights: number[];
}

/**
 * Compute the median of a numeric array. Invalid values (NaN, null, undefined, non-finite) are ignored.
 * Returns 0 if there are no valid values.
 */
export function median(values: number[]): number {
  const v = safeArray(values).slice();
  const n = v.length;
  if (n === 0) return 0;
  v.sort((a, b) => a - b);
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return v[mid];
  return (v[mid - 1] + v[mid]) / 2;
}

/**
 * Median Absolute Deviation (MAD).
 * method 'normal' scales by 1.4826 for normal consistency; 'raw' returns unscaled MAD.
 * Returns 0 if input is empty or MAD is undefined.
 */
export function mad(values: number[], method: 'normal' | 'raw' = 'normal'): number {
  const v = safeArray(values);
  if (v.length === 0) return 0;
  const med = median(v);
  const deviations = v.map((x) => Math.abs(x - med));
  const madRaw = median(deviations);
  if (madRaw === 0) return 0;
  return method === 'normal' ? 1.4826 * madRaw : madRaw;
}

/**
 * Robust z-scores using median and MAD.
 * If opts.center is provided, it is used as the center; otherwise median(values).
 * If MAD is 0 or insufficient data, returns an array of zeros matching the input length.
 */
export function zScoresMedian(
  values: number[],
  opts?: { constant?: number; center?: number }
): number[] {
  const v = values.slice(); // preserve length and indexing
  if (v.length === 0) return [];

  const center = typeof opts?.center === 'number' && Number.isFinite(opts.center)
    ? opts.center
    : median(safeArray(v));

  const constant = typeof opts?.constant === 'number' && Number.isFinite(opts.constant)
    ? opts.constant
    : 1.4826;

  // Compute MAD using raw method, then apply provided constant to denominator
  const vSafe = safeArray(v);
  let scale = 0;
  if (vSafe.length > 0) {
    const med = median(vSafe);
    const devs = vSafe.map((x) => Math.abs(x - med));
    const m = median(devs);
    scale = m * (constant || 1);
  }

  if (!scale || scale === 0) return new Array(v.length).fill(0);

  const zs: number[] = new Array(v.length);
  for (let i = 0; i < v.length; i++) {
    const x = v[i];
    zs[i] = Number.isFinite(x) ? (x - center) / scale : 0;
  }
  return zs;
}

/**
 * Pearson correlation coefficient between two arrays x and y.
 * Ignores invalid entries and pairs by index. Returns 0 if insufficient data or zero variance.
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const yi = y[i];
    if (Number.isFinite(xi) && Number.isFinite(yi)) {
      xs.push(xi);
      ys.push(yi);
    }
  }
  const m = xs.length;
  if (m < 2) return 0;

  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < m; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx <= 0 || syy <= 0) return 0;
  return num / Math.sqrt(sxx * syy);
}

/**
 * Regularized incomplete beta function I_x(a, b).
 * Uses Lentz's method via continued fraction expansion.
 * Returns NaN if inputs are out of domain; clamps x to [0, 1].
 */
export function regularizedIncompleteBeta(a: number, b: number, x: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return NaN;
  if (!Number.isFinite(x)) return NaN;
  // Clamp slightly away from 0 and 1 to improve numerical stability
  const EPS = 1e-15;
  x = clamp(x, EPS, 1 - EPS);

  // Compute front factor bt = exp(lgamma(a+b) - lgamma(a) - lgamma(b) + a*log(x) + b*log(1-x))
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );

  let result: number;
  if (x < (a + 1) / (a + b + 2)) {
    result = (bt * betacf(a, b, x)) / a;
  } else {
    result = 1 - (bt * betacf(b, a, 1 - x)) / b;
  }
  return clamp(result, 0, 1);
}

/**
 * Student's t cumulative distribution function (lower tail) for t with df degrees of freedom.
 * Uses the regularized incomplete beta function. Returns 0.5 if df <= 0.
 */
export function tCDF(t: number, df: number): number {
  if (!Number.isFinite(t)) return NaN;
  if (!Number.isFinite(df) || df <= 0) return 0.5;

  // Numerically integrate the PDF using adaptive Simpson's rule for robust accuracy
  const tt = Math.abs(t);

  const c = Math.exp(
    logGamma((df + 1) / 2) - logGamma(df / 2) - 0.5 * Math.log(df * Math.PI)
  );
  const pdf = (u: number): number => c * Math.pow(1 + (u * u) / df, -((df + 1) / 2));

  // Adaptive Simpson's rule
  function simpson(f: (x: number) => number, a: number, b: number): number {
    const c = (a + b) / 2;
    const h = b - a;
    return (h / 6) * (f(a) + 4 * f(c) + f(b));
  }
  function adaptiveSimpson(
    f: (x: number) => number,
    a: number,
    b: number,
    eps: number,
    S: number,
    depth: number
  ): number {
    const c = (a + b) / 2;
    const Sleft = simpson(f, a, c);
    const Sright = simpson(f, c, b);
    const delta = Sleft + Sright - S;
    if (depth <= 0 || Math.abs(delta) <= 15 * eps) {
      return Sleft + Sright + delta / 15;
    }
    return (
      adaptiveSimpson(f, a, c, eps / 2, Sleft, depth - 1) +
      adaptiveSimpson(f, c, b, eps / 2, Sright, depth - 1)
    );
  }

  const eps = 1e-12;
  const maxDepth = 30;
  const S0 = simpson(pdf, 0, tt);
  const integral = tt === 0 ? 0 : adaptiveSimpson(pdf, 0, tt, eps, S0, maxDepth);
  const base = 0.5;
  const cdf = t >= 0 ? base + integral : base - integral;
  return clamp(cdf, 0, 1);
}

/**
 * Two-tailed p-value for a Pearson correlation coefficient r with sample size n.
 * Uses t-distribution with df = n - 2.
 * Returns 1 if insufficient data.
 */
export function pValueForCorrelation(r: number, n: number): number {
  if (!Number.isFinite(r) || !Number.isFinite(n) || n < 3) return 1;
  const df = n - 2;
  const denom = 1 - r * r;
  if (denom <= 0) return 0; // perfect correlation
  const t = Math.abs((r * Math.sqrt(df)) / Math.sqrt(denom));
  const cdf = tCDF(t, df);
  // two-tailed p = 2*(1 - CDF), clamp minimal p to machine epsilon
  let p = 2 * (1 - cdf);
  if (!Number.isFinite(p)) p = 1;
  const EPS = 1e-16;
  return clamp(Math.max(p, EPS), 0, 1);
}

/**
 * Fisher's exact test (two-tailed) for a 2x2 contingency table.
 * Returns the exact two-tailed p-value using the hypergeometric distribution.
 * The two-tailed p-value is computed by summing probabilities of all tables
 * with probability less than or equal to the observed table under fixed margins.
 */
export function fisherExactTwoTailed(a: number, b: number, c: number, d: number): number {
  const A = Math.max(0, Math.floor(a));
  const B = Math.max(0, Math.floor(b));
  const C = Math.max(0, Math.floor(c));
  const D = Math.max(0, Math.floor(d));
  const row1 = A + B;
  const row2 = C + D;
  const col1 = A + C;
  const col2 = B + D;
  const N = row1 + row2;
  if (N === 0) return 1;

  // Hypergeometric probability mass function for given x in cell (0,0)
  function logChoose(n: number, k: number): number {
    if (k < 0 || k > n) return -Infinity;
    return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
  }
  function logHypergeom(x: number): number {
    return (
      logChoose(col1, x) +
      logChoose(col2, row1 - x) -
      logChoose(N, row1)
    );
  }

  const minX = Math.max(0, row1 - col2);
  const maxX = Math.min(row1, col1);
  const observed = A;
  const logPObs = logHypergeom(observed);

  // Sum probabilities of tables with probability <= observed (two-sided definition)
  let sum = 0;
  for (let x = minX; x <= maxX; x++) {
    const lp = logHypergeom(x);
    if (lp <= logPObs + 1e-12) {
      sum += Math.exp(lp);
    }
  }
  return clamp(sum, 0, 1);
}

/**
 * Robust linear regression using Huber loss via Iteratively Reweighted Least Squares (IRLS).
 * Model: y = intercept + slope * x
 *
 * opts:
 * - delta: threshold parameter for Huber loss (default 1.345)
 * - maxIter: maximum iterations (default 50)
 * - tol: convergence tolerance for parameter change (default 1e-6)
 *
 * Returns a result with fitted parameters, iterations, convergence flag, and final weights.
 * In case of insufficient data, returns slope=0 and intercept=median(y) (or 0 if empty), converged=false.
 */
export function huberRegression(
  x: number[],
  y: number[],
  opts?: { delta?: number; maxIter?: number; tol?: number }
): HuberRegressionResult {
  const n = Math.min(x.length, y.length);
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const yi = y[i];
    if (Number.isFinite(xi) && Number.isFinite(yi)) {
      xs.push(xi);
      ys.push(yi);
    }
  }

  const m = xs.length;
  const defaultIntercept = m > 0 ? median(ys) : 0;
  if (m < 2) {
    return { slope: 0, intercept: defaultIntercept, iterations: 0, converged: false, weights: new Array(n).fill(0) };
  }

  const delta = typeof opts?.delta === 'number' && opts.delta! > 0 ? opts.delta! : 1.345;
  const maxIter = typeof opts?.maxIter === 'number' && opts.maxIter! > 0 ? Math.floor(opts!.maxIter!) : 50;
  const tol = typeof opts?.tol === 'number' && opts.tol! > 0 ? opts.tol! : 1e-6;

  // Initialize with OLS if possible
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < m; i++) {
    const dx = xs[i] - mx;
    num += dx * (ys[i] - my);
    den += dx * dx;
  }
  let slope = den > 0 ? num / den : 0;
  let intercept = my - slope * mx;

  const weights = new Array(m).fill(1);
  let converged = false;
  let iterations = 0;

for (let iter = 0; iter < maxIter; iter++) {
    iterations = iter + 1;
    // residuals
    const residuals = new Array(m);
    for (let i = 0; i < m; i++) residuals[i] = ys[i] - (intercept + slope * xs[i]);

    // robust scale via MAD; guard against zero
    let scale = mad(residuals, 'normal');
    if (!scale || scale === 0) {
      // fallback to standard deviation
      const v = variance(residuals, true);
      scale = Math.sqrt(Math.max(v, 1e-12));
    }

    // compute Huber weights
    for (let i = 0; i < m; i++) {
      const r = residuals[i];
      const ar = Math.abs(r);
      const c = delta * scale;
      weights[i] = ar <= c ? 1 : c / ar;
    }

    // weighted least squares update
    const W = sum(weights);
    if (W <= 0) break;

    let xw = 0, yw = 0;
    for (let i = 0; i < m; i++) {
      const w = weights[i];
      xw += w * xs[i];
      yw += w * ys[i];
    }
    const xBar = xw / W;
    const yBar = yw / W;

    let sxx = 0, sxy = 0;
    for (let i = 0; i < m; i++) {
      const w = weights[i];
      const dx = xs[i] - xBar;
      sxx += w * dx * dx;
      sxy += w * dx * (ys[i] - yBar);
    }

    const prevSlope = slope;
    const prevIntercept = intercept;

    if (sxx > 0) {
      slope = sxy / sxx;
    } // else keep previous slope
    intercept = yBar - slope * xBar;

    const dSlope = Math.abs(slope - prevSlope);
    const dInt = Math.abs(intercept - prevIntercept);
    if (dSlope < tol && dInt < tol) {
      converged = true;
      break;
    }
  }

  return { slope, intercept, iterations, converged, weights };
}

