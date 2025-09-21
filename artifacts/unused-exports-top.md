# Unused Exports Report

Generated: 2025-09-21T09:04:35.433Z
Files scanned: 384
Total exports: 936
Unused exports: 192


## src/components/analysis/CorrelationHeatmap.tsx
- const: CorrelationHeatmap

## src/components/analysis/PatternAnalysisView.tsx
- const: PatternAnalysisView

## src/components/analytics/FiltersDrawer.tsx
- default: default

## src/components/analytics/panels/AlertsPanel.tsx
- const: AlertsPanel
- default: default

## src/components/analytics/panels/ExplorePanel.tsx
- const: ExplorePanel

## src/components/analytics/panels/OverviewPanel.tsx
- const: OverviewPanel

## src/components/analytics/PrecomputationScheduler.tsx
- const: PrecomputationScheduler
- default: default

## src/components/analytics/QuickQuestions.tsx
- default: default

## src/components/charts/EChartContainer.tsx
- const: EChartContainer

## src/components/charts/TrendsChart.tsx
- const: TrendsChart

## src/components/ComparisonSummary.tsx
- default: default

## src/components/DetailedConfidenceExplanation.tsx
- const: DetailedConfidenceExplanation

## src/components/EnhancedDataVisualization.tsx
- const: EnhancedDataVisualization

## src/components/profile-sections/GoalsSection.tsx
- re-export: GoalsSection

## src/components/profile-sections/ProfileErrorState.tsx
- function: ProfileErrorState

## src/components/profile-sections/ProfileLoadingState.tsx
- function: ProfileLoadingState

## src/components/profile-sections/ProgressSection.tsx
- re-export: ProgressSection

## src/components/profile-sections/ReportsSection.tsx
- re-export: ReportsSection

## src/components/ReportBuilder.tsx
- const: ReportBuilder

## src/components/settings/AnalyticsConfig.tsx
- const: AnalyticsConfig

## src/components/StorageManager.tsx
- const: StorageManager

## src/components/tracking/DataCollectionMonitor.tsx
- const: DataCollectionMonitor

## src/components/tracking/SessionIndicator.tsx
- const: SessionIndicator

## src/components/tracking/SessionRecovery.tsx
- const: SessionRecovery

## src/components/ui/FloatingActionButton.tsx
- const: FloatingActionButton

## src/components/ui/PremiumStatsCard.tsx
- const: PremiumStatsCard

## src/components/ui/sidebar.tsx
- re-export: SidebarInset

## src/components/ui/sonner.tsx
- re-export: Toaster

## src/components/ui/StudentCard.tsx
- const: StudentCard

## src/components/UniversalAnalyticsStatus.tsx
- const: UniversalAnalyticsStatus

## src/components/Visualization3D.poc.stub.tsx
- const: Visualization3D

## src/components/Visualization3D.tsx
- const: Visualization3D

## src/config/loaders/analytics.loader.ts
- function: getAnalyticsConfigCacheStamp
- function: loadAnalyticsConfig

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

## src/hooks/usePerformanceMonitor.ts
- function: onRenderCallback
- function: useBatchPerformanceMonitor
- function: useComputationTimer
- function: useMemoryLeakDetector
- function: usePerformanceMonitor
- function: useWhyDidYouUpdate

## src/hooks/usePinnedAlerts.ts
- function: usePinnedAlerts

## src/hooks/useProgressiveChartData.ts
- function: useProgressiveChartData

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

## src/lib/ai/utils.ts
- const: delay
- function: backoffDelay
- function: extractFirstJsonObject
- function: sanitizeBodyForLog
- function: sanitizeHeadersForLog

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

## src/lib/analyticsConfigOverride.ts
- function: applyDevelopmentAnalyticsConfig

## src/lib/analyticsCoordinator.ts
- class: AnalyticsWorkerCoordinator

## src/lib/analyticsExportOptimized.ts
- const: analyticsExport

## src/lib/analyticsManager.ts
- const: ensureUniversalAnalyticsInitialization
- re-export: buildCacheKey
- re-export: buildTask

## src/lib/analyticsManagerLite.ts
- const: analyticsManagerLite

## src/lib/analyticsProfiles.ts
- function: clearAllProfiles
- function: clearStudentProfile
- function: getProfileCacheStats
- function: resetProfiles

## src/lib/analyticsWorkerFallback.ts
- class: AnalyticsWorkerFallback

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

## src/lib/chartTransforms.ts
- function: aggregateEntriesByDay
- function: computeIntensityBins

## src/lib/chartUtils.ts
- const: ChartEmotionRowSchema
- const: EMOTION_EMOJIS
- const: EMOTION_TYPES
- function: processEmotionData

## src/lib/DataFilter.ts
- const: applyFilters
- const: initialFilterCriteria

## src/lib/dataStorage.ts
- class: DataStorageManager

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

## src/lib/mock/mockSeeders.ts
- function: seedDemoData

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
