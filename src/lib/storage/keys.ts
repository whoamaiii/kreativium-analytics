/**
 * @file Centralized storage keys for localStorage and sessionStorage
 *
 * All storage keys used across the application are defined here for:
 * - Type safety: Prevents typos and ensures consistent naming
 * - Discoverability: See all keys in one place
 * - Maintainability: Change key names in one location
 * - Documentation: Clear descriptions of what each key stores
 *
 * Naming convention:
 * - Use dot notation for hierarchical keys: 'emotion.worldIndex'
 * - Use prefix for related keys: 'sensoryTracker_students', 'sensoryTracker_entries'
 * - Use descriptive names: 'adult.pin.verifiedUntil' not 'apv'
 *
 * @example
 * import { STORAGE_KEYS } from '@/lib/storage/keys'
 * localStorage.getItem(STORAGE_KEYS.CURRENT_STUDENT_ID)
 */

// =============================================================================
// ANALYTICS & TRACKING
// =============================================================================

/** Analytics configuration and cached data */
export const ANALYTICS_KEYS = {
  /** Main analytics configuration */
  CONFIG: 'sensory-compass-analytics-config',

  /** Analytics profiles for different configurations */
  PROFILES: 'sensoryTracker_analyticsProfiles',

  /** Cache prefix for analytics results */
  CACHE_PREFIX: 'analytics-cache',

  /** Performance cache prefix */
  PERFORMANCE_PREFIX: 'performance-cache',
} as const

/** Student tracking data */
export const TRACKING_KEYS = {
  /** Student records */
  STUDENTS: 'sensoryTracker_students',

  /** Tracking entries (emotions, sensory, behavior) */
  ENTRIES: 'sensoryTracker_entries',

  /** Alert history */
  ALERTS: 'sensoryTracker_alerts',

  /** Current active student ID */
  CURRENT_STUDENT_ID: 'current.studentId',
} as const

// =============================================================================
// EMOTION GAME
// =============================================================================

/** Emotion recognition game settings and progress */
export const EMOTION_GAME_KEYS = {
  /** Current world index (0-based) */
  WORLD_INDEX: 'emotion.worldIndex',

  /** Theme ID ('regnbueland' or 'rom') */
  THEME_ID: 'emotion.themeId',

  /** Game mode ('classic', 'challenge', etc.) */
  GAME_MODE: 'emotion.gameMode',

  /** Practice mode setting */
  PRACTICE_MODE: 'emotion-game:practice-mode',

  /** Tutorial seen flag */
  TUTORIAL_SEEN: 'emotion.tutorialSeen',

  /** Stickers collection data */
  STICKERS: 'emotion.stickers.v1',

  /** Emotion detector type */
  DETECTOR_TYPE: 'emotion.detectorType',

  /** Calibration data */
  CALIBRATION: 'emotion.calibration.v1',
} as const

/** Emotion game visual effects settings */
export const EMOTION_EFFECTS_KEYS = {
  /** Minimum particle count */
  PARTICLES_MIN: 'emotion.effects.particles.min',

  /** Maximum particle count */
  PARTICLES_MAX: 'emotion.effects.particles.max',
} as const

// =============================================================================
// ACCESSIBILITY & SETTINGS
// =============================================================================

/** User preference settings */
export const SETTINGS_KEYS = {
  /** Motion reduced flag (0 or 1) */
  MOTION_REDUCED: 'emotion.motionReduced',

  /** Sound volume (0.0 to 1.0) */
  SOUND_VOLUME: 'emotion.soundVolume',

  /** Hints enabled flag (0 or 1) */
  HINTS_ENABLED: 'emotion.hintsEnabled',

  /** High contrast mode flag (0 or 1) */
  HIGH_CONTRAST: 'emotion.highContrast',

  /** Quiet rewards mode (fewer sound effects) */
  QUIET_REWARDS: 'emotion.quietRewards',
} as const

// =============================================================================
// ADULT/ADMIN
// =============================================================================

/** Adult mode PIN and verification */
export const ADULT_KEYS = {
  /** Adult mode PIN (default: '1234') */
  PIN: 'adult.pin',

  /** PIN verification expiry timestamp */
  PIN_VERIFIED_UNTIL: 'adult.pin.verifiedUntil',
} as const

// =============================================================================
// AI & API CONFIGURATION
// =============================================================================

/** API keys and model configuration */
export const API_KEYS = {
  /** OpenRouter API key */
  OPENROUTER_API_KEY: 'OPENROUTER_API_KEY',

  /** Alternative OpenRouter API key */
  VITE_OPENROUTER_API_KEY: 'VITE_OPENROUTER_API_KEY',

  /** AI model name */
  AI_MODEL_NAME: 'VITE_AI_MODEL_NAME',
} as const

// =============================================================================
// SESSION STORAGE KEYS
// =============================================================================

/** Keys stored in sessionStorage (cleared when tab closes) */
export const SESSION_KEYS = {
  /** Explanation chat: show all sources flag */
  EXPLANATION_SHOW_ALL_SOURCES: 'explanationChat.showAllSources',

  /** Explanation chat: sources collapsed flag */
  EXPLANATION_SOURCES_COLLAPSED: 'explanationChat.sourcesCollapsed',
} as const

// =============================================================================
// PROGRESS & GAMIFICATION
// =============================================================================

