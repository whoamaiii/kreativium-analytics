import {
  Student,
  TrackingEntry,
  EmotionEntry,
  SensoryEntry,
  EnvironmentalEntry,
  Goal,
} from '@/types/student';
import { saveTrackingEntry as saveTrackingEntryUnified } from '@/lib/tracking/saveTrackingEntry';
import { logger } from './logger';
import { generateId } from './uuid';
import {
  validateEmotionEntry,
  validateSensoryEntry,
  validateTrackingEntry,
  validateStudent,
} from './dataValidation';
import { storageService } from '@/lib/storage/storageService';
import { convertLegacyEntryToSession } from '@/lib/adapters/legacyTransforms';
import { convertLegacyStudentToLocal } from '@/lib/adapters/legacyConverters';
import {
  TEMPERATURE,
  HUMIDITY,
  ATMOSPHERIC_PRESSURE,
  NOISE_LEVEL,
  LIGHTING,
  WEATHER,
  EMOTIONS,
  EMOTION_INTENSITY,
  DATA_GENERATION,
  PROBABILITY,
  TIME,
} from '@/config/constants';

// Helper function to get a random date within the last N days
const getRandomDate = (daysAgo: number, variance: number = 0): Date => {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - daysAgo);

  if (variance > 0) {
    const varianceMs = variance * TIME.DAY_MS; // Convert days to milliseconds
    const randomOffset = (Math.random() - 0.5) * 2 * varianceMs;
    baseDate.setTime(baseDate.getTime() + randomOffset);
  }

  return baseDate;
};

// -----------------------------------------------------------------------------
// Emma-specific social-context helpers
// -----------------------------------------------------------------------------

/** Apply a realistic social scenario to an entry for Emma to help AI answer
 * social-trigger questions (e.g., friminutt, gruppearbeid, kantine, overgang,
 * presentasjon). Uses Norwegian keywords the heuristics look for.
 */
