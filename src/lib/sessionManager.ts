import { TrackingEntry, EmotionEntry, SensoryEntry, EnvironmentalEntry } from '@/types/student';
import { dataStorage } from '@/lib/dataStorage';
import { analyticsManager } from '@/lib/analyticsManager';
import { saveTrackingEntry as saveTrackingEntryUnified } from '@/lib/tracking/saveTrackingEntry';
import { assessSessionQuality } from '@/lib/tracking/dataQuality';
import { validateSession as runSessionValidation } from '@/lib/tracking/validation';
import { logger } from '@/lib/logger';
import type { QualityAssessmentResult } from '@/lib/tracking/dataQuality';
import type { TrackingValidationRules, ValidationResult } from '@/lib/tracking/validation';

/**
 * Session metadata for tracking and recovery
 */
export interface SessionMetadata {
  id: string;
  studentId: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  dataPoints: number;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  autoSaved: boolean;
  quality: SessionQuality;
}

/**
 * Session quality assessment
 */
export type SessionQuality = QualityAssessmentResult;

/**
 * Session recovery data
 */
export interface SessionRecoveryData {
  sessionId: string;
  studentId: string;
  timestamp: Date;
  data: {
    emotions: Omit<EmotionEntry, 'id' | 'timestamp'>[];
    sensoryInputs: Omit<SensoryEntry, 'id' | 'timestamp'>[];
    environmentalData: Omit<EnvironmentalEntry, 'id' | 'timestamp'> | null;
    notes: string;
  };
  metadata: SessionMetadata;
}

/**
 * Session validation rules
 */
export type SessionValidationRules = TrackingValidationRules;

/**
 * Session statistics
 */
export interface SessionStatistics {
  totalSessions: number;
  completedSessions: number;
  abandonedSessions: number;
  averageDuration: number;
  averageDataPoints: number;
  averageQuality: number;
  mostCommonIssues: Array<{ issue: string; count: number }>;
}

/**
 * SessionManager class
 * Handles session lifecycle, persistence, validation, and recovery
 */
export class SessionManager {
  private static instance: SessionManager;
  private activeSessions: Map<string, SessionRecoveryData> = new Map();
  private sessionHistory: SessionMetadata[] = [];
  private validationRules: SessionValidationRules = {
    minEmotions: 0,
    minSensoryInputs: 0,
    requireEnvironmental: false,
    minDuration: 60000, // 1 minute
    maxDuration: 2 * 60 * 60 * 1000, // 2 hours
    requireNotes: false,
    enableQualityChecks: true,
  };
  private validationQualityThreshold: number = 20;

  private constructor() {
    this.loadSessionHistory();
    this.checkForAbandonedSessions();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Create a new session
   */
  createSession(studentId: string): string {
    const sessionId = crypto.randomUUID();
    const now = new Date();

    const sessionData: SessionRecoveryData = {
      sessionId,
      studentId,
      timestamp: now,
      data: {
        emotions: [],
        sensoryInputs: [],
        environmentalData: null,
        notes: '',
      },
      metadata: {
        id: sessionId,
        studentId,
        startTime: now,
        duration: 0,
        dataPoints: 0,
        status: 'active',
        autoSaved: false,
        quality: {
          score: 0,
          completeness: 0,
          consistency: 0,
          richness: 0,
          issues: [],
          recommendations: ['Start by recording emotions', 'Add sensory observations'],
        },
      },
    };

    this.activeSessions.set(sessionId, sessionData);
    this.persistSession(sessionData);

    logger.info('[SessionManager] Created new session', { sessionId, studentId });
    return sessionId;
  }

  /**
   * Update session data
   */
  updateSession(
    sessionId: string,
    updates: Partial<{
      emotions: Omit<EmotionEntry, 'id' | 'timestamp'>[];
      sensoryInputs: Omit<SensoryEntry, 'id' | 'timestamp'>[];
      environmentalData: Omit<EnvironmentalEntry, 'id' | 'timestamp'> | null;
      notes: string;
    }>
  ): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      logger.warn('[SessionManager] Session not found', { sessionId });
      return false;
    }

    // Update data
    if (updates.emotions) session.data.emotions = updates.emotions;
    if (updates.sensoryInputs) session.data.sensoryInputs = updates.sensoryInputs;
    if (updates.environmentalData !== undefined) session.data.environmentalData = updates.environmentalData;
    if (updates.notes !== undefined) session.data.notes = updates.notes;

    // Update metadata
    session.metadata.duration = Date.now() - session.metadata.startTime.getTime();
    session.metadata.dataPoints = 
      session.data.emotions.length + 
      session.data.sensoryInputs.length + 
      (session.data.environmentalData ? 1 : 0);

    // Assess quality
    session.metadata.quality = this.assessQuality(session);

    // Persist changes
    this.persistSession(session);

