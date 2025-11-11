// Detector tuning utilities
// - Control limit tuning for EWMA
// - Decision interval tuning for CUSUM
// - Adaptive adjustments based on baseline quality

/**
 * Compute the two‑sided z multiplier for a target false alert rate of ~1 per N points.
 * Uses normal approximation: 2 * (1 - Phi(z)) = 1 / N → z = Phi^{-1}(1 - 1/(2N)).
 * Defaults to N=336, which yields z≈3.0.
 */
export function computeEwmaControlMultiplier(targetFalseAlertsPerN: number = 336): number {
  const N =
    Number.isFinite(targetFalseAlertsPerN) && targetFalseAlertsPerN > 1
      ? targetFalseAlertsPerN
      : 336;
  const tail = 1 / (2 * N);
  const p = 1 - tail; // upper tail complement
  const z = inverseStandardNormalCDF(p);
  // Guard against numerical edge cases
  if (!Number.isFinite(z) || z <= 0) return 3.0;
  return Math.max(2.0, Math.min(z, 5.0));
}

/**
 * Compute a decision interval multiplier (in units of sigma) for one‑sided CUSUM.
 * Keeps the conventional default of ~5σ while allowing mild adjustment for different targets.
 * This is a pragmatic heuristic tuned for stability, not an exact ARL mapping.
 */
export function computeCusumDecisionIntervalMultiplier(
  kFactor: number = 0.5,
  targetFalseAlertsPerN: number = 336,
): number {
  const k = Number.isFinite(kFactor) && kFactor > 0 ? kFactor : 0.5;
  const N =
    Number.isFinite(targetFalseAlertsPerN) && targetFalseAlertsPerN > 1
      ? targetFalseAlertsPerN
      : 336;
  // Base at 5.0 with gentle scaling by target N and k
  // More conservative intervals for smaller k or larger N targets
  const nScale = clamp(Math.log10(N / 336), -0.5, 0.5); // [-0.5, 0.5]
  const kScale = clamp(0.5 / k - 1, -0.4, 0.6); // [-0.4, 0.6]
  const h = 5.0 * (1 + 0.15 * nScale + 0.2 * kScale);
  return clamp(h, 4.0, 7.5);
}

/**
 * Adjust a threshold multiplier based on baseline quality (0-1).
 * Lower quality → higher thresholds to reduce false alerts; higher quality → slight relaxation.
 */
export function adjustMultiplierByBaselineQuality(
  multiplier: number,
  qualityScore?: number,
): number {
  if (!Number.isFinite(multiplier) || multiplier <= 0) return multiplier;
  if (!Number.isFinite(qualityScore)) return multiplier;
  const q = clamp(qualityScore as number, 0, 1);
  // Piecewise linear adjustment: <0.6 → up to +25%; >0.9 → -5%
  if (q < 0.6) {
    const t = (0.6 - q) / 0.6; // 0..1 when q in [0, 0.6]
    return multiplier * (1 + 0.25 * t);
  }
  if (q > 0.9) {
    const t = (q - 0.9) / 0.1; // 0..1 when q in [0.9, 1]
    return multiplier * (1 - 0.05 * t);
  }
  return multiplier;
}

/** Clamp utility */
export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (min > max) [min, max] = [max, min];
  return Math.min(Math.max(value, min), max);
}

/**
 * Approximate inverse of the standard normal CDF using the Acklam method.
 * Accurate to ~1e-9 for 0<p<1.
 */
export function inverseStandardNormalCDF(p: number): number {
  // Coefficients in rational approximations
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2,
    -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];

  // Define break-points
  const plow = 0.02425;
  const phigh = 1 - plow;

  if (!(p > 0 && p < 1)) {
    if (p === 0) return -Infinity;
    if (p === 1) return Infinity;
    return NaN;
  }

  let q: number;
  let r: number;
  let x: number;

  if (p < plow) {
    // Rational approximation for lower region
    q = Math.sqrt(-2 * Math.log(p));
    x =
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p > phigh) {
    // Rational approximation for upper region
    q = Math.sqrt(-2 * Math.log(1 - p));
    x =
      -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else {
    // Rational approximation for central region
    q = p - 0.5;
    r = q * q;
    x =
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  // One step of Halley's method to improve accuracy
  const e = 0.5 * (1 + erf(x / Math.SQRT2)) - p;
  const u = e * Math.sqrt(2 * Math.PI) * Math.exp(0.5 * x * x);
  x = x - u / (1 + (x * u) / 2);
  return x;
}

/** Error function approximation (Abramowitz & Stegun 7.1.26) */
export function erf(x: number): number {
  // Save the sign of x
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);

  // Coefficients
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}