function applyEmmaSocialContext(entry: TrackingEntry): void {
  // Ensure at least one emotion exists so we can tag social triggers
  if (!entry.emotions || entry.emotions.length === 0) {
    entry.emotions = [generateEmotionEntry(entry.studentId, entry.timestamp, 'anxious')];
  }
  const emo = entry.emotions[0];

  // Prefer anxious/frustrated with higher intensity so it surfaces in patterns
  if (Math.random() < PROBABILITY.HIGH) emo.emotion = 'anxious';
  if (!emo.intensity || emo.intensity < EMOTION_INTENSITY.HIGH_THRESHOLD) {
    emo.intensity = EMOTION_INTENSITY.HIGH_THRESHOLD;
  }
  emo.triggers = Array.isArray(emo.triggers) ? emo.triggers : [];

  // Choose a social scenario
  const r = Math.random();
  if (r < PROBABILITY.SOCIAL_SCENARIOS.GROUP_WORK) {
    // Gruppearbeid i klasserommet
    entry.environmentalData = entry.environmentalData || {
      id: undefined,
      timestamp: entry.timestamp,
      location: '',
      roomConditions: { noiseLevel: 0, lighting: '', temperature: 0 },
      socialContext: '',
    };
    if (entry.environmentalData) {
      entry.environmentalData.location = 'classroom';
      entry.environmentalData.socialContext = 'Gruppearbeid';
      entry.environmentalData.classroom = {
        ...(entry.environmentalData.classroom || {}),
        activity: 'group-work',
        timeOfDay:
          (entry.environmentalData.classroom && entry.environmentalData.classroom.timeOfDay) ||
          'morning',
      };
    }
    emo.triggers.push('sosial interaksjon', 'gruppearbeid');
    emo.notes = emo.notes || 'Uro under gruppeoppgave';
    entry.generalNotes = 'Sosial situasjon: gruppeoppgave i klasserommet (samarbeid/gruppe).';
  } else if (r < PROBABILITY.SOCIAL_SCENARIOS.RECESS) {
    // Friminutt ute
    entry.environmentalData = entry.environmentalData || {
      id: undefined,
      timestamp: entry.timestamp,
      location: '',
      roomConditions: { noiseLevel: 0, lighting: '', temperature: 0 },
      socialContext: '',
    };
    if (entry.environmentalData) {
      entry.environmentalData.location = 'playground';
      entry.environmentalData.socialContext = 'Friminutt';
      entry.environmentalData.classroom = {
        ...(entry.environmentalData.classroom || {}),
        activity: 'free-time',
        timeOfDay:
          (entry.environmentalData.classroom && entry.environmentalData.classroom.timeOfDay) ||
          'afternoon',
      };
    }
    emo.triggers.push('sosial interaksjon', 'friminutt');
    emo.notes = emo.notes || 'Konflikt i friminutt';
    entry.generalNotes = 'Friminutt med mange elever; mulig konflikt/press i sosial situasjon.';
  } else if (r < PROBABILITY.SOCIAL_SCENARIOS.CAFETERIA) {
    // Lunsj i kantinen
    entry.environmentalData = entry.environmentalData || {
      id: undefined,
      timestamp: entry.timestamp,
      location: '',
      roomConditions: { noiseLevel: 0, lighting: '', temperature: 0 },
      socialContext: '',
    };
    if (entry.environmentalData) {
      entry.environmentalData.location = 'cafeteria';
      entry.environmentalData.socialContext = 'Lunsj/kantine';
      entry.environmentalData.roomConditions = {
        ...(entry.environmentalData.roomConditions || {}),
        noiseLevel: Math.max(
          NOISE_LEVEL.CAFETERIA_HIGH,
          entry.environmentalData.roomConditions?.noiseLevel || NOISE_LEVEL.CAFETERIA_HIGH,
        ),
        lighting: entry.environmentalData.roomConditions?.lighting || 'bright',
      };
    }
    emo.triggers.push('sosial interaksjon', 'lunsj', 'kantine');
    emo.notes = emo.notes || 'Overveldet i kantinen (støy, kø, mange elever)';
    entry.generalNotes = 'Lunsj i kantinen; tett sosialt miljø og høy lyd.';
  } else if (r < 0.9) {
    // Presentasjon foran klassen
    entry.environmentalData = entry.environmentalData || {
      id: undefined,
      timestamp: entry.timestamp,
      location: '',
      roomConditions: { noiseLevel: 0, lighting: '', temperature: 0 },
      socialContext: '',
    };
    if (entry.environmentalData) {
      entry.environmentalData.location = 'classroom';
      entry.environmentalData.socialContext = 'Presentasjon';
      entry.environmentalData.classroom = {
        ...(entry.environmentalData.classroom || {}),
        activity: 'instruction',
        timeOfDay:
          (entry.environmentalData.classroom && entry.environmentalData.classroom.timeOfDay) ||
          'morning',
      };
    }
    emo.triggers.push('sosial interaksjon', 'presentasjon');
    emo.notes = emo.notes || 'Nervøs/engstelig ved presentasjon';
    entry.generalNotes = 'Presentasjon foran klassen; sosial eksponering og forventninger.';
  } else {
    // Overgang mellom aktiviteter/timer (hallway/transition)
    entry.environmentalData = entry.environmentalData || {
      id: undefined,
      timestamp: entry.timestamp,
      location: '',
      roomConditions: { noiseLevel: 0, lighting: '', temperature: 0 },
      socialContext: '',
    };
    if (entry.environmentalData) {
      entry.environmentalData.location = 'hallway';
      entry.environmentalData.socialContext = 'Overgang';
      entry.environmentalData.classroom = {
        ...(entry.environmentalData.classroom || {}),
        activity: 'transition',
        timeOfDay:
          (entry.environmentalData.classroom && entry.environmentalData.classroom.timeOfDay) ||
          'afternoon',
      };
    }
    emo.triggers.push('sosial interaksjon', 'overgang');
    emo.notes = emo.notes || 'Påvirket ved overgang til/etter friminutt';
    entry.generalNotes = 'Overgang fra friminutt til time; stress i korridor/oppstilling.';
  }
}

