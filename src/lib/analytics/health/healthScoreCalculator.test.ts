import { describe, it, expect } from 'vitest';
import { calculateHealthScore } from './healthScoreCalculator';
import type { AnalyticsResultsCompat } from '@/lib/analytics/types';
import type { AnalyticsConfiguration } from '@/types/analytics';

describe('calculateHealthScore', () => {
  // Helper to create minimal valid results
  const createBaseResults = (): AnalyticsResultsCompat => ({
    patterns: [],
    correlations: [],
    predictiveInsights: [],
    anomalies: [],
    insights: [],
    suggestedInterventions: [],
  });

  describe('Base Component Scoring', () => {
    it('should return 0 for completely empty results', () => {
      const results = createBaseResults();
      const score = calculateHealthScore(results);
      expect(score).toBe(0);
    });

    it('should award points for patterns only', () => {
      const results = {
        ...createBaseResults(),
        patterns: [{ type: 'test', description: 'test' } as any],
      };
      const score = calculateHealthScore(results);
      expect(score).toBe(40); // PATTERNS (20) + inferred MINIMUM_DATA (20)
    });

    it('should award points for correlations only', () => {
      const results = {
        ...createBaseResults(),
        correlations: [{ factor1: 'test', factor2: 'test', coefficient: 0.5 } as any],
      };
      const score = calculateHealthScore(results);
      expect(score).toBe(40); // CORRELATIONS (20) + inferred MINIMUM_DATA (20)
    });

    it('should award points for predictive insights only', () => {
      const results = {
        ...createBaseResults(),
        predictiveInsights: [{ prediction: 'test' } as any],
      };
      const score = calculateHealthScore(results);
      expect(score).toBe(20); // PREDICTIONS weight only
    });

    it('should award points for anomalies only', () => {
      const results = {
        ...createBaseResults(),
        anomalies: [{ type: 'test', severity: 'medium' } as any],
      };
      const score = calculateHealthScore(results);
      expect(score).toBe(20); // ANOMALIES weight only
    });

    it('should award points for minimum data when explicitly set', () => {
      const results = {
        ...createBaseResults(),
        hasMinimumData: true,
      } as AnalyticsResultsCompat;
      const score = calculateHealthScore(results);
      expect(score).toBe(20); // MINIMUM_DATA weight only
    });

    it('should infer minimum data from patterns presence', () => {
      const results = {
        ...createBaseResults(),
        patterns: [{ type: 'test', description: 'test' } as any],
      };
      const score = calculateHealthScore(results);
      // Should get both PATTERNS (20) and MINIMUM_DATA (20)
      expect(score).toBe(40);
    });

    it('should sum all base components when all present', () => {
      const results = {
        ...createBaseResults(),
        patterns: [{ type: 'test' } as any],
        correlations: [{ factor1: 'test', factor2: 'test', coefficient: 0.5 } as any],
        predictiveInsights: [{ prediction: 'test' } as any],
        anomalies: [{ type: 'test' } as any],
        hasMinimumData: true,
      } as AnalyticsResultsCompat;
      const score = calculateHealthScore(results);
      expect(score).toBe(100); // All weights: 20 + 20 + 20 + 20 + 20
    });
  });

  describe('Confidence Scaling', () => {
    it('should scale score by confidence factor', () => {
      const results = {
        ...createBaseResults(),
        patterns: [{ type: 'test' } as any],
        correlations: [{ factor1: 'test', factor2: 'test', coefficient: 0.5 } as any],
        hasMinimumData: true,
        confidence: 0.5,
      } as AnalyticsResultsCompat;
      const score = calculateHealthScore(results);
      // Base: 20 + 20 + 20 = 60, scaled: 60 * 0.5 = 30
      expect(score).toBe(30);
    });

    it('should prefer AI confidence over fallback confidence', () => {
      const results = {
        ...createBaseResults(),
        patterns: [{ type: 'test' } as any],
        hasMinimumData: true,
        confidence: 0.3, // Should be ignored
        ai: {
          provider: 'openai/gpt-4',
          confidence: { overall: 0.8 },
        },
      } as AnalyticsResultsCompat;
      const score = calculateHealthScore(results);
      // Base: 20 + 20 = 40, scaled: 40 * 0.8 = 32, AI bonus: +5 = 37
      expect(score).toBe(37);
    });

    it('should use 1.0 confidence when none provided', () => {
      const results = {
        ...createBaseResults(),
        patterns: [{ type: 'test' } as any],
      };
      const score = calculateHealthScore(results);
      // Base: 40 (patterns + minimum data inferred), scaled: 40 * 1.0 = 40
      expect(score).toBe(40);
    });

    it('should handle zero confidence gracefully', () => {
      const results = {
        ...createBaseResults(),
        patterns: [{ type: 'test' } as any],
        confidence: 0,
      } as AnalyticsResultsCompat;
      const score = calculateHealthScore(results);
      expect(score).toBe(0); // Base score scaled to 0
    });
  });

  describe('AI Quality Bonuses', () => {
    it('should award +5 bonus for successful AI without fallback', () => {
      const results = {
        ...createBaseResults(),
        patterns: [{ type: 'test' } as any],
        hasMinimumData: true,
        ai: {
          provider: 'openai/gpt-4',
          confidence: { overall: 1.0 },
          caveats: [],
        },
      } as AnalyticsResultsCompat;
      const score = calculateHealthScore(results);
      // Base: 40, scaled: 40 * 1.0 = 40, AI bonus: +5 = 45
      expect(score).toBe(45);
    });

    it('should award +2 bonus for AI with fallback', () => {
      const results = {
        ...createBaseResults(),
        patterns: [{ type: 'test' } as any],
        hasMinimumData: true,
        ai: {
          provider: 'openai/gpt-4',
          confidence: { overall: 1.0 },
          caveats: ['Partial fallback to heuristic analysis'],
        },
      } as AnalyticsResultsCompat;
      const score = calculateHealthScore(results);
      // Base: 40, scaled: 40 * 1.0 = 40, AI bonus: +2 = 42
      expect(score).toBe(42);
    });

    it('should award no bonus for heuristic-only analysis', () => {
      const results = {
        ...createBaseResults(),
        patterns: [{ type: 'test' } as any],
        hasMinimumData: true,
        ai: {
          provider: 'heuristic',
          confidence: { overall: 1.0 },
        },
      } as AnalyticsResultsCompat;
      const score = calculateHealthScore(results);
      // Base: 40, scaled: 40 * 1.0 = 40, no AI bonus
      expect(score).toBe(40);
    });

    it('should award +3 bonus for 3+ data lineage entries', () => {
      const results = {
        ...createBaseResults(),
        patterns: [{ type: 'test' } as any],
        hasMinimumData: true,
        ai: {
          provider: 'openai/gpt-4',
          confidence: { overall: 1.0 },
          dataLineage: ['entry1', 'entry2', 'entry3', 'entry4'] as any,
        },
      } as AnalyticsResultsCompat;
      const score = calculateHealthScore(results);
      // Base: 40, scaled: 40, AI bonus: +5 (successful AI) +3 (lineage) = 48
      expect(score).toBe(48);
    });

    it('should award +2 bonus for 2 data lineage entries', () => {
      const results = {
        ...createBaseResults(),
        patterns: [{ type: 'test' } as any],
        hasMinimumData: true,
        ai: {
          provider: 'openai/gpt-4',
          confidence: { overall: 1.0 },
          dataLineage: ['entry1', 'entry2'] as any,
        },
      } as AnalyticsResultsCompat;
      const score = calculateHealthScore(results);
      // Base: 40, scaled: 40, AI bonus: +5 +2 = 47
      expect(score).toBe(47);
    });

    it('should award +1 bonus for 1 data lineage entry', () => {
      const results = {
        ...createBaseResults(),
        patterns: [{ type: 'test' } as any],
        hasMinimumData: true,
        ai: {
          provider: 'openai/gpt-4',
          confidence: { overall: 1.0 },
          dataLineage: ['entry1'] as any,
        },
      } as AnalyticsResultsCompat;
      const score = calculateHealthScore(results);
      // Base: 40, scaled: 40, AI bonus: +5 +1 = 46
      expect(score).toBe(46);
    });
  });

  describe('Score Normalization', () => {
    it('should clamp score to maximum of 100', () => {
      const results = {
        ...createBaseResults(),
        patterns: [{ type: 'test' } as any],
        correlations: [{ factor1: 'test', factor2: 'test', coefficient: 0.5 } as any],
        predictiveInsights: [{ prediction: 'test' } as any],
        anomalies: [{ type: 'test' } as any],
        hasMinimumData: true,
        ai: {
          provider: 'openai/gpt-4',
          confidence: { overall: 1.0 },
          dataLineage: ['e1', 'e2', 'e3', 'e4'] as any,
        },
      } as AnalyticsResultsCompat;
      const score = calculateHealthScore(results);
      // Base: 100, scaled: 100, bonuses: +5 +3 = 108, clamped to 100
      expect(score).toBe(100);
    });

    it('should ensure minimum score of 0', () => {
      const results = {
        ...createBaseResults(),
        confidence: -1.0, // Invalid negative confidence
      } as AnalyticsResultsCompat;
      const score = calculateHealthScore(results);
      expect(score).toBe(0);
    });
  });

  describe('Custom Configuration', () => {
    it('should use custom weights when provided', () => {
      const customConfig: Partial<AnalyticsConfiguration> = {
        healthScore: {
          WEIGHTS: {
            PATTERNS: 50,
            CORRELATIONS: 30,
            PREDICTIONS: 10,
            ANOMALIES: 5,
            MINIMUM_DATA: 5,
          },
        },
      } as any;

      const results = {
        ...createBaseResults(),
        patterns: [{ type: 'test' } as any],
        correlations: [{ factor1: 'test', factor2: 'test', coefficient: 0.5 } as any],
        hasMinimumData: true,
      } as AnalyticsResultsCompat;

      const score = calculateHealthScore(results, customConfig as AnalyticsConfiguration);
      // Custom weights: 50 (patterns) + 30 (correlations) + 5 (min data) = 85
      expect(score).toBe(85);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle high-quality AI analysis scenario', () => {
      const results = {
        ...createBaseResults(),
        patterns: [
          { type: 'test' },
          { type: 'test2' },
          { type: 'test3' },
          { type: 'test4' },
          { type: 'test5' },
        ] as any[],
        correlations: [
          { factor1: 'test', factor2: 'test', coefficient: 0.5 },
          { factor1: 'test2', factor2: 'test2', coefficient: 0.6 },
          { factor1: 'test3', factor2: 'test3', coefficient: 0.7 },
        ] as any[],
        predictiveInsights: [{ prediction: 'test' }, { prediction: 'test2' }] as any[],
        anomalies: [{ type: 'test' }] as any[],
        hasMinimumData: true,
        ai: {
          provider: 'openai/gpt-4',
          confidence: { overall: 0.92 },
          caveats: [],
          dataLineage: ['entry1', 'entry2', 'entry3', 'entry4'] as any,
        },
      } as AnalyticsResultsCompat;

      const score = calculateHealthScore(results);
      // Base: 100, scaled: 92, AI bonus: +5, lineage: +3, total: 100 (clamped)
      expect(score).toBe(100);
    });

    it('should handle sparse heuristic data scenario', () => {
      const results = {
        ...createBaseResults(),
        patterns: [{ type: 'test' }, { type: 'test2' }] as any[],
        hasMinimumData: true,
        confidence: 0.45,
      } as AnalyticsResultsCompat;

      const score = calculateHealthScore(results);
      // Base: 40 (patterns + min data), scaled: 40 * 0.45 = 18
      expect(score).toBe(18);
    });

    it('should handle AI with fallback scenario', () => {
      const results = {
        ...createBaseResults(),
        patterns: [{ type: 'test' }, { type: 'test2' }, { type: 'test3' }] as any[],
        correlations: [
          { factor1: 'test', factor2: 'test', coefficient: 0.5 },
          { factor1: 'test2', factor2: 'test2', coefficient: 0.6 },
        ] as any[],
        predictiveInsights: [{ prediction: 'test' }] as any[],
        anomalies: [{ type: 'test' }] as any[],
        hasMinimumData: true,
        ai: {
          provider: 'openai/gpt-4',
          confidence: { overall: 0.78 },
          caveats: ['Partial fallback to heuristic analysis'],
          dataLineage: ['entry1', 'entry2'] as any,
        },
      } as AnalyticsResultsCompat;

      const score = calculateHealthScore(results);
      // Base: 100, scaled: 78, AI bonus: +2 (fallback), lineage: +2 = 82
      expect(score).toBe(82);
    });
  });
});
