// Enhanced mock data seeding utilities with realistic variation
import {
  Student,
  TrackingEntry,
  EmotionEntry,
  SensoryEntry,
  EnvironmentalEntry,
} from '@/types/student';
import { dataStorage } from './dataStorage';
import { POC_MODE } from './env';
import { logger } from './logger';

type TimeOfDay = 'morning' | 'afternoon' | 'evening';

interface SeedOptions {
  days: number; // number of days back from today
  entriesPerDayRange: [number, number]; // inclusive range
  includeEnvironmental: boolean;
  weekendPatterns: boolean;
}

const DEFAULT_SEED_OPTIONS: SeedOptions = {
  days: 30,
  entriesPerDayRange: [1, 3],
  includeEnvironmental: true,
  weekendPatterns: true,
};

const SUB_EMOTIONS: Record<string, string[]> = {
  Happy: ['Joyful', 'Playful', 'Proud'],
  Calm: ['Relaxed', 'Peaceful'],
  Excited: ['Energetic', 'Anticipating'],
  Anxious: ['Worried', 'Restless'],
  Frustrated: ['Irritated', 'Stuck'],
  Focused: ['Engaged', 'Attentive'],
  Tired: ['Sleepy', 'Low-energy'],
  Overwhelmed: ['Overstimulated', 'Flooded'],
  Content: ['Satisfied', 'At-ease'],
  Curious: ['Interested', 'Exploring'],
};

const SENSORY_TYPES = [
  'Visual',
  'Auditory',
  'Tactile',
  'Vestibular',
  'Proprioceptive',
  'Olfactory',
  'Gustatory',
] as const;

const SENSORY_RESPONSES: Record<(typeof SENSORY_TYPES)[number], string[]> = {
  Visual: ['Looked closely', 'Avoided gaze', 'Tracked movement'],
  Auditory: ['Covered ears', 'Hummed', 'Asked to lower volume'],
  Tactile: ['Touched texture', 'Avoided touch', 'Squeezed stress ball'],
  Vestibular: ['Rocked in chair', 'Spun briefly', 'Sought swinging'],
  Proprioceptive: ['Pushed against wall', 'Squeezed putty', 'Carried heavy books'],
  Olfactory: ['Noticed smell', 'Avoided odor', 'Sought scented object'],
  Gustatory: ['Chewed gum', 'Sipped water', 'Tasted snack'],
};

const ENVIRONMENTS = [
  'classroom',
  'playground',
  'lunchroom',
  'hallway',
  'home',
  'therapy',
  'library',
] as const;
type ClassroomActivity = 'instruction' | 'transition' | 'free-time' | 'testing' | 'group-work';
const CLASSROOM_ACTIVITIES: ClassroomActivity[] = [
  'instruction',
  'transition',
  'free-time',
  'testing',
  'group-work',
];

const seededRand = (() => {
  let seed = 1337;
  const rand = () => {
    // xorshift32
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 0xffffffff;
  };
  return {
    setSeed: (s: number) => {
      seed = s;
    },
    rand,
  };
})();