/** Ensure Emma has at least a baseline number of explicit social examples. */
function ensureEmmaSocialBaseline(
  entries: TrackingEntry[],
  student: Student,
  min = DATA_GENERATION.EMMA_SOCIAL_BASELINE_MIN,
): void {
  const socialRe =
    /(sosial|sosiale|venn|venner|kompis|klasse|klasserom|gruppe|grupp|friminutt|pause|lunsj|frokost|middag|kantine|overgang|presentasjon)/i;
  const count = entries.filter((e) => {
    const txt = `${e.generalNotes || e.notes || ''} ${e.environmentalData?.classroom?.activity || ''} ${e.environmentalData?.location || ''} ${e.environmentalData?.socialContext || ''}`;
    const emoTxt = (e.emotions || [])
      .map((em) => `${em.notes || ''} ${(em.triggers || []).join(' ')}`)
      .join(' ');
    return socialRe.test(txt) || socialRe.test(emoTxt);
  }).length;
  const needed = Math.max(0, min - count);
  if (needed === 0) return;

  const scenarios: Array<'gruppe' | 'friminutt' | 'kantine' | 'presentasjon' | 'overgang'> = [
    'gruppe',
    'friminutt',
    'kantine',
    'presentasjon',
    'overgang',
  ];
  for (let i = 0; i < needed; i++) {
    const ts = new Date(
      Date.now() - (i + 1) * DATA_GENERATION.SOCIAL_BASELINE_INTERVAL_HOURS * TIME.HOUR_MS,
    ); // every ~3 hours back
    const e: TrackingEntry = {
      id: generateId(`tracking_${student.id}`),
      studentId: student.id,
      timestamp: ts,
      emotions: [generateEmotionEntry(student.id, ts, 'anxious')],
      sensoryInputs: [],
      environmentalData: {},
      generalNotes: '',
    } as TrackingEntry;
    // Always high enough intensity and social trigger
    e.emotions[0].intensity = Math.max(
      EMOTION_INTENSITY.HIGH_THRESHOLD,
      e.emotions[0].intensity || EMOTION_INTENSITY.HIGH_THRESHOLD,
    );
    e.emotions[0].triggers = Array.from(
      new Set([...(e.emotions[0].triggers || []), 'sosial interaksjon']),
    );

    // Cycle through scenarios to diversify examples
    const t = scenarios[i % scenarios.length];
    switch (t) {
      case 'gruppe':
        e.environmentalData = {
          ...(e.environmentalData || {}),
          location: 'classroom',
          socialContext: 'Gruppearbeid',
          classroom: { activity: 'group-work', timeOfDay: 'morning' },
        };
        e.generalNotes = 'Sosial situasjon: gruppeoppgave i klasserommet (gruppe/samarbeid).';
        e.emotions[0].triggers?.push('gruppearbeid');
        break;
      case 'friminutt':
        e.environmentalData = {
          ...(e.environmentalData || {}),
          location: 'playground',
          socialContext: 'Friminutt',
          classroom: { activity: 'free-time', timeOfDay: 'afternoon' },
        };
        e.generalNotes = 'Friminutt med venner; noe konflikt og uro.';
        e.emotions[0].triggers?.push('friminutt');
        break;
      case 'kantine':
        e.environmentalData = {
          ...(e.environmentalData || {}),
          location: 'cafeteria',
          socialContext: 'Lunsj/kantine',
          roomConditions: {
            noiseLevel: NOISE_LEVEL.CAFETERIA_HIGH,
            lighting: 'bright',
            temperature: 0,
          },
        };
        e.generalNotes = 'Lunsj i kantinen; høy lyd og tett sosialt miljø.';
        e.emotions[0].triggers?.push('kantine', 'lunsj');
        break;
      case 'presentasjon':
        e.environmentalData = {
          ...(e.environmentalData || {}),
          location: 'classroom',
          socialContext: 'Presentasjon',
          classroom: { activity: 'instruction', timeOfDay: 'morning' },
        };
        e.generalNotes = 'Presentasjon foran klassen; sosial eksponering.';
        e.emotions[0].triggers?.push('presentasjon');
        break;
      case 'overgang':
        e.environmentalData = {
          ...(e.environmentalData || {}),
          location: 'hallway',
          socialContext: 'Overgang',
          classroom: { activity: 'transition', timeOfDay: 'afternoon' },
        };
        e.generalNotes = 'Overgang fra friminutt til time; stress i korridor.';
        e.emotions[0].triggers?.push('overgang');
        break;
    }
    entries.push(e);
  }
}

