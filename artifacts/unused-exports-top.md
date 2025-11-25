# Unused Exports Report

Generated: 2025-11-17T08:38:51.319Z
Files scanned: 648
Total exports: 2028
Unused exports: 403


## src/components/AlertManager.tsx
- const: AlertManager

## src/components/alerts/AlertCard.tsx
- default: default

## src/components/alerts/AlertDetails.tsx
- default: default

## src/components/analysis/PatternAnalysisView.tsx
- const: PatternAnalysisView

## src/components/analytics-panels/alerts/utils/alertFormatters.ts
- function: formatAlertDateTime
- function: formatAlertKind
- function: formatConfidence
- function: formatTimeWindow
- function: truncateText

## src/components/analytics-panels/alerts/utils/alertIcons.tsx
- function: getStatusIcon

## src/components/analytics-panels/citation-utils.ts
- const: CHAT_CITATION_LIMIT

## src/components/auth/PinGate.tsx
- function: PinGate

## src/components/CategoryBrowser.tsx
- default: default

## src/components/error-boundaries/ChartErrorBoundary.tsx
- class: ChartErrorBoundary

## src/components/error-boundaries/GameErrorBoundary.tsx
- class: GameErrorBoundary

## src/components/game/AnimatedProgressRing.tsx
- default: default

## src/components/game/CalibrationErrorSparkline.tsx
- default: default

## src/components/game/CalibrationOverlay.tsx
- default: default

## src/components/game/ConfettiBurst.tsx
- default: default

## src/components/game/ConfidencePrompt.tsx
- default: default

## src/components/game/CornerCelebrate.tsx
- default: default
- function: CornerCelebrate

## src/components/game/FaceOverlay.tsx
- default: default

## src/components/game/HintHeatmapOverlay.tsx
- default: default

## src/components/game/IntensityRing.tsx
- default: default
- function: IntensityRing

## src/components/game/LevelCompleteModal.tsx
- default: default

## src/components/game/LevelUpModal.tsx
- default: default

## src/components/game/MatchMeter.tsx
- default: default

## src/components/game/ModeSelector.tsx
- default: default

## src/components/game/PracticeSelector.tsx
- default: default

## src/components/game/ProgressRing.tsx
- function: ProgressRing

## src/components/game/RoundSummaryCard.tsx
- default: default

## src/components/game/SessionSummary.tsx
- default: default

## src/components/game/StickerBook.tsx
- default: default

## src/components/game/StickerMachine.tsx
- default: default

## src/components/game/ThemeSwitch.tsx
- default: default

## src/components/game/TutorialOverlay.tsx
- default: default

## src/components/game/WorldBanner.tsx
- default: default

## src/components/goals/CreateGoalFromAlertDialog.tsx
- const: CreateGoalFromAlertDialog

## src/components/mini/SparkMini.tsx
- function: SparkMini

## src/components/SmartDataEntry.tsx
- function: SmartDataEntry

## src/components/ui/alert.tsx
- re-export: AlertTitle

## src/components/ui/dropdown-menu.tsx
- re-export: DropdownMenuCheckboxItem
- re-export: DropdownMenuGroup
- re-export: DropdownMenuLabel
- re-export: DropdownMenuPortal
- re-export: DropdownMenuRadioGroup
- re-export: DropdownMenuRadioItem
- re-export: DropdownMenuShortcut
- re-export: DropdownMenuSub
- re-export: DropdownMenuSubContent
- re-export: DropdownMenuSubTrigger

## src/components/ui/form-field.tsx
- const: FormField

## src/components/ui/select.tsx
- re-export: SelectGroup
- re-export: SelectLabel
- re-export: SelectScrollDownButton
- re-export: SelectScrollUpButton
- re-export: SelectSeparator

## src/components/ui/sidebar.tsx
- re-export: SidebarInset

## src/config/gameConfig.ts
- const: DETECTOR_CONFIG

## src/constants/analytics.ts
- const: ALERT_TIER_THRESHOLDS
- const: CACHE_CHECK_INTERVAL_MS
- const: DATA_DISPLAY_LIMITS
- const: MOCK_DATA_RANGES
- const: PERFORMANCE_THRESHOLDS

## src/constants/analyticsThresholds.ts
- const: ALERT_TIMING
- const: SOURCE_RANKING_WEIGHTS

## src/constants/game.ts
- const: CALIBRATION
- const: COMBO_THRESHOLDS
- const: CONFETTI_CONFIG
- const: GAME_TIMING
- const: PARTICLE_EFFECTS
- const: SCORE_MULTIPLIERS
- const: STORAGE_KEYS

## src/game/levels.ts
- const: MVP_WORLD
- const: STAR_HOLD_WORLD

