import { DetectorResult, SourceType } from '@/lib/alerts/types';
import { regularizedIncompleteBeta } from '@/lib/statistics';
import type { BetaPrior } from '@/lib/alerts/types';

export interface BetaRateDetectorInput {
  successes: number;
  trials: number;
  baselinePrior: BetaPrior;
  label?: string;
  delta?: number;
  minSupport?: number;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export function detectBetaRateShift(input: BetaRateDetectorInput): DetectorResult | null {
  const { successes, trials, baselinePrior, label } = input;
  const minSupport = input.minSupport ?? 5;
  if (!baselinePrior || trials < minSupport) {
    return null;
  }
  if (!Number.isFinite(successes) || !Number.isFinite(trials) || trials <= 0) {
    return null;
  }

  // Phase 2 alignment: fallback to Jeffreys(0.5,0.5) when baseline prior is absent or non-positive.
  const alpha0 = baselinePrior?.alpha && baselinePrior.alpha > 0 ? baselinePrior.alpha : 0.5;
  const beta0 = baselinePrior?.beta && baselinePrior.beta > 0 ? baselinePrior.beta : 0.5;
  const baselineRate = alpha0 / (alpha0 + beta0);

  const alphaPost = alpha0 + successes;
  const betaPost = beta0 + (trials - successes);
  const posteriorMean = alphaPost / (alphaPost + betaPost);

  // Approximate 95% credible interval using normal approximation to Beta(a,b)
  const a = alphaPost;
  const b = betaPost;
  const denom = (a + b) * (a + b) * (a + b + 1);
  const variance = denom > 0 ? (a * b) / denom : 0;
  const stdDev = Math.sqrt(Math.max(variance, 0));
  const ciLower = clamp(posteriorMean - 1.96 * stdDev, 0, 1);
  const ciUpper = clamp(posteriorMean + 1.96 * stdDev, 0, 1);

  const delta = clamp(input.delta ?? 0.1, 0, 0.5);
  const thresholdRate = clamp(baselineRate + delta, 0, 0.9999);

  const cdfAtThreshold = regularizedIncompleteBeta(alphaPost, betaPost, thresholdRate);
  if (!Number.isFinite(cdfAtThreshold)) {
    return null;
  }
  const probability = 1 - cdfAtThreshold;

  if (probability < 0.9) {
    return null;
  }

  const effectSize = posteriorMean - baselineRate;
  const score = clamp(effectSize / Math.max(delta, 1e-3), 0, 1);
  const confidence = clamp(probability, 0.9, 0.99);

  return {
    score,
    confidence,
    impactHint: `Rate increased by ${(effectSize * 100).toFixed(1)} pts over baseline`,
    sources: [
      {
        type: SourceType.PatternEngine,
        label: label ?? 'Rate shift',
        details: {
          baselineRate,
          posteriorMean,
          delta,
          probability,
          successes,
          trials,
          posteriorAlpha: alphaPost,
          posteriorBeta: betaPost,
          credibleInterval: { lower: ciLower, upper: ciUpper, level: 0.95, n: trials },
        },
      },
    ],
  };
}
