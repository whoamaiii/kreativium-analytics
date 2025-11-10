import { logger } from '@/lib/logger';
import { AI_ANALYSIS_ENABLED, EXPLANATION_V2_ENABLED } from '@/lib/env';
import { storageGet, storageSet, storageRemove, isStorageAvailable } from '@/lib/storage/storageHelpers';
import {
  CORRELATION_THRESHOLDS,
  CORRELATION_SIGNIFICANCE,
  TIME_WINDOWS,
  DATA_QUALITY,
  CONFIDENCE_THRESHOLDS,
  ANOMALY_THRESHOLDS,
  TREND_THRESHOLDS,
  INTENSITY_THRESHOLDS,
  FREQUENCY_THRESHOLDS,
  EMOTION_TREND_THRESHOLDS,
  CACHE_CONFIG,
  ALERT_DETECTION,
  CHART_CONFIG,
  INSIGHTS_LIMITS,
  FEATURE_ENGINEERING,
  HUBER_REGRESSION,
  PRECOMPUTATION_CONFIG,
  CONFIDENCE_WEIGHTS,
  HEALTH_SCORE_WEIGHTS,
  SENSITIVITY_MULTIPLIERS,
  STRESS_ASSESSMENT,
  EMOTION_TAXONOMY,
} from '@/constants/analyticsThresholds';

// Centralized storage keys and prefixes
export const STORAGE_KEYS = {
  analyticsConfig: 'sensory-compass-analytics-config',
  analyticsProfiles: 'sensoryTracker_analyticsProfiles',
  cachePrefix: 'analytics-cache',
  performancePrefix: 'performance-cache',
} as const;

export interface AnalyticsConfiguration {
  // Schema version to invalidate caches when structure changes
  schemaVersion: string;
  
  // Feature flags (non-breaking)
  features?: {
    enableStructuredInsights?: boolean;
    enableSummaryFacade?: boolean;
    aiAnalysisEnabled?: boolean;
    explanationV2?: boolean;
  };

  // Feature Engineering Settings
  featureEngineering: {
    timeEncoding: {
      variant: 'sixFeatureV1' | 'none';
    };
    normalization: {
      clampToUnit: boolean;
      minVariance: number;
    };
  };

  // Pattern Analysis Thresholds
  patternAnalysis: {
    minDataPoints: number;
    correlationThreshold: number;
    highIntensityThreshold: number;
    concernFrequencyThreshold: number;
    emotionConsistencyThreshold: number;
    moderateNegativeThreshold: number;
  };

  // Enhanced Pattern Analysis
  enhancedAnalysis: {
    minSampleSize: number;
    trendThreshold: number;
    predictionConfidenceThreshold: number;
    anomalyThreshold: number; // Switch to z-score threshold
    // Optional severity levels for anomaly z-scores; if omitted, defaults will be applied
    anomalySeverityLevels?: {
      medium: number; // z >= medium => medium
      high: number;   // z >= high => high
    };
    huber: {
      delta: number;
      maxIter: number;
      tol: number;
    };
    qualityTargets: {
      pointsTarget: number;
      timeSpanDaysTarget: number;
    };
    correlationSignificance: {
      high: number;
      moderate: number;
      low: number;
    };
    riskAssessment: {
      stressIntensityThreshold: number;
      stressEmotions: string[];
    };
  };

  // Time Windows
  timeWindows: {
    defaultAnalysisDays: number;
    recentDataDays: number;
    shortTermDays: number;
    longTermDays: number;
  };

  // Alert Sensitivity
  alertSensitivity: {
    level: 'low' | 'medium' | 'high';
    emotionIntensityMultiplier: number;
    frequencyMultiplier: number;
    anomalyMultiplier: number;
  };

  alerts?: {
    cusum?: {
      kFactor: number;
      decisionInterval: number;
    };
  };

  // Cache Settings
  cache: {
    ttl: number; // Time to live in milliseconds
    maxSize: number;
    invalidateOnConfigChange: boolean;
  };

  // Existing settings (maintained for compatibility)
  insights: {
    MIN_SESSIONS_FOR_FULL_ANALYTICS: number;
    HIGH_CONFIDENCE_PATTERN_THRESHOLD: number;
    MAX_PATTERNS_TO_SHOW: number;
    MAX_CORRELATIONS_TO_SHOW: number;
    MAX_PREDICTIONS_TO_SHOW: number;
    RECENT_EMOTION_COUNT: number;
    POSITIVE_EMOTION_TREND_THRESHOLD: number;
    NEGATIVE_EMOTION_TREND_THRESHOLD: number;
  };