// Generate realistic emotion entry
export const generateEmotionEntry = (
  studentId: string,
  timestamp: Date,
  emotionBias?: string,
): EmotionEntry => {
  const emotions = [...EMOTIONS.TYPES];
  const biasedEmotion = emotionBias || emotions[Math.floor(Math.random() * EMOTIONS.COUNT)];

  // Generate intensity based on emotion type
  const intensityRange =
    EMOTION_INTENSITY.RANGES[biasedEmotion as keyof typeof EMOTION_INTENSITY.RANGES];
  const [minIntensity, maxIntensity] = intensityRange
    ? [intensityRange.min, intensityRange.max]
    : [EMOTION_INTENSITY.RANGES.sad.min, EMOTION_INTENSITY.RANGES.sad.max];
  const intensity = Math.floor(Math.random() * (maxIntensity - minIntensity + 1)) + minIntensity;

  const entry: EmotionEntry = {
    id: generateId('emotion'),
    studentId,
    timestamp,
    emotion: biasedEmotion,
    intensity,
    triggers:
      Math.random() > PROBABILITY.MEDIUM_HIGH ? ['environmental change', 'social interaction'] : [],
    notes:
      Math.random() > PROBABILITY.HIGH ? `Student seemed ${biasedEmotion} during this period` : '',
  };

  // Validate the generated entry
  const validationResult = validateEmotionEntry(entry);
  if (!validationResult.isValid) {
    logger.error('Generated invalid emotion entry:', entry, validationResult.errors);
    throw new Error('Failed to generate valid emotion entry');
  }

  return entry;
};

// Generate realistic sensory entry
export const generateSensoryEntry = (
  studentId: string,
  timestamp: Date,
  seeking?: boolean,
): SensoryEntry => {
  const sensoryTypes = ['visual', 'auditory', 'tactile', 'vestibular', 'proprioceptive'];
  const type = sensoryTypes[Math.floor(Math.random() * sensoryTypes.length)];

  // Determine response based on seeking behavior
  const responses = seeking
    ? ['seeking', 'engaging', 'exploring']
    : ['avoiding', 'withdrawing', 'defensive'];
  const response = responses[Math.floor(Math.random() * responses.length)];

  const intensity = Math.floor(Math.random() * 5) + 1;

  const entry: SensoryEntry = {
    id: generateId('sensory'),
    studentId,
    timestamp,
    type,
    sensoryType: type,
    response,
    intensity,
    notes: Math.random() > 0.8 ? `${type} input was ${response}` : '',
  };

  // Validate the generated entry
  const validationResult = validateSensoryEntry(entry);
  if (!validationResult.isValid) {
    logger.error('Generated invalid sensory entry:', entry, validationResult.errors);
    throw new Error('Failed to generate valid sensory entry');
  }

  return entry;
};

