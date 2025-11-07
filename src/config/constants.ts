/**
 * Application-wide constants
 *
 * Centralizes magic numbers and hardcoded values for better maintainability.
 * All values are grouped by domain and exported as const objects.
 */

// =============================================================================
// TIME CONSTANTS
// =============================================================================

export const TIME = {
  /** Milliseconds in one second */
  SECOND_MS: 1000,
  /** Milliseconds in one minute */
  MINUTE_MS: 60_000,
  /** Milliseconds in one hour */
  HOUR_MS: 3_600_000,
  /** Milliseconds in one day */
  DAY_MS: 86_400_000,
  /** Hours in a day */
  HOURS_PER_DAY: 24,
  /** Minutes in an hour */
  MINUTES_PER_HOUR: 60,
  /** Seconds in a minute */
  SECONDS_PER_MINUTE: 60,
} as const;

// =============================================================================
// ENVIRONMENTAL DATA GENERATION
// =============================================================================

export const TEMPERATURE = {
  /** Indoor minimum temperature (°C) */
  INDOOR_MIN: 18,
  /** Indoor maximum temperature (°C) */
  INDOOR_MAX: 28,
  /** Indoor temperature range (°C) */
  INDOOR_RANGE: 10,

  /** Outdoor minimum temperature (°C) */
  OUTDOOR_MIN: 10,
  /** Outdoor maximum temperature (°C) */
  OUTDOOR_MAX: 25,
  /** Outdoor temperature range (°C) */
  OUTDOOR_RANGE: 15,

  /** Realtime indoor base temperature (°C) */
  REALTIME_INDOOR_BASE: 20,
  /** Realtime indoor temperature variance (°C) */
  REALTIME_INDOOR_VARIANCE: 5,

  /** Realtime outdoor base temperature (°C) */
  REALTIME_OUTDOOR_BASE: 15,
  /** Realtime outdoor temperature variance (°C) */
  REALTIME_OUTDOOR_VARIANCE: 15,
} as const;

export const HUMIDITY = {
  /** Minimum humidity percentage */
  MIN: 40,
  /** Maximum humidity percentage */
  MAX: 60,
  /** Humidity range */
  RANGE: 20,
} as const;

export const ATMOSPHERIC_PRESSURE = {
  /** Minimum atmospheric pressure (hPa) */
  MIN: 1000,
  /** Maximum atmospheric pressure (hPa) */
  MAX: 1050,
  /** Pressure range (hPa) */
  RANGE: 50,
} as const;

export const NOISE_LEVEL = {
  /** Minimum noise level (scale 1-5) */
  MIN_SCALE_5: 1,
  /** Maximum noise level (scale 1-5) */
  MAX_SCALE_5: 5,
  /** Range for 1-5 scale */
  RANGE_SCALE_5: 5,

  /** Minimum noise level (scale 1-10) */
  MIN_SCALE_10: 1,
  /** Maximum noise level (scale 1-10) */
  MAX_SCALE_10: 10,
  /** Range for 1-10 scale */
  RANGE_SCALE_10: 10,

  /** High noise level for cafeteria */
  CAFETERIA_HIGH: 4,
  /** Noise level when specified as noisy */
  NOISY: 4,
  /** Noise level when specified as quiet */
  QUIET: 2,
} as const;

// =============================================================================
// DATA GENERATION - TIME RANGES
// =============================================================================

export const DATA_GENERATION = {
  /** Minimum days for generated data */
  MIN_DAYS: 60,
  /** Maximum days for generated data */
  MAX_DAYS: 90,
  /** Range of days */
  DAYS_RANGE: 30,

  /** Interval between social baseline entries (hours) */
  SOCIAL_BASELINE_INTERVAL_HOURS: 3,

  /** Minimum social examples for Emma */
  EMMA_SOCIAL_BASELINE_MIN: 6,
} as const;

// =============================================================================
// EMOTION INTENSITY RANGES
// =============================================================================