## src/hooks/useAlerts.ts
- default: default

## src/hooks/useKreativiumAiState.ts
- re-export: toConcreteTimeRange

## src/hooks/usePinnedAlerts.ts
- function: usePinnedAlerts

## src/hooks/useRealtimeData.ts
- const: useRealtimeVisualization

## src/hooks/useSyncedExplorePreset.ts
- re-export: isValidPreset
- re-export: LEGACY_PRESET_MAP
- re-export: normalizePreset
- re-export: VALID_PRESETS

## src/hooks/useWeeklyReports.ts
- function: useWeeklyReports

## src/lib/aiConfig.ts
- const: DEFAULT_AI_CONFIG
- function: getAllowedModels

## src/lib/alerts/baselineUtils.ts
- const: assessBaselineQuality
- function: generateBaselineReport
- function: mergeBaselines
- function: optimizeWindowSizes

## src/lib/alerts/bridge.ts
- default: default

## src/lib/alerts/builders/seriesBuilders.ts
- function: buildAssociationDataset
- function: buildBurstEvents
- function: buildEmotionSeries
- function: buildSensoryAggregates

## src/lib/alerts/constants.ts
- const: MAX_ALERT_CONFIDENCE
- const: MAX_SOURCES_PER_ALERT
- const: MIN_ALERT_CONFIDENCE
- const: MIN_CONFIDENCE_THRESHOLD
- const: REQUIRED_ALERT_FIELDS
- const: SEVERITY_LIMITS
- const: SOURCE_RANKING_WEIGHTS
- const: TERMINAL_STATUSES
- const: VALID_STATUS_TRANSITIONS

## src/lib/alerts/detection/alertFinalizer.ts
- function: applyPolicies
- function: batchFinalizeAlerts
- function: computeSeriesStats
- function: enrichWithMetadata
- function: finalizeAlertEvent
- function: generateSparkline

## src/lib/alerts/detection/detectionOrchestrator.ts
- class: DetectionOrchestrator

## src/lib/alerts/detection/resultAggregator.ts
- function: aggregateDetectorResults
- function: calculateAggregateConfidence
- function: combineDetectorScores
- function: computeDetectionQuality
- function: filterValidResults

## src/lib/alerts/detectors/__tests__/syntheticData.ts
- function: autocorrelation
- function: generateSeasonal
- function: mean
- function: variance

## src/lib/alerts/detectors/tauU.ts
- default: default
- function: detectInterventionOutcome

## src/lib/alerts/detectors/tuning.ts
- function: erf
- function: inverseStandardNormalCDF

## src/lib/alerts/engineConfig.ts
- function: createEngineFromConfig
- function: getPresetForPopulation
- function: normalizeScoringWeights
- function: recommendConfigPreset
- function: recommendDetectorSelection
- function: recommendDetectorsFor
- function: recommendSeriesLimit

## src/lib/alerts/engineExamples.ts
- function: analyticsWorkerStep
- function: runDetectionForCohort
- function: runDetectionForStudent
- function: withABTesting
- function: withCustomThresholdLearner

## src/lib/alerts/enginePerformance.ts
- function: benchmarkEngine
- function: benchmarkEngineDetailed
- function: scaleTest
- function: synthesizeStudentData

## src/lib/alerts/experiments/abTesting.ts
- default: default

## src/lib/alerts/learning/thresholdLearner.ts
- default: default

## src/lib/alerts/performance.ts
- function: measureAsync

## src/lib/alerts/policyConfig.ts
- default: default

## src/lib/alerts/policyExamples.ts
- function: exampleAlertFactory
- function: exampleDedupInHighActivityClassroom
- function: exampleEngineIntegration
- function: exampleQuietHoursForDistrict
- function: exampleSeverityCapsForMiddleSchool
- function: exampleSnoozePlannedIntervention

## src/lib/alerts/sced/tauU.ts
- default: default

## src/lib/alerts/telemetry.ts
- default: default

## src/lib/alerts/telemetryExamples.ts
- function: analyzeWeeklyPerformance
- function: collectWithPrivacy
- function: exportForAnalysis
- function: fairnessDashboard
- function: highVolumeIngest
- function: setupTelemetryForCohort
- function: simulateABTesting

## src/lib/alerts/utils/hash.ts
- default: default

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

## src/lib/analytics/cache/cacheCoordinator.ts
- function: clearAllCaches
- function: clearManagerCache
- function: clearStudentCaches
- function: notifyWorkers

## src/lib/analytics/cache/localStorageCleaner.ts
- function: clearByPrefix
- function: clearSpecificKey
- function: getAnalyticsCacheCount

