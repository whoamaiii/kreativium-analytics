import { EmotionEntry, SensoryEntry, EnvironmentalEntry } from '@/types/student';
import { startOfDay, addDays, subDays } from 'date-fns';

export interface FilterCriteria {
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  emotions: {
    types: string[];
    intensityRange: [number, number];
    includeTriggers: string[];
    excludeTriggers: string[];
  };
  sensory: {
    types: string[];
    responses: string[];
    intensityRange: [number, number];
  };
  environmental: {
    locations: string[];
    activities: string[];
    conditions: {
      noiseLevel: [number, number];
      temperature: [number, number];
      lighting: string[];
    };
    weather: string[];
    timeOfDay: string[];
  };
  patterns: {
    anomaliesOnly: boolean;
    minConfidence: number;
    patternTypes: string[];
  };
  realtime: boolean;
}

// Preset filter configurations
export const FILTER_PRESETS: Array<{ name: string; description: string; criteria: Partial<FilterCriteria> }> = [
  {
    name: 'High Intensity Events',
    description: 'Focus on high-intensity emotions and sensory responses',
    criteria: {
      emotions: {
        types: [],
        intensityRange: [4, 5], // Max app intensity is 5
        includeTriggers: [],
        excludeTriggers: []
      },
      sensory: {
        types: [],
        responses: [],
        intensityRange: [4, 5] // Max app intensity is 5
      }
    }
  },
  {
    name: 'Challenging Environments',
    description: 'Filter for difficult environmental conditions',
    criteria: {
      environmental: {
        locations: [],
        activities: [],
        conditions: {
          noiseLevel: [7, 10],
          temperature: [25, 40],
          lighting: []
        },
        weather: ['stormy', 'rainy'],
        timeOfDay: []
      }
    }
  },
  {
    name: 'Positive Patterns',
    description: 'Show only positive emotions and seeking behaviors',
    criteria: {
      emotions: {
        types: ['happy', 'calm', 'excited', 'proud', 'focused'],
        intensityRange: [0, 5],
        includeTriggers: [],
        excludeTriggers: []
      },
      sensory: {
        types: [],
        responses: ['seeking'],
        intensityRange: [0, 5]
      }
    }
  },
  {
    name: 'Recent Activity',
    description: 'Last 24 hours of data',
    criteria: {
      dateRange: {
        start: subDays(new Date(), 1),
        end: new Date()
      }
    }
  }
];

// Helper function to apply filters to data
export const applyFilters = <T extends { timestamp: Date }>(
  data: T[],
  criteria: FilterCriteria,
  getEmotionData?: (item: T) => EmotionEntry | null,
  getSensoryData?: (item: T) => SensoryEntry | null,
  getEnvironmentalData?: (item: T) => EnvironmentalEntry | null
): T[] => {
  return data.filter(item => {
    // Date range filter: normalize to half-open [start, end)
    if (criteria.dateRange.start || criteria.dateRange.end) {
      const start = criteria.dateRange.start ? startOfDay(criteria.dateRange.start) : new Date(0);
      // Use endExclusive as startOfDay(end) + 1 day for whole-day selection
      const endExclusive = criteria.dateRange.end ? addDays(startOfDay(criteria.dateRange.end), 1) : new Date(8640000000000000);
      const ts = item.timestamp;
      if (!(ts >= start && ts < endExclusive)) return false;
    }

    // Emotion filters
    if (getEmotionData) {
      const emotion = getEmotionData(item);
      if (emotion) {
        if (criteria.emotions.types.length > 0 && !criteria.emotions.types.includes(emotion.emotion)) {
          return false;
        }
        if (emotion.intensity < criteria.emotions.intensityRange[0] ||
            emotion.intensity > criteria.emotions.intensityRange[1]) {
          return false;
        }
        if (criteria.emotions.includeTriggers.length > 0 &&
            !emotion.triggers?.some(t => criteria.emotions.includeTriggers.includes(t))) {
          return false;
        }
        if (criteria.emotions.excludeTriggers.length > 0 &&
            emotion.triggers?.some(t => criteria.emotions.excludeTriggers.includes(t))) {
          return false;
        }
      }
    }

    // Sensory filters
    if (getSensoryData) {
      const sensory = getSensoryData(item);
      if (sensory) {
        const sensoryType = sensory.sensoryType || sensory.type || '';
        if (criteria.sensory.types.length > 0 && !criteria.sensory.types.includes(sensoryType)) {
          return false;
        }
        if (criteria.sensory.responses.length > 0 && !criteria.sensory.responses.includes(sensory.response)) {
          return false;
        }
        if (sensory.intensity &&
            (sensory.intensity < criteria.sensory.intensityRange[0] ||
             sensory.intensity > criteria.sensory.intensityRange[1])) {
          return false;
        }
      }
    }

    // Environmental filters
    if (getEnvironmentalData) {
      const env = getEnvironmentalData(item);
      if (env) {
        if (criteria.environmental.locations.length > 0 &&
            env.location && !criteria.environmental.locations.includes(env.location)) {
          return false;
        }
        if (criteria.environmental.activities.length > 0 &&
            env.classroom?.activity && !criteria.environmental.activities.includes(env.classroom.activity)) {
          return false;
        }
        if (criteria.environmental.weather.length > 0 &&
            env.weather?.condition && !criteria.environmental.weather.includes(env.weather.condition)) {
          return false;
        }
        if (env.roomConditions?.noiseLevel &&
            (env.roomConditions.noiseLevel < criteria.environmental.conditions.noiseLevel[0] ||
             env.roomConditions.noiseLevel > criteria.environmental.conditions.noiseLevel[1])) {
          return false;
        }
      }
    }

    return true;
  });
};