// Generate environmental entry
const generateEnvironmentalEntry = (
  timestamp: Date,
  correlationFactors?: { noise?: boolean; bright?: boolean },
): EnvironmentalEntry => {
  const factors = correlationFactors || {};

  return {
    id: generateId('env'),
    timestamp,
    location: ['classroom', 'library', 'cafeteria', 'playground', 'hallway'][
      Math.floor(Math.random() * 5)
    ],
    socialContext: ['individual work', 'group activity', 'instruction', 'transition'][
      Math.floor(Math.random() * 4)
    ],
    roomConditions: {
      noiseLevel:
        factors.noise !== undefined
          ? factors.noise
            ? NOISE_LEVEL.NOISY
            : NOISE_LEVEL.QUIET
          : Math.floor(Math.random() * NOISE_LEVEL.RANGE_SCALE_5) + NOISE_LEVEL.MIN_SCALE_5,
      lighting:
        factors.bright !== undefined
          ? factors.bright
            ? 'bright'
            : 'dim'
          : LIGHTING.CONDITIONS[Math.floor(Math.random() * LIGHTING.COUNT)],
      temperature: Math.floor(Math.random() * TEMPERATURE.INDOOR_RANGE) + TEMPERATURE.INDOOR_MIN,
      humidity: Math.floor(Math.random() * HUMIDITY.RANGE) + HUMIDITY.MIN,
    },
    weather: {
      condition: WEATHER.CONDITIONS[Math.floor(Math.random() * WEATHER.COUNT_FULL)] as
        | 'sunny'
        | 'cloudy'
        | 'rainy'
        | 'stormy'
        | 'snowy',
      temperature: Math.floor(Math.random() * TEMPERATURE.OUTDOOR_RANGE) + TEMPERATURE.OUTDOOR_MIN,
      pressure: Math.floor(Math.random() * ATMOSPHERIC_PRESSURE.RANGE) + ATMOSPHERIC_PRESSURE.MIN,
    },
    classroom: {
      activity: ['instruction', 'transition', 'free-time', 'testing', 'group-work'][
        Math.floor(Math.random() * 5)
      ] as 'instruction' | 'transition' | 'free-time' | 'testing' | 'group-work',
      studentCount: Math.floor(Math.random() * 20) + 10, // 10-30 students
      timeOfDay: ['morning', 'afternoon', 'evening'][Math.floor(Math.random() * 3)] as
        | 'morning'
        | 'afternoon'
        | 'evening',
    },
    notes: Math.random() > 0.9 ? 'Notable environmental conditions' : '',
  };
};

