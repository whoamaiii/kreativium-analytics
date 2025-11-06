import { STORAGE_KEYS } from '@/lib/analyticsConfig';
import { logger } from '@/lib/logger';

export interface StudentAnalyticsProfile {
  studentId: string;
  isInitialized: boolean;
  lastAnalyzedAt: Date | null;
  analyticsConfig: {
    patternAnalysisEnabled: boolean;
    correlationAnalysisEnabled: boolean;
    predictiveInsightsEnabled: boolean;
    anomalyDetectionEnabled: boolean;
    alertSystemEnabled: boolean;
  };
  minimumDataRequirements: {
    emotionEntries: number;
    sensoryEntries: number;
    trackingEntries: number;
  };
  analyticsHealthScore: number;
}

// Raw profile as stored in localStorage (dates are strings)
interface StoredProfile {
  studentId: string;
  isInitialized: boolean;
  lastAnalyzedAt: string | null;
  analyticsConfig: StudentAnalyticsProfile['analyticsConfig'];
  minimumDataRequirements: StudentAnalyticsProfile['minimumDataRequirements'];
  analyticsHealthScore: number;
}

let profiles: Map<string, StudentAnalyticsProfile> | null = null;

function loadProfilesFromStorage(): Map<string, StudentAnalyticsProfile> {
  const map = new Map<string, StudentAnalyticsProfile>();
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.analyticsProfiles) : null;
    if (!raw) return map;
    const obj = JSON.parse(raw) as Record<string, unknown>;
    for (const [studentId, profileData] of Object.entries(obj)) {
      // Type guard to ensure profile has required structure
      if (profileData && typeof profileData === 'object' && 'studentId' in profileData) {
        const profile = profileData as StoredProfile;
        if (typeof profile.studentId === 'string') {
          map.set(studentId, {
            ...profile,
            lastAnalyzedAt: profile.lastAnalyzedAt ? new Date(profile.lastAnalyzedAt) : null,
          });
        }
      }
    }
  } catch (error) {
    logger.error('[analyticsProfiles] Failed to load profiles', { error });
  }
  return map;
}

function ensureProfilesLoaded() {
  if (!profiles) profiles = loadProfilesFromStorage();
}

export function getProfileMap(): Map<string, StudentAnalyticsProfile> {
  ensureProfilesLoaded();
  return profiles as Map<string, StudentAnalyticsProfile>;
}

export function saveProfiles(): void {
  ensureProfilesLoaded();
  try {
    const data = Object.fromEntries((profiles as Map<string, StudentAnalyticsProfile>).entries());
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.analyticsProfiles, JSON.stringify(data));
    }
  } catch (error) {
    logger.error('[analyticsProfiles] Failed to save profiles', { error });
  }
}

export function initializeStudentProfile(studentId: string): void {
  ensureProfilesLoaded();
  if (!studentId || typeof studentId !== 'string') return;
  if ((profiles as Map<string, StudentAnalyticsProfile>).has(studentId)) return;
  const profile: StudentAnalyticsProfile = {
    studentId,
    isInitialized: true,
    lastAnalyzedAt: null,
    analyticsConfig: {
      patternAnalysisEnabled: true,
      correlationAnalysisEnabled: true,
      predictiveInsightsEnabled: true,
      anomalyDetectionEnabled: true,
      alertSystemEnabled: true,
    },
    minimumDataRequirements: {
      emotionEntries: 1,
      sensoryEntries: 1,
      trackingEntries: 1,
    },
    analyticsHealthScore: 0,
  };
  (profiles as Map<string, StudentAnalyticsProfile>).set(studentId, profile);
  saveProfiles();
}

/**
 * Clear all analytics profiles from memory and localStorage.
 * Returns the number of profiles cleared.
 */
export function clearAllProfiles(): number {
  ensureProfilesLoaded();
  const count = (profiles as Map<string, StudentAnalyticsProfile>).size;
  try {
    (profiles as Map<string, StudentAnalyticsProfile>).clear();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.analyticsProfiles);
    }
    logger.info('[analyticsProfiles] Cleared all profiles', { count });
  } catch (error) {
    logger.error('[analyticsProfiles] Failed to clear all profiles', { error });
  }
  return count;
}

/**
 * Clear a specific student profile from cache and persist the change.
 */
export function clearStudentProfile(studentId: string): boolean {
  ensureProfilesLoaded();
  if (!studentId) return false;
  const existed = (profiles as Map<string, StudentAnalyticsProfile>).delete(studentId);
  if (existed) {
    saveProfiles();
    logger.info('[analyticsProfiles] Cleared student profile', { studentId });
  }
  return existed;
}

/**
 * Reset profiles to a default empty state and persist.
 */
export function resetProfiles(): void {
  ensureProfilesLoaded();
  (profiles as Map<string, StudentAnalyticsProfile>).clear();
  saveProfiles();
  logger.info('[analyticsProfiles] Reset profiles to default state');
}

/**
 * Return simple stats about the profile cache.
 */
export function getProfileCacheStats(): { count: number } {
  ensureProfilesLoaded();
  return { count: (profiles as Map<string, StudentAnalyticsProfile>).size };
}

