import { DetectorResult, SourceType } from '@/lib/alerts/types';
import { pearsonCorrelation, pValueForCorrelation, fisherExactTwoTailed } from '@/lib/statistics';

export interface AssociationDetectorInput {
  label: string;
  contingency: { a: number; b: number; c: number; d: number };
  seriesX?: number[];
  seriesY?: number[];
  context?: Record<string, unknown>;
  minSupport?: number;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export function detectAssociation(input: AssociationDetectorInput): DetectorResult | null {
  const { label, contingency, seriesX, seriesY } = input;
  const minSupport = input.minSupport ?? 5;
  const { a, b, c, d } = contingency;
  const total = a + b + c + d;
  if (total < minSupport) {
    return null;
  }

  const adjust = (value: number): number => (value <= 0 ? 0.5 : value);
  const oddsRatio = (adjust(a) * adjust(d)) / (adjust(b) * adjust(c));
  const logOdds = Math.log(oddsRatio);
  const se = Math.sqrt(1 / adjust(a) + 1 / adjust(b) + 1 / adjust(c) + 1 / adjust(d));
  const ciLow = logOdds - 1.96 * se;
  const ciHigh = logOdds + 1.96 * se;

  if (ciLow <= 0 && ciHigh >= 0) {
    return null;
  }

  // Fisher's exact two-tailed p-value
  const pValueExact = fisherExactTwoTailed(a, b, c, d);

  let r = 0;
  let pValue = 1;
  if (Array.isArray(seriesX) && Array.isArray(seriesY) && seriesX.length >= 5 && seriesY.length >= 5) {
    const n = Math.min(seriesX.length, seriesY.length);
    const x = seriesX.slice(0, n);
    const y = seriesY.slice(0, n);
    r = pearsonCorrelation(x, y);
    pValue = pValueForCorrelation(r, n);
  }

  const confidenceFromCorrelation = 1 - pValue;
  const confidenceFromFisher = 1 - pValueExact;
  const combined = Math.max(confidenceFromFisher, confidenceFromCorrelation, 1 - (1 / (1 + Math.abs(logOdds))));
  const confidence = clamp(combined, 0.7, 0.99);
  const score = clamp(Math.min(Math.abs(r), Math.abs(logOdds) / 2), 0, 1);

  return {
    score,
    confidence,
    impactHint: 'Statistically significant association detected',
    sources: [
      {
        type: SourceType.PatternEngine,
        label,
        details: {
          contingency,
          oddsRatio,
          logOdds,
          logOddsCi: [ciLow, ciHigh],
          correlation: r,
          correlationPValue: pValue,
          pValueExact,
          context: input.context,
          support: total,
        },
      },
    ],
  };
}

