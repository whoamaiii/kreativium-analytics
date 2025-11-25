/**
 * @file Adapter module exports.
 *
 * These adapters bridge between legacy and new data formats.
 */

// Legacy analytics adapter
export { legacyAnalyticsAdapter } from './legacyAnalyticsAdapter';
export type { LegacyAnalyticsAdapter } from './legacyAnalyticsAdapter';

// Type converters
export {
  convertLegacyStudentToLocal,
  convertLocalStudentToLegacy,
  convertLegacyGoalToLocal,
  convertLocalGoalToLegacy,
  convertLegacyAlertToLocal,
  convertLocalAlertToLegacy,
} from './legacyConverters';

// Session/Entry transforms
export {
  convertSessionToLegacyEntry,
  convertLegacyEntryToSession,
} from './legacyTransforms';

// Local entity pipeline (sync to legacy storage)
export {
  syncLocalStudentsToLegacy,
  syncLocalGoalsToLegacy,
  syncLocalAlertsToLegacy,
} from './localEntityPipeline';

// Local analytics data storage
export { localAnalyticsDataStorage } from './localAnalyticsDataStorage';

// Session cache bridge
export { ensureSessionAnalyticsBridge } from './sessionCacheBridge';

