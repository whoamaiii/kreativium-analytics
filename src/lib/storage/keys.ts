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

  /** Advanced filters for analytics view */
  ADVANCED_FILTERS: 'analytics_advanced_filters',

  /** Cache prefix for analytics results */
  CACHE_PREFIX: 'analytics-cache',

  /** Performance cache prefix */
  PERFORMANCE_PREFIX: 'performance-cache',

  /** Cross-tab cache clear signal */
  CACHE_SIGNAL: 'analytics:cache:signal',

  /** Cross-tab student-specific cache clear signal */
  CACHE_SIGNAL_STUDENT: 'analytics:cache:signal:student',
} as const;

/** Student tracking data */
export const TRACKING_KEYS = {
  /** Student records */
  STUDENTS: 'sensoryTracker_students',

  /** Tracking entries (emotions, sensory, behavior) */
  ENTRIES: 'sensoryTracker_entries',

  /** Alert history */
  ALERTS: 'sensoryTracker_alerts',

  /** Pinned alerts for quick access */
  PINNED_ALERTS: 'sensoryTracker_pinnedAlerts',

  /** Current active student ID */
  CURRENT_STUDENT_ID: 'current.studentId',

  /** Active session recovery data prefix (deprecated TrackingContext) */
  ACTIVE_SESSION_PREFIX: 'sensoryTracker_activeSession_',
} as const;

// =============================================================================
// DATA STORAGE & MANAGEMENT
// =============================================================================

/** Core data storage keys for tracking entries, goals, etc. */
export const DATA_STORAGE_KEYS = {
  /** Student goals */
  GOALS: 'sensoryTracker_goals',

  /** Interventions */
  INTERVENTIONS: 'sensoryTracker_interventions',

  /** Correlation data */
  CORRELATIONS: 'sensoryTracker_correlations',

  /** Data version for migrations */
  DATA_VERSION: 'sensoryTracker_dataVersion',

  /** Storage index for quick lookups */
  STORAGE_INDEX: 'sensoryTracker_index',

  /** User preferences */
  PREFERENCES: 'sensoryTracker_preferences',
} as const;

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

/** Session tracking and recovery */
export const SESSION_MANAGEMENT_KEYS = {
  /** Session data prefix (followed by sessionId) */
  SESSION_PREFIX: 'sensoryTracker_session_',

  /** Session history */
  SESSION_HISTORY: 'sensoryTracker_sessionHistory',
} as const;

// =============================================================================
// GAMIFICATION & XP
// =============================================================================

/** Experience points and gamification */
export const GAMIFICATION_KEYS = {
  /** Total XP accumulated (TegnXP) */
  TEGN_XP_TOTAL: 'tegn_xp_total',
} as const;

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

  /** Game telemetry events */
  TELEMETRY: 'emotion.telemetry.v1',

  /** Daily hints state */
  HINTS_DAILY: 'emotion.hints.daily',
} as const;

/** Emotion game visual effects settings */
export const EMOTION_EFFECTS_KEYS = {
  /** Minimum particle count */
  PARTICLES_MIN: 'emotion.effects.particles.min',

  /** Maximum particle count */
  PARTICLES_MAX: 'emotion.effects.particles.max',
} as const;

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

  /** Language preference ('nb' or 'en') */
  LANGUAGE: 'sensoryTracker_language',
} as const;

// =============================================================================
// ADULT/ADMIN
// =============================================================================

/** Adult mode PIN and verification */
export const ADULT_KEYS = {
  /** Adult mode PIN (default: '1234') */
  PIN: 'adult.pin',

  /** PIN verification expiry timestamp */
  PIN_VERIFIED_UNTIL: 'adult.pin.verifiedUntil',
} as const;

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

  /** AI connectivity test cache */
  CONNECTIVITY_CACHE: 'kreativium_ai_conn_cache_v1',

  /** AI metrics and telemetry */
  METRICS: 'kreativium_ai_metrics_v1',
} as const;

// =============================================================================
// DIAGNOSTICS
// =============================================================================

