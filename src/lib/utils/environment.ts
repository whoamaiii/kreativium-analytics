/**
 * Environment condition utilities
 *
 * This module provides type-safe functions for categorizing environment
 * conditions from numeric sensor readings into meaningful categorical values.
 *
 * Used to replace deeply nested ternary operators in pattern analysis.
 */

// ============================================================================
// Types
// ============================================================================

export type NoiseLevel = 'loud' | 'moderate' | 'quiet';
export type LightLevel = 'bright' | 'moderate' | 'dim';
export type TemperatureLevel = 'hot' | 'comfortable' | 'cold';

// ============================================================================
// Thresholds
// ============================================================================

/**
 * Noise level categorization thresholds (0-100 scale)
 */
export const NOISE_THRESHOLDS = {
  /** Noise above 70 is considered loud */
  LOUD: 70,
  /** Noise below 40 is considered quiet */
  QUIET: 40,
} as const;

/**
 * Light level categorization thresholds (0-100 scale)
 */
export const LIGHT_THRESHOLDS = {
  /** Light above 70 is considered bright */
  BRIGHT: 70,
  /** Light below 40 is considered dim */
  DIM: 40,
} as const;

/**
 * Temperature categorization thresholds (Celsius)
 */
export const TEMPERATURE_THRESHOLDS = {
  /** Temperature above 24°C is considered hot */
  HOT: 24,
  /** Temperature below 18°C is considered cold */
  COLD: 18,
} as const;

// ============================================================================
// Categorization Functions
// ============================================================================

/**
 * Maps a numeric noise level to a categorical value
 *
 * @param noiseLevel - Numeric noise level (0-100 scale)
 * @returns Categorical noise level: 'loud' | 'moderate' | 'quiet'
 *
 * @example
 * ```typescript
 * categorizeNoiseLevel(80)       // 'loud'
 * categorizeNoiseLevel(50)       // 'moderate'
 * categorizeNoiseLevel(30)       // 'quiet'
 * categorizeNoiseLevel(undefined) // 'moderate' (default)
 * ```
 */
export function categorizeNoiseLevel(
  noiseLevel: number | undefined | null
): NoiseLevel {
  if (noiseLevel == null) return 'moderate';
  if (noiseLevel > NOISE_THRESHOLDS.LOUD) return 'loud';
  if (noiseLevel < NOISE_THRESHOLDS.QUIET) return 'quiet';
  return 'moderate';
}

/**
 * Maps a numeric light level to a categorical value
 *
 * @param lightLevel - Numeric light level (0-100 scale)
 * @returns Categorical light level: 'bright' | 'moderate' | 'dim'
 *
 * @example
 * ```typescript
 * categorizeLightLevel(85)       // 'bright'
 * categorizeLightLevel(55)       // 'moderate'
 * categorizeLightLevel(25)       // 'dim'
 * categorizeLightLevel(null)     // 'moderate' (default)
 * ```
 */
export function categorizeLightLevel(
  lightLevel: number | undefined | null
): LightLevel {
  if (lightLevel == null) return 'moderate';
  if (lightLevel > LIGHT_THRESHOLDS.BRIGHT) return 'bright';
  if (lightLevel < LIGHT_THRESHOLDS.DIM) return 'dim';
  return 'moderate';
}

/**
 * Maps a numeric temperature to a categorical value
 *
 * @param temperature - Temperature in Celsius
 * @returns Categorical temperature level: 'hot' | 'comfortable' | 'cold'
 *
 * @example
 * ```typescript
 * categorizeTemperature(26)       // 'hot'
 * categorizeTemperature(20)       // 'comfortable'
 * categorizeTemperature(16)       // 'cold'
 * categorizeTemperature(undefined) // 'comfortable' (default)
 * ```
 */
export function categorizeTemperature(
  temperature: number | undefined | null
): TemperatureLevel {
  if (temperature == null) return 'comfortable';
  if (temperature > TEMPERATURE_THRESHOLDS.HOT) return 'hot';
  if (temperature < TEMPERATURE_THRESHOLDS.COLD) return 'cold';
  return 'comfortable';
}

// ============================================================================
// Composite Functions
// ============================================================================

/**
 * Complete environment condition categorization
 */
export interface EnvironmentConditions {
  /** Noise level category */
  noise: NoiseLevel;
  /** Light level category */
  lighting: LightLevel;
  /** Temperature level category */
  temperature: TemperatureLevel;
}

/**
 * Room conditions from tracking data
 */
export interface RoomConditions {
  noiseLevel?: number;
  lightLevel?: number;
  temperature?: number;
}

/**
 * Environmental data structure from tracking entries
 */
export interface EnvironmentalData {
  roomConditions?: RoomConditions;
}

/**
 * Tracking entry with environmental data
 */
export interface TrackingEntryWithEnvironment {
  environmentalData?: EnvironmentalData;
}

/**
 * Extracts and categorizes environment conditions from the most recent tracking entry
 *
 * @param trackingEntries - Array of tracking entries
 * @returns Categorized environment conditions
 *
 * @example
 * ```typescript
 * const conditions = getLatestEnvironmentConditions(trackingData);
 * // { noise: 'moderate', lighting: 'bright', temperature: 'comfortable' }
 * ```
 *
 * Replaces this complex pattern:
 * ```typescript
 * // BEFORE (from src/lib/enhancedPatternAnalysis.ts:227-235)
 * noise: (trackingEntries[trackingEntries.length - 1].environmentalData?.roomConditions?.noiseLevel &&
 *         trackingEntries[trackingEntries.length - 1].environmentalData.roomConditions.noiseLevel > 70 ? 'loud' :
 *         trackingEntries[trackingEntries.length - 1].environmentalData?.roomConditions?.noiseLevel &&
 *         trackingEntries[trackingEntries.length - 1].environmentalData.roomConditions.noiseLevel < 40 ? 'quiet' : 'moderate')
 * ```
 */
export function getLatestEnvironmentConditions(
  trackingEntries: TrackingEntryWithEnvironment[]
): EnvironmentConditions {
  // Handle empty array
  if (trackingEntries.length === 0) {
    return {
      noise: 'moderate',
      lighting: 'moderate',
      temperature: 'comfortable',
    };
  }

  // Get latest entry and extract room conditions
  const latestEntry = trackingEntries[trackingEntries.length - 1];
  const roomConditions = latestEntry?.environmentalData?.roomConditions;

  // Categorize each condition
  return {
    noise: categorizeNoiseLevel(roomConditions?.noiseLevel),
    lighting: categorizeLightLevel(roomConditions?.lightLevel),
    temperature: categorizeTemperature(roomConditions?.temperature),
  };
}

/**
 * Gets environment conditions from a specific tracking entry
 *
 * @param entry - Single tracking entry
 * @returns Categorized environment conditions
 *
 * @example
 * ```typescript
 * const entry = trackingData[0];
 * const conditions = getEnvironmentConditions(entry);
 * ```
 */
export function getEnvironmentConditions(
  entry: TrackingEntryWithEnvironment
): EnvironmentConditions {
  const roomConditions = entry?.environmentalData?.roomConditions;

  return {
    noise: categorizeNoiseLevel(roomConditions?.noiseLevel),
    lighting: categorizeLightLevel(roomConditions?.lightLevel),
    temperature: categorizeTemperature(roomConditions?.temperature),
  };
}