  confidence: {
    THRESHOLDS: {
      EMOTION_ENTRIES: number;
      SENSORY_ENTRIES: number;
      TRACKING_ENTRIES: number;
      DAYS_SINCE_LAST_ENTRY: number;
    };
    WEIGHTS: {
      EMOTION: number;
      SENSORY: number;
      TRACKING: number;
      RECENCY_BOOST: number;
    };
  };

  healthScore: {
    WEIGHTS: {
      PATTERNS: number;
      CORRELATIONS: number;
      PREDICTIONS: number;
      ANOMALIES: number;
      MINIMUM_DATA: number;
    };
  };

  analytics: {
    MIN_TRACKING_FOR_CORRELATION: number;
    MIN_TRACKING_FOR_ENHANCED: number;
    ANALYSIS_PERIOD_DAYS: number;
  };

  // Emotion taxonomy
  taxonomy: {
    positiveEmotions: string[];
  };

  // Charts configuration (centralizes chart-related magic numbers)
  charts: {
    // Threshold settings
    emotionThreshold: number;
    sensoryThreshold: number;

    // Display settings
    movingAverageWindow: number;

    // Correlation settings
    correlationLabelThreshold: number;

    // Axis settings
    yAxisMax: number;
    yAxisInterval: number;

    // Zoom settings
    dataZoomMinSpan: number;

    // Visual settings
    lineWidths: {
      average: number;
      movingAverage: number;
      positive: number;
      negative: number;
      sensory: number;
    };
  };

  // Background precomputation behavior and device/user constraints
  precomputation: PrecomputationConfig;
}

// Precomputation configuration for background analytics scheduling
export interface PrecomputationConfig {
  // Master enable switch
  enabled: boolean;

  // Device behavior toggles
  enableOnBattery: boolean; // allow precomputation when on battery power
  enableOnSlowNetwork: boolean; // allow precomputation on slow networks

  // Queue management
  maxQueueSize: number;
  batchSize: number;
  idleTimeout: number; // ms for requestIdleCallback timeout

  // Device constraints
  respectBatteryLevel: boolean;
  respectCPUUsage: boolean;
  respectNetworkConditions: boolean;

  // Priority settings
  commonTimeframes: number[]; // days to look back
  prioritizeRecentStudents: boolean;

  // Performance limits
  maxConcurrentTasks: number;
  taskStaggerDelay: number; // ms between task dispatches
  maxPrecomputeTime: number; // ms per idle processing slice

  // User preferences
  precomputeOnlyWhenIdle: boolean;
  pauseOnUserActivity: boolean;
}