export const EMOTION_INTENSITY = {
  /** Minimum intensity for any emotion */
  MIN: 1,
  /** Maximum intensity for any emotion */
  MAX: 5,

  /** High intensity threshold */
  HIGH_THRESHOLD: 4,

  /** Intensity ranges by emotion type */
  RANGES: {
    happy: { min: 3, max: 5 } as const,
    sad: { min: 2, max: 4 } as const,
    anxious: { min: 3, max: 5 } as const,
    calm: { min: 2, max: 4 } as const,
    excited: { min: 4, max: 5 } as const,
    frustrated: { min: 3, max: 5 } as const,
    content: { min: 2, max: 4 } as const,
    overwhelmed: { min: 4, max: 5 } as const,
  } as const,
} as const;

// =============================================================================
// PROBABILITY THRESHOLDS
// =============================================================================

export const PROBABILITY = {
  /** High probability threshold (80%) */
  HIGH: 0.8,
  /** Medium-high probability threshold (70%) */
  MEDIUM_HIGH: 0.7,
  /** Medium probability threshold (50%) */
  MEDIUM: 0.5,
  /** Medium-low probability threshold (30%) */
  MEDIUM_LOW: 0.3,
  /** Low probability threshold (20%) */
  LOW: 0.2,

  /** Social scenario probabilities */
  SOCIAL_SCENARIOS: {
    /** Probability of group work scenario */
    GROUP_WORK: 0.30,
    /** Probability of recess scenario */
    RECESS: 0.55,
    /** Probability of cafeteria scenario */
    CAFETERIA: 0.75,
  } as const,
} as const;

// =============================================================================
// ANIMATION CONSTANTS
// =============================================================================

export const CONFETTI = {
  /** Default confetti duration (ms) */
  DURATION_MS: 900,
  /** Default number of particles */
  PARTICLES: 110,
  /** Default spread angle (degrees) */
  SPREAD_DEG: 320,
  /** Full circle spread (degrees) */
  FULL_CIRCLE_DEG: 360,
  /** Default speed multiplier */
  SPEED: 1,
  /** Default origin X (normalized 0-1) */
  ORIGIN_X: 0.5,
  /** Default origin Y (normalized 0-1) */
  ORIGIN_Y: 0.6,

  /** Physics constants */
  PHYSICS: {
    /** Base velocity minimum */
    VELOCITY_MIN: 2.2,
    /** Base velocity range */
    VELOCITY_RANGE: 5.2,
    /** Particle radius minimum */
    RADIUS_MIN: 1.6,
    /** Particle radius range */
    RADIUS_RANGE: 2.6,
    /** Gravity base */
    GRAVITY_BASE: 0.22,
    /** Gravity variance */
    GRAVITY_VARIANCE: 0.14,
    /** Air resistance factor */
    AIR_RESISTANCE: 0.992,
    /** Rotation speed per frame */
    ROTATION_SPEED: 0.08,
  } as const,

  /** Default color palette */
  COLORS: ['#34d399', '#60a5fa', '#f472b6', '#f59e0b', '#a78bfa'] as const,
} as const;

// =============================================================================
// ANGLE CONVERSIONS
// =============================================================================

export const ANGLE = {
  /** Degrees to radians multiplier */
  DEG_TO_RAD: Math.PI / 180,
  /** Radians to degrees multiplier */
  RAD_TO_DEG: 180 / Math.PI,
  /** Full circle in radians */
  FULL_CIRCLE_RAD: Math.PI * 2,
} as const;

// =============================================================================
// NORMALIZATION CONSTANTS
// =============================================================================

export const NORMALIZATION = {
  /** Minimum normalized value */
  MIN: 0,
  /** Maximum normalized value */
  MAX: 1,
} as const;

// =============================================================================
// DEVICE PIXEL RATIO
// =============================================================================

export const DPR = {
  /** Minimum device pixel ratio */
  MIN: 1,
  /** Maximum practical device pixel ratio for calculations */
  MAX: 3,
} as const;

// =============================================================================
// LIGHTING CONDITIONS
// =============================================================================

export const LIGHTING = {
  /** Available lighting conditions */
  CONDITIONS: ['bright', 'moderate', 'dim'] as const,
  /** Number of lighting condition options */
  COUNT: 3,
} as const;

