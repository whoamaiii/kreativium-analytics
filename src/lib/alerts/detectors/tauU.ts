import { TauUEvaluator } from '@/lib/alerts/sced/tauU';
import type { Goal, Intervention } from '@/types/student';
import type { DetectorResult } from '@/lib/alerts/types';
import { SourceType } from '@/lib/alerts/types';

export interface TauUDetectorInput {
  intervention: Intervention;
  goal?: Goal | null;
  baselineWindowDays?: number;
  label?: string;
  evaluator?: TauUEvaluator;
}

export function detectInterventionOutcome(input: TauUDetectorInput): DetectorResult | null {
  if (!input?.intervention) return null;
  const evaluator = input.evaluator ?? new TauUEvaluator();
  const phaseData = evaluator.extractPhaseData({
    intervention: input.intervention,
    goal: input.goal,
    baselineWindowDays: input.baselineWindowDays,
  });
  if (!phaseData) {
    return null;
  }

  const tauU = evaluator.computeTauU(phaseData.phaseA, phaseData.phaseB);
  if (!tauU) return null;

  const score = Math.min(1, Math.max(0, Math.abs(tauU.effectSize)));
  const confidence = Math.max(0.05, 1 - tauU.pValue);
  const label = input.label ?? 'Tau-U intervention analysis';

  return {
    score,
    confidence,
    impactHint: tauU.interpretation.headline,
    sources: [
      {
        type: SourceType.PatternEngine,
        label,
        details: {
          outcome: tauU.outcome,
          effectSize: tauU.effectSize,
          pValue: tauU.pValue,
          comparisons: tauU.comparisons,
          trendAdjustment: tauU.trendAdjustment,
          improvementProbability: tauU.improvementProbability,
          phaseA: tauU.phaseA,
          phaseB: tauU.phaseB,
          recommendations: tauU.interpretation.recommendations,
        },
      },
    ],
    analysis: {
      tauU,
      interventionId: input.intervention.id,
      goalId: input.goal?.id,
      phaseData,
      detectorType: 'tauU',
    },
  } as DetectorResult;
}

export default detectInterventionOutcome;
