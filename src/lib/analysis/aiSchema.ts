import { z } from "zod";

const ZSeverity = z.enum(["low", "medium", "high"]);
const ZTimeHorizon = z.enum(["short", "medium", "long"]);
const ZSourceType = z.enum([
  "emotion",
  "behavior",
  "sensor",
  "environment",
  "goal",
  "tracking",
  "system",
  "external",
  "other",
]);

const ZTimeRange = z
  .object({
    start: z.string().min(1),
    end: z.string().min(1),
    timezone: z.string().optional(),
  })
  .strict();

const ZAiConfidence = z
  .object({
    overall: z.number().min(0).max(1),
    calibration: z.string().optional(),
    caveats: z.array(z.string()).default([]),
  })
  .strict();

const ZAiEvidence = z
  .object({
    id: z.string().optional(),
    description: z.string().min(1),
    weight: z.number().min(0).max(1).default(0.5),
    sources: z.array(ZSourceType).default([]),
    refs: z.array(z.string()).default([]),
  })
  .strict();

const ZAiPattern = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    strength: z.number().min(0).max(1).optional(),
    impact: ZSeverity.optional(),
    evidence: z.array(ZAiEvidence).default([]),
  })
  .strict();

const ZAiCorrelation = z
  .object({
    variables: z.tuple([z.string(), z.string()]),
    coefficient: z.number().min(-1).max(1),
    direction: z.enum(["positive", "negative"]).optional(),
    pValue: z.number().min(0).max(1).optional(),
    confounders: z.array(z.string()).default([]),
    evidence: z.array(ZAiEvidence).default([]),
  })
  .strict();

const ZAiHypothesis = z
  .object({
    cause: z.string().min(1),
    likelihood: z.number().min(0).max(1),
    rationale: z.string().optional(),
    supportingEvidence: z.array(ZAiEvidence).default([]),
  })
  .strict();

const ZAiIntervention = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1),
    actions: z.array(z.string()).default([]),
    expectedImpact: ZSeverity.optional(),
    timeHorizon: ZTimeHorizon.optional(),
    metrics: z.array(z.string()).default([]),
    confidence: ZAiConfidence.optional(),
    // Evidence-related fields (backward compatible)
    sources: z.array(z.string()).default([]),
    udlCheckpoints: z.array(z.string()).optional(),
    hlps: z.array(z.string()).optional(),
    tier: z.enum(["Tier1", "Tier2", "Tier3"]).optional(),
    scope: z.enum(["classroom", "school"]).optional(),
  })
  .strict();

const ZAiAnomaly = z
  .object({
    id: z.string().optional(),
    description: z.string().min(1),
    severity: ZSeverity.default("medium"),
    at: z.string().optional(),
    range: ZTimeRange.optional(),
    evidence: z.array(ZAiEvidence).default([]),
  })
  .strict();

const ZAiPredictiveInsight = z
  .object({
    outcome: z.string().min(1),
    probability: z.number().min(0).max(1),
    horizon: ZTimeHorizon.optional(),
    drivers: z.array(z.string()).default([]),
    confidence: ZAiConfidence.optional(),
  })
  .strict();

const ZAiDataLineageItem = z
  .object({
    source: z.string().min(1),
    type: ZSourceType.optional(),
    timeRange: ZTimeRange.optional(),
    fields: z.array(z.string()).optional(),
    notes: z.string().optional(),
  })
  .strict();

const ZAiReportCore = z.object({
  keyFindings: z.array(z.string()).default([]),
  patterns: z.array(ZAiPattern).default([]),
  correlations: z.array(ZAiCorrelation).default([]),
  hypothesizedCauses: z.array(ZAiHypothesis).default([]),
  suggestedInterventions: z.array(ZAiIntervention).default([]),
  dataLineage: z.array(ZAiDataLineageItem).default([]).optional(),
}).strict();

export const ZAiReport = ZAiReportCore.extend({
  summary: z.string().optional(),
  anomalies: z.array(ZAiAnomaly).default([]).optional(),
  predictiveInsights: z.array(ZAiPredictiveInsight).default([]).optional(),
  insights: z.array(z.string()).default([]).optional(),
  confidence: ZAiConfidence.optional(),
}).strict();

export type AiReport = z.infer<typeof ZAiReport>;

