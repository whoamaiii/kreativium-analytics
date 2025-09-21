# Analytics Configuration: Schema Reference

This document describes the runtime analytics configuration schema used across the app. It mirrors
the AnalyticsConfiguration TypeScript interface and default values declared in
src/lib/analyticsConfig.ts.

- Source of truth: src/lib/analyticsConfig.ts
- Validator: src/lib/analyticsConfigValidation.ts
- Manager singleton: analyticsConfig (AnalyticsConfigManager.getInstance())

Overview

- Configuration is stored per-user in localStorage under the key sensory-compass-analytics-config.
- Safe defaults are always available from DEFAULT_ANALYTICS_CONFIG.
- The configuration manager exposes getConfig(), updateConfig(), setPreset(), resetToDefaults(),
  exportConfig(), and importConfig().

Top-level shape

```
AnalyticsConfiguration {
  patternAnalysis: {
    minDataPoints: number;
    correlationThreshold: number;
    highIntensityThreshold: number;
    concernFrequencyThreshold: number;
    emotionConsistencyThreshold: number;
    moderateNegativeThreshold: number;
  };
  enhancedAnalysis: {
    trendThreshold: number;
    anomalyThreshold: number; // standard deviations
    minSampleSize: number;
    predictionConfidenceThreshold: number;
    riskAssessmentThreshold: number;
  };
  timeWindows: {
    defaultAnalysisDays: number;
    recentDataDays: number;
    shortTermDays: number;
    longTermDays: number;
  };
  alertSensitivity: {
    level: 'low' | 'medium' | 'high';
    emotionIntensityMultiplier: number;
    frequencyMultiplier: number;
    anomalyMultiplier: number;
  };
  cache: {
    ttl: number; // ms
    maxSize: number;
    invalidateOnConfigChange: boolean;
  };
  charts: {
    emotionThreshold: number;
    sensoryThreshold: number;
    movingAverageWindow: number;
    correlationLabelThreshold: number;
    yAxisMax: number;
    yAxisInterval: number;
    dataZoomMinSpan: number; // percentage (0-100)
    lineWidths: {
      baseline: number;
      emotion: number;
      sensory: number;
      trend: number;
      anomaly: number;
      prediction: number;
      correlation: number;
    };
  };
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
  taxonomy: {
    positiveEmotions: string[];
  };
  precomputation: {
    enabled: boolean;
    enableOnBattery: boolean;
    enableOnSlowNetwork: boolean;
    maxQueueSize: number;
    batchSize: number;
    idleTimeout: number; // ms
    respectBatteryLevel: boolean;
    respectCPUUsage: boolean;
    respectNetworkConditions: boolean;
    commonTimeframes: number[]; // days
    prioritizeRecentStudents: boolean;
    maxConcurrentTasks: number;
    taskStaggerDelay: number; // ms
    maxPrecomputeTime: number; // ms per session
    precomputeOnlyWhenIdle: boolean;
    pauseOnUserActivity: boolean;
  };
}
```

Note: Workers receive `ttlSeconds`, derived from `cache.ttl` (ms). See `docs/analytics.md` for details.

Default values (summary) The defaults are defined in DEFAULT_ANALYTICS_CONFIG. Highlights:

- patternAnalysis: { minDataPoints: 3, correlationThreshold: 0.25, highIntensityThreshold: 4,
  concernFrequencyThreshold: 0.3, emotionConsistencyThreshold: 0.4, moderateNegativeThreshold: 0.4 }
- enhancedAnalysis: { trendThreshold: 0.05, anomalyThreshold: 1.5, minSampleSize: 5,
  predictionConfidenceThreshold: 0.6, riskAssessmentThreshold: 3 }
- timeWindows: { defaultAnalysisDays: 30, recentDataDays: 7, shortTermDays: 14, longTermDays: 90 }
- alertSensitivity: { level: 'medium', emotionIntensityMultiplier: 1.0, frequencyMultiplier: 1.0,
  anomalyMultiplier: 1.0 }
- cache: { ttl: 600000, maxSize: 50, invalidateOnConfigChange: true }
- charts: {
  emotionThreshold: 0.5,
  sensoryThreshold: 0.5,
  movingAverageWindow: 5,
  correlationLabelThreshold: 0.4,
  yAxisMax: 5,
  yAxisInterval: 1,
  dataZoomMinSpan: 10,
  lineWidths: { baseline: 1, emotion: 2, sensory: 2, trend: 2, anomaly: 2, prediction: 2, correlation: 1 }
}
- insights: { MIN*SESSIONS_FOR_FULL_ANALYTICS: 5, HIGH_CONFIDENCE_PATTERN_THRESHOLD: 0.6,
  MAX*\*\_TO_SHOW: 2, RECENT_EMOTION_COUNT: 7, POSITIVE_EMOTION_TREND_THRESHOLD: 0.6,
  NEGATIVE_EMOTION_TREND_THRESHOLD: 0.3 }