// Default configuration
export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfiguration = {
  schemaVersion: '2.3.0',
  
  features: {
    enableStructuredInsights: false,
    enableSummaryFacade: true,
    aiAnalysisEnabled: AI_ANALYSIS_ENABLED,
    explanationV2: EXPLANATION_V2_ENABLED,
  },
  
  featureEngineering: {
    timeEncoding: {
      variant: 'sixFeatureV1',
    },
    normalization: {
      clampToUnit: FEATURE_ENGINEERING.CLAMP_TO_UNIT,
      minVariance: FEATURE_ENGINEERING.MIN_VARIANCE,
    },
  },
  
  patternAnalysis: {
    minDataPoints: DATA_QUALITY.MIN_DATA_POINTS,
    correlationThreshold: CORRELATION_THRESHOLDS.DISPLAY,
    highIntensityThreshold: INTENSITY_THRESHOLDS.HIGH_INTENSITY,
    concernFrequencyThreshold: FREQUENCY_THRESHOLDS.CONCERN_FREQUENCY,
    emotionConsistencyThreshold: FREQUENCY_THRESHOLDS.EMOTION_CONSISTENCY,
    moderateNegativeThreshold: FREQUENCY_THRESHOLDS.MODERATE_NEGATIVE,
  },
  
  enhancedAnalysis: {
    minSampleSize: DATA_QUALITY.MIN_SAMPLE_SIZE,
    trendThreshold: TREND_THRESHOLDS.MINIMUM_SLOPE,
    predictionConfidenceThreshold: CONFIDENCE_THRESHOLDS.PREDICTION_CONFIDENCE,
    anomalyThreshold: ANOMALY_THRESHOLDS.DEFAULT,
    anomalySeverityLevels: {
      medium: ANOMALY_THRESHOLDS.MEDIUM_SEVERITY,
      high: ANOMALY_THRESHOLDS.HIGH_SEVERITY,
    },
    huber: {
      delta: HUBER_REGRESSION.DELTA,
      maxIter: HUBER_REGRESSION.MAX_ITERATIONS,
      tol: HUBER_REGRESSION.TOLERANCE,
    },
    qualityTargets: {
      pointsTarget: DATA_QUALITY.POINTS_TARGET,
      timeSpanDaysTarget: TIME_WINDOWS.QUALITY_TIME_SPAN_DAYS,
    },
    correlationSignificance: {
      high: CORRELATION_SIGNIFICANCE.HIGH,
      moderate: CORRELATION_SIGNIFICANCE.MODERATE,
      low: CORRELATION_SIGNIFICANCE.LOW,
    },
    riskAssessment: {
      stressIntensityThreshold: STRESS_ASSESSMENT.INTENSITY_THRESHOLD,
      stressEmotions: [...STRESS_ASSESSMENT.STRESS_EMOTIONS],
    },
  },
  timeWindows: {
    defaultAnalysisDays: TIME_WINDOWS.DEFAULT_ANALYSIS_DAYS,
    recentDataDays: TIME_WINDOWS.RECENT_DAYS,
    shortTermDays: TIME_WINDOWS.SHORT_TERM_DAYS,
    longTermDays: TIME_WINDOWS.LONG_TERM_DAYS,
  },
  alertSensitivity: {
    level: 'medium',
    emotionIntensityMultiplier: SENSITIVITY_MULTIPLIERS.MEDIUM.EMOTION_INTENSITY,
    frequencyMultiplier: SENSITIVITY_MULTIPLIERS.MEDIUM.FREQUENCY,
    anomalyMultiplier: SENSITIVITY_MULTIPLIERS.MEDIUM.ANOMALY,
  },
  alerts: {
    cusum: {
      kFactor: ALERT_DETECTION.CUSUM_K_FACTOR,
      decisionInterval: ALERT_DETECTION.CUSUM_DECISION_INTERVAL,
    },
  },
  cache: {
    ttl: CACHE_CONFIG.TTL_MS,
    maxSize: CACHE_CONFIG.MAX_SIZE,
    invalidateOnConfigChange: CACHE_CONFIG.INVALIDATE_ON_CONFIG_CHANGE,
  },
  insights: {
    MIN_SESSIONS_FOR_FULL_ANALYTICS: DATA_QUALITY.MIN_SESSIONS_FOR_FULL_ANALYTICS,
    HIGH_CONFIDENCE_PATTERN_THRESHOLD: CONFIDENCE_THRESHOLDS.HIGH_CONFIDENCE_PATTERN,
    MAX_PATTERNS_TO_SHOW: INSIGHTS_LIMITS.MAX_PATTERNS,
    MAX_CORRELATIONS_TO_SHOW: INSIGHTS_LIMITS.MAX_CORRELATIONS,
    MAX_PREDICTIONS_TO_SHOW: INSIGHTS_LIMITS.MAX_PREDICTIONS,
    RECENT_EMOTION_COUNT: EMOTION_TREND_THRESHOLDS.RECENT_COUNT,
    POSITIVE_EMOTION_TREND_THRESHOLD: EMOTION_TREND_THRESHOLDS.POSITIVE,
    NEGATIVE_EMOTION_TREND_THRESHOLD: EMOTION_TREND_THRESHOLDS.NEGATIVE,
  },
  confidence: {
    THRESHOLDS: {
      EMOTION_ENTRIES: CONFIDENCE_THRESHOLDS.EMOTION_ENTRIES,
      SENSORY_ENTRIES: CONFIDENCE_THRESHOLDS.SENSORY_ENTRIES,
      TRACKING_ENTRIES: CONFIDENCE_THRESHOLDS.TRACKING_ENTRIES,
      DAYS_SINCE_LAST_ENTRY: CONFIDENCE_THRESHOLDS.DAYS_SINCE_LAST_ENTRY,
    },
    WEIGHTS: {
      EMOTION: CONFIDENCE_WEIGHTS.EMOTION,
      SENSORY: CONFIDENCE_WEIGHTS.SENSORY,
      TRACKING: CONFIDENCE_WEIGHTS.TRACKING,
      RECENCY_BOOST: CONFIDENCE_WEIGHTS.RECENCY_BOOST,
    },
  },
  healthScore: {
    WEIGHTS: {
      PATTERNS: HEALTH_SCORE_WEIGHTS.PATTERNS,
      CORRELATIONS: HEALTH_SCORE_WEIGHTS.CORRELATIONS,
      PREDICTIONS: HEALTH_SCORE_WEIGHTS.PREDICTIONS,
      ANOMALIES: HEALTH_SCORE_WEIGHTS.ANOMALIES,
      MINIMUM_DATA: HEALTH_SCORE_WEIGHTS.MINIMUM_DATA,
    },
  },
  analytics: {
    MIN_TRACKING_FOR_CORRELATION: DATA_QUALITY.MIN_TRACKING_FOR_CORRELATION,
    MIN_TRACKING_FOR_ENHANCED: DATA_QUALITY.MIN_TRACKING_FOR_ENHANCED,
    ANALYSIS_PERIOD_DAYS: TIME_WINDOWS.DEFAULT_ANALYSIS_DAYS,
  },
  taxonomy: {
    positiveEmotions: [...EMOTION_TAXONOMY.POSITIVE_EMOTIONS],
  },
  charts: {
    // Threshold settings
    emotionThreshold: INTENSITY_THRESHOLDS.EMOTION_DISPLAY,
    sensoryThreshold: INTENSITY_THRESHOLDS.SENSORY_DISPLAY,

    // Display settings
    movingAverageWindow: CHART_CONFIG.MOVING_AVERAGE_WINDOW,

    // Correlation settings
    correlationLabelThreshold: CORRELATION_THRESHOLDS.LABEL,

    // Axis settings
    yAxisMax: CHART_CONFIG.Y_AXIS_MAX,
    yAxisInterval: CHART_CONFIG.Y_AXIS_INTERVAL,

    // Zoom settings
    dataZoomMinSpan: CHART_CONFIG.DATA_ZOOM_MIN_SPAN,

    // Visual settings
    lineWidths: {
      average: CHART_CONFIG.LINE_WIDTHS.AVERAGE,
      movingAverage: CHART_CONFIG.LINE_WIDTHS.MOVING_AVERAGE,
      positive: CHART_CONFIG.LINE_WIDTHS.POSITIVE,
      negative: CHART_CONFIG.LINE_WIDTHS.NEGATIVE,
      sensory: CHART_CONFIG.LINE_WIDTHS.SENSORY,
    },
  },
  precomputation: {
    enabled: true,
    enableOnBattery: false,
    enableOnSlowNetwork: false,
    maxQueueSize: PRECOMPUTATION_CONFIG.MAX_QUEUE_SIZE,
    batchSize: PRECOMPUTATION_CONFIG.BATCH_SIZE,
    idleTimeout: PRECOMPUTATION_CONFIG.IDLE_TIMEOUT_MS,
    respectBatteryLevel: true,
    respectCPUUsage: true,
    respectNetworkConditions: true,
    commonTimeframes: [...PRECOMPUTATION_CONFIG.COMMON_TIMEFRAMES],
    prioritizeRecentStudents: true,
    maxConcurrentTasks: PRECOMPUTATION_CONFIG.MAX_CONCURRENT_TASKS,
    taskStaggerDelay: PRECOMPUTATION_CONFIG.TASK_STAGGER_DELAY_MS,
    maxPrecomputeTime: PRECOMPUTATION_CONFIG.MAX_PRECOMPUTE_TIME_MS,
    precomputeOnlyWhenIdle: true,
    pauseOnUserActivity: true,
  },
};

