import { z } from 'zod';
import { logger } from '@/lib/logger';

// Schema components for AI responses
const ZCauseItem = z.union([
  z.string().transform((text) => ({ text })),
  z.object({
    text: z.string(),
    evidenceIds: z.array(z.string()).optional(),
    confidence: z.number().min(0).max(1).optional(),
  }),
]);

const ZInterventionItem = z.union([
  z.string().transform((text) => ({ text })),
  z.object({
    text: z.string(),
    evidenceIds: z.array(z.string()).optional(),
  }),
]);

const ZExampleItem = z.union([
  z.string().transform((id) => ({ id })),
  z.object({
    id: z.string(),
    whyRelevant: z.string().optional(),
  }),
]);

// Shared schema for AI explanation responses
export const ZAIExplanationResponse = z.object({
  summary: z.string().min(10).max(1000),
  causes: z.array(ZCauseItem).max(5).default([]),
  interventions: z.array(ZInterventionItem).max(5).default([]),
  examples: z.array(ZExampleItem).max(10).default([]),
});

export type AIExplanationResponse = z.infer<typeof ZAIExplanationResponse>;

// Shared schema for pattern detection results
export const ZPatternResult = z.object({
  type: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  confidence: z.number().min(0).max(1),
  description: z.string(),
  affectedStudents: z.array(z.string()).optional(),
  timeRange: z
    .object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    })
    .optional(),
  evidence: z.array(z.any()).optional(),
});

export type PatternResult = z.infer<typeof ZPatternResult>;

/**
 * Validates AI response JSON with fallback to empty structure
 */
export function validateAIResponse(data: unknown): AIExplanationResponse {
  try {
    return ZAIExplanationResponse.parse(data);
  } catch (e) {
    logger.warn('AI response validation failed, using defaults', { error: e });
    return {
      summary: 'Could not process explanation',
      causes: [],
      interventions: [],
      examples: [],
    };
  }
}

/**
 * Validates pattern results with type safety
 */
export function validatePatternResults(data: unknown): PatternResult[] {
  try {
    if (!Array.isArray(data)) return [];
    return data
      .map((item) => {
        try {
          return ZPatternResult.parse(item);
        } catch {
          return null;
        }
      })
      .filter((x): x is PatternResult => x !== null);
  } catch (e) {
    logger.warn('Pattern results validation failed', { error: e });
    return [];
  }
}