/** Diagnostic and debugging configuration */
export const DIAGNOSTICS_KEYS = {
  /** Diagnostic mode flag */
  MODE: 'diagnostics',
} as const;

// =============================================================================
// SESSION STORAGE KEYS
// =============================================================================

/** Keys stored in sessionStorage (cleared when tab closes) */
export const SESSION_KEYS = {
  /** Explanation chat: show all sources flag */
  EXPLANATION_SHOW_ALL_SOURCES: 'explanationChat.showAllSources',

  /** Explanation chat: sources collapsed flag */
  EXPLANATION_SOURCES_COLLAPSED: 'explanationChat.sourcesCollapsed',
} as const;

// =============================================================================
// PROGRESS & GAMIFICATION
// =============================================================================

/** Progress tracking for various activities */
export const PROGRESS_KEYS = {
  /** Progress store prefix */
  PREFIX: 'progress:',

  /** Achievement data */
  ACHIEVEMENTS: 'achievements',

  /** Daily progress for emotion game (legacy global) */
  DAILY_PROGRESS: 'emotion.dailyProgress',

  /** Progress migration marker prefix */
  MIGRATION_MARKER_PREFIX: 'progress.migratedFor:',
} as const;

// =============================================================================
// REPORTS & EXPORT SETTINGS
// =============================================================================

/** Export and report preferences */
export const EXPORT_KEYS = {
  /** Export preferences for data export dialog */
  PREFERENCES: 'sensory-tracker_export_prefs_v1',
} as const;

// =============================================================================
// VIEWED/INTERACTION STATE
// =============================================================================