// Preset configurations
export const PRESET_CONFIGS = {
  conservative: {
    name: 'Conservative',
    description: 'Higher thresholds, fewer alerts, more data required',
    config: {
      ...DEFAULT_ANALYTICS_CONFIG,
      schemaVersion: '2.3.0',
      patternAnalysis: {
        ...DEFAULT_ANALYTICS_CONFIG.patternAnalysis,
        minDataPoints: DATA_QUALITY.MIN_DATA_POINTS_CONSERVATIVE,
        correlationThreshold: CORRELATION_THRESHOLDS.CONSERVATIVE,
        concernFrequencyThreshold: FREQUENCY_THRESHOLDS.CONCERN_FREQUENCY_CONSERVATIVE,
      },
      enhancedAnalysis: {
        ...DEFAULT_ANALYTICS_CONFIG.enhancedAnalysis,
        anomalyThreshold: ANOMALY_THRESHOLDS.CONSERVATIVE,
        minSampleSize: DATA_QUALITY.MIN_SAMPLE_SIZE_CONSERVATIVE,
      },
      alertSensitivity: {
        level: 'low' as const,
        emotionIntensityMultiplier: SENSITIVITY_MULTIPLIERS.LOW.EMOTION_INTENSITY,
        frequencyMultiplier: SENSITIVITY_MULTIPLIERS.LOW.FREQUENCY,
        anomalyMultiplier: SENSITIVITY_MULTIPLIERS.LOW.ANOMALY,
      },
    },
  },
  balanced: {
    name: 'Balanced',
    description: 'Default settings, balanced sensitivity',
    config: {
      ...DEFAULT_ANALYTICS_CONFIG,
      schemaVersion: '2.3.0',
    },
  },
  sensitive: {
    name: 'Sensitive',
    description: 'Lower thresholds, more alerts, less data required',
    config: {
      ...DEFAULT_ANALYTICS_CONFIG,
      schemaVersion: '2.3.0',
      patternAnalysis: {
        ...DEFAULT_ANALYTICS_CONFIG.patternAnalysis,
        minDataPoints: DATA_QUALITY.MIN_DATA_POINTS_SENSITIVE,
        correlationThreshold: CORRELATION_THRESHOLDS.SENSITIVE,
        concernFrequencyThreshold: FREQUENCY_THRESHOLDS.CONCERN_FREQUENCY_SENSITIVE,
      },
      enhancedAnalysis: {
        ...DEFAULT_ANALYTICS_CONFIG.enhancedAnalysis,
        anomalyThreshold: ANOMALY_THRESHOLDS.SENSITIVE,
        minSampleSize: DATA_QUALITY.MIN_SAMPLE_SIZE_SENSITIVE,
      },
      alertSensitivity: {
        level: 'high' as const,
        emotionIntensityMultiplier: SENSITIVITY_MULTIPLIERS.HIGH.EMOTION_INTENSITY,
        frequencyMultiplier: SENSITIVITY_MULTIPLIERS.HIGH.FREQUENCY,
        anomalyMultiplier: SENSITIVITY_MULTIPLIERS.HIGH.ANOMALY,
      },
    },
  },
};

