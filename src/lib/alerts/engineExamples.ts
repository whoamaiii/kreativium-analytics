import { AlertDetectionEngine } from '@/lib/alerts/engine';
import { BaselineService } from '@/lib/alerts/baseline';
import { AlertPolicies } from '@/lib/alerts/policies';
import { ABTestingService } from '@/lib/alerts/experiments/abTesting';
import { ThresholdLearner } from '@/lib/alerts/learning/thresholdLearner';
import type { AlertEvent } from '@/lib/alerts/types';
import type {
  EmotionEntry,
  SensoryEntry,
  TrackingEntry,
  Intervention,
  Goal,
} from '@/types/student';

/** Example: Run detection for a single student with optional baseline */
export function runDetectionForStudent(params: {
  studentId: string;
  emotions: EmotionEntry[];
  sensory: SensoryEntry[];
  tracking: TrackingEntry[];
  baselineService?: BaselineService;
  policies?: AlertPolicies;
  experiments?: ABTestingService;
  learner?: ThresholdLearner;
  now?: Date;
  interventions?: Intervention[];
  goals?: Goal[];
}): AlertEvent[] {
  const baselineService = params.baselineService ?? new BaselineService();
  // Optionally refresh baseline before running detection
  const baseline =
    baselineService.updateBaseline({
      studentId: params.studentId,
      emotions: params.emotions,
      sensory: params.sensory,
      tracking: params.tracking,
    }) ?? baselineService.getEmotionBaseline(params.studentId);

  const engine = new AlertDetectionEngine({
    baselineService,
    policies: params.policies,
    experiments: params.experiments,
    learner: params.learner,
  });

  return engine.runDetection({
    studentId: params.studentId,
    emotions: params.emotions,
    sensory: params.sensory,
    tracking: params.tracking,
    baseline,
    now: params.now,
    interventions: params.interventions,
    goals: params.goals,
  });
}

/** Example: Run detection across a cohort in batches */
export async function runDetectionForCohort(params: {
  cohort: Array<{
    studentId: string;
    emotions: EmotionEntry[];
    sensory: SensoryEntry[];
    tracking: TrackingEntry[];
    interventions?: Intervention[];
    goals?: Goal[];
  }>;
  baselineService?: BaselineService;
  policies?: AlertPolicies;
  experiments?: ABTestingService;
  learner?: ThresholdLearner;
}): Promise<Record<string, AlertEvent[]>> {
  const baselineService = params.baselineService ?? new BaselineService();
  const engine = new AlertDetectionEngine({
    baselineService,
    policies: params.policies,
    experiments: params.experiments,
    learner: params.learner,
    seriesLimit: 180,
  });

  const results: Record<string, AlertEvent[]> = {};
  await Promise.all(
    params.cohort.map(async (entry) => {
      const baseline =
        baselineService.updateBaseline({
          studentId: entry.studentId,
          emotions: entry.emotions,
          sensory: entry.sensory,
          tracking: entry.tracking,
        }) ?? null;
      const alerts = engine.runDetection({
        studentId: entry.studentId,
        emotions: entry.emotions,
        sensory: entry.sensory,
        tracking: entry.tracking,
        baseline,
        interventions: entry.interventions,
        goals: entry.goals,
      });
      results[entry.studentId] = alerts;
    }),
  );
  return results;
}

/** Example: Integrate within an analytics worker pipeline */
export function analyticsWorkerStep(payload: {
  studentId: string;
  emotions: EmotionEntry[];
  sensory: SensoryEntry[];
  tracking: TrackingEntry[];
}): { alerts: AlertEvent[] } {
  const engine = new AlertDetectionEngine();
  const alerts = engine.runDetection({
    studentId: payload.studentId,
    emotions: payload.emotions,
    sensory: payload.sensory,
    tracking: payload.tracking,
  });
  return { alerts };
}

/** Example: Configure A/B testing experiment variants */
export function withABTesting(
  studentId: string,
  data: {
    emotions: EmotionEntry[];
    sensory: SensoryEntry[];
    tracking: TrackingEntry[];
  },
): AlertEvent[] {
  const experiments = new ABTestingService();
  const engine = new AlertDetectionEngine({ experiments });
  return engine.runDetection({ studentId, ...data });
}

/** Example: Override thresholds via a custom learner implementation */
export function withCustomThresholdLearner(
  studentId: string,
  data: {
    emotions: EmotionEntry[];
    sensory: SensoryEntry[];
    tracking: TrackingEntry[];
  },
): AlertEvent[] {
  class StaticLearner extends ThresholdLearner {
    getThresholdOverrides(): Record<
      string,
      {
        detectorType: string;
        adjustmentValue: number;
        confidenceLevel: number;
        lastUpdatedAt: string;
        baselineThreshold?: number;
      }
    > {
      return {
        ewma: {
          detectorType: 'ewma',
          adjustmentValue: -0.1,
          confidenceLevel: 0.8,
          lastUpdatedAt: new Date().toISOString(),
        },
        cusum: {
          detectorType: 'cusum',
          adjustmentValue: -0.05,
          confidenceLevel: 0.7,
          lastUpdatedAt: new Date().toISOString(),
        },
      };
    }
  }
  const learner = new StaticLearner();
  const engine = new AlertDetectionEngine({ learner });
  return engine.runDetection({ studentId, ...data });
}