## src/lib/analytics/cache/ttlCache.ts
- function: getTtlMs
- function: isCacheValid
- function: isManagerTtlCacheDisabled

## src/lib/analytics/engine/engineConfig.ts
- function: getEnvAIEnabled
- function: getEnvApiKey
- function: getEnvModelName
- function: toBooleanValue
- function: validateModel

## src/lib/analytics/engine/engineFactory.ts
- function: createAnalysisEngine
- function: resetDebugLogRateLimit

## src/lib/analytics/insights/insightsOrchestrator.ts
- function: getInsights
- re-export: buildInsightsCacheKey
- re-export: buildInsightsTask

## src/lib/analytics/orchestration/bulkAnalytics.ts
- function: getStatusForAll
- function: partitionStudentsByStatus
- function: triggerAnalyticsForAll

## src/lib/analytics/orchestration/studentAnalytics.ts
- class: StudentAnalyticsOrchestrator
- function: createProfileManagerAdapter
- function: createStudentAnalyticsOrchestrator

## src/lib/analytics/workerManager.ts
- const: flushQueuedTasks
- const: resetWorkerManagerForTests

## src/lib/analyticsCoordinator.ts
- class: AnalyticsWorkerCoordinator

## src/lib/analyticsExportOptimized.ts
- const: analyticsExport

## src/lib/analyticsManagerLite.ts
- const: analyticsManagerLite
- re-export: analyticsManager

## src/lib/cachedPatternAnalysis.ts
- class: CachedPatternAnalysisEngine

## src/lib/cacheManager.ts
- const: cacheManager

## src/lib/chartColors.ts
- const: CHART_COLOR_PALETTE
- const: EMOTION_COLORS
- const: SENSORY_COLORS
- function: getEmotionColor
- function: getEmotionIcon
- function: getSensoryColor
- function: getSeverityColor

## src/lib/chartUtils.ts
- function: formatCalibrationData

## src/lib/DataFilter.ts
- const: applyFilters
- const: initialFilterCriteria

## src/lib/dataTransformations.ts
- const: dataTransformations

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

## src/lib/emotions/catalog.ts
- const: EMOTION_CATALOG

## src/lib/errorHandler.ts
- const: handleError

## src/lib/errorRecovery.ts
- enum: ErrorSeverity
- enum: RecoveryAction
- function: getRecoveryActionsForError
- function: getRetryStrategy
- function: isTransientError
- function: isUserError
- function: serializeError

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

## src/lib/export/common/dataCollector.ts
- function: applyDateRangeFilter
- function: calculateExportMetadata
- function: chunkData
- function: collectExportData
- function: filterByStudentIds
- function: filterStudents
- function: getDataStatistics
- function: getUniqueStudentIds
- function: groupDataBy
- function: streamExportData
- function: validateCollectedData

## src/lib/export/common/dataTransformer.ts
- const: EMOTION_COMPUTED_FIELDS
- const: GOAL_COMPUTED_FIELDS
- const: STUDENT_COMPUTED_FIELDS
- function: anonymizeData
- function: anonymizeEmotion
- function: anonymizeGoal
- function: anonymizeSensory
- function: anonymizeStudent
- function: anonymizeTracking
- function: enrichWithComputedFields
- function: flattenNestedData
- function: getNestedField
- function: redactPII
- function: selectFields
- function: setNestedField
- function: transformData
- function: transformDataBatched

## src/lib/export/common/exportOptions.ts
- const: AVAILABLE_FIELDS
- const: DEFAULT_EXPORT_OPTIONS
- const: NESTED_FIELD_PATHS
- function: estimateExportSize
- function: isExportTooLarge
- function: mergeExportOptions
- function: validateDateRange
- function: validateExportOptions

## src/lib/export/common/USAGE_EXAMPLES.ts
- function: anonymizedExportForResearch
- function: basicValidatedExport
- function: csvExportWithFlattening
- function: dateRangeFilteredExport
- function: exportWithProgressUI
- function: groupedExportByStudent
- function: integratedCSVExport
- function: streamingLargeExport
- function: validateAndPrepareExport

## src/lib/export/csv/csvFormatter.ts
- function: anonymizeStudent
- function: flattenObject
- function: mapColumnNames
- function: selectFields

## src/lib/export/csv/csvGenerator.ts
- function: generateCSVExport
- function: generateCSVHeader
- function: generateCSVRow
- function: generateEmotionsCSV
- function: generateGoalsCSV
- function: generateGroupedCSV
- function: generateMultiSectionCSV
- function: generateSensoryCSV
- function: generateTrackingCSV

