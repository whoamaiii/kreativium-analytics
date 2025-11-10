import { describe, expect, it } from 'vitest';
import {
  categorizeNoiseLevel,
  categorizeLightLevel,
  categorizeTemperature,
  getLatestEnvironmentConditions,
  getEnvironmentConditions,
  NOISE_THRESHOLDS,
  LIGHT_THRESHOLDS,
  TEMPERATURE_THRESHOLDS,
  type EnvironmentConditions,
  type TrackingEntryWithEnvironment,
} from '../environment';

describe('Environment Utilities', () => {
  describe('categorizeNoiseLevel', () => {
    it('returns "loud" for noise above threshold', () => {
      expect(categorizeNoiseLevel(71)).toBe('loud');
      expect(categorizeNoiseLevel(80)).toBe('loud');
      expect(categorizeNoiseLevel(100)).toBe('loud');
    });

    it('returns "quiet" for noise below threshold', () => {
      expect(categorizeNoiseLevel(39)).toBe('quiet');
      expect(categorizeNoiseLevel(20)).toBe('quiet');
      expect(categorizeNoiseLevel(0)).toBe('quiet');
    });

    it('returns "moderate" for noise between thresholds', () => {
      expect(categorizeNoiseLevel(40)).toBe('moderate');
      expect(categorizeNoiseLevel(50)).toBe('moderate');
      expect(categorizeNoiseLevel(70)).toBe('moderate');
    });

    it('returns "moderate" for null or undefined', () => {
      expect(categorizeNoiseLevel(null)).toBe('moderate');
      expect(categorizeNoiseLevel(undefined)).toBe('moderate');
    });

    it('uses correct threshold values', () => {
      expect(NOISE_THRESHOLDS.LOUD).toBe(70);
      expect(NOISE_THRESHOLDS.QUIET).toBe(40);
    });
  });

  describe('categorizeLightLevel', () => {
    it('returns "bright" for light above threshold', () => {
      expect(categorizeLightLevel(71)).toBe('bright');
      expect(categorizeLightLevel(85)).toBe('bright');
      expect(categorizeLightLevel(100)).toBe('bright');
    });

    it('returns "dim" for light below threshold', () => {
      expect(categorizeLightLevel(39)).toBe('dim');
      expect(categorizeLightLevel(25)).toBe('dim');
      expect(categorizeLightLevel(0)).toBe('dim');
    });

    it('returns "moderate" for light between thresholds', () => {
      expect(categorizeLightLevel(40)).toBe('moderate');
      expect(categorizeLightLevel(55)).toBe('moderate');
      expect(categorizeLightLevel(70)).toBe('moderate');
    });

    it('returns "moderate" for null or undefined', () => {
      expect(categorizeLightLevel(null)).toBe('moderate');
      expect(categorizeLightLevel(undefined)).toBe('moderate');
    });

    it('uses correct threshold values', () => {
      expect(LIGHT_THRESHOLDS.BRIGHT).toBe(70);
      expect(LIGHT_THRESHOLDS.DIM).toBe(40);
    });
  });

  describe('categorizeTemperature', () => {
    it('returns "hot" for temperature above threshold', () => {
      expect(categorizeTemperature(25)).toBe('hot');
      expect(categorizeTemperature(30)).toBe('hot');
      expect(categorizeTemperature(35)).toBe('hot');
    });

    it('returns "cold" for temperature below threshold', () => {
      expect(categorizeTemperature(17)).toBe('cold');
      expect(categorizeTemperature(10)).toBe('cold');
      expect(categorizeTemperature(0)).toBe('cold');
    });

    it('returns "comfortable" for temperature between thresholds', () => {
      expect(categorizeTemperature(18)).toBe('comfortable');
      expect(categorizeTemperature(20)).toBe('comfortable');
      expect(categorizeTemperature(24)).toBe('comfortable');
    });

    it('returns "comfortable" for null or undefined', () => {
      expect(categorizeTemperature(null)).toBe('comfortable');
      expect(categorizeTemperature(undefined)).toBe('comfortable');
    });

    it('uses correct threshold values', () => {
      expect(TEMPERATURE_THRESHOLDS.HOT).toBe(24);
      expect(TEMPERATURE_THRESHOLDS.COLD).toBe(18);
    });
  });

  describe('getLatestEnvironmentConditions', () => {
    it('returns default conditions for empty array', () => {
      const result = getLatestEnvironmentConditions([]);

      expect(result).toEqual({
        noise: 'moderate',
        lighting: 'moderate',
        temperature: 'comfortable',
      });
    });

    it('categorizes all conditions from latest entry', () => {
      const entries: TrackingEntryWithEnvironment[] = [
        {
          environmentalData: {
            roomConditions: {
              noiseLevel: 30,
              lightLevel: 80,
              temperature: 26,
            },
          },
        },
        {
          environmentalData: {
            roomConditions: {
              noiseLevel: 75,
              lightLevel: 35,
              temperature: 16,
            },
          },
        },
      ];

      const result = getLatestEnvironmentConditions(entries);

      expect(result).toEqual({
        noise: 'loud',
        lighting: 'dim',
        temperature: 'cold',
      });
    });

    it('handles missing environmental data gracefully', () => {
      const entries: TrackingEntryWithEnvironment[] = [
        {},
        { environmentalData: {} },
        { environmentalData: { roomConditions: {} } },
      ];

      const result = getLatestEnvironmentConditions(entries);

      expect(result).toEqual({
        noise: 'moderate',
        lighting: 'moderate',
        temperature: 'comfortable',
      });
    });

    it('handles partial room conditions', () => {
      const entries: TrackingEntryWithEnvironment[] = [
        {
          environmentalData: {
            roomConditions: {
              noiseLevel: 80,
              // Missing lightLevel and temperature
            },
          },
        },
      ];

      const result = getLatestEnvironmentConditions(entries);

      expect(result).toEqual({
        noise: 'loud',
        lighting: 'moderate',
        temperature: 'comfortable',
      });
    });

    it('only uses the last entry in array', () => {
      const entries: TrackingEntryWithEnvironment[] = [
        {
          environmentalData: {
            roomConditions: {
              noiseLevel: 80,
              lightLevel: 80,
              temperature: 30,
            },
          },
        },
        {
          environmentalData: {
            roomConditions: {
              noiseLevel: 30,
              lightLevel: 30,
              temperature: 15,
            },
          },
        },
      ];

      const result = getLatestEnvironmentConditions(entries);

      // Should use last entry (quiet, dim, cold), not first (loud, bright, hot)
      expect(result).toEqual({
        noise: 'quiet',
        lighting: 'dim',
        temperature: 'cold',
      });
    });

    it('handles entries with undefined environmentalData', () => {
      const entries: TrackingEntryWithEnvironment[] = [{ environmentalData: undefined }];

      const result = getLatestEnvironmentConditions(entries);

      expect(result).toEqual({
        noise: 'moderate',
        lighting: 'moderate',
        temperature: 'comfortable',
      });
    });
  });

  describe('getEnvironmentConditions', () => {
    it('categorizes conditions from single entry', () => {
      const entry: TrackingEntryWithEnvironment = {
        environmentalData: {
          roomConditions: {
            noiseLevel: 75,
            lightLevel: 35,
            temperature: 16,
          },
        },
      };

      const result = getEnvironmentConditions(entry);

      expect(result).toEqual({
        noise: 'loud',
        lighting: 'dim',
        temperature: 'cold',
      });
    });

    it('handles missing environmental data', () => {
      const entry: TrackingEntryWithEnvironment = {};

      const result = getEnvironmentConditions(entry);

      expect(result).toEqual({
        noise: 'moderate',
        lighting: 'moderate',
        temperature: 'comfortable',
      });
    });

    it('handles partial room conditions', () => {
      const entry: TrackingEntryWithEnvironment = {
        environmentalData: {
          roomConditions: {
            noiseLevel: 80,
          },
        },
      };

      const result = getEnvironmentConditions(entry);

      expect(result).toEqual({
        noise: 'loud',
        lighting: 'moderate',
        temperature: 'comfortable',
      });
    });

    it('handles entry with undefined roomConditions', () => {
      const entry: TrackingEntryWithEnvironment = {
        environmentalData: {
          roomConditions: undefined,
        },
      };

      const result = getEnvironmentConditions(entry);

      expect(result).toEqual({
        noise: 'moderate',
        lighting: 'moderate',
        temperature: 'comfortable',
      });
    });
  });

  describe('Edge cases', () => {
    it('handles boundary values correctly', () => {
      // Noise boundaries
      expect(categorizeNoiseLevel(NOISE_THRESHOLDS.LOUD)).toBe('moderate');
      expect(categorizeNoiseLevel(NOISE_THRESHOLDS.LOUD + 0.1)).toBe('loud');
      expect(categorizeNoiseLevel(NOISE_THRESHOLDS.QUIET)).toBe('moderate');
      expect(categorizeNoiseLevel(NOISE_THRESHOLDS.QUIET - 0.1)).toBe('quiet');

      // Light boundaries
      expect(categorizeLightLevel(LIGHT_THRESHOLDS.BRIGHT)).toBe('moderate');
      expect(categorizeLightLevel(LIGHT_THRESHOLDS.BRIGHT + 0.1)).toBe('bright');
      expect(categorizeLightLevel(LIGHT_THRESHOLDS.DIM)).toBe('moderate');
      expect(categorizeLightLevel(LIGHT_THRESHOLDS.DIM - 0.1)).toBe('dim');

      // Temperature boundaries
      expect(categorizeTemperature(TEMPERATURE_THRESHOLDS.HOT)).toBe('comfortable');
      expect(categorizeTemperature(TEMPERATURE_THRESHOLDS.HOT + 0.1)).toBe('hot');
      expect(categorizeTemperature(TEMPERATURE_THRESHOLDS.COLD)).toBe('comfortable');
      expect(categorizeTemperature(TEMPERATURE_THRESHOLDS.COLD - 0.1)).toBe('cold');
    });

    it('handles extreme values', () => {
      expect(categorizeNoiseLevel(999)).toBe('loud');
      expect(categorizeNoiseLevel(-999)).toBe('quiet');
      expect(categorizeLightLevel(999)).toBe('bright');
      expect(categorizeLightLevel(-999)).toBe('dim');
      expect(categorizeTemperature(100)).toBe('hot');
      expect(categorizeTemperature(-50)).toBe('cold');
    });

    it('handles decimal values', () => {
      expect(categorizeNoiseLevel(70.5)).toBe('loud');
      expect(categorizeNoiseLevel(39.5)).toBe('quiet');
      expect(categorizeLightLevel(70.5)).toBe('bright');
      expect(categorizeLightLevel(39.5)).toBe('dim');
      expect(categorizeTemperature(24.5)).toBe('hot');
      expect(categorizeTemperature(17.5)).toBe('cold');
    });
  });

  describe('Type safety', () => {
    it('returns strongly typed results', () => {
      const noise = categorizeNoiseLevel(50);
      const light = categorizeLightLevel(50);
      const temp = categorizeTemperature(20);

      // TypeScript should enforce these types
      const noiseTest: 'loud' | 'moderate' | 'quiet' = noise;
      const lightTest: 'bright' | 'moderate' | 'dim' = light;
      const tempTest: 'hot' | 'comfortable' | 'cold' = temp;

      expect(noiseTest).toBeDefined();
      expect(lightTest).toBeDefined();
      expect(tempTest).toBeDefined();
    });

    it('composite function returns correct interface', () => {
      const conditions = getLatestEnvironmentConditions([]);

      const test: EnvironmentConditions = conditions;

      expect(test.noise).toBeDefined();
      expect(test.lighting).toBeDefined();
      expect(test.temperature).toBeDefined();
    });
  });
});