    logger.debug('[SessionManager] Updated session', { sessionId, updates });
    return true;
  }

  /**
   * Complete a session
   */
  async completeSession(sessionId: string): Promise<TrackingEntry | null> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      logger.warn('[SessionManager] Session not found', { sessionId });
      return null;
    }

    // Validate session
    const validation = this.validateSession(session);
    if (!validation.isValid) {
      logger.warn('[SessionManager] Session validation failed', {
        sessionId,
        errors: validation.errors,
      });
      return null;
    }

    if (validation.quality) {
      session.metadata.quality = {
        ...session.metadata.quality,
        ...validation.quality,
      };
    }

    // Create tracking entry
    const timestamp = new Date();
    const trackingEntry: TrackingEntry = {
      id: crypto.randomUUID(),
      studentId: session.studentId,
      timestamp,
      emotions: session.data.emotions.map(e => ({
        ...e,
        id: crypto.randomUUID(),
        timestamp,
      })),
      sensoryInputs: session.data.sensoryInputs.map(s => ({
        ...s,
        id: crypto.randomUUID(),
        timestamp,
      })),
      environmentalData: session.data.environmentalData ? {
        ...session.data.environmentalData,
        id: crypto.randomUUID(),
        timestamp,
      } : undefined,
      notes: session.data.notes || undefined,
      generalNotes: session.data.notes || undefined,
    };

    // Unified save: validate → save → broadcast → analytics
    const result = await saveTrackingEntryUnified(trackingEntry, { minDataPoints: 1 });
    if (!result.success) {
      logger.warn('[SessionManager] Unified save failed', { errors: result.errors, sessionId });
      return null;
    }

    // Update session metadata
    session.metadata.endTime = timestamp;
    session.metadata.status = 'completed';
    session.metadata.duration = timestamp.getTime() - session.metadata.startTime.getTime();
    session.metadata.dataPoints =
      session.data.emotions.length +
      session.data.sensoryInputs.length +
      (session.data.environmentalData ? 1 : 0);
    session.metadata.quality = this.assessQuality(session);
    this.sessionHistory.push(session.metadata);
    this.saveSessionHistory();

    // Remove from active sessions
    this.activeSessions.delete(sessionId);
    this.clearPersistedSession(sessionId);

    // Analytics handled by unified helper

    logger.info('[SessionManager] Completed session', { 
      sessionId, 
      entryId: trackingEntry.id 
    });

    return trackingEntry;
  }

  /**
   * Abandon a session
   */
  abandonSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.metadata.endTime = new Date();
    session.metadata.status = 'abandoned';
    this.sessionHistory.push(session.metadata);
    this.saveSessionHistory();

    this.activeSessions.delete(sessionId);
    this.clearPersistedSession(sessionId);

    logger.info('[SessionManager] Abandoned session', { sessionId });
  }

  /**
   * Pause a session
   */
  pauseSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.metadata.status !== 'active') return false;

    session.metadata.status = 'paused';
    this.persistSession(session);

    logger.info('[SessionManager] Paused session', { sessionId });
    return true;
  }

  /**
   * Resume a session
   */
  resumeSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.metadata.status !== 'paused') return false;

    session.metadata.status = 'active';
    this.persistSession(session);

    logger.info('[SessionManager] Resumed session', { sessionId });
    return true;
  }

  /**
   * Recover sessions from localStorage
   */
  recoverSessions(): SessionRecoveryData[] {
    const recovered: SessionRecoveryData[] = [];
    const keys = Object.keys(localStorage).filter(k => 
      k.startsWith('sensoryTracker_session_')
    );

    for (const key of keys) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const session = JSON.parse(data) as SessionRecoveryData;
          // Convert date strings back to Date objects
          session.timestamp = new Date(session.timestamp);
          session.metadata.startTime = new Date(session.metadata.startTime);
          if (session.metadata.endTime) {
            session.metadata.endTime = new Date(session.metadata.endTime);
          }
          
          // Check if session is not too old (24 hours)
          const age = Date.now() - session.metadata.startTime.getTime();
          if (age < 24 * 60 * 60 * 1000) {
            this.activeSessions.set(session.sessionId, session);
            recovered.push(session);
          } else {
            // Mark as abandoned and clean up
            session.metadata.status = 'abandoned';
            this.sessionHistory.push(session.metadata);
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        logger.error('[SessionManager] Failed to recover session', { key, error });
        localStorage.removeItem(key);
      }
    }

    if (recovered.length > 0) {
      this.saveSessionHistory();
      logger.info('[SessionManager] Recovered sessions', { count: recovered.length });
    }

    return recovered;
  }

  /**
   * Get active sessions for a student
   */
  getActiveSessionsForStudent(studentId: string): SessionRecoveryData[] {
    return Array.from(this.activeSessions.values()).filter(
      session => session.studentId === studentId && session.metadata.status === 'active'
    );
  }

  /**
   * Get all active sessions across all students
   */
  getAllActiveSessions(): SessionRecoveryData[] {
    return Array.from(this.activeSessions.values()).filter(
      session => session.metadata.status === 'active'
    );
  }

  /**
   * Get session statistics
   */
  getStatistics(studentId?: string): SessionStatistics {
    const relevantHistory = studentId 
      ? this.sessionHistory.filter(s => s.studentId === studentId)
      : this.sessionHistory;

    const completed = relevantHistory.filter(s => s.status === 'completed');
    const abandoned = relevantHistory.filter(s => s.status === 'abandoned');

    // Count issues
    const issueCount = new Map<string, number>();
    relevantHistory.forEach(session => {
      session.quality.issues.forEach(issue => {
        issueCount.set(issue, (issueCount.get(issue) || 0) + 1);
      });
    });

    const mostCommonIssues = Array.from(issueCount.entries())
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalSessions: relevantHistory.length,
      completedSessions: completed.length,
      abandonedSessions: abandoned.length,
      averageDuration: completed.length > 0
        ? completed.reduce((sum, s) => sum + s.duration, 0) / completed.length
        : 0,
      averageDataPoints: completed.length > 0
        ? completed.reduce((sum, s) => sum + s.dataPoints, 0) / completed.length
        : 0,
      averageQuality: completed.length > 0
        ? completed.reduce((sum, s) => sum + s.quality.score, 0) / completed.length
        : 0,
      mostCommonIssues,
    };
  }

  /**
   * Validate a session using shared validation rules
   */
  private validateSession(session: SessionRecoveryData): ValidationResult {
    const baselineQuality = session.metadata.quality;
    const validation = runSessionValidation(session, this.validationRules, {
      now: new Date(),
      qualityEvaluator: () => baselineQuality ?? assessSessionQuality(session),
      qualityThreshold: this.validationQualityThreshold,
    });

    if (validation.warnings.length > 0) {
      logger.debug('[SessionManager] Session validation warnings', {
        sessionId: session.sessionId,
        warnings: validation.warnings,
      });
    }

    return validation;
  }

  /**
   * Assess session quality via shared module
   */
  private assessQuality(session: SessionRecoveryData): SessionQuality {
    return assessSessionQuality(session);
  }

  /**
   * Persist session to localStorage
   */
  private persistSession(session: SessionRecoveryData): void {
    try {
      const key = `sensoryTracker_session_${session.sessionId}`;
      localStorage.setItem(key, JSON.stringify(session));
    } catch (error) {
      logger.error('[SessionManager] Failed to persist session', { 
        sessionId: session.sessionId, 
        error 
      });
    }
  }

  /**
   * Clear persisted session
   */
  private clearPersistedSession(sessionId: string): void {
    const key = `sensoryTracker_session_${sessionId}`;
    localStorage.removeItem(key);
  }

  /**
   * Load session history
   */
  private loadSessionHistory(): void {
    try {
      const data = localStorage.getItem('sensoryTracker_sessionHistory');
      if (data) {
        this.sessionHistory = JSON.parse(data).map((s: any) => ({
          ...s,
          startTime: new Date(s.startTime),
          endTime: s.endTime ? new Date(s.endTime) : undefined,
        }));
      }
    } catch (error) {
      logger.error('[SessionManager] Failed to load session history', { error });
      this.sessionHistory = [];
    }
  }

  /**
   * Save session history
   */
  private saveSessionHistory(): void {
    try {
      localStorage.setItem('sensoryTracker_sessionHistory', JSON.stringify(this.sessionHistory));
    } catch (error) {
      logger.error('[SessionManager] Failed to save session history', { error });
    }
  }

  /**
   * Check for abandoned sessions on startup
   */
  private checkForAbandonedSessions(): void {
    const recovered = this.recoverSessions();
    const now = Date.now();

    recovered.forEach(session => {
      const age = now - session.metadata.startTime.getTime();
      // Auto-abandon sessions older than 2 hours
      if (age > 2 * 60 * 60 * 1000) {
        this.abandonSession(session.sessionId);
      }
    });
  }

  /**
   * Update validation rules
   *
   * Note: Quality checks are enabled by default. To adjust the quality threshold used by
   * shared validation, call updateQualityThreshold().
   */
  updateValidationRules(rules: Partial<SessionValidationRules>): void {
    this.validationRules = { ...this.validationRules, ...rules };
    logger.info('[SessionManager] Updated validation rules', { rules });
  }

  /**
   * Update the quality threshold used when enableQualityChecks is true (default: 20)
   */
  updateQualityThreshold(threshold: number): void {
    this.validationQualityThreshold = Math.max(0, Math.min(100, threshold));
    logger.info('[SessionManager] Updated quality threshold', { threshold: this.validationQualityThreshold });
  }

  /**
   * Get validation rules
   */
  getValidationRules(): SessionValidationRules {
    return { ...this.validationRules };
  }

  /**
   * Clear all session data (for testing/reset)
   */
  clearAllSessions(): void {
    this.activeSessions.clear();
    this.sessionHistory = [];
    
    // Clear from localStorage
    const keys = Object.keys(localStorage).filter(k => 
      k.startsWith('sensoryTracker_session_') || 
      k === 'sensoryTracker_sessionHistory'
    );
    keys.forEach(key => localStorage.removeItem(key));

    logger.info('[SessionManager] Cleared all sessions');
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();