// Configuration manager class
export class AnalyticsConfigManager {
  private static instance: AnalyticsConfigManager;
  private config: AnalyticsConfiguration;
  private listeners: Array<(config: AnalyticsConfiguration) => void> = [];
  private storageKey = 'sensory-compass-analytics-config';

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): AnalyticsConfigManager {
    if (!AnalyticsConfigManager.instance) {
      AnalyticsConfigManager.instance = new AnalyticsConfigManager();
    }
    return AnalyticsConfigManager.instance;
  }

  getConfig(): AnalyticsConfiguration {
    // Always reflect latest Vite env for AI flag to avoid stale defaults
    try {
      const env: Record<string, unknown> = (import.meta as any)?.env ?? {};
      const toBool = (v: unknown) => {
        const s = (v ?? '').toString().toLowerCase();
        return s === '1' || s === 'true' || s === 'yes';
      };
      const envAi = toBool(env.VITE_AI_ANALYSIS_ENABLED);
      const envExplV2 = toBool(env.VITE_EXPLANATION_V2);
      const next: AnalyticsConfiguration = { ...this.config } as AnalyticsConfiguration;
      next.features = { ...(next.features || {}), aiAnalysisEnabled: envAi, explanationV2: envExplV2 } as AnalyticsConfiguration['features'];
      return next;
    } catch {
      // On any error, return a shallow copy
      return { ...this.config };
    }
  }

  updateConfig(updates: Partial<AnalyticsConfiguration>): void {
    this.config = this.deepMerge(this.config, updates);
    this.saveConfig();
    this.notifyListeners();
  }

  setPreset(presetKey: keyof typeof PRESET_CONFIGS): void {
    const preset = PRESET_CONFIGS[presetKey];
    if (preset) {
      this.config = { ...preset.config };
      this.saveConfig();
      this.notifyListeners();
    }
  }

  resetToDefaults(): void {
    this.config = { ...DEFAULT_ANALYTICS_CONFIG };
    this.saveConfig();
    this.notifyListeners();
  }

  subscribe(callback: (config: AnalyticsConfiguration) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  importConfig(configString: string): boolean {
    try {
      const importedConfig = JSON.parse(configString);
      // Validate the imported config structure
      if (this.validateConfig(importedConfig)) {
        // Merge over defaults so new sections (like charts) are included
        this.config = this.deepMerge(DEFAULT_ANALYTICS_CONFIG, importedConfig as Partial<AnalyticsConfiguration>);
        this.saveConfig();
        this.notifyListeners();
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to import configuration:', error);
      return false;
    }
  }

  private loadConfig(): AnalyticsConfiguration {
    try {
      if (!isStorageAvailable()) {
        // Non-browser environment (SSR/tests/workers)
        return { ...DEFAULT_ANALYTICS_CONFIG };
      }

      const stored = storageGet<AnalyticsConfiguration | null>(
        this.storageKey,
        null,
        {
          deserialize: (value) => {
            const parsed = JSON.parse(value);
            return this.validateConfig(parsed) ? parsed : null;
          }
        }
      );

      if (stored) {
        // Merge stored over defaults so new defaults (incl. env-driven flags) apply
        return this.deepMerge(DEFAULT_ANALYTICS_CONFIG, stored);
      }
    } catch (error) {
      logger.error('Failed to load analytics configuration:', error);
    }
    return { ...DEFAULT_ANALYTICS_CONFIG };
  }

  private saveConfig(): void {
    try {
      if (!isStorageAvailable()) {
        return;
      }

      // Guard against quota exceeded. If it happens, clear only our key (fail-soft)
      const success = storageSet(this.storageKey, this.config);

      if (!success) {
        // If save failed, try to remove the key to free up space
        storageRemove(this.storageKey);
        logger.error('Failed to save analytics configuration: storage quota may be exceeded');
      }
    } catch (error) {
      logger.error('Failed to save analytics configuration:', error);
    }
  }

  private notifyListeners(): void {
    const configCopy = { ...this.config };
    this.listeners.forEach(listener => listener(configCopy));
  }

  private deepMerge(target: AnalyticsConfiguration, source: Partial<AnalyticsConfiguration>): AnalyticsConfiguration {
    // Create a deep copy of the target
    const result = JSON.parse(JSON.stringify(target)) as AnalyticsConfiguration;
    
    // Merge source into result
    const merge = (targetObj: Record<string, unknown>, sourceObj: Record<string, unknown>) => {
      Object.keys(sourceObj).forEach(key => {
        const sourceValue = sourceObj[key];
        const targetValue = targetObj[key];
        
        if (sourceValue !== undefined && sourceValue !== null) {
          if (
            typeof sourceValue === 'object' &&
            !Array.isArray(sourceValue) &&
            targetValue &&
            typeof targetValue === 'object' &&
            !Array.isArray(targetValue)
          ) {
            // Recursively merge nested objects
            merge(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>);
          } else {
            // Direct assignment for primitives and arrays
            targetObj[key] = sourceValue;
          }
        }
      });
    };
    
    merge(result as unknown as Record<string, unknown>, source as unknown as Record<string, unknown>);
    
    return result;
  }

  private validateConfig(config: unknown): config is AnalyticsConfiguration {
    // Basic validation to ensure the config has the expected structure
    if (!config || typeof config !== 'object') {
      return false;
    }
    
    const cfg = config as Record<string, unknown>;
    return (
      typeof cfg.schemaVersion === 'string' &&
      !!cfg.featureEngineering &&
      !!cfg.patternAnalysis &&
      !!cfg.enhancedAnalysis &&
      !!cfg.timeWindows &&
      !!cfg.alertSensitivity &&
      !!cfg.cache &&
      !!cfg.insights &&
      !!cfg.confidence &&
      !!cfg.healthScore &&
      !!cfg.analytics &&
      !!cfg.taxonomy &&
      !!cfg.charts &&
      !!cfg.precomputation
    );
  }
}

// Export singleton instance
export const analyticsConfig = AnalyticsConfigManager.getInstance();

// Legacy export for backward compatibility
export const ANALYTICS_CONFIG = {
  ...DEFAULT_ANALYTICS_CONFIG,
  // Add missing POSITIVE_EMOTIONS set
  POSITIVE_EMOTIONS: new Set(EMOTION_TAXONOMY.POSITIVE_EMOTIONS)
};
export type AnalyticsConfig = typeof ANALYTICS_CONFIG;

// -----------------------------------------------------------------------------
// Internal helpers (type-only, not exported)
// -----------------------------------------------------------------------------
// These type aliases are available for future use if needed
type _ConfidenceConfig = AnalyticsConfiguration['confidence'];
type _InsightConfig = AnalyticsConfiguration['insights'];

// Note: Helper functions removed to avoid ESLint unused variable errors.
// If needed in the future, they can be re-added with proper usage or
// prefixed with underscore to indicate they are intentionally unused.
