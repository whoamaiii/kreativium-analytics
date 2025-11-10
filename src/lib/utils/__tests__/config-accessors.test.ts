import { describe, it, expect } from 'vitest';
import {
  isAnalyticsConfiguration,
  hasGoals,
  safeGetGoals,
  safeConvertConfig,
  safeGetConfig,
  getInsightsConfig,
  getAnalyticsConfig,
  getTimeWindowsConfig,
  getConfidenceConfig,
  getCacheConfig,
  getPatternAnalysisConfig,
  getEnhancedAnalysisConfig,
  safeGetStringMetadata,
  safeGetArrayMetadata,
  safeGetObjectMetadata,
} from '../config-accessors';
import { DEFAULT_ANALYTICS_CONFIG } from '@/lib/analyticsConfig';
import type { AnalyticsConfiguration } from '@/types/analytics';
import type { ComputeInsightsInputs } from '@/lib/insights/unified';
import type { Goal } from '@/types/student';

describe('Config Accessors', () => {
  describe('Type Guards', () => {
    describe('isAnalyticsConfiguration', () => {
      it('returns true for valid AnalyticsConfiguration', () => {
        expect(isAnalyticsConfiguration(DEFAULT_ANALYTICS_CONFIG)).toBe(true);
      });

      it('returns true for object with required properties', () => {
        const config = {
          analytics: {},
          insights: {},
          confidence: {},
        };
        expect(isAnalyticsConfiguration(config)).toBe(true);
      });

      it('returns false for null and undefined', () => {
        expect(isAnalyticsConfiguration(null)).toBe(false);
        expect(isAnalyticsConfiguration(undefined)).toBe(false);
      });

      it('returns false for primitives', () => {
        expect(isAnalyticsConfiguration(42)).toBe(false);
        expect(isAnalyticsConfiguration('config')).toBe(false);
        expect(isAnalyticsConfiguration(true)).toBe(false);
      });

      it('returns false for objects missing required properties', () => {
        expect(isAnalyticsConfiguration({})).toBe(false);
        expect(isAnalyticsConfiguration({ analytics: {} })).toBe(false);
        expect(isAnalyticsConfiguration({ insights: {} })).toBe(false);
      });

      it('returns false for objects with wrong property types', () => {
        expect(
          isAnalyticsConfiguration({ analytics: 'not-object', insights: {}, confidence: {} }),
        ).toBe(false);
        expect(isAnalyticsConfiguration({ analytics: {}, insights: null, confidence: {} })).toBe(
          false,
        );
      });
    });

    describe('hasGoals', () => {
      it('returns true for inputs with goals array', () => {
        const inputs: ComputeInsightsInputs = {
          entries: [],
          emotions: [],
          sensoryInputs: [],
          goals: [{ id: '1' } as Goal],
        };
        expect(hasGoals(inputs)).toBe(true);
      });

      it('returns false for inputs without goals', () => {
        const inputs: ComputeInsightsInputs = {
          entries: [],
          emotions: [],
          sensoryInputs: [],
        };
        expect(hasGoals(inputs)).toBe(false);
      });

      it('returns false for null and undefined', () => {
        expect(hasGoals(null)).toBe(false);
        expect(hasGoals(undefined)).toBe(false);
      });

      it('returns false when goals is not an array', () => {
        const inputs = {
          entries: [],
          emotions: [],
          sensoryInputs: [],
          goals: 'not-an-array',
        };
        expect(hasGoals(inputs)).toBe(false);
      });
    });
  });

  describe('Safe Config Accessors', () => {
    describe('safeGetGoals', () => {
      it('returns goals array when present', () => {
        const goals = [{ id: '1' } as Goal, { id: '2' } as Goal];
        const inputs: ComputeInsightsInputs = {
          entries: [],
          emotions: [],
          sensoryInputs: [],
          goals,
        };
        expect(safeGetGoals(inputs)).toEqual(goals);
      });

      it('returns empty array when goals is undefined', () => {
        const inputs: ComputeInsightsInputs = {
          entries: [],
          emotions: [],
          sensoryInputs: [],
        };
        expect(safeGetGoals(inputs)).toEqual([]);
      });

      it('always returns an array', () => {
        const inputs: ComputeInsightsInputs = {
          entries: [],
          emotions: [],
          sensoryInputs: [],
          goals: undefined,
        };
        const result = safeGetGoals(inputs);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
      });
    });

    describe('safeConvertConfig', () => {
      it('returns null for null input', () => {
        expect(safeConvertConfig(null)).toBeNull();
      });

      it('returns null for undefined input', () => {
        expect(safeConvertConfig(undefined)).toBeNull();
      });

      it('converts config subset to full config type', () => {
        const subset = {
          insights: DEFAULT_ANALYTICS_CONFIG.insights,
          confidence: DEFAULT_ANALYTICS_CONFIG.confidence,
          analytics: DEFAULT_ANALYTICS_CONFIG.analytics,
          timeWindows: DEFAULT_ANALYTICS_CONFIG.timeWindows,
        };
        const result = safeConvertConfig(subset);
        expect(result).toBeDefined();
        expect(result?.insights).toEqual(subset.insights);
      });
    });

    describe('safeGetConfig', () => {
      it('returns config when provided', () => {
        const result = safeGetConfig(DEFAULT_ANALYTICS_CONFIG, {} as any);
        expect(result).toBe(DEFAULT_ANALYTICS_CONFIG);
      });

      it('returns fallback when config is null', () => {
        const fallback = DEFAULT_ANALYTICS_CONFIG;
        const result = safeGetConfig(null, fallback);
        expect(result).toBe(fallback);
      });

      it('returns fallback when config is undefined', () => {
        const fallback = DEFAULT_ANALYTICS_CONFIG;
        const result = safeGetConfig(undefined, fallback);
        expect(result).toBe(fallback);
      });
    });
  });

  describe('Specific Property Accessors', () => {
    const config = DEFAULT_ANALYTICS_CONFIG;

    describe('getInsightsConfig', () => {
      it('returns insights config from valid config', () => {
        const result = getInsightsConfig(config);
        expect(result).toBe(config.insights);
      });

      it('returns undefined for null config', () => {
        expect(getInsightsConfig(null)).toBeUndefined();
      });

      it('returns undefined for undefined config', () => {
        expect(getInsightsConfig(undefined)).toBeUndefined();
      });
    });

    describe('getAnalyticsConfig', () => {
      it('returns analytics config from valid config', () => {
        const result = getAnalyticsConfig(config);
        expect(result).toBe(config.analytics);
      });

      it('returns undefined for null config', () => {
        expect(getAnalyticsConfig(null)).toBeUndefined();
      });
    });

    describe('getTimeWindowsConfig', () => {
      it('returns timeWindows config from valid config', () => {
        const result = getTimeWindowsConfig(config);
        expect(result).toBe(config.timeWindows);
      });

      it('returns undefined for null config', () => {
        expect(getTimeWindowsConfig(null)).toBeUndefined();
      });
    });

    describe('getConfidenceConfig', () => {
      it('returns confidence config from valid config', () => {
        const result = getConfidenceConfig(config);
        expect(result).toBe(config.confidence);
      });

      it('returns undefined for null config', () => {
        expect(getConfidenceConfig(null)).toBeUndefined();
      });
    });

    describe('getCacheConfig', () => {
      it('returns cache config from valid config', () => {
        const result = getCacheConfig(config);
        expect(result).toBe(config.cache);
      });

      it('returns undefined for null config', () => {
        expect(getCacheConfig(null)).toBeUndefined();
      });
    });

    describe('getPatternAnalysisConfig', () => {
      it('returns patternAnalysis config from valid config', () => {
        const result = getPatternAnalysisConfig(config);
        expect(result).toBe(config.patternAnalysis);
      });

      it('returns undefined for null config', () => {
        expect(getPatternAnalysisConfig(null)).toBeUndefined();
      });
    });

    describe('getEnhancedAnalysisConfig', () => {
      it('returns enhancedAnalysis config from valid config', () => {
        const result = getEnhancedAnalysisConfig(config);
        expect(result).toBe(config.enhancedAnalysis);
      });

      it('returns undefined for null config', () => {
        expect(getEnhancedAnalysisConfig(null)).toBeUndefined();
      });
    });
  });

  describe('Metadata Accessors', () => {
    describe('safeGetStringMetadata', () => {
      it('returns string value when present', () => {
        const metadata = { key: 'value', other: 'data' };
        expect(safeGetStringMetadata(metadata, 'key')).toBe('value');
      });

      it('returns undefined for non-string values', () => {
        const metadata = { key: 123, other: true };
        expect(safeGetStringMetadata(metadata, 'key')).toBeUndefined();
      });

      it('returns undefined for missing keys', () => {
        const metadata = { other: 'data' };
        expect(safeGetStringMetadata(metadata, 'key')).toBeUndefined();
      });

      it('returns undefined for null metadata', () => {
        expect(safeGetStringMetadata(null, 'key')).toBeUndefined();
      });

      it('returns undefined for undefined metadata', () => {
        expect(safeGetStringMetadata(undefined, 'key')).toBeUndefined();
      });

      it('returns undefined for non-object metadata', () => {
        expect(safeGetStringMetadata('not-object', 'key')).toBeUndefined();
        expect(safeGetStringMetadata(42, 'key')).toBeUndefined();
      });
    });

    describe('safeGetArrayMetadata', () => {
      it('returns array value when present', () => {
        const arr = [1, 2, 3];
        const metadata = { key: arr };
        expect(safeGetArrayMetadata(metadata, 'key')).toBe(arr);
      });

      it('returns undefined for non-array values', () => {
        const metadata = { key: 'not-array' };
        expect(safeGetArrayMetadata(metadata, 'key')).toBeUndefined();
      });

      it('returns undefined for object values', () => {
        const metadata = { key: { nested: 'object' } };
        expect(safeGetArrayMetadata(metadata, 'key')).toBeUndefined();
      });

      it('returns undefined for missing keys', () => {
        const metadata = { other: [1, 2, 3] };
        expect(safeGetArrayMetadata(metadata, 'key')).toBeUndefined();
      });

      it('returns undefined for null metadata', () => {
        expect(safeGetArrayMetadata(null, 'key')).toBeUndefined();
      });

      it('handles typed arrays', () => {
        const arr = ['a', 'b', 'c'];
        const metadata = { key: arr };
        const result = safeGetArrayMetadata<string>(metadata, 'key');
        expect(result).toEqual(arr);
      });
    });

    describe('safeGetObjectMetadata', () => {
      it('returns object value when present', () => {
        const obj = { nested: 'value' };
        const metadata = { key: obj };
        expect(safeGetObjectMetadata(metadata, 'key')).toBe(obj);
      });

      it('returns undefined for non-object values', () => {
        const metadata = { key: 'not-object' };
        expect(safeGetObjectMetadata(metadata, 'key')).toBeUndefined();
      });

      it('returns undefined for array values', () => {
        const metadata = { key: [1, 2, 3] };
        expect(safeGetObjectMetadata(metadata, 'key')).toBeUndefined();
      });

      it('returns undefined for null values', () => {
        const metadata = { key: null };
        expect(safeGetObjectMetadata(metadata, 'key')).toBeUndefined();
      });

      it('returns undefined for missing keys', () => {
        const metadata = { other: { data: 'value' } };
        expect(safeGetObjectMetadata(metadata, 'key')).toBeUndefined();
      });

      it('returns undefined for null metadata', () => {
        expect(safeGetObjectMetadata(null, 'key')).toBeUndefined();
      });

      it('handles typed objects', () => {
        interface CustomType {
          field: string;
        }
        const obj: CustomType = { field: 'value' };
        const metadata = { key: obj };
        const result = safeGetObjectMetadata<CustomType>(metadata, 'key');
        expect(result).toEqual(obj);
      });
    });
  });

  describe('Integration', () => {
    it('safely processes worker message inputs', () => {
      const inputs: ComputeInsightsInputs = {
        entries: [],
        emotions: [],
        sensoryInputs: [],
        goals: [{ id: 'goal-1' } as Goal],
      };

      const goals = safeGetGoals(inputs);
      expect(goals).toHaveLength(1);
      expect(goals[0].id).toBe('goal-1');
    });

    it('safely processes config conversion', () => {
      const subset = {
        insights: DEFAULT_ANALYTICS_CONFIG.insights,
        confidence: DEFAULT_ANALYTICS_CONFIG.confidence,
        analytics: DEFAULT_ANALYTICS_CONFIG.analytics,
        timeWindows: DEFAULT_ANALYTICS_CONFIG.timeWindows,
      };

      const fullConfig = safeConvertConfig(subset);
      expect(fullConfig).toBeDefined();

      const insightsConfig = getInsightsConfig(fullConfig);
      expect(insightsConfig).toBeDefined();
      expect(insightsConfig).toBe(subset.insights);
    });

    it('safely extracts alert metadata', () => {
      const metadata = {
        experimentKey: 'experiment-1',
        experimentVariant: 'variant-a',
        detectorTypes: ['emotion', 'sensory'],
        thresholdTrace: { value: 0.5 },
      };

      const expKey = safeGetStringMetadata(metadata, 'experimentKey');
      const expVariant = safeGetStringMetadata(metadata, 'experimentVariant');
      const detectors = safeGetArrayMetadata<string>(metadata, 'detectorTypes');
      const threshold = safeGetObjectMetadata(metadata, 'thresholdTrace');

      expect(expKey).toBe('experiment-1');
      expect(expVariant).toBe('variant-a');
      expect(detectors).toEqual(['emotion', 'sensory']);
      expect(threshold).toEqual({ value: 0.5 });
    });
  });
});
