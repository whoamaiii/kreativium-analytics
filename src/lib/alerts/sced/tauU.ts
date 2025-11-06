import type { Goal, GoalDataPoint, Intervention, InterventionDataPoint } from '@/types/student';
import type { TauUResult } from '@/lib/alerts/types';

interface PhaseData {
  phaseA: number[];
  phaseB: number[];
  timestampsA: number[];
  timestampsB: number[];
  phaseALabel: string;
  phaseBLabel: string;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.sqrt(2)));
}

function erf(x: number): number {
  // Numerical approximation (Abramowitz and Stegun, 7.1.26)
  const sign = x >= 0 ? 1 : -1;
  const abs = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * abs);
  const poly = (
    (((0.254829592 * t - 0.284496736) * t + 1.421413741) * t - 1.453152027) * t + 1.061405429
  ) * t;
  const expTerm = Math.exp(-abs * abs);
  return sign * (1 - poly * expTerm);
}

function toTimestamp(value: Date | string | number): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') return new Date(value).getTime();
  if (typeof value === 'number') return value;
  return NaN;
}

function sanitize(values: number[]): number[] {
  return values.filter(isFiniteNumber);
}

export class TauUEvaluator {
  computeTauU(phaseA: number[], phaseB: number[]): TauUResult | null {
    const baseline = sanitize(phaseA);
    const intervention = sanitize(phaseB);
    if (baseline.length < 5 || intervention.length < 5) {
      return null;
    }

    const comparisons = baseline.length * intervention.length;
    if (comparisons === 0) {
      return null;
    }

    let s = 0;
    let ties = 0;
    baseline.forEach((a) => {
      intervention.forEach((b) => {
        if (b > a) s += 1;
        else if (b < a) s -= 1;
        else ties += 1;
      });
    });

    const trendAdjustment = this.computeBaselineTrend(baseline);
    const adjustedS = s - trendAdjustment;
    const effectSize = adjustedS / comparisons;

    const variance = (baseline.length * intervention.length * (baseline.length + intervention.length + 1)) / 3;
    const zScore = variance > 0 ? adjustedS / Math.sqrt(variance) : 0;
    const pValue = Math.max(0, Math.min(1, 2 * (1 - normalCdf(Math.abs(zScore)))));

    const improvementProbability = (s + comparisons) / (2 * comparisons);
    const outcome = this.classifyOutcome(effectSize, pValue);

    return {
      effectSize,
      pValue,
      outcome,
      comparisons,
      trendAdjustment,
      ties,
      improvementProbability,
      phaseA: {
        count: baseline.length,
        mean: mean(baseline),
        median: median(baseline),
        values: baseline,
      },
      phaseB: {
        count: intervention.length,
        mean: mean(intervention),
        median: median(intervention),
        values: intervention,
      },
      interpretation: this.generateReport(effectSize, pValue, improvementProbability, outcome),
    };
  }

  extractPhaseData(input: {
    intervention: Intervention;
    goal?: Goal | null;
    baselineWindowDays?: number;
  }): PhaseData | null {
    const { intervention, goal } = input;
    if (!intervention?.implementationDate) return null;

    const baselineWindowMs = (input.baselineWindowDays ?? 60) * 24 * 3600_000;
    const implementationTs = toTimestamp(intervention.implementationDate);
    if (!Number.isFinite(implementationTs)) return null;

    const baselinePoints: Array<{ value: number; timestamp: number }> = [];
    const interventionPoints: Array<{ value: number; timestamp: number }> = [];

    const now = Date.now();

    (goal?.dataPoints ?? []).forEach((point: GoalDataPoint) => {
      const ts = toTimestamp(point.timestamp);
      if (!Number.isFinite(ts)) return;
      if (ts >= implementationTs) {
        interventionPoints.push({ value: Number(point.value), timestamp: ts });
      } else if (implementationTs - ts <= baselineWindowMs) {
        baselinePoints.push({ value: Number(point.value), timestamp: ts });
      }
    });

    (intervention.dataCollection ?? []).forEach((point: InterventionDataPoint) => {
      const ts = toTimestamp(point.timestamp);
      if (!Number.isFinite(ts)) return;
      const numeric = Number(point.effectiveness);
      if (ts >= implementationTs) {
        interventionPoints.push({ value: numeric, timestamp: ts });
      } else if (implementationTs - ts <= baselineWindowMs) {
        baselinePoints.push({ value: numeric, timestamp: ts });
      }
    });

    baselinePoints.sort((a, b) => a.timestamp - b.timestamp);
    interventionPoints.sort((a, b) => a.timestamp - b.timestamp);

    const baselineValues = baselinePoints.map((p) => p.value).filter(isFiniteNumber);
    const interventionValues = interventionPoints.map((p) => p.value).filter(isFiniteNumber);

    if (baselineValues.length < 5 || interventionValues.length < 5) {
      return null;
    }

    return {
      phaseA: baselineValues,
      phaseB: interventionValues,
      timestampsA: baselinePoints.map((p) => p.timestamp),
      timestampsB: interventionPoints.map((p) => p.timestamp),
      phaseALabel: 'Baseline (A)',
      phaseBLabel: 'Intervention (B)',
    };
  }

  classifyOutcome(effectSize: number, pValue: number): TauUResult['outcome'] {
    if (effectSize >= 0.2 && pValue <= 0.1) return 'improving';
    if (effectSize <= -0.2 && pValue <= 0.1) return 'worsening';
    return 'no_change';
  }

  generateReport(effectSize: number, pValue: number, improvementProbability: number, outcome: TauUResult['outcome']): {
    headline: string;
    summary: string;
    recommendations: string[];
  } {
    const headline = outcome === 'improving'
      ? 'Intervention shows improving trend'
      : outcome === 'worsening'
        ? 'Outcome trending down'
        : 'Outcome stable';

    const summary = `Tau-U effect size ${effectSize.toFixed(2)} with p ≈ ${pValue.toFixed(3)}.`
      + ` Improvement probability ${(improvementProbability * 100).toFixed(1)}%.`;

    const recommendations: string[] = [];
    if (outcome === 'improving') {
      recommendations.push('Continue intervention and monitor for sustained gains.');
    } else if (outcome === 'worsening') {
      recommendations.push('Review fidelity of implementation and consider alternative strategies.');
    } else {
      recommendations.push('Maintain current plan and gather additional data next week.');
    }
    if (pValue > 0.05) {
      recommendations.push('Collect additional data points to increase confidence.');
    }

    return { headline, summary, recommendations };
  }

  private computeBaselineTrend(values: number[]): number {
    if (values.length < 2) return 0;
    let trend = 0;
    for (let i = 0; i < values.length; i += 1) {
      for (let j = i + 1; j < values.length; j += 1) {
        const a = values[i];
        const b = values[j];
        if (b > a) trend += 1;
        else if (b < a) trend -= 1;
      }
    }
    return trend;
  }
}

export default TauUEvaluator;
