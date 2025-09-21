import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { TrackingEntry, EmotionEntry, SensoryEntry, EnvironmentalEntry } from '@/types/student';
import { dataStorage } from '@/lib/dataStorage';
import { analyticsManager } from '@/lib/analyticsManager';
import { saveTrackingEntry as saveTrackingEntryUnified } from '@/lib/tracking/saveTrackingEntry';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { validateTrackingEntry } from '@/lib/tracking/validation';
import { assessEntryQuality } from '@/lib/tracking/dataQuality';

/**
 * Session state for tracking data collection
 */
export interface SessionState {
  id: string;
  studentId: string;
  startTime: Date;
  lastActivity: Date;
  isActive: boolean;
  isPaused: boolean;
  emotions: Omit<EmotionEntry, 'id' | 'timestamp'>[];
  sensoryInputs: Omit<SensoryEntry, 'id' | 'timestamp'>[];
  environmentalData: Omit<EnvironmentalEntry, 'id' | 'timestamp'> | null;
  notes: string;
  autoSaveEnabled: boolean;
  dataQuality: DataQualityMetrics;
}

/**
 * Data quality metrics for session
 */
export interface DataQualityMetrics {
  emotionCount: number;
  sensoryCount: number;
  hasEnvironmental: boolean;
  sessionDuration: number;
  completeness: number; // 0-100
  lastSaved: Date | null;
}

/**
 * Session configuration options
 */
export interface SessionConfig {
  autoSaveInterval?: number; // ms
  sessionTimeout?: number; // ms
  minDataForSave?: number;
  enableRecovery?: boolean;
  enableQualityChecks?: boolean;
}

/**
 * Tracking context value interface
 */
/**
 * @deprecated TrackingContext is deprecated. Use `sessionManager` from `src/lib/sessionManager.ts` instead.
 */
export interface TrackingContextValue {
  // Session state
  currentSession: SessionState | null;
  sessions: SessionState[];
  
  // Session management
  startSession: (studentId: string, config?: SessionConfig) => void;
  endSession: (save?: boolean) => Promise<void>;
  pauseSession: () => void;
  resumeSession: () => void;
  
  // Data collection
  addEmotion: (emotion: Omit<EmotionEntry, 'id' | 'timestamp'>) => void;
  removeEmotion: (index: number) => void;
  addSensoryInput: (sensory: Omit<SensoryEntry, 'id' | 'timestamp'>) => void;
  removeSensoryInput: (index: number) => void;
  setEnvironmentalData: (environmental: Omit<EnvironmentalEntry, 'id' | 'timestamp'> | null) => void;
  setNotes: (notes: string) => void;
  
  // Session operations
  saveSession: () => Promise<TrackingEntry | null>;
  discardSession: () => void;
  recoverSession: (sessionId: string) => void;
  
  // Quality and validation
  validateSession: () => { isValid: boolean; errors: string[] };
  getDataQuality: () => DataQualityMetrics;
  
  // Configuration
  sessionConfig: SessionConfig;
  updateSessionConfig: (config: Partial<SessionConfig>) => void;
}

const DEFAULT_SESSION_CONFIG: SessionConfig = {
  autoSaveInterval: 5 * 60 * 1000, // 5 minutes
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  minDataForSave: 1,
  enableRecovery: true,
  enableQualityChecks: true,
};

const TrackingContext = createContext<TrackingContextValue | undefined>(undefined);

/**
 * TrackingProvider component
 * Manages all tracking sessions and data collection
 *
 * @deprecated Use `sessionManager` from `src/lib/sessionManager.ts`. This provider is no longer used in the app.
 */