// Generate tracking entry for a student based on scenario
export const generateTrackingEntry = (
  student: Student,
  daysAgo: number,
  scenario: 'emma' | 'lars' | 'astrid',
): TrackingEntry => {
  const timestamp = getRandomDate(daysAgo, 0.5);

  const entry: TrackingEntry = {
    id: generateId(`tracking_${student.id}`),
    studentId: student.id,
    timestamp,
    emotions: [],
    sensoryInputs: [],
    environmentalData: generateEnvironmentalEntry(timestamp),
    notes: '',
  };

  // Generate scenario-specific data
  switch (scenario) {
    case 'emma': // Mild anxiety patterns with improvement over time
      {
        const dayIndex = Math.max(0, 90 - daysAgo); // 90 days of improvement
        const anxietyLevel = Math.max(1, 4 - dayIndex * 0.02); // Gradual improvement

        // Generate consistent emotion patterns for detection
        // Recent days should have more consistent patterns
        if (daysAgo < 30) {
          // For recent data, create a more consistent pattern
          if (daysAgo < 7) {
            // Very recent: mostly anxious with high intensity to trigger high-intensity pattern
            entry.emotions.push(generateEmotionEntry(student.id, timestamp, 'anxious'));
            // Ensure some have high intensity (4-5)
            if (entry.emotions[0].intensity < 4 && Math.random() > 0.5) {
              entry.emotions[0].intensity = 4;
            }
          } else {
            // Still recent: mix of anxious and calm showing improvement
            const emotion = Math.random() > 0.6 ? 'calm' : 'anxious';
            entry.emotions.push(generateEmotionEntry(student.id, timestamp, emotion));
          }
        } else {
          // Older data: use original pattern
          entry.emotions.push(
            generateEmotionEntry(
              student.id,
              timestamp,
              Math.random() > anxietyLevel / 5 ? 'calm' : 'anxious',
            ),
          );
        }

        // Add sensory seeking behaviors that correlate with emotions
        entry.sensoryInputs.push(
          generateSensoryEntry(student.id, timestamp, entry.emotions[0].emotion === 'anxious'),
        );

        // Add additional emotions occasionally
        if (Math.random() > 0.7) {
          entry.emotions.push(generateEmotionEntry(student.id, timestamp, 'content'));
        }

        // For very recent entries, sometimes add multiple emotions
        if (daysAgo < 5 && Math.random() > 0.6) {
          entry.emotions.push(generateEmotionEntry(student.id, timestamp, 'frustrated'));
        }

        // Add realistic social context frequently so "sosiale triggere" can be answered
        if (Math.random() < 0.6) {
          applyEmmaSocialContext(entry);
        }
      }
      break;

    case 'lars': // Sensory processing challenges
      {
        // Lars has consistent sensory challenges with tactile sensitivity
        // Create more consistent patterns for recent data
        if (daysAgo < 30) {
          // Recent data: strong sensory avoiding pattern
          entry.sensoryInputs.push(generateSensoryEntry(student.id, timestamp, false)); // Consistent avoiding

          // Add more sensory entries for recent days to ensure pattern detection
          if (daysAgo < 10 && Math.random() > 0.3) {
            entry.sensoryInputs.push(generateSensoryEntry(student.id, timestamp, false)); // More avoiding
          }

          // Emotions correlate strongly with sensory for recent data
          const emotionType =
            daysAgo < 7 ? 'frustrated' : Math.random() > 0.6 ? 'frustrated' : 'anxious';
          entry.emotions.push(generateEmotionEntry(student.id, timestamp, emotionType));
        } else {
          // Older data: original pattern
          entry.sensoryInputs.push(generateSensoryEntry(student.id, timestamp, false));

          if (Math.random() > 0.5) {
            entry.sensoryInputs.push(generateSensoryEntry(student.id, timestamp, true));
          }

          const sensoryIntensity = entry.sensoryInputs[0].intensity || 3;
          const emotionType =
            sensoryIntensity > 3
              ? Math.random() > 0.6
                ? 'frustrated'
                : 'anxious'
              : Math.random() > 0.5
                ? 'calm'
                : 'content';
          entry.emotions.push(generateEmotionEntry(student.id, timestamp, emotionType));
        }

        // Environmental correlation - noise affects Lars significantly
        if (
          entry.environmentalData?.roomConditions?.noiseLevel &&
          entry.environmentalData.roomConditions.noiseLevel > 3
        ) {
          entry.emotions.push(generateEmotionEntry(student.id, timestamp, 'overwhelmed'));
          // Make sure overwhelmed has high intensity
          const lastEmotion = entry.emotions[entry.emotions.length - 1];
          if (lastEmotion.intensity < 4) {
            lastEmotion.intensity = 4;
          }
        }
      }
      break;

    case 'astrid': // Steady improvement and positive patterns
      {
        const dayIndex = Math.max(0, 120 - daysAgo); // 120 days of data
        const progressFactor = dayIndex / 120;

        // For recent data, ensure consistent positive patterns
        if (daysAgo < 30) {
          // Recent: mostly positive emotions showing clear improvement
          const positiveEmotions = ['happy', 'content', 'excited', 'calm'];
          const selectedEmotion =
            positiveEmotions[Math.floor(Math.random() * positiveEmotions.length)];
          entry.emotions.push(generateEmotionEntry(student.id, timestamp, selectedEmotion));

          // Add sensory seeking pattern for recent data
          entry.sensoryInputs.push(generateSensoryEntry(student.id, timestamp, true)); // Consistent seeking

          // Add more data points for very recent entries
          if (daysAgo < 7) {
            entry.emotions.push(generateEmotionEntry(student.id, timestamp, 'happy'));
            if (Math.random() > 0.5) {
              entry.sensoryInputs.push(generateSensoryEntry(student.id, timestamp, true));
            }
          }
        } else {
          // Older data: original progression pattern
          const emotionTypes =
            progressFactor > 0.7
              ? ['happy', 'content', 'excited']
              : progressFactor > 0.4
                ? ['calm', 'content', 'anxious']
                : ['anxious', 'frustrated', 'frustrated'];

          const selectedEmotion = emotionTypes[Math.floor(Math.random() * emotionTypes.length)];
          entry.emotions.push(generateEmotionEntry(student.id, timestamp, selectedEmotion));

          // Sensory seeking increases with confidence
          const seekingProbability = 0.3 + progressFactor * 0.4;
          entry.sensoryInputs.push(
            generateSensoryEntry(student.id, timestamp, Math.random() < seekingProbability),
          );
        }

        // Occasionally add multiple entries for comprehensive tracking
        if (Math.random() > 0.6) {
          entry.emotions.push(generateEmotionEntry(student.id, timestamp, 'content'));
        }
      }
      break;
  }

  // Add notes based on the generated data
  if (entry.emotions.length > 1 || entry.sensoryInputs.length > 1) {
    entry.notes = `Complex session with multiple ${entry.emotions.length > 1 ? 'emotional states' : 'sensory needs'}`;
  }

  return entry;
};

