# Unused Exports Report

Generated: 2025-09-21T09:23:03.417Z
Files scanned: 366
Total exports: 906
Unused exports: 135


## src/components/ComparisonSummary.tsx
- default: default

## src/components/ui/alert.tsx
- re-export: AlertTitle

## src/components/ui/sidebar.tsx
- re-export: SidebarInset

## src/config/schemas/analytics.schema.ts
- const: featureFlagsSchema
- const: insightRuleSchema
- const: workerSettingsSchema
- function: parseAnalyticsConfig

## src/config/validators/analytics.validator.ts
- function: formatZodError

## src/contexts/TrackingContext.tsx
- const: TrackingProvider
- const: useTracking

## src/hooks/useAnalyticsStatus.ts
- const: useAnalyticsStatus

## src/hooks/useAsyncHandler.ts
- function: useAsyncHandler

## src/hooks/useChartStore.ts
- const: useChartStore

## src/hooks/useMockDataSeeding.ts
- function: useMockDataSeeding

## src/hooks/usePinnedAlerts.ts
- function: usePinnedAlerts

## src/hooks/useRealtimeData.ts
- const: useRealtimeVisualization

## src/hooks/useRenderProfiler.ts
- function: useRenderProfiler

## src/hooks/useStudentExport.ts
- function: useStudentExport

## src/hooks/useSyncedExplorePreset.ts
- re-export: isValidPreset
- re-export: normalizePreset
- re-export: VALID_PRESETS

## src/lib/aiConfig.ts
- const: DEFAULT_AI_CONFIG
- function: getAllowedModels

## src/lib/analysis/heuristicAnalysisEngine.ts
- default: default

## src/lib/analysis/llmAnalysisEngine.ts
- default: default

## src/lib/analysis/mapReduce.ts
- const: ZChunkSummary
- function: chooseChunkSpanDays
- function: chunkByDays
- function: reduceSummariesToFinalReport
- function: summarizeChunk

## src/lib/analytics/cache-key.ts
- function: stableSerialize

## src/lib/analyticsCoordinator.ts
- class: AnalyticsWorkerCoordinator

## src/lib/analyticsExportOptimized.ts
- const: analyticsExport

## src/lib/analyticsManagerLite.ts
- const: analyticsManagerLite

## src/lib/buttonVariants.ts
- const: buttonVariants

## src/lib/cachedPatternAnalysis.ts
- class: CachedPatternAnalysisEngine

## src/lib/cacheManager.ts
- const: cacheManager

## src/lib/chartBuilders.ts
- function: buildAreaOption
- function: buildComposedOption
- function: buildCorrelationHeatmapOption
- function: buildEmotionTrendsOption
- function: buildScatterOption

## src/lib/chartUtils.ts
- const: ChartEmotionRowSchema
- const: EMOTION_EMOJIS
- const: EMOTION_TYPES
- function: processEmotionData

## src/lib/DataFilter.ts
- const: applyFilters
- const: initialFilterCriteria

## src/lib/dataValidation.ts
- function: validateTrackingData

## src/lib/dateRange.ts
- function: computeDateRange
- function: isCustomRangeInvalid

## src/lib/deprecation.ts
- function: clearDeprecationWarnings
- function: deprecate

## src/lib/deviceConstraints.ts
- function: canPrecompute
- function: estimateCpuBusy
- function: getBatteryStatus
- function: getNetworkInfo
- function: isMemoryPressureHigh
- function: isNetworkSlow
- function: isUserIdle

## src/lib/echartsUtils.ts
- function: bindChartEvents
- function: initEChart
- function: resizeChart
- function: updateChartOption

## src/lib/errorHandler.ts
- const: handleAnalyticsError
- const: handleStorageError
- const: handleValidationError

## src/lib/evidence/select.ts
- function: filterAndBreakTies
- function: normalizeTags
- function: scoreSources

## src/lib/evidence/types.ts
- const: ZDomainTag
- const: ZEvidenceLevel
- const: ZGradeBand

## src/lib/evidence/validation.ts
- const: ZAIExplanationResponse
- const: ZPatternResult
- function: validatePatternResults

## src/lib/explanations/sourceUtils.ts
- const: buildCopyFromSource
- const: CITATION_LIMIT
- const: clampText
- const: collectEnvironmentDetails
- const: describeSource
- const: describeSourceForPrompt
- const: formatSourceTimestamp
- const: SOCIAL_CONTEXT_RE
- const: sourcePrimaryLabel

## src/lib/exportTemplates.ts
- function: getChartA11yDescription
- function: getChartConfig
- function: getLayoutConfig

## src/lib/formValidation.ts
- const: emotionEntrySchema
- const: environmentalEntrySchema
- const: sensoryEntrySchema
- const: studentSchema
- function: sanitizeObject
- function: validateEnvironmentalEntry

## src/lib/hash.ts
- function: hashStringToHex64

## src/lib/inlineWorker.ts
- function: createInlineWorker

## src/lib/key.ts
- function: hashOfObject
- function: stableKeyFromObject

## src/lib/mlModels.ts
- class: MLModels

## src/lib/modelEvaluation.ts
- function: invalidateEvaluationCacheByTag

## src/lib/monitoring/modelDrift.ts
- class: ModelDriftDetector

## src/lib/preprocessing/facade.ts
- function: convertTrackingEntriesToSessions
- function: extractTimeFeatures
- function: normalizeData
- function: prepareEmotionData
- function: prepareSensoryData

## src/lib/resolveCssColorVar.ts
- function: colorMutedForeground
- function: resolveCssColorVar

## src/lib/sessionManager.ts
- class: SessionManager
- const: sessionManager

## src/lib/startupValidation.ts
- function: validateApiKeyPresence
- function: validateModelAvailability
- function: validateModelName

## src/lib/statistics.ts
- function: regularizedIncompleteBeta

## src/lib/tracking/dataQuality.ts
- function: calculateCompleteness
- function: calculateConsistency
- function: calculateRichness

## src/lib/universalAnalyticsInitializer.ts
- class: UniversalAnalyticsInitializer

## src/lib/universalDataGenerator.ts
- function: getStudentPatternInfo

## src/lib/validation/dataLeakage.ts
- class: DataLeakageDetector

## src/types/analytics.ts
- const: ANALYTICS_CONFIG_MIGRATION_NOTES
- const: EXAMPLE_CONFIG_BALANCED
- const: EXAMPLE_CONFIG_CONSERVATIVE
- const: EXAMPLE_CONFIG_SENSITIVE
- const: EXAMPLE_CONFIG_SHORT_TERM

## src/types/errors.ts
- const: createAnalyticsError
- const: createStorageError
- const: createValidationError

## src/types/filters.ts
- const: LIGHTING_CONDITION_TOKENS

## src/types/typeGuards.ts
- function: isEmotionEntry
- function: isSensoryEntry

## src/utils/accessibility.ts
- function: getFocusableElements
- function: isFocusable
- function: moveFocusTo
- function: trapFocus