export const TrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSession, setCurrentSession] = useState<SessionState | null>(null);
  const [sessions, setSessions] = useState<SessionState[]>([]);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig>(DEFAULT_SESSION_CONFIG);
  
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Emit deprecation warning once on mount
  useEffect(() => {
    logger.warn('[TrackingContext] Deprecated: TrackingContext/Provider are deprecated. Use sessionManager instead.');
  }, []);

  /**
   * Calculate data quality metrics
   */
  const calculateDataQuality = useCallback((session: SessionState): DataQualityMetrics => {
    const timestamp = new Date();
    const pseudoEntry: TrackingEntry = {
      id: 'temp',
      studentId: session.studentId,
      timestamp,
      emotions: session.emotions.map(e => ({ ...e, id: 'temp', timestamp })),
      sensoryInputs: session.sensoryInputs.map(s => ({ ...s, id: 'temp', timestamp })),
      environmentalData: session.environmentalData ? { ...session.environmentalData, id: 'temp', timestamp } : undefined,
      notes: session.notes || undefined,
    };

    const quality = assessEntryQuality(pseudoEntry);

    return {
      emotionCount: quality.emotionCount,
      sensoryCount: quality.sensoryCount,
      hasEnvironmental: quality.hasEnvironmental,
      sessionDuration: quality.sessionDuration,
      completeness: quality.completeness,
      lastSaved: session.dataQuality?.lastSaved ?? null,
    };
  }, []);

  /**
   * Start a new tracking session
   */
  const startSession = useCallback((studentId: string, config?: SessionConfig) => {
    // End any existing session first
    if (currentSession?.isActive) {
      endSession(true);
    }

    const newConfig = { ...sessionConfig, ...config };
    const sessionId = crypto.randomUUID();
    
    const newSession: SessionState = {
      id: sessionId,
      studentId,
      startTime: new Date(),
      lastActivity: new Date(),
      isActive: true,
      isPaused: false,
      emotions: [],
      sensoryInputs: [],
      environmentalData: null,
      notes: '',
      autoSaveEnabled: true,
      dataQuality: {
        emotionCount: 0,
        sensoryCount: 0,
        hasEnvironmental: false,
        sessionDuration: 0,
        completeness: 0,
        lastSaved: null,
      },
    };

    setCurrentSession(newSession);
    setSessions(prev => [...prev, newSession]);
    
    // Save to localStorage for recovery
    if (newConfig.enableRecovery) {
      localStorage.setItem(`sensoryTracker_activeSession_${studentId}`, JSON.stringify(newSession));
    }

    // Setup auto-save
    if (newConfig.autoSaveInterval) {
      // eslint-disable-next-line no-restricted-syntax
      autoSaveTimerRef.current = setInterval(() => {
        if (currentSession?.autoSaveEnabled) {
          saveSession();
        }
      }, newConfig.autoSaveInterval);
    }

    // Setup session timeout
    if (newConfig.sessionTimeout) {
      // eslint-disable-next-line no-restricted-syntax
      sessionTimeoutRef.current = setTimeout(() => {
        toast.warning('Session timed out due to inactivity');
        endSession(true);
      }, newConfig.sessionTimeout);
    }

    logger.info('[TrackingContext] Started new session', { sessionId, studentId });
  }, [currentSession, sessionConfig, endSession, saveSession]);

  /**
   * End the current session
   */
  const endSession = useCallback(async (save: boolean = true) => {
    if (!currentSession) return;

    if (save) {
      await saveSession();
    }

    // Clear timers
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }

    // Clear recovery data
    localStorage.removeItem(`sensoryTracker_activeSession_${currentSession.studentId}`);

    setCurrentSession(null);
    logger.info('[TrackingContext] Ended session', { sessionId: currentSession.id });
  }, [currentSession, saveSession]);

  /**
   * Pause the current session
   */
  const pauseSession = useCallback(() => {
    if (!currentSession || !currentSession.isActive) return;

    setCurrentSession(prev => prev ? {
      ...prev,
      isPaused: true,
      lastActivity: new Date(),
    } : null);

    // Pause auto-save
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    logger.info('[TrackingContext] Paused session', { sessionId: currentSession.id });
  }, [currentSession]);

  /**
   * Resume a paused session
   */
  const resumeSession = useCallback(() => {
    if (!currentSession || !currentSession.isPaused) return;

    setCurrentSession(prev => prev ? {
      ...prev,
      isPaused: false,
      lastActivity: new Date(),
    } : null);

    // Resume auto-save
    if (sessionConfig.autoSaveInterval) {
      // eslint-disable-next-line no-restricted-syntax
      autoSaveTimerRef.current = setInterval(() => {
        if (currentSession?.autoSaveEnabled) {
          saveSession();
        }
      }, sessionConfig.autoSaveInterval);
    }

    logger.info('[TrackingContext] Resumed session', { sessionId: currentSession.id });
  }, [currentSession, sessionConfig, saveSession]);

  /**
   * Add emotion to current session
   */
  const addEmotion = useCallback((emotion: Omit<EmotionEntry, 'id' | 'timestamp'>) => {
    if (!currentSession) return;

    setCurrentSession(prev => {
      if (!prev) return null;
      const updated = {
        ...prev,
        emotions: [...prev.emotions, emotion],
        lastActivity: new Date(),
      };
      updated.dataQuality = calculateDataQuality(updated);
      
      // Update recovery data
      if (sessionConfig.enableRecovery) {
        localStorage.setItem(`sensoryTracker_activeSession_${prev.studentId}`, JSON.stringify(updated));
      }
      
      return updated;
    });

    // Reset timeout
    if (sessionTimeoutRef.current && sessionConfig.sessionTimeout) {
      clearTimeout(sessionTimeoutRef.current);
      // eslint-disable-next-line no-restricted-syntax
      sessionTimeoutRef.current = setTimeout(() => {
        toast.warning('Session timed out due to inactivity');
        endSession(true);
      }, sessionConfig.sessionTimeout);
    }
  }, [currentSession, sessionConfig, calculateDataQuality, endSession]);

  /**
   * Remove emotion from current session
   */
  const removeEmotion = useCallback((index: number) => {
    if (!currentSession) return;

    setCurrentSession(prev => {
      if (!prev) return null;
      const updated = {
        ...prev,
        emotions: prev.emotions.filter((_, i) => i !== index),
        lastActivity: new Date(),
      };
      updated.dataQuality = calculateDataQuality(updated);
      return updated;
    });
  }, [currentSession, calculateDataQuality]);

  /**
   * Add sensory input to current session
   */
  const addSensoryInput = useCallback((sensory: Omit<SensoryEntry, 'id' | 'timestamp'>) => {
    if (!currentSession) return;

    setCurrentSession(prev => {
      if (!prev) return null;
      const updated = {
        ...prev,
        sensoryInputs: [...prev.sensoryInputs, sensory],
        lastActivity: new Date(),
      };
      updated.dataQuality = calculateDataQuality(updated);
      
      // Update recovery data
      if (sessionConfig.enableRecovery) {
        localStorage.setItem(`sensoryTracker_activeSession_${prev.studentId}`, JSON.stringify(updated));
      }
      
      return updated;
    });

    // Reset timeout
    if (sessionTimeoutRef.current && sessionConfig.sessionTimeout) {
      clearTimeout(sessionTimeoutRef.current);
      // eslint-disable-next-line no-restricted-syntax
      sessionTimeoutRef.current = setTimeout(() => {
        toast.warning('Session timed out due to inactivity');
        endSession(true);
      }, sessionConfig.sessionTimeout);
    }
  }, [currentSession, sessionConfig, calculateDataQuality, endSession]);

  /**
   * Remove sensory input from current session
   */
  const removeSensoryInput = useCallback((index: number) => {
    if (!currentSession) return;

    setCurrentSession(prev => {
      if (!prev) return null;
      const updated = {
        ...prev,
        sensoryInputs: prev.sensoryInputs.filter((_, i) => i !== index),
        lastActivity: new Date(),
      };
      updated.dataQuality = calculateDataQuality(updated);
      return updated;
    });
  }, [currentSession, calculateDataQuality]);

  /**
   * Set environmental data for current session
   */
  const setEnvironmentalData = useCallback((environmental: Omit<EnvironmentalEntry, 'id' | 'timestamp'> | null) => {
    if (!currentSession) return;

    setCurrentSession(prev => {
      if (!prev) return null;
      const updated = {
        ...prev,
        environmentalData: environmental,
        lastActivity: new Date(),
      };
      updated.dataQuality = calculateDataQuality(updated);
      
      // Update recovery data
      if (sessionConfig.enableRecovery) {
        localStorage.setItem(`sensoryTracker_activeSession_${prev.studentId}`, JSON.stringify(updated));
      }
      
      return updated;
    });
  }, [currentSession, sessionConfig, calculateDataQuality]);

  /**
   * Set notes for current session
   */
  const setNotes = useCallback((notes: string) => {
    if (!currentSession) return;

    setCurrentSession(prev => {
      if (!prev) return null;
      const updated = {
        ...prev,
        notes,
        lastActivity: new Date(),
      };
      updated.dataQuality = calculateDataQuality(updated);
      
      // Update recovery data
      if (sessionConfig.enableRecovery) {
        localStorage.setItem(`sensoryTracker_activeSession_${prev.studentId}`, JSON.stringify(updated));
      }
      
      return updated;
    });
  }, [currentSession, sessionConfig, calculateDataQuality]);

  /**
   * Save the current session
   */
  const saveSession = useCallback(async (): Promise<TrackingEntry | null> => {
    if (!currentSession) return null;

    const validation = validateSession();
    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return null;
    }

    try {
      const timestamp = new Date();
      const trackingEntry: TrackingEntry = {
        id: crypto.randomUUID(),
        studentId: currentSession.studentId,
        timestamp,
        emotions: currentSession.emotions.map(e => ({
          ...e,
          id: crypto.randomUUID(),
          timestamp,
        })),
        sensoryInputs: currentSession.sensoryInputs.map(s => ({
          ...s,
          id: crypto.randomUUID(),
          timestamp,
        })),
        environmentalData: currentSession.environmentalData ? {
          ...currentSession.environmentalData,
          id: crypto.randomUUID(),
          timestamp,
        } : undefined,
        notes: currentSession.notes || undefined,
      };

      // Unified save: validate → save → broadcast → analytics
      const min = sessionConfig.minDataForSave ?? 1;
      const result = await saveTrackingEntryUnified(trackingEntry, { minDataPoints: min });
      if (!result.success) {
        result.errors?.forEach(err => toast.error(err));
        return null;
      }

      // Update quality metrics
      setCurrentSession(prev => prev ? {
        ...prev,
        dataQuality: {
          ...prev.dataQuality,
          lastSaved: timestamp,
        },
      } : null);

      // Analytics is triggered by unified helper; no-op here

      toast.success('Session saved successfully');
      logger.info('[TrackingContext] Session saved', { 
        sessionId: currentSession.id, 
        entryId: trackingEntry.id 
      });

      return trackingEntry;
    } catch (error) {
      logger.error('[TrackingContext] Failed to save session', { error });
      toast.error('Failed to save session');
      return null;
    }
  }, [currentSession, validateSession]);

  /**
   * Validate the current session
   */
  const validateSession = useCallback((): { isValid: boolean; errors: string[] } => {
    // Deprecated: mirrors SessionManager validation via unified module
    if (!currentSession) {
      return { isValid: false, errors: ['No active session'] };
    }

    const timestamp = new Date();
    const pseudoEntry: TrackingEntry = {
      id: 'temp',
      studentId: currentSession.studentId,
      timestamp,
      emotions: currentSession.emotions.map(e => ({ ...e, id: 'temp', timestamp })),
      sensoryInputs: currentSession.sensoryInputs.map(s => ({ ...s, id: 'temp', timestamp })),
      environmentalData: currentSession.environmentalData ? { ...currentSession.environmentalData, id: 'temp', timestamp } : undefined,
      notes: currentSession.notes || undefined,
    };

    const validation = validateTrackingEntry(pseudoEntry, {
      minDataPoints: sessionConfig.minDataForSave,
      enableQualityChecks: true,
    });

    return { isValid: validation.isValid, errors: validation.errors };
  }, [currentSession, sessionConfig.minDataForSave]);

  /**
   * Discard the current session
   */
  const discardSession = useCallback(() => {
    if (!currentSession) return;

    // Clear recovery data
    localStorage.removeItem(`sensoryTracker_activeSession_${currentSession.studentId}`);

    setCurrentSession(null);
    toast.info('Session discarded');
    logger.info('[TrackingContext] Session discarded', { sessionId: currentSession.id });
  }, [currentSession]);

  /**
   * Recover a session from localStorage
   */
  const recoverSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      toast.error('Session not found');
      return;
    }

    setCurrentSession(session);
    toast.success('Session recovered');
    logger.info('[TrackingContext] Session recovered', { sessionId });
  }, [sessions]);

  /**
   * Get current data quality metrics
   */
  const getDataQuality = useCallback((): DataQualityMetrics => {
    if (!currentSession) {
      return {
        emotionCount: 0,
        sensoryCount: 0,
        hasEnvironmental: false,
        sessionDuration: 0,
        completeness: 0,
        lastSaved: null,
      };
    }
    return calculateDataQuality(currentSession);
  }, [currentSession, calculateDataQuality]);

  /**
   * Update session configuration
   */
  const updateSessionConfig = useCallback((config: Partial<SessionConfig>) => {
    setSessionConfig(prev => ({ ...prev, ...config }));
  }, []);

  /**
   * Check for recoverable sessions on mount
   */
  useEffect(() => {
    const checkRecoverableSessions = () => {
      const keys = Object.keys(localStorage).filter(k => 
        k.startsWith('sensoryTracker_activeSession_')
      );

      if (keys.length > 0) {
        const recoverableSessionsData = keys.map(key => {
          try {
            return JSON.parse(localStorage.getItem(key) || '{}');
          } catch {
            return null;
          }
        }).filter(Boolean);

        if (recoverableSessionsData.length > 0) {
          setSessions(recoverableSessionsData.map(data => ({
            ...data,
            startTime: new Date(data.startTime),
            lastActivity: new Date(data.lastActivity),
          })));

          toast.info(`Found ${recoverableSessionsData.length} recoverable session(s)`);
        }
      }
    };

    checkRecoverableSessions();
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
    };
  }, []);

  const value: TrackingContextValue = {
    currentSession,
    sessions,
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    addEmotion,
    removeEmotion,
    addSensoryInput,
    removeSensoryInput,
    setEnvironmentalData,
    setNotes,
    saveSession,
    discardSession,
    recoverSession,
    validateSession,
    getDataQuality,
    sessionConfig,
    updateSessionConfig,
  };

  return (
    <TrackingContext.Provider value={value}>
      {children}
    </TrackingContext.Provider>
  );
};

/**
 * Hook to use the tracking context
 * @deprecated Use `sessionManager` instead of this hook.
 */
export const useTracking = () => {
  const context = useContext(TrackingContext);
  if (!context) {
    throw new Error('useTracking must be used within a TrackingProvider');
  }
  return context;
};
