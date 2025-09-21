# Unused Exports Report

Generated: 2025-09-21T14:55:13.372Z
Files scanned: 359
Total exports: 884
Unused exports: 81


## src/components/analytics-panels/AlertsPanel.tsx
- const: AlertsPanel

## src/components/analytics-panels/ChatComposer.tsx
- function: ChatComposer

## src/components/analytics-panels/citation-utils.ts
- const: CHAT_CITATION_LIMIT

## src/components/ComparisonSummary.tsx
- default: default

## src/components/ui/alert.tsx
- re-export: AlertTitle

## src/components/ui/sidebar.tsx
- re-export: SidebarInset

## src/contexts/TrackingContext.tsx
- const: TrackingProvider
- const: useTracking

## src/hooks/usePinnedAlerts.ts
- function: usePinnedAlerts

## src/hooks/useRealtimeData.ts
- const: useRealtimeVisualization

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

## src/lib/cachedPatternAnalysis.ts
- class: CachedPatternAnalysisEngine

## src/lib/cacheManager.ts
- const: cacheManager

## src/lib/DataFilter.ts
- const: applyFilters
- const: initialFilterCriteria

## src/lib/dataValidation.ts
- function: validateTrackingData

## src/lib/dateRange.ts
- function: computeDateRange
- function: isCustomRangeInvalid

## src/lib/deviceConstraints.ts
- function: canPrecompute

## src/lib/echartsUtils.ts
- function: bindChartEvents
- function: initEChart
- function: resizeChart
- function: updateChartOption

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

## src/lib/exportTemplates.ts
- function: getChartA11yDescription
- function: getChartConfig
- function: getLayoutConfig

## src/lib/formValidation.ts
- const: studentSchema

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

## src/pages/EnhancedTrackStudent.tsx
- re-export: EnhancedTrackStudent

## src/pages/ReportsHub.tsx
- default: default

## src/pages/StudentProfile.original.tsx
- re-export: StudentProfile

## src/pages/StudentProfileOptimized.tsx
- re-export: StudentProfile

## src/types/errors.ts
- const: createAnalyticsError
- const: createStorageError
- const: createValidationError

## src/types/filters.ts
- const: LIGHTING_CONDITION_TOKENS