## src/lib/export/csv/examples.ts
- function: exampleAnonymizedExport
- function: exampleBasicExport
- function: exampleCustomDateFormatExport
- function: exampleDateRangeExport
- function: exampleDownloadCSV
- function: exampleEmotionsOnlyExport
- function: exampleExcelExport
- function: exampleGoalsProgressExport
- function: exampleGroupedByStudentExport
- function: exampleIntegrationWithExportSystem
- function: exampleMultiSectionExport
- function: exampleQuoteAllExport
- function: exampleStreamingExport
- function: exampleTabSeparatedExport

## src/lib/export/json/backupSystem.ts
- class: BackupSystem
- const: backupSystem

## src/lib/export/json/jsonExporter.ts
- class: JSONExporter
- const: jsonExporter

## src/lib/export/pdf/pdfGenerator.ts
- function: generatePDFReport
- function: generatePDFReportWithMetadata
- function: validateReportData

## src/lib/export/pdf/reportBuilder.ts
- function: analyzeEmotionsForReport
- function: analyzeGoalsForReport
- function: analyzeSensoryForReport
- function: generateRecommendations

## src/lib/exportTemplates.ts
- function: getChartA11yDescription
- function: getChartConfig
- function: getLayoutConfig

## src/lib/formValidation.ts
- const: studentSchema

## src/lib/game/metrics.ts
- class: MetricsAccumulator

## src/lib/game/scoring.ts
- function: scoreRound

## src/lib/interventions/library.ts
- function: searchInterventions

## src/lib/interventions/templateManager.ts
- class: InterventionTemplateManager

## src/lib/mlModels.ts
- const: resetMlModelsInstanceForTests

## src/lib/mlModels/evaluation.ts
- function: recordModelEvaluation

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

## src/lib/progress/progress-store.ts
- function: saveStudentProgress

## src/lib/resolveCssColorVar.ts
- function: colorMutedForeground
- function: resolveCssColorVar

## src/lib/rewards/achievements.ts
- function: evaluateAchievements

## src/lib/sessionManager.ts
- class: SessionManager
- const: sessionManager

## src/lib/signals/neutral-detector.ts
- function: observeNeutral

## src/lib/startupValidation.ts
- function: validateApiKeyPresence
- function: validateModelAvailability
- function: validateModelName

## src/lib/storage/keys.ts
- const: ADULT_KEYS
- const: ANALYTICS_KEYS
- const: API_KEYS
- const: DATA_STORAGE_KEYS
- const: DIAGNOSTICS_KEYS
- const: EMOTION_EFFECTS_KEYS
- const: EMOTION_GAME_KEYS
- const: EXPORT_KEYS
- const: GAMIFICATION_KEYS
- const: PROGRESS_KEYS
- const: SESSION_KEYS
- const: SESSION_MANAGEMENT_KEYS
- const: SETTINGS_KEYS
- const: TRACKING_KEYS
- const: VIEWED_KEYS
- function: getKeysByCategory
- function: isStorageKey

## src/lib/storage/storageHelpers.ts
- function: storageClearPrefix

## src/lib/storage/useStorageState.ts
- function: getStorageKeys

## src/lib/testing/biasTester.ts
- class: BiasTester

## src/lib/theme/themes.ts
- const: THEMES

## src/lib/tracking/dataQuality.ts
- function: assessEntryQuality
- function: calculateCompleteness
- function: calculateConsistency
- function: calculateRichness

## src/lib/universalAnalyticsInitializer.ts
- class: UniversalAnalyticsInitializer

## src/lib/universalDataGenerator.ts
- function: getStudentPatternInfo

## src/lib/utils/errorHandling.ts
- function: assertCondition
- function: isDefined
- function: retryWithBackoff
- function: safeJsonParse
- function: safeJsonStringify
- function: safeLocalStorageGet
- function: safeLocalStorageRemove
- function: safeLocalStorageSet
- function: safeNumberParse
- function: tryCatch
- function: tryCatchSync

## src/lib/validation/dataLeakage.ts
- class: DataLeakageDetector

## src/new/hooks/mutationHooks.ts
- const: useAlertActions

## src/new/hooks/storageHooks.ts
- const: useAlerts
- const: useAlertsByStudent

## src/new/legacy/converters.ts
- const: convertLegacyAlertToLocal

## src/new/storage/schema.ts
- const: emotionEntrySchema
- const: environmentalEntrySchema
- const: sensoryEntrySchema
- const: sessionQualitySchema

## src/new/storage/storageService.ts
- const: createStudent

## src/new/tracking/hooks.ts
- const: useSession

## src/types/errors.ts
- const: createAnalyticsError
- const: createStorageError
- const: createValidationError

## src/types/filters.ts
- const: LIGHTING_CONDITION_TOKENS