// =============================================================================
// WEATHER CONDITIONS
// =============================================================================

export const WEATHER = {
  /** Available weather conditions */
  CONDITIONS: ['sunny', 'cloudy', 'rainy', 'stormy', 'snowy'] as const,
  /** Number of weather condition options */
  COUNT_FULL: 5,

  /** Simple weather conditions (for realtime data) */
  CONDITIONS_SIMPLE: ['sunny', 'cloudy', 'rainy'] as const,
  /** Number of simple weather condition options */
  COUNT_SIMPLE: 3,
} as const;

// =============================================================================
// EMOTION TYPES
// =============================================================================

export const EMOTIONS = {
  /** Available emotion types */
  TYPES: ['happy', 'sad', 'anxious', 'calm', 'excited', 'frustrated', 'content'] as const,
  /** Number of emotion types */
  COUNT: 7,

  /** Social anxiety related emotions */
  SOCIAL_ANXIETY: ['anxious', 'frustrated', 'overwhelmed'] as const,
} as const;

// =============================================================================
// CLASSROOM & STUDENT CONSTANTS
// =============================================================================

export const CLASSROOM = {
  /** Minimum student count */
  MIN_STUDENTS: 10,
  /** Maximum student count */
  MAX_STUDENTS: 30,
  /** Student count range */
  STUDENT_RANGE: 20,

  /** Realtime minimum student count */
  REALTIME_MIN_STUDENTS: 15,
  /** Realtime maximum student count */
  REALTIME_MAX_STUDENTS: 25,
  /** Realtime student count range */
  REALTIME_STUDENT_RANGE: 10,

  /** Available activities */
  ACTIVITIES: ['instruction', 'transition', 'free-time', 'testing', 'group-work'] as const,
  /** Number of activity types */
  ACTIVITIES_COUNT: 5,

  /** Simple activities (for realtime) */
  ACTIVITIES_SIMPLE: ['instruction', 'transition', 'free-time'] as const,
  /** Number of simple activity types */
  ACTIVITIES_SIMPLE_COUNT: 3,

  /** Available times of day */
  TIMES_OF_DAY: ['morning', 'afternoon', 'evening'] as const,
  /** Number of time periods */
  TIMES_OF_DAY_COUNT: 3,
} as const;

export const LOCATION = {
  /** Available locations */
  TYPES: ['classroom', 'library', 'cafeteria', 'playground', 'hallway'] as const,
  /** Number of location types */
  COUNT: 5,
} as const;

export const SOCIAL_CONTEXT = {
  /** Available social contexts */
  TYPES: ['individual work', 'group activity', 'instruction', 'transition'] as const,
  /** Number of social context types */
  COUNT: 4,
} as const;

// =============================================================================
// EXPORT FOR TYPE-SAFE ACCESS
// =============================================================================

/** Type for temperature constant keys */
export type TemperatureKey = keyof typeof TEMPERATURE;

/** Type for humidity constant keys */
export type HumidityKey = keyof typeof HUMIDITY;

/** Type for time constant keys */
export type TimeKey = keyof typeof TIME;

/** Type for emotion types */
export type EmotionType = (typeof EMOTIONS.TYPES)[number];

/** Type for weather conditions */
export type WeatherCondition = (typeof WEATHER.CONDITIONS)[number];

/** Type for lighting conditions */
export type LightingCondition = (typeof LIGHTING.CONDITIONS)[number];

/** Type for classroom activities */
export type ClassroomActivity = (typeof CLASSROOM.ACTIVITIES)[number];

/** Type for simple classroom activities */
export type ClassroomActivitySimple = (typeof CLASSROOM.ACTIVITIES_SIMPLE)[number];

/** Type for time of day */
export type TimeOfDay = (typeof CLASSROOM.TIMES_OF_DAY)[number];

/** Type for location */
export type LocationType = (typeof LOCATION.TYPES)[number];

/** Type for social context */
export type SocialContextType = (typeof SOCIAL_CONTEXT.TYPES)[number];