/** User interaction state (what has been viewed, dismissed, etc.) */
export const VIEWED_KEYS = {
  /** Viewed alert IDs */
  ALERTS_VIEWED: 'alerts:viewed',

  /** Dismissed hints */
  HINTS_DISMISSED: 'hints:dismissed',
} as const;

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
  ANALYTICS_ADVANCED_FILTERS: ANALYTICS_KEYS.ADVANCED_FILTERS,
  ANALYTICS_CACHE_PREFIX: ANALYTICS_KEYS.CACHE_PREFIX,
  ANALYTICS_PERFORMANCE_PREFIX: ANALYTICS_KEYS.PERFORMANCE_PREFIX,
  ANALYTICS_CACHE_SIGNAL: ANALYTICS_KEYS.CACHE_SIGNAL,
  ANALYTICS_CACHE_SIGNAL_STUDENT: ANALYTICS_KEYS.CACHE_SIGNAL_STUDENT,

  // Tracking
  STUDENTS: TRACKING_KEYS.STUDENTS,
  ENTRIES: TRACKING_KEYS.ENTRIES,
  ALERTS: TRACKING_KEYS.ALERTS,
  PINNED_ALERTS: TRACKING_KEYS.PINNED_ALERTS,
  CURRENT_STUDENT_ID: TRACKING_KEYS.CURRENT_STUDENT_ID,
  ACTIVE_SESSION_PREFIX: TRACKING_KEYS.ACTIVE_SESSION_PREFIX,

  // Data Storage
  GOALS: DATA_STORAGE_KEYS.GOALS,
  INTERVENTIONS: DATA_STORAGE_KEYS.INTERVENTIONS,
  CORRELATIONS: DATA_STORAGE_KEYS.CORRELATIONS,
  DATA_VERSION: DATA_STORAGE_KEYS.DATA_VERSION,
  STORAGE_INDEX: DATA_STORAGE_KEYS.STORAGE_INDEX,
  DATA_PREFERENCES: DATA_STORAGE_KEYS.PREFERENCES,

  // Session Management
  SESSION_PREFIX: SESSION_MANAGEMENT_KEYS.SESSION_PREFIX,
  SESSION_HISTORY: SESSION_MANAGEMENT_KEYS.SESSION_HISTORY,

  // Gamification
  TEGN_XP_TOTAL: GAMIFICATION_KEYS.TEGN_XP_TOTAL,

  // Emotion Game
  EMOTION_WORLD_INDEX: EMOTION_GAME_KEYS.WORLD_INDEX,
  EMOTION_THEME_ID: EMOTION_GAME_KEYS.THEME_ID,
  EMOTION_GAME_MODE: EMOTION_GAME_KEYS.GAME_MODE,
  EMOTION_PRACTICE_MODE: EMOTION_GAME_KEYS.PRACTICE_MODE,
  EMOTION_TUTORIAL_SEEN: EMOTION_GAME_KEYS.TUTORIAL_SEEN,
  EMOTION_STICKERS: EMOTION_GAME_KEYS.STICKERS,
  EMOTION_DETECTOR_TYPE: EMOTION_GAME_KEYS.DETECTOR_TYPE,
  EMOTION_CALIBRATION: EMOTION_GAME_KEYS.CALIBRATION,
  EMOTION_TELEMETRY: EMOTION_GAME_KEYS.TELEMETRY,
  EMOTION_HINTS_DAILY: EMOTION_GAME_KEYS.HINTS_DAILY,

  // Effects
  EMOTION_PARTICLES_MIN: EMOTION_EFFECTS_KEYS.PARTICLES_MIN,
  EMOTION_PARTICLES_MAX: EMOTION_EFFECTS_KEYS.PARTICLES_MAX,

  // Settings
  MOTION_REDUCED: SETTINGS_KEYS.MOTION_REDUCED,
  SOUND_VOLUME: SETTINGS_KEYS.SOUND_VOLUME,
  HINTS_ENABLED: SETTINGS_KEYS.HINTS_ENABLED,
  HIGH_CONTRAST: SETTINGS_KEYS.HIGH_CONTRAST,
  QUIET_REWARDS: SETTINGS_KEYS.QUIET_REWARDS,
  LANGUAGE: SETTINGS_KEYS.LANGUAGE,

  // Adult
  ADULT_PIN: ADULT_KEYS.PIN,
  ADULT_PIN_VERIFIED_UNTIL: ADULT_KEYS.PIN_VERIFIED_UNTIL,

  // API
  OPENROUTER_API_KEY: API_KEYS.OPENROUTER_API_KEY,
  VITE_OPENROUTER_API_KEY: API_KEYS.VITE_OPENROUTER_API_KEY,
  AI_MODEL_NAME: API_KEYS.AI_MODEL_NAME,
  AI_CONNECTIVITY_CACHE: API_KEYS.CONNECTIVITY_CACHE,
  AI_METRICS: API_KEYS.METRICS,

  // Diagnostics
  DIAGNOSTICS_MODE: DIAGNOSTICS_KEYS.MODE,

  // Session (sessionStorage)
  SESSION_EXPLANATION_SHOW_ALL_SOURCES: SESSION_KEYS.EXPLANATION_SHOW_ALL_SOURCES,
  SESSION_EXPLANATION_SOURCES_COLLAPSED: SESSION_KEYS.EXPLANATION_SOURCES_COLLAPSED,

  // Progress
  PROGRESS_PREFIX: PROGRESS_KEYS.PREFIX,
  ACHIEVEMENTS: PROGRESS_KEYS.ACHIEVEMENTS,
  PROGRESS_DAILY: PROGRESS_KEYS.DAILY_PROGRESS,
  PROGRESS_MIGRATION_PREFIX: PROGRESS_KEYS.MIGRATION_MARKER_PREFIX,

  // Export
  EXPORT_PREFERENCES: EXPORT_KEYS.PREFERENCES,

  // Viewed
  ALERTS_VIEWED: VIEWED_KEYS.ALERTS_VIEWED,
  HINTS_DISMISSED: VIEWED_KEYS.HINTS_DISMISSED,
} as const;

/**
 * Type for all valid storage keys
 * Enables TypeScript autocomplete and type checking
 */
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * Helper to check if a string is a valid storage key
 *
 * @example
 * if (isStorageKey(key)) {
 *   // TypeScript knows key is a valid storage key
 * }
 */
export function isStorageKey(key: string): key is StorageKey {
  return Object.values(STORAGE_KEYS).includes(key as StorageKey);
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
    .map(([, value]) => value) as StorageKey[];
}