function randomInt(min: number, max: number): number {
  const r = POC_MODE ? seededRand.rand() : Math.random();
  return Math.floor(r * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  const r = POC_MODE ? seededRand.rand() : Math.random();
  return r * (max - min) + min;
}

function pickOne<T>(arr: readonly T[]): T {
  const r = POC_MODE ? seededRand.rand() : Math.random();
  return arr[Math.floor(r * arr.length)];
}

function pickSome<T>(arr: readonly T[], countRange: [number, number]): T[] {
  const [min, max] = countRange;
  const count = randomInt(min, max);
  const pool = [...arr];
  const result: T[] = [];
  while (result.length < count && pool.length > 0) {
    const idx = randomInt(0, pool.length - 1);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function timeOfDaySlots(day: Date): Record<TimeOfDay, Date> {
  const morning = new Date(day);
  morning.setHours(9, randomInt(0, 59), 0, 0);
  const afternoon = new Date(day);
  afternoon.setHours(13, randomInt(0, 59), 0, 0);
  const evening = new Date(day);
  evening.setHours(16, randomInt(0, 59), 0, 0);
  return { morning, afternoon, evening };
}

function chooseEmotionsForTimeOfDay(tod: TimeOfDay): string[] {
  switch (tod) {
    case 'morning':
      return ['Calm', 'Curious', 'Happy', 'Focused'];
    case 'afternoon':
      return ['Excited', 'Anxious', 'Focused', 'Frustrated'];
    case 'evening':
    default:
      return ['Tired', 'Content', 'Calm', 'Overwhelmed'];
  }
}

function baseIntensityForContext(
  tod: TimeOfDay,
  env: (typeof ENVIRONMENTS)[number],
  isWeekend: boolean,
): number {
  let base = 3;
  if (tod === 'afternoon') base += 0.5;
  if (tod === 'evening') base -= 0.5;
  if (env === 'lunchroom' || env === 'playground') base += 0.5;
  if (isWeekend) base -= 0.3;
  return clamp(Math.round(base + randomFloat(-1, 1)), 1, 5);
}

function buildEnvironmentalData(
  timestamp: Date,
  env: (typeof ENVIRONMENTS)[number],
  tod: TimeOfDay,
): EnvironmentalEntry {
  const noiseBase =
    env === 'lunchroom' || env === 'playground'
      ? randomInt(6, 9)
      : env === 'library'
        ? randomInt(1, 3)
        : randomInt(3, 6);
  const lighting =
    env === 'classroom'
      ? tod === 'morning'
        ? 'natural'
        : 'fluorescent'
      : env === 'playground'
        ? 'sunlight'
        : 'mixed';
  const activity = env === 'classroom' ? pickOne(CLASSROOM_ACTIVITIES) : undefined;
  const timeOfDay = tod;
  type WeatherCondition = NonNullable<EnvironmentalEntry['weather']>['condition'];
  const weatherKinds: WeatherCondition[] = ['sunny', 'cloudy', 'rainy', 'stormy', 'snowy'];
  const temp = randomInt(18, 27);
  return {
    timestamp,
    location: env,
    socialContext: env === 'playground' ? 'peers' : env === 'home' ? 'family' : 'class',
    roomConditions: {
      temperature: temp,
      humidity: randomInt(30, 60),
      lighting,
      noiseLevel: noiseBase,
    },
    weather: {
      condition: pickOne(weatherKinds),
      temperature: temp,
      pressure: randomInt(990, 1025),
    },
    classroom: activity
      ? {
          activity,
          studentCount: activity === 'testing' ? randomInt(15, 20) : randomInt(20, 30),
          timeOfDay,
        }
      : undefined,
  };
}

function makeEmotion(
  id: string,
  studentId: string,
  emotion: string,
  timestamp: Date,
  intensity: number,
): EmotionEntry {
  const subs = SUB_EMOTIONS[emotion] || [];
  const subEmotion = subs.length ? pickOne(subs) : undefined;
  const patterns: EmotionEntry['escalationPattern'][] = ['sudden', 'gradual', 'unknown'];
  return {
    id,
    studentId,
    emotion,
    subEmotion,
    intensity,
    duration: randomInt(3, 20),
    timestamp,
    triggers: pickSome(
      ['noise', 'transition', 'reward', 'task-change', 'peer-interaction', 'hunger', 'fatigue'],
      [0, 2],
    ),
    context: 'observed during routine activity',
    escalationPattern: pickOne(patterns),
  };
}

function makeSensory(
  id: string,
  studentId: string,
  type: (typeof SENSORY_TYPES)[number],
  timestamp: Date,
  intensity: number,
): SensoryEntry {
  const response = pickOne(SENSORY_RESPONSES[type]);
  return {
    id,
    studentId,
    sensoryType: type,
    type,
    input: type,
    response,
    intensity,
    location: pickOne(['hands', 'ears', 'eyes', 'whole-body']),
    timestamp,
    notes: 'auto-generated demo',
    environment: pickOne(ENVIRONMENTS as unknown as string[]),
    context: 'session observation',
    copingStrategies: pickSome(
      ['deep-breathing', 'quiet-space', 'movement-break', 'fidget-tool', 'noise-cancelling'],
      [0, 2],
    ),
  };
}

/**
 * Enhanced seeding with realistic variation over multiple days
 */
export const seedMinimalDemoData = async (
  studentId: string,
  opts?: Partial<SeedOptions>,
): Promise<void> => {
  try {
    const options: SeedOptions = { ...DEFAULT_SEED_OPTIONS, ...(opts || {}) };
    const now = new Date();
    if (POC_MODE) {
      // Stabilize randomness per session for consistent demo outputs
      const hash =
        Array.from(studentId).reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 0) ^
        now.getFullYear();
      seededRand.setSeed(0xdeadbeef ^ hash);
    }

    const student: Student = {
      id: studentId,
      name:
        studentId
          .replace(/^mock_?/, '')
          .split(/[_-]/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ') || 'Demo Student',
      dateOfBirth: '2015-01-01',
      grade: '3',
      createdAt: now,
      lastUpdated: now,
      version: 1,
    };
    dataStorage.saveStudent(student);

    let entryCounter = 0;

    for (let d = 0; d < options.days; d++) {
      const dayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dayDate.setDate(dayDate.getDate() - d);
      const isWeekend = [0, 6].includes(dayDate.getDay());
      const slots = timeOfDaySlots(dayDate);
      const numEntries = randomInt(options.entriesPerDayRange[0], options.entriesPerDayRange[1]);

      const availableSlots: TimeOfDay[] = ['morning', 'afternoon', 'evening'];
      for (let i = 0; i < numEntries; i++) {
        const tod = pickOne(availableSlots);
        const timestamp = new Date(slots[tod]);
        timestamp.setMinutes(timestamp.getMinutes() + randomInt(-15, 15));

        const env = pickOne(ENVIRONMENTS);
        const baseIntensity = baseIntensityForContext(
          tod,
          env,
          options.weekendPatterns && isWeekend,
        );

        const emotionPool = chooseEmotionsForTimeOfDay(tod);
        const emotionNames = pickSome(emotionPool as unknown as string[], [1, 2]);
        const emotions: EmotionEntry[] = emotionNames.map((name, idx) =>
          makeEmotion(
            `${studentId}_e_${d}_${i}_${idx}`,
            student.id,
            name,
            timestamp,
            clamp(baseIntensity + randomInt(-1, 1), 1, 5),
          ),
        );

        const sensoryPool = SENSORY_TYPES as unknown as string[];
        const sensoryNames = pickSome(sensoryPool, [1, 2]) as (typeof SENSORY_TYPES)[number][];
        const sensoryInputs: SensoryEntry[] = sensoryNames.map((typeName, idx) =>
          makeSensory(
            `${studentId}_s_${d}_${i}_${idx}`,
            student.id,
            typeName,
            timestamp,
            clamp(baseIntensity + randomInt(-1, 1), 1, 5),
          ),
        );

        const environmentalData: EnvironmentalEntry | undefined = options.includeEnvironmental
          ? buildEnvironmentalData(timestamp, env, tod)
          : undefined;

        const entry: TrackingEntry = {
          id: `${studentId}_entry_${entryCounter++}`,
          studentId: student.id,
          timestamp,
          emotions,
          sensoryInputs,
          environmentalData,
          generalNotes: `Observed during ${tod} in ${env}`,
          notes: emotions.map((e) => e.emotion).join(', '),
          version: 1,
        };

        dataStorage.saveTrackingEntry(entry);
      }
    }

    const totalEntries = dataStorage.getEntriesForStudent(studentId).length;
    logger.info('seedMinimalDemoData: seeded enhanced demo data', {
      studentId,
      studentName: student.name,
      entriesCount: totalEntries,
    });
  } catch (error) {
    logger.error('seedMinimalDemoData: failed to seed demo data', { studentId, error });
    throw error;
  }
};
