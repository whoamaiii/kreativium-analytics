/**
 * Lightweight version of analyticsManager for initial page loads
 * Full functionality is loaded on-demand
 */

import { logger } from '@/lib/logger';
// Legacy storage no longer used directly in the lite manager
import { initializeStudentProfile } from '@/lib/analyticsProfiles';

// Lazy-loaded full manager
let fullManager: any = null;

/**
 * Lightweight analytics manager that lazy-loads the full implementation
 */
export const analyticsManagerLite = {
  /**
   * Initialize student analytics (lightweight version)
   */
  initializeStudentAnalytics(studentId: string): void {
    try {
      // Perform minimal initialization
      initializeStudentProfile(studentId);
      logger.debug('[analyticsManagerLite] Student initialized', { studentId });
    } catch (error) {
      logger.error('[analyticsManagerLite] Failed to initialize student', { error, studentId });
    }
  },

  /**
   * Get the full analytics manager (lazy-loaded)
   */
  async getFullManager() {
    if (!fullManager) {
      logger.debug('[analyticsManagerLite] Loading full analytics manager...');
      const { analyticsManager } = await import('@/lib/analyticsManager');
      fullManager = analyticsManager;
    }
    return fullManager;
  },

  /**
   * Trigger full analytics for a student (deferred loading)
   */
  async triggerAnalyticsForStudent(studentId: string) {
    const manager = await this.getFullManager();
    return manager.triggerAnalyticsForStudent(studentId);
  },

  /**
   * Get student analytics (deferred loading)
   */
  async getStudentAnalytics(student: any) {
    const manager = await this.getFullManager();
    return manager.getStudentAnalytics(student);
  },

  /**
   * Clear cache for a student (deferred loading)
   */
  async clearStudentCache(studentId: string) {
    const manager = await this.getFullManager();
    return manager.clearStudentCache(studentId);
  },
};

// Export as default for easier migration
export { analyticsManagerLite as analyticsManager };