// Generate mock students
export const generateMockStudents = (): Student[] => {
  const createMockGoal = (studentId: string, title: string, description: string): Goal => {
    const progress = Math.floor(Math.random() * 50) + 25;
    return {
      id: generateId('goal'),
      studentId,
      title,
      description,
      category: 'sensory' as const,
      targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      createdDate: new Date(),
      updatedAt: new Date(),
      status: 'active' as const,
      measurableObjective: description,
      currentProgress: progress,
      progress,
      milestones: [],
      interventions: [],
      dataPoints: [],
    };
  };

  const students: Student[] = [
    {
      id: 'mock_emma_001',
      name: 'Emma Larsen',
      grade: '8',
      dateOfBirth: new Date('2011-03-15').toISOString().split('T')[0],
      notes: 'Mild anxiety, responds well to sensory breaks',
      iepGoals: [
        createMockGoal(
          'mock_emma_001',
          'Reduce anxiety episodes',
          'Reduce anxiety episodes through sensory regulation',
        ),
        createMockGoal(
          'mock_emma_001',
          'Improve emotional self-awareness',
          'Improve emotional self-awareness through tracking',
        ),
      ],
      createdAt: new Date('2024-01-15'),
      lastUpdated: new Date(),
      version: 1,
    },
    {
      id: 'mock_lars_002',
      name: 'Lars Andersen',
      grade: '6',
      dateOfBirth: new Date('2013-08-22').toISOString().split('T')[0],
      notes: 'Sensory processing disorder, tactile defensiveness',
      iepGoals: [
        createMockGoal(
          'mock_lars_002',
          'Increase tactile tolerance',
          'Increase tactile tolerance through gradual exposure',
        ),
        createMockGoal(
          'mock_lars_002',
          'Develop sensory self-regulation',
          'Develop sensory self-regulation strategies',
        ),
      ],
      createdAt: new Date('2024-02-01'),
      lastUpdated: new Date(),
      version: 1,
    },
    {
      id: 'mock_astrid_003',
      name: 'Astrid Berg',
      grade: '9',
      dateOfBirth: new Date('2010-11-08').toISOString().split('T')[0],
      notes: 'ADHD, benefits from sensory input for focus',
      iepGoals: [
        createMockGoal(
          'mock_astrid_003',
          'Improve attention span',
          'Improve attention span through sensory strategies',
        ),
        createMockGoal(
          'mock_astrid_003',
          'Develop independent self-regulation',
          'Develop independent self-regulation skills',
        ),
      ],
      createdAt: new Date('2024-01-20'),
      lastUpdated: new Date(),
      version: 1,
    },
  ];

  return students;
};