- confidence.THRESHOLDS: { EMOTION_ENTRIES: 10, SENSORY_ENTRIES: 10, TRACKING_ENTRIES: 5,
  DAYS_SINCE_LAST_ENTRY: 7 }
- confidence.WEIGHTS: { EMOTION: 0.3, SENSORY: 0.3, TRACKING: 0.4, RECENCY_BOOST: 0.1 }
- healthScore.WEIGHTS: equal weights (20 each)
- analytics: { MIN_TRACKING_FOR_CORRELATION: 3, MIN_TRACKING_FOR_ENHANCED: 2, ANALYSIS_PERIOD_DAYS:
  30 }
- taxonomy.positiveEmotions: [ 'happy', 'calm', 'excited', 'content', 'peaceful', 'cheerful',
  'relaxed', 'optimistic' ]

- precomputation: {
  enabled: false,
  enableOnBattery: false,
  enableOnSlowNetwork: false,
  maxQueueSize: 50,
  batchSize: 5,
  idleTimeout: 10000,
  respectBatteryLevel: true,
  respectCPUUsage: true,
  respectNetworkConditions: true,
  commonTimeframes: [7, 30],
  prioritizeRecentStudents: true,
  maxConcurrentTasks: 2,
  taskStaggerDelay: 500,
  maxPrecomputeTime: 30000,
  precomputeOnlyWhenIdle: true,
  pauseOnUserActivity: true,
}

Presets

- PRESET_CONFIGS.conservative: higher thresholds and low alert sensitivity
- PRESET_CONFIGS.balanced: default
- PRESET_CONFIGS.sensitive: lower thresholds and high alert sensitivity

Accessing and updating config

- Read: const cfg = analyticsConfig.getConfig();
- Update partial: analyticsConfig.updateConfig({ patternAnalysis: { minDataPoints: 5 } });
  - Charts example: analyticsConfig.updateConfig({ charts: { yAxisMax: 5, dataZoomMinSpan: 8 } });
  - Precomputation example: analyticsConfig.updateConfig({ precomputation: { enabled: true, maxConcurrentTasks: 2 } });
- Preset: analyticsConfig.setPreset('conservative' | 'balanced' | 'sensitive');
- Reset: analyticsConfig.resetToDefaults();
- Export/Import JSON: analyticsConfig.exportConfig(); analyticsConfig.importConfig(jsonString);

Notes

- The manager performs a shallow shape validation when loading/importing. For stricter validation,
  see docs/CONFIG_TROUBLESHOOTING.md and the validateAnalyticsRuntimeConfig helper.
- Local storage quota errors are caught and will log via the central logger without crashing the UI.

---

Schema version

- This project does not track a formal schema version. The source of truth is `src/lib/analyticsConfig.ts`. Migration notes below explain additions such as `charts` and `precomputation`.
- Migration considerations:
  - New sections will be filled with defaults on load if missing.
  - If you previously hardcoded chart constants, remove them and read from `analyticsConfig.getConfig().charts` instead.
  - Background precomputation is opt-in by default. Enable and tune per device profile.

Configuration examples

```ts
// Charts for high-resolution displays
analyticsConfig.updateConfig({
  charts: {
    emotionThreshold: 0.6,
    sensoryThreshold: 0.6,
    movingAverageWindow: 7,
    correlationLabelThreshold: 0.5,
    yAxisMax: 6,
    yAxisInterval: 1,
    dataZoomMinSpan: 6,
    lineWidths: { baseline: 1, emotion: 2, sensory: 2, trend: 2, anomaly: 2, prediction: 2, correlation: 1 }
  }
})

// Precomputation tuned for laptops on AC power
analyticsConfig.updateConfig({
  precomputation: {
    enabled: true,
    enableOnBattery: false,
    enableOnSlowNetwork: false,
    respectBatteryLevel: true,
    respectCPUUsage: true,
    respectNetworkConditions: true,
    commonTimeframes: [7, 30, 90],
    prioritizeRecentStudents: true,
    maxConcurrentTasks: 3,
    taskStaggerDelay: 400,
    maxPrecomputeTime: 60000,
    precomputeOnlyWhenIdle: true,
    pauseOnUserActivity: true,
  }
})
```

Validation notes

- The new sections are included in the runtime configuration validation and shape checks. If keys are missing or have incompatible types, defaults are merged and a warning is logged.