/** Progress tracking for various activities */
export const PROGRESS_KEYS = {
  /** Progress store prefix */
  PREFIX: 'progress:',

  /** Achievement data */
  ACHIEVEMENTS: 'achievements',
} as const

// =============================================================================
// VIEWED/INTERACTION STATE
// =============================================================================

/** User interaction state (what has been viewed, dismissed, etc.) */
export const VIEWED_KEYS = {
  /** Viewed alert IDs */
  ALERTS_VIEWED: 'alerts:viewed',

  /** Dismissed hints */
  HINTS_DISMISSED: 'hints:dismissed',
} as const

// =============================================================================
// FLAT EXPORT FOR CONVENIENCE
// =============================================================================

/**
 * All storage keys in a flat structure for easy import
 *
 * @example
 * import { STORAGE_KEYS } from '@/lib/storage/keys'
 * const theme = localStorage.getItem(STORAGE_KEYS.THEME_ID)
 */
export const STORAGE_KEYS = {
  // Analytics
  ANALYTICS_CONFIG: ANALYTICS_KEYS.CONFIG,
  ANALYTICS_PROFILES: ANALYTICS_KEYS.PROFILES,
  ANALYTICS_CACHE_PREFIX: ANALYTICS_KEYS.CACHE_PREFIX,
  ANALYTICS_PERFORMANCE_PREFIX: ANALYTICS_KEYS.PERFORMANCE_PREFIX,

  // Tracking
  STUDENTS: TRACKING_KEYS.STUDENTS,
  ENTRIES: TRACKING_KEYS.ENTRIES,
  ALERTS: TRACKING_KEYS.ALERTS,
  CURRENT_STUDENT_ID: TRACKING_KEYS.CURRENT_STUDENT_ID,

  // Emotion Game
  EMOTION_WORLD_INDEX: EMOTION_GAME_KEYS.WORLD_INDEX,
  EMOTION_THEME_ID: EMOTION_GAME_KEYS.THEME_ID,
  EMOTION_GAME_MODE: EMOTION_GAME_KEYS.GAME_MODE,
  EMOTION_PRACTICE_MODE: EMOTION_GAME_KEYS.PRACTICE_MODE,
  EMOTION_TUTORIAL_SEEN: EMOTION_GAME_KEYS.TUTORIAL_SEEN,
  EMOTION_STICKERS: EMOTION_GAME_KEYS.STICKERS,
  EMOTION_DETECTOR_TYPE: EMOTION_GAME_KEYS.DETECTOR_TYPE,
  EMOTION_CALIBRATION: EMOTION_GAME_KEYS.CALIBRATION,

  // Effects
  EMOTION_PARTICLES_MIN: EMOTION_EFFECTS_KEYS.PARTICLES_MIN,
  EMOTION_PARTICLES_MAX: EMOTION_EFFECTS_KEYS.PARTICLES_MAX,

  // Settings
  MOTION_REDUCED: SETTINGS_KEYS.MOTION_REDUCED,
  SOUND_VOLUME: SETTINGS_KEYS.SOUND_VOLUME,
  HINTS_ENABLED: SETTINGS_KEYS.HINTS_ENABLED,
  HIGH_CONTRAST: SETTINGS_KEYS.HIGH_CONTRAST,
  QUIET_REWARDS: SETTINGS_KEYS.QUIET_REWARDS,

  // Adult
  ADULT_PIN: ADULT_KEYS.PIN,
  ADULT_PIN_VERIFIED_UNTIL: ADULT_KEYS.PIN_VERIFIED_UNTIL,

  // API
  OPENROUTER_API_KEY: API_KEYS.OPENROUTER_API_KEY,
  VITE_OPENROUTER_API_KEY: API_KEYS.VITE_OPENROUTER_API_KEY,
  AI_MODEL_NAME: API_KEYS.AI_MODEL_NAME,

  // Session (sessionStorage)
  SESSION_EXPLANATION_SHOW_ALL_SOURCES: SESSION_KEYS.EXPLANATION_SHOW_ALL_SOURCES,
  SESSION_EXPLANATION_SOURCES_COLLAPSED: SESSION_KEYS.EXPLANATION_SOURCES_COLLAPSED,

  // Progress
  PROGRESS_PREFIX: PROGRESS_KEYS.PREFIX,
  ACHIEVEMENTS: PROGRESS_KEYS.ACHIEVEMENTS,

  // Viewed
  ALERTS_VIEWED: VIEWED_KEYS.ALERTS_VIEWED,
  HINTS_DISMISSED: VIEWED_KEYS.HINTS_DISMISSED,
} as const

/**
 * Type for all valid storage keys
 * Enables TypeScript autocomplete and type checking
 */
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

/**
 * Helper to check if a string is a valid storage key
 *
 * @example
 * if (isStorageKey(key)) {
 *   // TypeScript knows key is a valid storage key
 * }
 */
export function isStorageKey(key: string): key is StorageKey {
  return Object.values(STORAGE_KEYS).includes(key as StorageKey)
}

/**
 * Get all storage keys matching a category
 *
 * @example
 * const emotionKeys = getKeysByCategory('EMOTION')
 * // Returns all keys starting with 'EMOTION_'
 */
export function getKeysByCategory(category: string): StorageKey[] {
  return Object.entries(STORAGE_KEYS)
    .filter(([key]) => key.startsWith(category))
    .map(([, value]) => value) as StorageKey[]
}