// Generate tracking data for a student
const generateTrackingDataForStudent = (
  student: Student,
  scenario: 'emma' | 'lars' | 'astrid',
): TrackingEntry[] => {
  const entries: TrackingEntry[] = [];
  const totalDays = Math.floor(Math.random() * 30) + 60; // 60-90 days of data

  // Ensure more recent data for pattern detection
  for (let i = 0; i < totalDays; i++) {
    let entriesPerDay: number;

    // Generate more entries for recent days to ensure pattern detection works
    if (i < 7) {
      // Last 7 days: 2-4 entries per day
      entriesPerDay = Math.floor(Math.random() * 3) + 2;
    } else if (i < 30) {
      // Last 30 days: 1-3 entries per day with high probability
      entriesPerDay = Math.random() > 0.2 ? Math.floor(Math.random() * 3) + 1 : 0;
    } else {
      // Older than 30 days: 0-2 entries per day with lower probability
      entriesPerDay = Math.random() > 0.5 ? Math.floor(Math.random() * 2) + 1 : 0;
    }

    for (let j = 0; j < entriesPerDay; j++) {
      const daysAgo = i + j * 0.3; // Spread entries throughout the day
      entries.push(generateTrackingEntry(student, daysAgo, scenario));
    }
  }

  // Guarantee a baseline of social examples for Emma
  if (scenario === 'emma') {
    try {
      ensureEmmaSocialBaseline(entries, student, 6);
    } catch {
      // fail-soft; baseline is optional
    }
  }

  return entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

// Generate all mock data
export const generateAllMockData = (): {
  students: Student[];
  trackingEntries: TrackingEntry[];
} => {
  const students = generateMockStudents();
  const trackingEntries: TrackingEntry[] = [];

  const scenarios: Array<'emma' | 'lars' | 'astrid'> = ['emma', 'lars', 'astrid'];

  students.forEach((student, index) => {
    const scenario = scenarios[index];
    const studentEntries = generateTrackingDataForStudent(student, scenario);
    trackingEntries.push(...studentEntries);
  });

  return { students, trackingEntries };
};

/**
 * Load a specific scenario's mock data into storage.
 * This is a library-only helper that clears existing mock data and seeds a single
 * student's dataset matching the given scenario. It is safe and non-breaking for
 * consumers that still call loadMockDataToStorage().
 */
export function loadScenarioDataToStorage(scenario: 'emma' | 'lars' | 'astrid'): void {
  try {
    // Remove previously seeded mock data while preserving real data
    clearMockDataFromStorage();

    const students = generateMockStudents();
    const selected = students.find((s) => s.name.toLowerCase().includes(scenario));
    if (!selected) {
      throw new Error(`Student not found for scenario: ${scenario}`);
    }

    // Save the selected student first
    storageService.upsertStudent(convertLegacyStudentToLocal(selected));

    // Generate and persist tracking entries for this scenario
    const entries = generateTrackingDataForStudent(selected, scenario);
    for (const entry of entries) {
      // Validate before saving to prevent corrupt data
      const trackingValidation = validateTrackingEntry(entry);
      if (!trackingValidation.isValid) {
        logger.error('Generated invalid tracking entry for scenario', {
          scenario,
          entry,
          errors: trackingValidation.errors,
        });
        continue; // Skip invalid entries rather than failing entire load
      }
      // Use unified save to ensure cache invalidation and analytics triggers
      try {
        void saveTrackingEntryUnified(entry);
      } catch {
        const session = convertLegacyEntryToSession(entry);
        storageService.saveSession(session);
      }
    }
  } catch (error) {
    logger.error('Failed to load scenario data', error);
    throw new Error('Failed to initialize scenario data');
  }
}

export function loadMockDataToStorage(): void {
  try {
    // Clear only existing mock data first
    clearMockDataFromStorage();

    const { students, trackingEntries } = generateAllMockData();

    // Save students
    students.forEach((student) => {
      const studentValidation = validateStudent(student);
      if (!studentValidation.isValid) {
        logger.warn('Skipping invalid student in mock load', { student });
        return;
      }
      storageService.upsertStudent(convertLegacyStudentToLocal(student));
    });

    // Save tracking entries
    trackingEntries.forEach((entry) => {
      const trackingValidation = validateTrackingEntry(entry);
      if (!trackingValidation.isValid) {
        logger.error('Generated invalid tracking entry during bulk mock load', {
          entry,
          errors: trackingValidation.errors,
        });
        return; // Skip invalid entries
      }
      // Use unified save helper with minimal rules; fall back to direct save if needed
      try {
        void saveTrackingEntryUnified(entry);
      } catch {
        const session = convertLegacyEntryToSession(entry);
        storageService.saveSession(session);
      }
    });
  } catch (error) {
    logger.error('Failed to load mock data:', error);
    throw new Error('Failed to initialize mock data');
  }
}

export function clearMockDataFromStorage(): void {
  try {
    const students = storageService.listStudents();
    students
      .filter((student) => student.id.startsWith('mock_'))
      .forEach((student) => storageService.deleteStudent(student.id));

    const sessions = storageService.listSessions();
    sessions
      .filter(
        (session) => session.id.startsWith('mock_') || session.studentId.startsWith('mock_'),
      )
      .forEach((session) => storageService.deleteSession(session.id));
  } catch (error) {
    logger.error('Failed to clear mock data:', error);
    throw new Error('Failed to clear mock data');
  }
}
