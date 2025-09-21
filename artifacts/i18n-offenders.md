# i18n Offenders Report

Generated: 9/21/2025, 2:16:12 PM

Found 1125 potential offenders across 132 files.

Key convention: feature.section.purpose — prefer nouns and verbs in present tense.

## Namespace: analytics

### src/components/AnalyticsDashboard.tsx
- [152:22] (MessageAPI) `Error coercing timestamp:` → key: `analytics.analyticsdashboard.error_coercing_timestamp` — Message API call: error()
  - context: `} return new Date(); } catch (error) { logger.error('Error coercing timestamp:', v, error); return new Date(); } }`
- [163:20] (MessageAPI) `Error normalizing filteredData:` → key: `analytics.analyticsdashboard.error_normalizing_filtereddata` — Message API call: error()
  - context: `amp: coerce(s.timestamp) })), }; } catch (error) { logger.error('Error normalizing filteredData:', error); return { entries: [], emotions:`
- [194:20] (MessageAPI) `[AnalyticsDashboard] Demo seed failed` → key: `analytics.analyticsdashboard.analyticsdashboard_demo_seed_failed` — Message API call: error()
  - context: `ta, { useAI, student: analyticsStudent }); } catch (e) { logger.error('[AnalyticsDashboard] Demo seed failed', { error: e }); toast.error(String`
- [284:78] (MessageAPI) `[AnalyticsDashboard] Analytics error surfaced to user` → key: `analytics.analyticsdashboard.analyticsdashboard_analytics_error_surfaced_to` — Message API call: error()
  - context: `n; doOnce('analytics_ui_error_' + String(error), 60_000, () => logger.error('[AnalyticsDashboard] Analytics error surfaced to user', { error })); }, [erro`
- [364:26] (MessageAPI) `Failed to collect chart exports` → key: `analytics.analyticsdashboard.failed_to_collect_chart_exports` — Message API call: error()
  - context: `turn usableExports; } catch (collectError) { logger.error('Failed to collect chart exports', collectError); toast.error(String`
- [401:20] (MessageAPI) `Export failed:` → key: `analytics.analyticsdashboard.export_failed` — Message API call: error()
  - context: `uccessMessageKey[format]))); }); } catch (error) { logger.error('Export failed:', error); toast.error(String(tAnalytics('export.failure'))`
- [442:46] (JSXAttribute) `analytics-dashboard-title` → key: `analytics.analyticsdashboard.analytics_dashboard_title` — Static aria-labelledby attribute
  - context: `tics('skipToContent'))} </a> <section role="region" aria-labelledby="analytics-dashboard-title" className="space-y-6"> {error && !isAnalyzing`
- [808:23] (MessageAPI) `Error comparing timestamps in AnalyticsDashboard memo:` → key: `analytics.analyticsdashboard.error_comparing_timestamps_in_analyticsdashboard` — Message API call: error()
  - context: `return prevTime === nextTime; } catch (error) { logger.error('Error comparing timestamps in AnalyticsDashboard memo:', error); retur`

### src/components/AnalyticsSettings.tsx
- [75:20] (MessageAPI) `Failed to load ML model status` → key: `analytics.analyticssettings.failed_to_load_ml_model` — Message API call: error()
  - context: `tatus(); setModelStatus(status); } catch (error) { logger.error('Failed to load ML model status', { error }); toast.error("Failed to load`
- [76:19] (MessageAPI) `Failed to load ML models: Could not retrieve model status. Some features may be unavailable.` → key: `analytics.analyticssettings.failed_to_load_ml_models` — Message API call: error()
  - context: `logger.error('Failed to load ML model status', { error }); toast.error("Failed to load ML models: Could not retrieve model status. Some features may be`
- [76:19] (MessageAPI) `Failed to load ML models: Could not retrieve model status. Some features may be unavailable.` → key: `analytics.analyticssettings.failed_to_load_ml_models` — sonner toast.error()
  - context: `logger.error('Failed to load ML model status', { error }); toast.error("Failed to load ML models: Could not retrieve model status. Some features may be`
- [113:19] (MessageAPI) `Analytics configuration has been updated` → key: `analytics.analyticssettings.analytics_configuration_has_been_updated` — Message API call: success()
  - context: `Config.updateConfig(config); setHasUnsavedChanges(false); toast.success("Analytics configuration has been updated"); }; const handleReset = () => {`
- [113:19] (MessageAPI) `Analytics configuration has been updated` → key: `analytics.analyticssettings.analytics_configuration_has_been_updated` — sonner toast.success()
  - context: `Config.updateConfig(config); setHasUnsavedChanges(false); toast.success("Analytics configuration has been updated"); }; const handleReset = () => {`
- [120:19] (MessageAPI) `Settings have been reset to defaults` → key: `analytics.analyticssettings.settings_have_been_reset_to` — Message API call: success()
  - context: `tSelectedPreset('balanced'); setHasUnsavedChanges(false); toast.success("Settings have been reset to defaults"); }; const handleExport = () => {`
- [120:19] (MessageAPI) `Settings have been reset to defaults` → key: `analytics.analyticssettings.settings_have_been_reset_to` — sonner toast.success()
  - context: `tSelectedPreset('balanced'); setHasUnsavedChanges(false); toast.success("Settings have been reset to defaults"); }; const handleExport = () => {`
- [135:19] (MessageAPI) `Configuration saved to analytics-config.json` → key: `analytics.analyticssettings.configuration_saved_to_analytics_config` — Message API call: success()
  - context: `ument.body.removeChild(a); URL.revokeObjectURL(url); toast.success("Configuration saved to analytics-config.json"); }; const MAX_IMPORT_BYTES`
- [135:19] (MessageAPI) `Configuration saved to analytics-config.json` → key: `analytics.analyticssettings.configuration_saved_to_analytics_config` — sonner toast.success()
  - context: `ument.body.removeChild(a); URL.revokeObjectURL(url); toast.success("Configuration saved to analytics-config.json"); }; const MAX_IMPORT_BYTES`
- [146:19] (MessageAPI) `Configuration file exceeds the 5 MB limit` → key: `analytics.analyticssettings.configuration_file_exceeds_the_5` — Message API call: error()
  - context: `if (!file) return; if (file.size > MAX_IMPORT_BYTES) { toast.error('Configuration file exceeds the 5 MB limit'); event.target.value = '';`
- [146:19] (MessageAPI) `Configuration file exceeds the 5 MB limit` → key: `analytics.analyticssettings.configuration_file_exceeds_the_5` — sonner toast.error()
  - context: `if (!file) return; if (file.size > MAX_IMPORT_BYTES) { toast.error('Configuration file exceeds the 5 MB limit'); event.target.value = '';`
- [152:19] (MessageAPI) `Only JSON configuration files are supported` → key: `analytics.analyticssettings.only_json_configuration_files_are` — Message API call: error()
  - context: `if (file.type && !ALLOWED_IMPORT_TYPES.has(file.type)) { toast.error('Only JSON configuration files are supported'); event.target.value = '';`
- [152:19] (MessageAPI) `Only JSON configuration files are supported` → key: `analytics.analyticssettings.only_json_configuration_files_are` — sonner toast.error()
  - context: `if (file.type && !ALLOWED_IMPORT_TYPES.has(file.type)) { toast.error('Only JSON configuration files are supported'); event.target.value = '';`
- [163:25] (MessageAPI) `Successfully imported configuration` → key: `analytics.analyticssettings.successfully_imported_configuration` — Message API call: success()
  - context: `nfig(content)) { setHasUnsavedChanges(false); toast.success("Successfully imported configuration"); } else { toast.error("`
- [163:25] (MessageAPI) `Successfully imported configuration` → key: `analytics.analyticssettings.successfully_imported_configuration` — sonner toast.success()
  - context: `nfig(content)) { setHasUnsavedChanges(false); toast.success("Successfully imported configuration"); } else { toast.error("`
- [165:23] (MessageAPI) `Invalid configuration file` → key: `analytics.analyticssettings.invalid_configuration_file` — Message API call: error()
  - context: `("Successfully imported configuration"); } else { toast.error("Invalid configuration file"); } } catch (_error) { toast.`
- [165:23] (MessageAPI) `Invalid configuration file` → key: `analytics.analyticssettings.invalid_configuration_file` — sonner toast.error()
  - context: `("Successfully imported configuration"); } else { toast.error("Invalid configuration file"); } } catch (_error) { toast.`
- [168:21] (MessageAPI) `Failed to read configuration file` → key: `analytics.analyticssettings.failed_to_read_configuration_file` — Message API call: error()
  - context: `id configuration file"); } } catch (_error) { toast.error("Failed to read configuration file"); } event.target.value = '';`
- [168:21] (MessageAPI) `Failed to read configuration file` → key: `analytics.analyticssettings.failed_to_read_configuration_file` — sonner toast.error()
  - context: `id configuration file"); } } catch (_error) { toast.error("Failed to read configuration file"); } event.target.value = '';`
- [209:19] (MessageAPI) `Failed to delete model` → key: `analytics.analyticssettings.failed_to_delete_model` — Message API call: error()
  - context: `${modelType} model has been removed\`); } catch (_error) { toast.error("Failed to delete model"); } finally { setIsDeletingModel(null); }`
- [209:19] (MessageAPI) `Failed to delete model` → key: `analytics.analyticssettings.failed_to_delete_model` — sonner toast.error()
  - context: `${modelType} model has been removed\`); } catch (_error) { toast.error("Failed to delete model"); } finally { setIsDeletingModel(null); }`
- [331:52] (JSXText) `Pattern Analysis Thresholds` → key: `analytics.analyticssettings.pattern_analysis_thresholds` — Static JSX text node
  - context: `<CardHeader> <CardTitle className="text-base">Pattern Analysis Thresholds</CardTitle> <CardDescription>`
- [333:21] (JSXText) `Adjust minimum requirements and thresholds for pattern detection` → key: `analytics.analyticssettings.adjust_minimum_requirements_and_thresholds` — Static JSX text node
  - context: `Thresholds</CardTitle> <CardDescription> Adjust minimum requirements and thresholds for pattern detection`
- [339:54] (JSXText) `Minimum Data Points` → key: `analytics.analyticssettings.minimum_data_points` — Static JSX text node
  - context: `sName="flex items-center"> <Label htmlFor="minDataPoints">Minimum Data Points</Label> {renderTooltip("Minimum number`
- [358:61] (JSXText) `Correlation Threshold` → key: `analytics.analyticssettings.correlation_threshold` — Static JSX text node
  - context: `flex items-center"> <Label htmlFor="correlationThreshold">Correlation Threshold</Label> {renderTooltip("Minimum corr`
- [377:57] (JSXText) `Concern Frequency Threshold` → key: `analytics.analyticssettings.concern_frequency_threshold` — Static JSX text node
  - context: `me="flex items-center"> <Label htmlFor="concernFrequency">Concern Frequency Threshold</Label> {renderTooltip("Percen`
- [398:52] (JSXText) `Enhanced Analysis Thresholds` → key: `analytics.analyticssettings.enhanced_analysis_thresholds` — Static JSX text node
  - context: `<CardHeader> <CardTitle className="text-base">Enhanced Analysis Thresholds</CardTitle> <CardDescription>`
- [400:21] (JSXText) `Configure advanced pattern detection and anomaly thresholds` → key: `analytics.analyticssettings.configure_advanced_pattern_detection_and` — Static JSX text node
  - context: `Thresholds</CardTitle> <CardDescription> Configure advanced pattern detection and anomaly thresholds </`
- [406:57] (JSXText) `Anomaly Detection Sensitivity` → key: `analytics.analyticssettings.anomaly_detection_sensitivity` — Static JSX text node
  - context: `me="flex items-center"> <Label htmlFor="anomalyThreshold">Anomaly Detection Sensitivity</Label> {renderTooltip("Numb`
- [419:110] (JSXText) `σ` → key: `analytics.analyticssettings.` — Static JSX text node
  - context: `lassName="w-12 text-right">{config.enhancedAnalysis.anomalyThreshold.toFixed(2)}σ</span> </div> </div>`
- [425:54] (JSXText) `Minimum Sample Size` → key: `analytics.analyticssettings.minimum_sample_size` — Static JSX text node
  - context: `sName="flex items-center"> <Label htmlFor="minSampleSize">Minimum Sample Size</Label> {renderTooltip("Minimum data p`
- [448:52] (JSXText) `Alert Sensitivity` → key: `analytics.analyticssettings.alert_sensitivity` — Static JSX text node
  - context: `<CardHeader> <CardTitle className="text-base">Alert Sensitivity</CardTitle> <CardDescription>`
- [450:21] (JSXText) `Control how sensitive the system is to potential issues` → key: `analytics.analyticssettings.control_how_sensitive_the_system` — Static JSX text node
  - context: `Sensitivity</CardTitle> <CardDescription> Control how sensitive the system is to potential issues </Card`
- [462:54] (JSXText) `Low Sensitivity` → key: `analytics.analyticssettings.low_sensitivity` — Static JSX text node
  - context: `<div> <p className="font-medium">Low Sensitivity</p> <p className="text-sm text-muted-f`
- [464:29] (JSXText) `Only alert for significant patterns with high confidence` → key: `analytics.analyticssettings.only_alert_for_significant_patterns` — Static JSX text node
  - context: `<p className="text-sm text-muted-foreground"> Only alert for significant patterns with high confidence`
- [472:54] (JSXText) `Medium Sensitivity` → key: `analytics.analyticssettings.medium_sensitivity` — Static JSX text node
  - context: `<div> <p className="font-medium">Medium Sensitivity</p> <p className="text-sm text-mute`
- [474:29] (JSXText) `Balanced approach to pattern detection and alerts` → key: `analytics.analyticssettings.balanced_approach_to_pattern_detection` — Static JSX text node
  - context: `<p className="text-sm text-muted-foreground"> Balanced approach to pattern detection and alerts </p>`
- [482:54] (JSXText) `High Sensitivity` → key: `analytics.analyticssettings.high_sensitivity` — Static JSX text node
  - context: `<div> <p className="font-medium">High Sensitivity</p> <p className="text-sm text-muted-`
- [484:29] (JSXText) `Alert for subtle patterns and potential concerns early` → key: `analytics.analyticssettings.alert_for_subtle_patterns_and` — Static JSX text node
  - context: `<p className="text-sm text-muted-foreground"> Alert for subtle patterns and potential concerns early`
- [492:78] (JSXText) `Current Multipliers:` → key: `analytics.analyticssettings.current_multipliers` — Static JSX text node
  - context: `"> <p className="text-sm font-medium text-muted-foreground">Current Multipliers:</p> <div className="grid grid-cols-3 ga`
- [506:52] (JSXText) `Analysis Time Windows` → key: `analytics.analyticssettings.analysis_time_windows` — Static JSX text node
  - context: `<CardHeader> <CardTitle className="text-base">Analysis Time Windows</CardTitle> <CardDescription>`
- [508:21] (JSXText) `Configure the time periods used for different analyses` → key: `analytics.analyticssettings.configure_the_time_periods_used` — Static JSX text node
  - context: `ime Windows</CardTitle> <CardDescription> Configure the time periods used for different analyses </CardD`
- [514:56] (JSXText) `Default Analysis Period` → key: `analytics.analyticssettings.default_analysis_period` — Static JSX text node
  - context: `ame="flex items-center"> <Label htmlFor="defaultAnalysis">Default Analysis Period</Label> {renderTooltip("Standard t`
- [533:51] (JSXText) `Recent Data Window` → key: `analytics.analyticssettings.recent_data_window` — Static JSX text node
  - context: `lassName="flex items-center"> <Label htmlFor="recentData">Recent Data Window</Label> {renderTooltip("Time window for`
- [552:49] (JSXText) `Long-term Analysis Window` → key: `analytics.analyticssettings.long_term_analysis_window` — Static JSX text node
  - context: `className="flex items-center"> <Label htmlFor="longTerm">Long-term Analysis Window</Label> {renderTooltip("Extended`
- [578:23] (JSXText) `Machine Learning Models` → key: `analytics.analyticssettings.machine_learning_models` — Static JSX text node
  - context: `p-2"> <Brain className="h-4 w-4" /> Machine Learning Models </span> <div cla`
- [581:83] (JSXText) `Enable ML` → key: `analytics.analyticssettings.enable_ml` — Static JSX text node
  - context: `<Label htmlFor="ml-enabled" className="text-sm font-normal">Enable ML</Label> <Switch id="ml-e`
- [590:21] (JSXText) `Manage AI-powered prediction models for enhanced analytics` → key: `analytics.analyticssettings.manage_ai_powered_prediction_models` — Static JSX text node
  - context: `</CardTitle> <CardDescription> Manage AI-powered prediction models for enhanced analytics </C`
- [598:68] (JSXText) `Loading ML models...` → key: `analytics.analyticssettings.loading_ml_models` — Static JSX text node
  - context: `reground" /> <span className="ml-2 text-muted-foreground">Loading ML models...</span> </div> ) : (`
- [627:70] (JSXText) `Last Trained` → key: `analytics.analyticssettings.last_trained` — Static JSX text node
  - context: `<div> <p className="text-muted-foreground">Last Trained</p> <p className="font-medium">`
- [639:70] (JSXText) `Data Points` → key: `analytics.analyticssettings.data_points` — Static JSX text node
  - context: `<div> <p className="text-muted-foreground">Data Points</p> <p className="font-medium">{mode`
- [647:75] (JSXText) `Model Performance` → key: `analytics.analyticssettings.model_performance` — Static JSX text node
  - context: `-sm"> <span className="text-muted-foreground">Model Performance</span> <span>{(model.accurac`
- [693:31] (JSXText) `No model trained yet. Model will be trained automatically when sufficient data is available.` → key: `analytics.analyticssettings.no_model_trained_yet_model` — Static JSX text node
  - context: `p className="text-sm text-muted-foreground mb-3"> No model trained yet. Model will be trained automatically when sufficient data i`
- [709:35] (JSXText) `Train Model` → key: `analytics.analyticssettings.train_model` — Static JSX text node
  - context: `<Brain className="h-3 w-3 mr-1" /> Train Model </> )}`
- [723:23] (JSXText) `About Machine Learning` → key: `analytics.analyticssettings.about_machine_learning` — Static JSX text node
  - context: `ap-2"> <Info className="h-4 w-4" /> About Machine Learning </h5> <p classNam`
- [726:23] (JSXText) `ML models enhance predictions by learning from historical patterns. They require:` → key: `analytics.analyticssettings.ml_models_enhance_predictions_by` — Static JSX text node
  - context: `<p className="text-sm text-muted-foreground"> ML models enhance predictions by learning from historical patterns. They require`
- [729:27] (JSXText) `• Emotion prediction: 7+ days of data` → key: `analytics.analyticssettings.emotion_prediction_7_days_of` — Static JSX text node
  - context: `sName="text-sm text-muted-foreground space-y-1 ml-4"> <li>• Emotion prediction: 7+ days of data</li> <li>• Sensory r`
- [730:27] (JSXText) `• Sensory response: 10+ tracking sessions` → key: `analytics.analyticssettings.sensory_response_10_tracking_sessions` — Static JSX text node
  - context: `<li>• Emotion prediction: 7+ days of data</li> <li>• Sensory response: 10+ tracking sessions</li> <li>• Basel`
- [731:27] (JSXText) `• Baseline clustering: 10+ tracking entries` → key: `analytics.analyticssettings.baseline_clustering_10_tracking_entries` — Static JSX text node
  - context: `<li>• Sensory response: 10+ tracking sessions</li> <li>• Baseline clustering: 10+ tracking entries</li> </ul>`
- [734:23] (JSXText) `Models are trained locally in your browser and improve over time as more data is collected.` → key: `analytics.analyticssettings.models_are_trained_locally_in` — Static JSX text node
  - context: `<p className="text-sm text-muted-foreground"> Models are trained locally in your browser and improve over time as more data is`
- [746:52] (JSXText) `Cache Settings` → key: `analytics.analyticssettings.cache_settings` — Static JSX text node
  - context: `<CardHeader> <CardTitle className="text-base">Cache Settings</CardTitle> <CardDescription>`
- [748:21] (JSXText) `Configure performance optimization settings` → key: `analytics.analyticssettings.configure_performance_optimization_settings` — Static JSX text node
  - context: `he Settings</CardTitle> <CardDescription> Configure performance optimization settings </CardDescription>`
- [754:49] (JSXText) `Cache Duration` → key: `analytics.analyticssettings.cache_duration` — Static JSX text node
  - context: `className="flex items-center"> <Label htmlFor="cacheTTL">Cache Duration</Label> {renderTooltip("How long to keep ca`
- [773:30] (JSXText) `Invalidate cache on config change` → key: `analytics.analyticssettings.invalidate_cache_on_config_change` — Static JSX text node
  - context: `<div className="flex items-center"> <Label>Invalidate cache on config change</Label> {renderTooltip("`
- [785:52] (JSXText) `Import/Export Configuration` → key: `analytics.analyticssettings.import_export_configuration` — Static JSX text node
  - context: `<CardHeader> <CardTitle className="text-base">Import/Export Configuration</CardTitle> <CardDescription>`
- [787:21] (JSXText) `Save and share your configuration settings` → key: `analytics.analyticssettings.save_and_share_your_configuration` — Static JSX text node
  - context: `nfiguration</CardTitle> <CardDescription> Save and share your configuration settings </CardDescription>`
- [797:21] (JSXText) `Export Config` → key: `analytics.analyticssettings.export_config` — Static JSX text node
  - context: `> <Download className="h-4 w-4" /> Export Config </Button> <`
- [808:25] (JSXText) `Import Config` → key: `analytics.analyticssettings.import_config` — Static JSX text node
  - context: `<Upload className="h-4 w-4" /> Import Config </span> </Button>`
- [816:34] (JSXAttribute) `Import configuration file` → key: `analytics.analyticssettings.import_configuration_file` — Static aria-label attribute
  - context: `onChange={handleImport} aria-label="Import configuration file" className="hidden"`
- [833:15] (JSXText) `Reset to Defaults` → key: `analytics.analyticssettings.reset_to_defaults` — Static JSX text node
  - context: `-2" > <RotateCcw className="h-4 w-4" /> Reset to Defaults </Button> <div className=`
- [840:19] (JSXText) `Unsaved changes` → key: `analytics.analyticssettings.unsaved_changes` — Static JSX text node
  - context: `r-4"> <AlertTriangle className="h-4 w-4" /> Unsaved changes </p> )}`
- [857:17] (JSXText) `Save Changes` → key: `analytics.analyticssettings.save_changes` — Static JSX text node
  - context: `2" > <Save className="h-4 w-4" /> Save Changes </Button> </div> </div>`

### src/components/AnalyticsStatusIndicator.tsx
- [119:20] (MessageAPI) `Error refreshing analytics` → key: `analytics.analyticsstatusindicator.error_refreshing_analytics` — Message API call: error()
  - context: `; } loadAnalyticsStatus(); } catch (error) { logger.error('Error refreshing analytics', error); } finally { setIsRefreshing(fals`
- [171:13] (JSXText) `Analytics Status` → key: `analytics.analyticsstatusindicator.analytics_status` — Static JSX text node
  - context: `flex items-center gap-2"> <Brain className="h-5 w-5" /> Analytics Status {studentId && \` - ${analyticsStatus[0]?.studentName`
- [189:16] (JSXText) `No analytics data available` → key: `analytics.analyticsstatusindicator.no_analytics_data_available` — Static JSX text node
  - context: `<Activity className="h-8 w-8 mx-auto mb-2 opacity-50" /> <p>No analytics data available</p> </div> ) : ( <div cl`
- [208:27] (JSXText) `Data Available` → key: `analytics.analyticsstatusindicator.data_available` — Static JSX text node
  - context: `<BarChart3 className="h-3 w-3 mr-1" /> Data Available </Badge> ) : (`
- [213:27] (JSXText) `Collecting Data` → key: `analytics.analyticsstatusindicator.collecting_data` — Static JSX text node
  - context: `<Clock className="h-3 w-3 mr-1" /> Collecting Data </Badge> )}`
- [223:25] (JSXText) `Last updated:` → key: `analytics.analyticsstatusindicator.last_updated` — Static JSX text node
  - context: `{status.lastAnalyzed ? ( <> Last updated:<br /> {formatDistanceToNow(status.lastAnal`
- [236:66] (JSXText) `Active Analytics Systems:` → key: `analytics.analyticsstatusindicator.active_analytics_systems` — Static JSX text node
  - context: `order-border"> <h4 className="font-medium text-foreground mb-3">Active Analytics Systems:</h4> <div className="grid grid-cols-2`
- [240:21] (JSXText) `Pattern Analysis` → key: `analytics.analyticsstatusindicator.pattern_analysis` — Static JSX text node
  - context: `<CheckCircle className="h-4 w-4 text-green-600" /> Pattern Analysis </div> <div className="flex`
- [244:21] (JSXText) `Correlation Analysis` → key: `analytics.analyticsstatusindicator.correlation_analysis` — Static JSX text node
  - context: `<CheckCircle className="h-4 w-4 text-green-600" /> Correlation Analysis </div> <div className="`
- [248:21] (JSXText) `Predictive Insights` → key: `analytics.analyticsstatusindicator.predictive_insights` — Static JSX text node
  - context: `<CheckCircle className="h-4 w-4 text-green-600" /> Predictive Insights </div> <div className="f`
- [252:21] (JSXText) `Anomaly Detection` → key: `analytics.analyticsstatusindicator.anomaly_detection` — Static JSX text node
  - context: `<CheckCircle className="h-4 w-4 text-green-600" /> Anomaly Detection </div> <div className="fle`
- [256:21] (JSXText) `Alert System` → key: `analytics.analyticsstatusindicator.alert_system` — Static JSX text node
  - context: `<CheckCircle className="h-4 w-4 text-green-600" /> Alert System </div> <div className="flex ite`

### src/components/DataQualityFeedback.tsx
- [219:13] (JSXText) `Ingen data tilgjengelig for kvalitetsvurdering` → key: `analytics.dataqualityfeedback.ingen_data_tilgjengelig_for_kvalitetsvurdering` — Static JSX text node
  - context: `uted-foreground" /> <p className="text-muted-foreground"> Ingen data tilgjengelig for kvalitetsvurdering </p> </CardCont`
- [235:61] (JSXText) `Samlet score:` → key: `analytics.dataqualityfeedback.samlet_score` — Static JSX text node
  - context: `tems-center gap-2"> <span className="text-sm text-muted-foreground">Samlet score:</span> <Badge variant={overallScore >= 80 ? 'default'`
- [267:23] (JSXText) `•` → key: `analytics.dataqualityfeedback.` — Static JSX text node
  - context: `y={\`${metric.id}-${rec}\`} className="text-xs opacity-90"> • {rec} </p> ))} </div>`
- [278:44] (JSXText) `Samlet vurdering` → key: `analytics.dataqualityfeedback.samlet_vurdering` — Static JSX text node
  - context: `/20 dark:to-blue-950/20 rounded-lg"> <h4 className="font-medium mb-2">Samlet vurdering</h4> <p className="text-sm text-muted-foreground mb-3`
- [289:51] (JSXText) `Prioriterte forbedringer:` → key: `analytics.dataqualityfeedback.prioriterte_forbedringer` — Static JSX text node
  - context: `<div className="space-y-2"> <h5 className="text-sm font-medium">Prioriterte forbedringer:</h5> {qualityMetrics .fi`

### src/components/ProgressDashboard.tsx
- [221:56] (JSXText) `Total Goals` → key: `analytics.progressdashboard.total_goals` — Static JSX text node
  - context: `between space-y-0 pb-2"> <CardTitle className="text-sm font-medium">Total Goals</CardTitle> <Crosshair className="h-4 w-4 text-muted-for`
- [229:45] (JSXText) `active,` → key: `analytics.progressdashboard.active` — Static JSX text node
  - context: `me="text-xs text-muted-foreground"> {progressMetrics.activeGoals} active, {progressMetrics.achievedGoals} achieved </p> </Ca`
- [236:56] (JSXText) `Overall Progress` → key: `analytics.progressdashboard.overall_progress` — Static JSX text node
  - context: `between space-y-0 pb-2"> <CardTitle className="text-sm font-medium">Overall Progress</CardTitle> <TrendingUp className="h-4 w-4 text-mut`
- [249:56] (JSXText) `On Track` → key: `analytics.progressdashboard.on_track` — Static JSX text node
  - context: `between space-y-0 pb-2"> <CardTitle className="text-sm font-medium">On Track</CardTitle> <CheckCircle className="h-4 w-4 text-green-500"`
- [257:15] (JSXText) `goals meeting expectations` → key: `analytics.progressdashboard.goals_meeting_expectations` — Static JSX text node
  - context: `</div> <p className="text-xs text-muted-foreground"> goals meeting expectations </p> </CardContent> </C`
- [264:56] (JSXText) `At Risk` → key: `analytics.progressdashboard.at_risk` — Static JSX text node
  - context: `between space-y-0 pb-2"> <CardTitle className="text-sm font-medium">At Risk</CardTitle> <Clock className="h-4 w-4 text-red-500" />`
- [272:15] (JSXText) `goals needing attention` → key: `analytics.progressdashboard.goals_needing_attention` — Static JSX text node
  - context: `</div> <p className="text-xs text-muted-foreground"> goals needing attention </p> </CardContent> </Card`
- [290:26] (JSXText) `Progress Trends (Last 3 Months)` → key: `analytics.progressdashboard.progress_trends_last_3_months` — Static JSX text node
  - context: `t-card border-0 shadow-soft"> <CardHeader> <CardTitle>Progress Trends (Last 3 Months)</CardTitle> </CardHeader>`
- [294:33] (JSXAttribute) `Loading trends chart` → key: `analytics.progressdashboard.loading_trends_chart` — Static aria-label attribute
  - context: `rdContent> {isAnalyzingTrends ? ( <div aria-label="Loading trends chart" className="h-[300px] w-full"> <div clas`
- [322:135] (JSXAttribute) `Loading progress trends` → key: `analytics.progressdashboard.loading_progress_trends` — Static aria-label attribute
  - context: `Name="h-[300px] rounded-md border bg-card motion-safe:animate-pulse" aria-label="Loading progress trends" />}> <EChartContainer`
- [326:34] (JSXAttribute) `Progress trends line chart` → key: `analytics.progressdashboard.progress_trends_line_chart` — Static aria-label attribute
  - context: `={option} height={300} aria-label="Progress trends line chart" exportRegistration={{ id: 'pr`
- [338:26] (JSXText) `Recent Goal Updates` → key: `analytics.progressdashboard.recent_goal_updates` — Static JSX text node
  - context: `t-card border-0 shadow-soft"> <CardHeader> <CardTitle>Recent Goal Updates</CardTitle> </CardHeader> <CardConte`
- [376:26] (JSXText) `Goal Completion Trends` → key: `analytics.progressdashboard.goal_completion_trends` — Static JSX text node
  - context: `t-card border-0 shadow-soft"> <CardHeader> <CardTitle>Goal Completion Trends</CardTitle> </CardHeader> <CardCo`
- [401:137] (JSXAttribute) `Loading category chart` → key: `analytics.progressdashboard.loading_category_chart` — Static aria-label attribute
  - context: `Name="h-[300px] rounded-md border bg-card motion-safe:animate-pulse" aria-label="Loading category chart" />}> <EChartContainer`
- [405:36] (JSXAttribute) `Goal completion by category bar chart` → key: `analytics.progressdashboard.goal_completion_by_category_bar` — Static aria-label attribute
  - context: `tion} height={300} aria-label="Goal completion by category bar chart" exportRegistrati`
- [419:28] (JSXText) `Progress by Category` → key: `analytics.progressdashboard.progress_by_category` — Static JSX text node
  - context: `rd border-0 shadow-soft"> <CardHeader> <CardTitle>Progress by Category</CardTitle> </CardHeader> <Card`
- [446:137] (JSXAttribute) `Loading donut chart` → key: `analytics.progressdashboard.loading_donut_chart` — Static aria-label attribute
  - context: `Name="h-[250px] rounded-md border bg-card motion-safe:animate-pulse" aria-label="Loading donut chart" />}> <EChartContainer`
- [450:36] (JSXAttribute) `Progress by category donut chart` → key: `analytics.progressdashboard.progress_by_category_donut_chart` — Static aria-label attribute
  - context: `tion} height={250} aria-label="Progress by category donut chart" exportRegistration={{`
- [461:28] (JSXText) `Category Breakdown` → key: `analytics.progressdashboard.category_breakdown` — Static JSX text node
  - context: `rd border-0 shadow-soft"> <CardHeader> <CardTitle>Category Breakdown</CardTitle> </CardHeader> <CardCo`
- [473:50] (JSXText) `% average progress` → key: `analytics.progressdashboard.average_progress` — Static JSX text node
  - context: `ext-xs text-muted-foreground"> <span>{category.progress}% average progress</span> <span>{category.achieved} achi`
- [487:26] (JSXText) `Priority Goals Requiring Attention` → key: `analytics.progressdashboard.priority_goals_requiring_attention` — Static JSX text node
  - context: `t-card border-0 shadow-soft"> <CardHeader> <CardTitle>Priority Goals Requiring Attention</CardTitle> </CardHeader>`
- [513:25] (JSXText) `⚠️ This goal is past its target date and may need review or extension.` → key: `analytics.progressdashboard.this_goal_is_past_its` — Static JSX text node
  - context: `uctive/20 rounded text-sm text-destructive-foreground"> ⚠️ This goal is past its target date and may need review or extension.`
- [518:25] (JSXText) `📈 Consider increasing intervention intensity to meet target date.` → key: `analytics.progressdashboard.consider_increasing_intervention_intensity_to` — Static JSX text node
  - context: `er-warning/20 rounded text-sm text-warning-foreground"> 📈 Consider increasing intervention intensity to meet target date.`
- [526:80] (JSXText) `All goals are on track!` → key: `analytics.progressdashboard.all_goals_are_on_track` — Static JSX text node
  - context: `<p className="text-lg font-medium text-success-foreground">All goals are on track!</p> <p className="text-muted-foregro`
- [527:58] (JSXText) `Great work keeping` → key: `analytics.progressdashboard.great_work_keeping` — Static JSX text node
  - context: `oals are on track!</p> <p className="text-muted-foreground">Great work keeping {student.name}'s progress moving forward.</p>`
- [527:91] (JSXText) `'s progress moving forward.` → key: `analytics.progressdashboard.s_progress_moving_forward` — Static JSX text node
  - context: `<p className="text-muted-foreground">Great work keeping {student.name}'s progress moving forward.</p> </div> )}`

### src/components/ReportBuilder.tsx
- [474:15] (JSXText) `Create Report` → key: `analytics.reportbuilder.create_report` — Static JSX text node
  - context: `nt-dyslexia"> <FileText className="h-4 w-4 mr-2" /> Create Report </Button> </DialogTrigger> <Dialog`

### src/components/analytics-panels/CorrelationsPanel.tsx
- [72:131] (JSXAttribute) `Loading correlations` → key: `analytics.correlationspanel.loading_correlations` — Static aria-label attribute
  - context: `Name="h-[420px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label="Loading correlations" />}> <EChartContainer option={option} he`
- [97:49] (JSXText) `↔` → key: `analytics.correlationspanel.` — Static JSX text node
  - context: `="font-medium text-foreground"> {correlation.factor1} ↔ {correlation.factor2} </h4> <p`

### src/components/analytics-panels/EntryDetailsDrawer.tsx
- [54:63] (JSXText) `Ingen data` → key: `analytics.entrydetailsdrawer.ingen_data` — Static JSX text node
  - context: `{!source && ( <div className="mt-4 text-sm text-muted-foreground">Ingen data</div> )} {source && ( <div className="mt-4`
- [70:54] (JSXText) `Følelser` → key: `analytics.entrydetailsdrawer.f_lelser` — Static JSX text node
  - context: `th ? ( <div> <div className="text-sm font-medium">Følelser</div> <ul className="mt-1 text-sm list-disc pl-5">`
- [108:72] (JSXText) `Kopier som tekst` → key: `analytics.entrydetailsdrawer.kopier_som_tekst` — Static JSX text node
  - context: `="pt-2"> <Button variant="outline" size="sm" onClick={copyAsText}>Kopier som tekst</Button> </div> </div> )} <`

### src/components/analytics-panels/ExplanationChat.tsx
- [78:19] (MessageAPI) `Kunne ikke hente AI-svar` → key: `analytics.explanationchat.kunne_ikke_hente_ai_svar` — Message API call: error()
  - context: `{ textareaRef.current?.focus(); } catch {} } catch (e) { toast.error('Kunne ikke hente AI-svar'); } finally { setPending(false); } };`
- [78:19] (MessageAPI) `Kunne ikke hente AI-svar` → key: `analytics.explanationchat.kunne_ikke_hente_ai_svar` — sonner toast.error()
  - context: `{ textareaRef.current?.focus(); } catch {} } catch (e) { toast.error('Kunne ikke hente AI-svar'); } finally { setPending(false); } };`
- [161:28] (JSXAttribute) `Kopier melding` → key: `analytics.explanationchat.kopier_melding` — Static aria-label attribute
  - context: `ded border text-muted-foreground hover:bg-accent/40" aria-label="Kopier melding" title="Kopier melding" onClick=`
- [162:23] (JSXAttribute) `Kopier melding` → key: `analytics.explanationchat.kopier_melding` — Static title attribute
  - context: `bg-accent/40" aria-label="Kopier melding" title="Kopier melding" onClick={async () => { try {`
- [186:19] (JSXAttribute) `Toggle kildeliste` → key: `analytics.explanationchat.toggle_kildeliste` — Static title attribute
  - context: `n rounded px-1 py-1 text-muted-foreground hover:bg-accent/30" title="Toggle kildeliste" > <span className="font-medium">Kilder`
- [188:43] (JSXText) `Kilder fra data (` → key: `analytics.explanationchat.kilder_fra_data` — Static JSX text node
  - context: `title="Toggle kildeliste" > <span className="font-medium">Kilder fra data ({sList.length})</span> <span className={\`inline-fle`
- [191:52] (JSXText) `Klikk for å skjule` → key: `analytics.explanationchat.klikk_for_skjule` — Static JSX text node
  - context: `{!sourcesCollapsed && ( <span className="hidden sm:inline">Klikk for å skjule</span> )} {sourcesCollapsed && (`
- [194:52] (JSXText) `Klikk for å vise` → key: `analytics.explanationchat.klikk_for_vise` — Static JSX text node
  - context: `{sourcesCollapsed && ( <span className="hidden sm:inline">Klikk for å vise</span> )} <ChevronDown className={\``
- [244:83] (JSXText) `Kilder fra data (` → key: `analytics.explanationchat.kilder_fra_data` — Static JSX text node
  - context: `<summary className="cursor-pointer select-none text-muted-foreground">Kilder fra data ({sources.length})</summary> <ul className="mt-2 lis`

### src/components/analytics-panels/ExplanationContent.tsx
- [36:24] (JSXAttribute) `Kopier tekst` → key: `analytics.explanationcontent.kopier_tekst` — Static aria-label attribute
  - context: `onClick={() => hasText && onCopy?.(text as string)} aria-label="Kopier tekst" title="Kopier tekst" > <Copy cl`
- [37:19] (JSXAttribute) `Kopier tekst` → key: `analytics.explanationcontent.kopier_tekst` — Static title attribute
  - context: `Copy?.(text as string)} aria-label="Kopier tekst" title="Kopier tekst" > <Copy className="h-4 w-4 mr-2" />Kopier`
- [46:24] (JSXAttribute) `Legg til i rapport` → key: `analytics.explanationcontent.legg_til_i_rapport` — Static aria-label attribute
  - context: `Click={() => hasText && onAddToReport?.(text as string)} aria-label="Legg til i rapport" title="Legg til i rapport" >`
- [47:19] (JSXAttribute) `Legg til i rapport` → key: `analytics.explanationcontent.legg_til_i_rapport` — Static title attribute
  - context: `(text as string)} aria-label="Legg til i rapport" title="Legg til i rapport" > <FileText className="h-4 w-4 mr-2"`
- [56:48] (JSXText) `Henter forklaring…` → key: `analytics.explanationcontent.henter_forklaring` — Static JSX text node
  - context: `{status === 'loading' && ( <p className="text-muted-foreground">Henter forklaring…</p> )} {status === 'error' && ( <p`

### src/components/analytics-panels/ExplanationDock.tsx
- [81:107] (JSXAttribute) `Data readiness for sosiale triggere` → key: `analytics.explanationdock.data_readiness_for_sosiale_triggere` — Static aria-label attribute
  - context: `adinessDetailsRef} className="mb-2 rounded border px-3 py-2 text-xs" aria-label="Data readiness for sosiale triggere"> <summary className="cursor-po`
- [84:17] (JSXText) `Data readiness for sosiale triggere:` → key: `analytics.explanationdock.data_readiness_for_sosiale_triggere` — Static JSX text node
  - context: `s.label === 'partial' ? 'text-yellow-500' : 'text-orange-500'}> Data readiness for sosiale triggere: {Math.round(readiness.score * 100)}% ({read`
- [101:23] (JSXText) `Legg til sosiale eksempler (dev)` → key: `analytics.explanationdock.legg_til_sosiale_eksempler_dev` — Static JSX text node
  - context: `a(dataset.entries[0].studentId); }} > Legg til sosiale eksempler (dev) </Button>`
- [139:78] (JSXText) `Chat om forklaringen` → key: `analytics.explanationdock.chat_om_forklaringen` — Static JSX text node
  - context: `"> <h5 className="mb-2 text-sm font-medium text-muted-foreground">Chat om forklaringen</h5> <ExplanationChat aiEnabl`

### src/components/analytics-panels/ExplanationSheet.tsx
- [98:80] (JSXText) `Chat om forklaringen` → key: `analytics.explanationsheet.chat_om_forklaringen` — Static JSX text node
  - context: `<h5 className="mb-2 text-sm font-medium text-muted-foreground">Chat om forklaringen</h5> <ExplanationChat aiE`

### src/components/analytics-panels/ExplanationTabs.tsx
- [67:23] (MessageAPI) `[UI] explanationV2.tabChange` → key: `analytics.explanationtabs.ui_explanationv2_tabchange` — Message API call: info()
  - context: `ring) => { setTab(val); writeStorage('tab', val); try { logger.info('[UI] explanationV2.tabChange', { tab: val, pattern: patternTitle }); } catch {}`
- [119:21] (JSXAttribute) `Skjul alt` → key: `analytics.explanationtabs.skjul_alt` — Static title attribute
  - context: `py-1 text-[11px] text-muted-foreground hover:bg-accent/40" title="Skjul alt" onClick={() => { try { window.dispatch`
- [121:103] (MessageAPI) `[UI] explanationV2.collapseAll` → key: `analytics.explanationtabs.ui_explanationv2_collapseall` — Message API call: info()
  - context: `window.dispatchEvent(new CustomEvent('explanationV2:collapseAll')); logger.info('[UI] explanationV2.collapseAll'); } catch {} setShowAllKilder(f`
- [125:15] (JSXText) `Skjul alt` → key: `analytics.explanationtabs.skjul_alt` — Static JSX text node
  - context: `setShowAllKilder(false); }} > Skjul alt </button> <button type="button"`
- [130:21] (JSXAttribute) `Vis alt` → key: `analytics.explanationtabs.vis_alt` — Static title attribute
  - context: `py-1 text-[11px] text-muted-foreground hover:bg-accent/40" title="Vis alt" onClick={() => { try { window.dispatchEv`
- [132:101] (MessageAPI) `[UI] explanationV2.expandAll` → key: `analytics.explanationtabs.ui_explanationv2_expandall` — Message API call: info()
  - context: `{ window.dispatchEvent(new CustomEvent('explanationV2:expandAll')); logger.info('[UI] explanationV2.expandAll'); } catch {} setShowAllKilder(tru`
- [136:15] (JSXText) `Vis alt` → key: `analytics.explanationtabs.vis_alt` — Static JSX text node
  - context: `setShowAllKilder(true); }} > Vis alt </button> </div> </div> <TabsCont`
- [164:60] (JSXText) `Åpne fanen for å laste kilder…` → key: `analytics.explanationtabs.pne_fanen_for_laste_kilder` — Static JSX text node
  - context: `!visited.kilder ? ( <div className="text-sm text-muted-foreground">Åpne fanen for å laste kilder…</div> ) : sourcesList.length === 0 ? (`
- [166:60] (JSXText) `Ingen kilder tilgjengelig.` → key: `analytics.explanationtabs.ingen_kilder_tilgjengelig` — Static JSX text node
  - context: `ist.length === 0 ? ( <div className="text-sm text-muted-foreground">Ingen kilder tilgjengelig.</div> ) : ( <div className="spa`
- [170:64] (JSXText) `Kilder fra data (` → key: `analytics.explanationtabs.kilder_fra_data` — Static JSX text node
  - context: `ustify-between"> <div className="text-sm text-muted-foreground">Kilder fra data ({sourcesList.length})</div> <button`
- [208:60] (JSXText) `Åpne fanen for å vise henvisninger…` → key: `analytics.explanationtabs.pne_fanen_for_vise_henvisninger` — Static JSX text node
  - context: `ted.henvisninger ? ( <div className="text-sm text-muted-foreground">Åpne fanen for å vise henvisninger…</div> ) : sourcesList.length === 0`
- [210:60] (JSXText) `Ingen henvisninger.` → key: `analytics.explanationtabs.ingen_henvisninger` — Static JSX text node
  - context: `ist.length === 0 ? ( <div className="text-sm text-muted-foreground">Ingen henvisninger.</div> ) : ( <div className="space-y-2"`

### src/components/analytics-panels/PatternsPanel.tsx
- [279:21] (MessageAPI) `Kopiert til utklippstavlen` → key: `analytics.patternspanel.kopiert_til_utklippstavlen` — Message API call: success()
  - context: `try { await navigator.clipboard.writeText(text); toast.success('Kopiert til utklippstavlen'); } catch { toast.error('Kunne ikke kopie`
- [279:21] (MessageAPI) `Kopiert til utklippstavlen` → key: `analytics.patternspanel.kopiert_til_utklippstavlen` — sonner toast.success()
  - context: `try { await navigator.clipboard.writeText(text); toast.success('Kopiert til utklippstavlen'); } catch { toast.error('Kunne ikke kopie`
- [281:19] (MessageAPI) `Kunne ikke kopiere` → key: `analytics.patternspanel.kunne_ikke_kopiere` — Message API call: error()
  - context: `toast.success('Kopiert til utklippstavlen'); } catch { toast.error('Kunne ikke kopiere'); } }; const handleAddToReport = (text: string) =>`
- [281:19] (MessageAPI) `Kunne ikke kopiere` → key: `analytics.patternspanel.kunne_ikke_kopiere` — sonner toast.error()
  - context: `toast.success('Kopiert til utklippstavlen'); } catch { toast.error('Kunne ikke kopiere'); } }; const handleAddToReport = (text: string) =>`
- [287:22] (MessageAPI) `Lagt til i rapportutkast` → key: `analytics.patternspanel.lagt_til_i_rapportutkast` — Message API call: info()
  - context: `> { // Placeholder for integration with report builder try { toast.info('Lagt til i rapportutkast'); } catch {} }; const current = selectedKey ? ex`
- [287:22] (MessageAPI) `Lagt til i rapportutkast` → key: `analytics.patternspanel.lagt_til_i_rapportutkast` — sonner toast.info()
  - context: `> { // Placeholder for integration with report builder try { toast.info('Lagt til i rapportutkast'); } catch {} }; const current = selectedKey ? ex`
- [577:68] (JSXText) `•` → key: `analytics.patternspanel.` — Static JSX text node
  - context: `tart gap-2"> <span className="text-primary">•</span> <span>{rec}</span>`

### src/components/analytics/FiltersDrawer.tsx
- [200:31] (JSXText) `×` → key: `analytics.filtersdrawer.` — Static JSX text node
  - context: `}))} > × </button> </Badge>`
- [238:31] (JSXText) `×` → key: `analytics.filtersdrawer.` — Static JSX text node
  - context: `}))} > × </button> </Badge>`

### src/components/analytics/panels/AlertsPanel.tsx
- [135:20] (MessageAPI) `Failed to resolve alert in pinned rail` → key: `analytics.alertspanel.failed_to_resolve_alert_in` — Message API call: error()
  - context: `tAnalytics('alerts.resolveSuccess'))); } catch (error) { logger.error('Failed to resolve alert in pinned rail', error); toast.error(String(tAnal`

### src/components/analytics/panels/OverviewPanel.tsx
- [70:34] (JSXAttribute) `overview-insights-title` → key: `analytics.overviewpanel.overview_insights_title` — Static aria-labelledby attribute
  - context: `Type} /> </Suspense> </div> <section aria-labelledby="overview-insights-title" className="space-y-3"> <h3 id="overview-insi`

### src/components/charts/EChartContainer.tsx
- [387:22] (MessageAPI) `[EChartContainer] Option normalization failed` → key: `analytics.echartcontainer.echartcontainer_option_normalization_failed` — Message API call: error()
  - context: `tion; } catch (e) { if (import.meta?.env?.DEV) { logger.error("[EChartContainer] Option normalization failed", { error: e }); } re`
- [459:22] (MessageAPI) `[EChartContainer] Theme merge failed` → key: `analytics.echartcontainer.echartcontainer_theme_merge_failed` — Message API call: error()
  - context: `tion; } catch (e) { if (import.meta?.env?.DEV) { logger.error("[EChartContainer] Theme merge failed", { error: e, optionP`

### src/components/charts/TrendsChart.tsx
- [37:16] (JSXText) `No data available for selected time range` → key: `analytics.trendschart.no_data_available_for_selected` — Static JSX text node
  - context: `<Activity className="h-16 w-16 mx-auto mb-4 opacity-50" /> <p>No data available for selected time range</p> <p className="text-xs`
- [38:41] (JSXText) `Try expanding the time range or adjusting filters` → key: `analytics.trendschart.try_expanding_the_time_range` — Static JSX text node
  - context: `a available for selected time range</p> <p className="text-xs mt-1">Try expanding the time range or adjusting filters</p> </div> <`
- [79:123] (JSXAttribute) `Loading trends` → key: `analytics.trendschart.loading_trends` — Static aria-label attribute
  - context: `Name="h-[400px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label="Loading trends" />}> <EChartContainer option={option}`
- [89:18] (MessageAPI) `TrendsChart.renderChart failed` → key: `analytics.trendschart.trendschart_renderchart_failed` — Message API call: error()
  - context: `/> </React.Suspense> ); } catch (error) { logger.error("TrendsChart.renderChart failed", { error }); return ( <div className=`
- [94:14] (JSXText) `Could not render chart` → key: `analytics.trendschart.could_not_render_chart` — Static JSX text node
  - context: `<Activity className="h-16 w-16 mx-auto mb-4 opacity-50" /> <p>Could not render chart</p> <p className="text-xs mt-1">An internal err`
- [95:39] (JSXText) `An internal error occurred while building the chart` → key: `analytics.trendschart.an_internal_error_occurred_while` — Static JSX text node
  - context: `> <p>Could not render chart</p> <p className="text-xs mt-1">An internal error occurred while building the chart</p> </div> </d`

### src/components/profile-sections/AnalyticsSection.tsx
- [126:29] (JSXAttribute) `ai-analysis-toggle-label` → key: `analytics.analyticssection.ai_analysis_toggle_label` — Static aria-labelledby attribute
  - context: `efaults.available} aria-checked={useAI} aria-labelledby="ai-analysis-toggle-label" aria-describedby="ai-analysis-toggle-desc`
- [127:30] (JSXAttribute) `ai-analysis-toggle-desc` → key: `analytics.analyticssection.ai_analysis_toggle_desc` — Static aria-describedby attribute
  - context: `aria-labelledby="ai-analysis-toggle-label" aria-describedby="ai-analysis-toggle-desc" data-testid="ai-toggle" />`

## Namespace: common

### src/components/AdvancedFilterPanel.tsx
- [395:47] (JSXAttribute) `Select triggers to include` → key: `common.advancedfilterpanel.select_triggers_to_include` — Static aria-label attribute
  - context: `}} > <SelectTrigger aria-label="Select triggers to include"> <SelectValue placeholder="Se`
- [396:48] (JSXAttribute) `Select triggers to include` → key: `common.advancedfilterpanel.select_triggers_to_include` — Static placeholder attribute
  - context: `el="Select triggers to include"> <SelectValue placeholder="Select triggers to include" /> </SelectTrigger>`
- [697:30] (JSXAttribute) `Filter name` → key: `common.advancedfilterpanel.filter_name` — Static aria-label attribute
  - context: `eholder={String(tCommon('filterNamePlaceholder'))} aria-label="Filter name" value={filterName} onChange={(`
- [745:42] (JSXAttribute) `Delete saved filter` → key: `common.advancedfilterpanel.delete_saved_filter` — Static aria-label attribute
  - context: `variant="ghost" aria-label="Delete saved filter" title="Delete saved filter"`
- [746:37] (JSXAttribute) `Delete saved filter` → key: `common.advancedfilterpanel.delete_saved_filter` — Static title attribute
  - context: `aria-label="Delete saved filter" title="Delete saved filter" onClick={() => onDeleteFilte`

### src/components/AlertManager.tsx
- [81:20] (MessageAPI) `Failed to resolve alert` → key: `common.alertmanager.failed_to_resolve_alert` — Message API call: error()
  - context: `tAnalytics('alerts.resolveSuccess'))); } catch (error) { logger.error('Failed to resolve alert', error); toast.error(String(tAnalytics('alerts.r`
- [215:68] (JSXText) `•` → key: `common.alertmanager.` — Static JSX text node
  - context: `tart gap-2"> <span className="text-primary">•</span> <span>{rec}</span>`
- [265:54] (JSXText) `•` → key: `common.alertmanager.` — Static JSX text node
  - context: `="flex items-start gap-2"> <span className="text-primary">•</span> <span>{recommendation}</span>`

### src/components/ComparisonSummary.tsx
- [352:27] (JSXText) `Δ` → key: `common.comparisonsummary.` — Static JSX text node
  - context: `der-emerald-200' : 'text-rose-700 border-rose-200')}> Δ {(c.deltaStrength * 100).toFixed(0)}% </Badge>`
- [359:101] (JSXText) `→` → key: `common.comparisonsummary.` — Static JSX text node
  - context: `{tAnalytics('interface.impactChange')} {String(c.impactChange.from || '—')} → {String(c.impactChange.to || '—')} </div>`
- [435:37] (JSXText) `Δ strength:` → key: `common.comparisonsummary.strength` — Static JSX text node
  - context: `"text-[13px] mt-1 flex items-center gap-2"> <span>Δ strength: {(c.deltaStrength ?? 0).toFixed(2)}</span>`
- [436:112] (JSXText) `→` → key: `common.comparisonsummary.` — Static JSX text node
  - context: `c.impactChange && <Badge variant="outline">{String(c.impactChange.from || '—')} → {String(c.impactChange.to || '—')}</Badge>} </div>`
- [443:74] (JSXAttribute) `Vis flere endrede mønstre` → key: `common.comparisonsummary.vis_flere_endrede_m_nstre` — Static aria-label attribute
  - context: `mt-1"> <Button size="sm" variant="outline" aria-label="Vis flere endrede mønstre" onClick={() => setPatLimit(p => p + 8)}>Vis flere</B`
- [443:142] (JSXText) `Vis flere` → key: `common.comparisonsummary.vis_flere` — Static JSX text node
  - context: `aria-label="Vis flere endrede mønstre" onClick={() => setPatLimit(p => p + 8)}>Vis flere</Button> </div> )}`
- [457:165] (JSXText) `–` → key: `common.comparisonsummary.` — Static JSX text node
  - context: `ground">{tAnalytics('interface.none')}</li> : removed.map(r => <li key={r.name}>– {r.name}</li>)} </ul> </`
- [487:74] (JSXAttribute) `Vis flere korrelasjonsendringer` → key: `common.comparisonsummary.vis_flere_korrelasjonsendringer` — Static aria-label attribute
  - context: `mt-1"> <Button size="sm" variant="outline" aria-label="Vis flere korrelasjonsendringer" onClick={() => setCorrLimit(p => p + 8)}>Vis f`
- [487:149] (JSXText) `Vis flere` → key: `common.comparisonsummary.vis_flere` — Static JSX text node
  - context: `abel="Vis flere korrelasjonsendringer" onClick={() => setCorrLimit(p => p + 8)}>Vis flere</Button> </div> )}`
- [493:71] (JSXText) `Nye korrelasjoner` → key: `common.comparisonsummary.nye_korrelasjoner` — Static JSX text node
  - context: `<div> <div className="text-sm font-medium mb-1">Nye korrelasjoner</div> <ul className="text-sm space`
- [499:71] (JSXText) `Fjernede korrelasjoner` → key: `common.comparisonsummary.fjernede_korrelasjoner` — Static JSX text node
  - context: `<div> <div className="text-sm font-medium mb-1">Fjernede korrelasjoner</div> <ul className="text-sm`
- [501:164] (JSXText) `–` → key: `common.comparisonsummary.` — Static JSX text node
  - context: `eground">{tAnalytics('interface.none')}</li> : removed.map(r => <li key={r.key}>– {r.variables.join(' × ')}</li>)} </ul>`
- [536:98] (JSXAttribute) `Vis flere nye tiltak` → key: `common.comparisonsummary.vis_flere_nye_tiltak` — Static aria-label attribute
  - context: `<div className="mt-1"><Button size="sm" variant="outline" aria-label="Vis flere nye tiltak" onClick={() => setIntAddedLimit(p => p + 8)}>Vis flere</B`
- [536:166] (JSXText) `Vis flere` → key: `common.comparisonsummary.vis_flere` — Static JSX text node
  - context: `aria-label="Vis flere nye tiltak" onClick={() => setIntAddedLimit(p => p + 8)}>Vis flere</Button></div> )} </`
- [556:98] (JSXAttribute) `Vis flere fjernede tiltak` → key: `common.comparisonsummary.vis_flere_fjernede_tiltak` — Static aria-label attribute
  - context: `<div className="mt-1"><Button size="sm" variant="outline" aria-label="Vis flere fjernede tiltak" onClick={() => setIntRemovedLimit(p => p + 8)}>Vis f`
- [556:173] (JSXText) `Vis flere` → key: `common.comparisonsummary.vis_flere` — Static JSX text node
  - context: `abel="Vis flere fjernede tiltak" onClick={() => setIntRemovedLimit(p => p + 8)}>Vis flere</Button></div> )} </`
- [562:69] (JSXText) `Endret tillit` → key: `common.comparisonsummary.endret_tillit` — Static JSX text node
  - context: `<div> <div className="text-sm font-medium mb-1">Endret tillit</div> <ul className="text-sm space-y-1">`
- [566:42] (JSXText) `: Δ` → key: `common.comparisonsummary.` — Static JSX text node
  - context: `<li key={c.title}> {c.title}: Δ {(c.deltaConfidence ?? 0).toFixed(2)} </li>`
- [599:74] (JSXText) `–` → key: `common.comparisonsummary.` — Static JSX text node
  - context: `) => ( <li key={\`removed-${s}\`} className="text-rose-700">– {s}</li> ))} </ul> </div`

### src/components/ConfidenceIndicator.tsx
- [104:19] (JSXText) `•` → key: `common.confidenceindicator.` — Static JSX text node
  - context: `key={explanation} className="text-xs text-muted-foreground"> • {explanation} </div> ))} </div>`

### src/components/DataCollectionRoadmap.tsx
- [149:13] (JSXText) `Start datainnsamlingen for å se ditt fremgangskart mot høyere sikkerhetsnivåer.` → key: `common.datacollectionroadmap.start_datainnsamlingen_for_se_ditt` — Static JSX text node
  - context: `foreground" /> <p className="text-muted-foreground mb-4"> Start datainnsamlingen for å se ditt fremgangskart mot høyere sikkerhetsnivåer.`
- [164:11] (JSXText) `Fremgang mot høyere sikkerhetsnivå gjennom systematisk datainnsamling` → key: `common.datacollectionroadmap.fremgang_mot_h_yere_sikkerhetsniv` — Static JSX text node
  - context: `</CardTitle> <div className="text-sm text-muted-foreground"> Fremgang mot høyere sikkerhetsnivå gjennom systematisk datainnsamling </`
- [171:43] (JSXText) `Din fremgang` → key: `common.datacollectionroadmap.din_fremgang` — Static JSX text node
  - context: `x items-center justify-between mb-2"> <span className="font-medium">Din fremgang</span> <Badge variant="outline"> {milesto`
- [173:82] (JSXText) `milepæler` → key: `common.datacollectionroadmap.milep_ler` — Static JSX text node
  - context: `{milestones.filter(m => m.achieved).length} av {milestones.length} milepæler </Badge> </div> <div className="grid g`
- [196:45] (JSXText) `Neste mål:` → key: `common.datacollectionroadmap.neste_m_l` — Static JSX text node
  - context: `</div> <div> <h4 className="font-medium">Neste mål: {nextMilestone.title}</h4> <p className="text-sm text`
- [220:17] (JSXText) `Estimert ferdigdato:` → key: `common.datacollectionroadmap.estimert_ferdigdato` — Static JSX text node
  - context: `"> <Calendar className="h-4 w-4 inline mr-1" /> Estimert ferdigdato: {formatDate(nextMilestone.estimatedDate)} </d`
- [228:39] (JSXText) `Komplett veikart` → key: `common.datacollectionroadmap.komplett_veikart` — Static JSX text node
  - context: `e */} <div className="space-y-4"> <h4 className="font-medium">Komplett veikart</h4> <div className="relative"> {/* Timel`

### src/components/DataRequirementsCalculator.tsx
- [140:13] (JSXText) `Datakrav for sikkerhetsnivå` → key: `common.datarequirementscalculator.datakrav_for_sikkerhetsniv` — Static JSX text node
  - context: `lex items-center gap-2"> <Target className="h-5 w-5" /> Datakrav for sikkerhetsnivå </CardTitle> </CardHeader>`
- [146:13] (JSXText) `Ingen data registrert ennå. Start med å samle data for å se fremgang mot sikkerhetsnivåer.` → key: `common.datarequirementscalculator.ingen_data_registrert_enn_start` — Static JSX text node
  - context: `foreground" /> <p className="text-muted-foreground mb-4"> Ingen data registrert ennå. Start med å samle data for å se fremgang mot sikkerh`
- [149:13] (JSXText) `Start datainnsamling` → key: `common.datarequirementscalculator.start_datainnsamling` — Static JSX text node
  - context: `kkerhetsnivåer. </p> <Button variant="outline"> Start datainnsamling </Button> </CardContent> </Card>`
- [161:11] (JSXText) `Datakrav for sikkerhetsnivå` → key: `common.datarequirementscalculator.datakrav_for_sikkerhetsniv` — Static JSX text node
  - context: `e="flex items-center gap-2"> <Target className="h-5 w-5" /> Datakrav for sikkerhetsnivå </CardTitle> <div className="flex it`
- [164:44] (JSXText) `datapunkter samlet` → key: `common.datarequirementscalculator.datapunkter_samlet` — Static JSX text node
  - context: `ap-4 text-sm text-muted-foreground"> <span>{currentStatus.dataPoints} datapunkter samlet</span> <span>{currentStatus.daysSpan} dager med dat`
- [165:42] (JSXText) `dager med data` → key: `common.datarequirementscalculator.dager_med_data` — Static JSX text node
  - context: `.dataPoints} datapunkter samlet</span> <span>{currentStatus.daysSpan} dager med data</span> </div> </CardHeader> <CardContent clas`
- [172:40] (JSXText) `Nåværende sikkerhetsnivå` → key: `common.datarequirementscalculator.n_v_rende_sikkerhetsniv` — Static JSX text node
  - context: `bg-muted/50 rounded-lg"> <div> <p className="font-medium">Nåværende sikkerhetsnivå</p> <p className="text-sm text-muted-foregr`
- [189:43] (JSXText) `Fremgang mot` → key: `common.datarequirementscalculator.fremgang_mot` — Static JSX text node
  - context: `="flex items-center justify-between"> <h4 className="font-medium">Fremgang mot {nextTarget.requirement.description}</h4> <span class`
- [191:50] (JSXText) `% fullført` → key: `common.datarequirementscalculator.fullf_rt` — Static JSX text node
  - context: `ext-sm text-muted-foreground"> {Math.round(nextTarget.progress)}% fullført </span> </div> <Pr`
- [206:52] (JSXText) `flere datapunkter trengs` → key: `common.datarequirementscalculator.flere_datapunkter_trengs` — Static JSX text node
  - context: `t-xs text-muted-foreground"> {nextTarget.dataPoints.needed} flere datapunkter trengs </p> )}`
- [219:46] (JSXText) `flere dager trengs` → key: `common.datarequirementscalculator.flere_dager_trengs` — Static JSX text node
  - context: `e="text-xs text-muted-foreground"> {nextTarget.days.needed} flere dager trengs </p> )} </div`
- [232:44] (JSXText) `datapunkt(er) per dag vil du nå` → key: `common.datarequirementscalculator.datapunkt_er_per_dag_vil` — Static JSX text node
  - context: `e="text-sm text-info-foreground/80"> Med {getRecommendedRate()} datapunkt(er) per dag vil du nå{' '} <span className="font-mediu`
- [243:39] (JSXText) `Alle sikkerhetsnivåer` → key: `common.datarequirementscalculator.alle_sikkerhetsniv_er` — Static JSX text node
  - context: `w */} <div className="space-y-3"> <h4 className="font-medium">Alle sikkerhetsnivåer</h4> {progressCalculations.map((calc) => (`
- [261:54] (JSXText) `datapunkter over` → key: `common.datarequirementscalculator.datapunkter_over` — Static JSX text node
  - context: `xs text-muted-foreground"> {calc.requirement.minDataPoints} datapunkter over {calc.requirement.minDays} dager </p>`
- [271:42] (JSXText) `dager igjen` → key: `common.datarequirementscalculator.dager_igjen` — Static JSX text node
  - context: `="text-xs text-muted-foreground mt-1"> ~{calc.daysToTarget} dager igjen </p> )} </div>`
- [287:19] (JSXText) `• Samle` → key: `common.datarequirementscalculator.samle` — Static JSX text node
  - context: `<ul className="text-sm text-primary-foreground/80 space-y-1"> <li>• Samle {getRecommendedRate()} datapunkt(er) per dag for optimal fremgang</li>`
- [287:50] (JSXText) `datapunkt(er) per dag for optimal fremgang` → key: `common.datarequirementscalculator.datapunkt_er_per_dag_for` — Static JSX text node
  - context: `mary-foreground/80 space-y-1"> <li>• Samle {getRecommendedRate()} datapunkt(er) per dag for optimal fremgang</li> <li>• Registrer da`
- [288:19] (JSXText) `• Registrer data konsekvent for bedre mønstergjenkjenning` → key: `common.datarequirementscalculator.registrer_data_konsekvent_for_bedre` — Static JSX text node
  - context: `mendedRate()} datapunkt(er) per dag for optimal fremgang</li> <li>• Registrer data konsekvent for bedre mønstergjenkjenning</li> <li`
- [289:19] (JSXText) `• Inkluder både følelser og sensoriske opplevelser i hver økt` → key: `common.datarequirementscalculator.inkluder_b_de_f_lelser` — Static JSX text node
  - context: `Registrer data konsekvent for bedre mønstergjenkjenning</li> <li>• Inkluder både følelser og sensoriske opplevelser i hver økt</li>`
- [290:19] (JSXText) `• Noter miljøfaktorer for å identifisere sammenhenger` → key: `common.datarequirementscalculator.noter_milj_faktorer_for_identifisere` — Static JSX text node
  - context: `luder både følelser og sensoriske opplevelser i hver økt</li> <li>• Noter miljøfaktorer for å identifisere sammenhenger</li> </ul>`

### src/components/DateRangeSelector.tsx
- [122:36] (JSXAttribute) `Quick select` → key: `common.daterangeselector.quick_select` — Static placeholder attribute
  - context: `lassName="w-[160px] bg-input border-border"> <SelectValue placeholder="Quick select" /> </SelectTrigger> <SelectContent> {pr`
- [154:21] (JSXText) `Pick a date range` → key: `common.daterangeselector.pick_a_date_range` — Static JSX text node
  - context: `eRange.from, "LLL dd, y") ) ) : ( <span>Pick a date range</span> )} <ChevronDown className="ml-a`

### src/components/DevErrorBanner.tsx
- [46:22] (MessageAPI) `Dev error captured` → key: `common.deverrorbanner.dev_error_captured` — Message API call: error()
  - context: `// Record through central logger; recursion guarded above logger.error('Dev error captured', ...args); } catch (e) { logger.error('Error`
- [48:22] (MessageAPI) `Error in DevErrorBanner console.error interceptor` → key: `common.deverrorbanner.error_in_deverrorbanner_console_error` — Message API call: error()
  - context: `.error('Dev error captured', ...args); } catch (e) { logger.error('Error in DevErrorBanner console.error interceptor', e); } finally {`
- [61:20] (MessageAPI) `Window error` → key: `common.deverrorbanner.window_error` — Message API call: error()
  - context: `=> c + 1); // Log window errors through central logger logger.error('Window error', e.error || new Error(e.message)); }; const onUnhandledRe`
- [70:20] (MessageAPI) `Unhandled promise rejection` → key: `common.deverrorbanner.unhandled_promise_rejection` — Message API call: error()
  - context: `1); // Log unhandled rejections through central logger logger.error('Unhandled promise rejection', reason instanceof Error ? reason : new Error(msg)`

### src/components/EnhancedDataVisualization.tsx
- [66:63] (JSXText) `No data to display` → key: `common.enhanceddatavisualization.no_data_to_display` — Static JSX text node
  - context: `uted-foreground"> <h3 className="text-lg font-semibold">No data to display</h3> <p className="text-sm">There is`
- [67:48] (JSXText) `There is no` → key: `common.enhanceddatavisualization.there_is_no` — Static JSX text node
  - context: `emibold">No data to display</h3> <p className="text-sm">There is no {dataType} data available for {studentName}.</p>`
- [67:71] (JSXText) `data available for` → key: `common.enhanceddatavisualization.data_available_for` — Static JSX text node
  - context: `play</h3> <p className="text-sm">There is no {dataType} data available for {studentName}.</p> </div>`
- [78:77] (JSXText) `Enhanced Data Insights for` → key: `common.enhanceddatavisualization.enhanced_data_insights_for` — Static JSX text node
  - context: `iv> <h2 className="text-2xl font-bold text-card-foreground">Enhanced Data Insights for {studentName}</h2> <p className="`
- [89:19] (JSXText) `Lightweight stub preview — charts library removed as unused` → key: `common.enhanceddatavisualization.lightweight_stub_preview_charts_library` — Static JSX text node
  - context: `x items-center justify-center text-sm text-muted-foreground"> Lightweight stub preview — charts library removed as unused </di`

### src/components/ErrorBoundary.tsx
- [94:18] (MessageAPI) `[ErrorBoundary] Component error caught` → key: `common.errorboundary.errorboundary_component_error_caught` — Message API call: error()
  - context: `ronment configuration and doesn't log to console in production logger.error('[ErrorBoundary] Component error caught', { error: { message: erro`
- [128:21] (MessageAPI) `An unexpected error occurred` → key: `common.errorboundary.an_unexpected_error_occurred` — Message API call: error()
  - context: `ble; also emit a dev-only minimal toast payload try { toast.error('An unexpected error occurred', { description: import.meta.env.DEV &&`
- [128:21] (MessageAPI) `An unexpected error occurred` → key: `common.errorboundary.an_unexpected_error_occurred` — sonner toast.error()
  - context: `ble; also emit a dev-only minimal toast payload try { toast.error('An unexpected error occurred', { description: import.meta.env.DEV &&`
- [158:13] (MessageAPI) `Page automatically refreshed after multiple errors` → key: `common.errorboundary.page_automatically_refreshed_after_multiple` — Message API call: toast()
  - context: `this.resetTimeoutId = setTimeout(() => { this.handleRetry(); toast('Page automatically refreshed after multiple errors'); }, 5000); }; /**`
- [158:13] (MessageAPI) `Page automatically refreshed after multiple errors` → key: `common.errorboundary.page_automatically_refreshed_after_multiple` — sonner toast()
  - context: `this.resetTimeoutId = setTimeout(() => { this.handleRetry(); toast('Page automatically refreshed after multiple errors'); }, 5000); }; /**`
- [204:17] (JSXText) `Something went wrong` → key: `common.errorboundary.something_went_wrong` — Static JSX text node
  - context: `ructive"> <AlertTriangle className="h-5 w-5" /> Something went wrong </CardTitle> </CardHeader>`
- [209:17] (JSXText) `An unexpected error occurred. The application may not be working correctly.` → key: `common.errorboundary.an_unexpected_error_occurred_the` — Static JSX text node
  - context: `4"> <p className="text-sm text-muted-foreground"> An unexpected error occurred. The application may not be working correctly.`
- [214:67] (JSXText) `Error Details` → key: `common.errorboundary.error_details` — Static JSX text node
  - context: `me="text-xs"> <summary className="cursor-pointer font-medium">Error Details</summary> <pre className="mt-2 p-2 bg-muted roun`
- [225:19] (JSXText) `Try Again` → key: `common.errorboundary.try_again` — Static JSX text node
  - context: `lt"> <RefreshCw className="h-4 w-4 mr-2" /> Try Again </Button> <Button o`
- [232:19] (JSXText) `Reload Page` → key: `common.errorboundary.reload_page` — Static JSX text node
  - context: `> <RefreshCw className="h-4 w-4 mr-2" /> Reload Page </Button> <Button`
- [239:19] (JSXText) `Go Home` → key: `common.errorboundary.go_home` — Static JSX text node
  - context: `> <Home className="h-4 w-4 mr-2" /> Go Home </Button> </div>`
- [245:19] (JSXText) `Auto-refreshing in 5 seconds...` → key: `common.errorboundary.auto_refreshing_in_5_seconds` — Static JSX text node
  - context: `<p className="text-xs text-muted-foreground"> Auto-refreshing in 5 seconds... </p> )}`

### src/components/ErrorWrapper.tsx
- [16:15] (JSXText) `Something went wrong loading this component` → key: `common.errorwrapper.something_went_wrong_loading_this` — Static JSX text node
  - context: `text-destructive"> <AlertTriangle className="h-5 w-5" /> <span>Something went wrong loading this component</span> </div> </CardConten`

### src/components/GoalManager.tsx
- [97:19] (MessageAPI) `Please fill in all required fields` → key: `common.goalmanager.please_fill_in_all_required` — Message API call: error()
  - context: `.description.trim() || !newGoal.measurableObjective.trim()) { toast.error("Please fill in all required fields"); return; } // Validate targ`
- [97:19] (MessageAPI) `Please fill in all required fields` → key: `common.goalmanager.please_fill_in_all_required` — sonner toast.error()
  - context: `.description.trim() || !newGoal.measurableObjective.trim()) { toast.error("Please fill in all required fields"); return; } // Validate targ`
- [103:19] (MessageAPI) `Please select a target date` → key: `common.goalmanager.please_select_a_target_date` — Message API call: error()
  - context: `} // Validate target date if (!newGoal.targetDate) { toast.error("Please select a target date"); return; } const targetDate = new`
- [103:19] (MessageAPI) `Please select a target date` → key: `common.goalmanager.please_select_a_target_date` — sonner toast.error()
  - context: `} // Validate target date if (!newGoal.targetDate) { toast.error("Please select a target date"); return; } const targetDate = new`
- [109:19] (MessageAPI) `Invalid target date` → key: `common.goalmanager.invalid_target_date` — Message API call: error()
  - context: `e(newGoal.targetDate); if (isNaN(targetDate.getTime())) { toast.error("Invalid target date"); return; } // Ensure target date is in the`
- [109:19] (MessageAPI) `Invalid target date` → key: `common.goalmanager.invalid_target_date` — sonner toast.error()
  - context: `e(newGoal.targetDate); if (isNaN(targetDate.getTime())) { toast.error("Invalid target date"); return; } // Ensure target date is in the`
- [117:19] (MessageAPI) `Target date must be in the future` → key: `common.goalmanager.target_date_must_be_in` — Message API call: error()
  - context: `today.setHours(0, 0, 0, 0); if (targetDate < today) { toast.error("Target date must be in the future"); return; } // Validate basel`
- [117:19] (MessageAPI) `Target date must be in the future` → key: `common.goalmanager.target_date_must_be_in` — sonner toast.error()
  - context: `today.setHours(0, 0, 0, 0); if (targetDate < today) { toast.error("Target date must be in the future"); return; } // Validate basel`
- [123:19] (MessageAPI) `Target value must be greater than baseline value` → key: `common.goalmanager.target_value_must_be_greater` — Message API call: error()
  - context: `alues if (newGoal.targetValue <= newGoal.baselineValue) { toast.error("Target value must be greater than baseline value"); return; } co`
- [123:19] (MessageAPI) `Target value must be greater than baseline value` → key: `common.goalmanager.target_value_must_be_greater` — sonner toast.error()
  - context: `alues if (newGoal.targetValue <= newGoal.baselineValue) { toast.error("Target value must be greater than baseline value"); return; } co`
- [155:19] (MessageAPI) `Goal created successfully!` → key: `common.goalmanager.goal_created_successfully` — Message API call: success()
  - context: `loadGoals(); resetForm(); setShowCreateDialog(false); toast.success("Goal created successfully!"); onGoalUpdate?.(); }; const updateGoal =`
- [155:19] (MessageAPI) `Goal created successfully!` → key: `common.goalmanager.goal_created_successfully` — sonner toast.success()
  - context: `loadGoals(); resetForm(); setShowCreateDialog(false); toast.success("Goal created successfully!"); onGoalUpdate?.(); }; const updateGoal =`
- [189:19] (MessageAPI) `Progress updated!` → key: `common.goalmanager.progress_updated` — Message API call: success()
  - context: `urrentProgress: Math.max(0, Math.min(100, progress)) }); toast.success("Progress updated!"); }; const addMilestone = (goalId: string, title: strin`
- [189:19] (MessageAPI) `Progress updated!` → key: `common.goalmanager.progress_updated` — sonner toast.success()
  - context: `urrentProgress: Math.max(0, Math.min(100, progress)) }); toast.success("Progress updated!"); }; const addMilestone = (goalId: string, title: strin`
- [208:19] (MessageAPI) `Milestone added!` → key: `common.goalmanager.milestone_added` — Message API call: success()
  - context: `milestones: [...goal.milestones, newMilestone] }); toast.success("Milestone added!"); }; const completeMilestone = (goalId: string, mileston`
- [208:19] (MessageAPI) `Milestone added!` → key: `common.goalmanager.milestone_added` — sonner toast.success()
  - context: `milestones: [...goal.milestones, newMilestone] }); toast.success("Milestone added!"); }; const completeMilestone = (goalId: string, mileston`
- [222:19] (MessageAPI) `Milestone completed! 🎉` → key: `common.goalmanager.milestone_completed` — Message API call: success()
  - context: `; updateGoal(goalId, { milestones: updatedMilestones }); toast.success("Milestone completed! 🎉"); }; /** * Delete a goal with proper confirmat`
- [222:19] (MessageAPI) `Milestone completed! 🎉` → key: `common.goalmanager.milestone_completed` — sonner toast.success()
  - context: `; updateGoal(goalId, { milestones: updatedMilestones }); toast.success("Milestone completed! 🎉"); }; /** * Delete a goal with proper confirmat`
- [244:23] (MessageAPI) `Goal deleted` → key: `common.goalmanager.goal_deleted` — Message API call: success()
  - context: `dataStorage.saveGoal(updatedGoal); loadGoals(); toast.success("Goal deleted"); onGoalUpdate?.(); } } catch (error) { l`
- [244:23] (MessageAPI) `Goal deleted` → key: `common.goalmanager.goal_deleted` — sonner toast.success()
  - context: `dataStorage.saveGoal(updatedGoal); loadGoals(); toast.success("Goal deleted"); onGoalUpdate?.(); } } catch (error) { l`
- [248:20] (MessageAPI) `Failed to delete goal` → key: `common.goalmanager.failed_to_delete_goal` — Message API call: error()
  - context: `d"); onGoalUpdate?.(); } } catch (error) { logger.error('Failed to delete goal', error); toast.error('Failed to delete goal. Pleas`
- [249:19] (MessageAPI) `Failed to delete goal. Please try again.` → key: `common.goalmanager.failed_to_delete_goal_please` — Message API call: error()
  - context: `(error) { logger.error('Failed to delete goal', error); toast.error('Failed to delete goal. Please try again.'); } }; const resetForm = ()`
- [249:19] (MessageAPI) `Failed to delete goal. Please try again.` → key: `common.goalmanager.failed_to_delete_goal_please` — sonner toast.error()
  - context: `(error) { logger.error('Failed to delete goal', error); toast.error('Failed to delete goal. Please try again.'); } }; const resetForm = ()`
- [292:62] (JSXText) `IEP Goals` → key: `common.goalmanager.iep_goals` — Static JSX text node
  - context: `en"> <div> <h2 className="text-2xl font-bold text-foreground">IEP Goals</h2> <p className="text-muted-foreground">Track and monitor`
- [293:48] (JSXText) `Track and monitor` → key: `common.goalmanager.track_and_monitor` — Static JSX text node
  - context: `text-foreground">IEP Goals</h2> <p className="text-muted-foreground">Track and monitor {student.name}'s progress toward educational objectives</p>`
- [293:80] (JSXText) `'s progress toward educational objectives` → key: `common.goalmanager.s_progress_toward_educational_objectives` — Static JSX text node
  - context: `<p className="text-muted-foreground">Track and monitor {student.name}'s progress toward educational objectives</p> </div> <Dialog ope`
- [299:15] (JSXText) `New Goal` → key: `common.goalmanager.new_goal` — Static JSX text node
  - context: `0 font-dyslexia"> <Plus className="h-4 w-4 mr-2" /> New Goal </Button> </DialogTrigger> <DialogConte`
- [304:28] (JSXText) `Create New IEP Goal` → key: `common.goalmanager.create_new_iep_goal` — Static JSX text node
  - context: `nt className="max-w-2xl"> <DialogHeader> <DialogTitle>Create New IEP Goal</DialogTitle> <DialogDescription>`
- [306:17] (JSXText) `Enter goal details, targets, and measurable objectives.` → key: `common.goalmanager.enter_goal_details_targets_and` — Static JSX text node
  - context: `te New IEP Goal</DialogTitle> <DialogDescription> Enter goal details, targets, and measurable objectives. </DialogDe`
- [311:40] (JSXText) `Goal Title *` → key: `common.goalmanager.goal_title` — Static JSX text node
  - context: `assName="space-y-4"> <div> <Label htmlFor="title">Goal Title *</Label> <Input id="title"`
- [316:31] (JSXAttribute) `e.g., Improve emotional regulation during transitions` → key: `common.goalmanager.e_g_improve_emotional_regulation` — Static placeholder attribute
  - context: `al(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g., Improve emotional regulation during transitions" />`
- [335:46] (JSXText) `Description *` → key: `common.goalmanager.description` — Static JSX text node
  - context: `</div> <div> <Label htmlFor="description">Description *</Label> <Textarea id="descriptio`
- [340:31] (JSXAttribute) `Detailed description of what the student will achieve...` → key: `common.goalmanager.detailed_description_of_what_the` — Static placeholder attribute
  - context: `v => ({ ...prev, description: e.target.value }))} placeholder="Detailed description of what the student will achieve..." />`
- [344:45] (JSXText) `Measurable Objective *` → key: `common.goalmanager.measurable_objective` — Static JSX text node
  - context: `</div> <div> <Label htmlFor="measurable">Measurable Objective *</Label> <Textarea id="m`
- [349:31] (JSXAttribute) `How will progress be measured? Include specific criteria...` → key: `common.goalmanager.how_will_progress_be_measured` — Static placeholder attribute
  - context: `...prev, measurableObjective: e.target.value }))} placeholder="How will progress be measured? Include specific criteria..." />`
- [354:45] (JSXText) `Baseline Value` → key: `common.goalmanager.baseline_value` — Static JSX text node
  - context: `ols-2 gap-4"> <div> <Label htmlFor="baseline">Baseline Value</Label> <Input id="baseline`
- [363:43] (JSXText) `Target Value` → key: `common.goalmanager.target_value` — Static JSX text node
  - context: `</div> <div> <Label htmlFor="target">Target Value</Label> <Input id="target"`
- [373:45] (JSXText) `Target Date` → key: `common.goalmanager.target_date` — Static JSX text node
  - context: `</div> <div> <Label htmlFor="targetDate">Target Date</Label> <Input id="targetDate"`
- [385:46] (JSXText) `Create Goal` → key: `common.goalmanager.create_goal` — Static JSX text node
  - context: `Cancel </Button> <Button onClick={createGoal}>Create Goal</Button> </div> </div> </DialogC`
- [397:72] (JSXText) `No IEP Goals Yet` → key: `common.goalmanager.no_iep_goals_yet` — Static JSX text node
  - context: `mb-4" /> <h3 className="text-xl font-semibold text-foreground mb-2">No IEP Goals Yet</h3> <p className="text-muted-foreground text-cente`
- [399:15] (JSXText) `Start by creating your first IEP goal to track` → key: `common.goalmanager.start_by_creating_your_first` — Static JSX text node
  - context: `<p className="text-muted-foreground text-center mb-6 max-w-md"> Start by creating your first IEP goal to track {student.name}'s educational prog`
- [399:76] (JSXText) `'s educational progress.` → key: `common.goalmanager.s_educational_progress` — Static JSX text node
  - context: `md"> Start by creating your first IEP goal to track {student.name}'s educational progress. </p> <Button onClick={() => set`
- [403:15] (JSXText) `Create First Goal` → key: `common.goalmanager.create_first_goal` — Static JSX text node
  - context: `0 font-dyslexia"> <Plus className="h-4 w-4 mr-2" /> Create First Goal </Button> </CardContent> </Card>`
- [429:68] (JSXAttribute) `Edit goal` → key: `common.goalmanager.edit_goal` — Static aria-label attribute
  - context: `flex gap-2"> <Button variant="ghost" size="icon" aria-label="Edit goal" title="Edit goal"> <Edit className="h-4 w-4" /`
- [429:86] (JSXAttribute) `Edit goal` → key: `common.goalmanager.edit_goal` — Static title attribute
  - context: `<Button variant="ghost" size="icon" aria-label="Edit goal" title="Edit goal"> <Edit className="h-4 w-4" />`
- [432:68] (JSXAttribute) `Delete goal` → key: `common.goalmanager.delete_goal` — Static aria-label attribute
  - context: `</Button> <Button variant="ghost" size="icon" aria-label="Delete goal" title="Delete goal" onClick={() => deleteGoal(goal.id)}>`
- [432:88] (JSXAttribute) `Delete goal` → key: `common.goalmanager.delete_goal` — Static title attribute
  - context: `<Button variant="ghost" size="icon" aria-label="Delete goal" title="Delete goal" onClick={() => deleteGoal(goal.id)}> <Trash2`
- [450:52] (JSXText) `Measurable Objective` → key: `common.goalmanager.measurable_objective` — Static JSX text node
  - context: `<div className="mb-4"> <h4 className="font-medium mb-2">Measurable Objective</h4> <p className="text-sm text-muted-for`
- [476:46] (MessageAPI) `Milestone title:` → key: `common.goalmanager.milestone_title` — Message API call: prompt()
  - context: `onClick={() => { const title = prompt("Milestone title:"); const description = prompt("Milesto`
- [477:52] (MessageAPI) `Milestone description:` → key: `common.goalmanager.milestone_description` — Message API call: prompt()
  - context: `prompt("Milestone title:"); const description = prompt("Milestone description:"); const dateStr = prompt("Targe`
- [478:48] (MessageAPI) `Target date (YYYY-MM-DD):` → key: `common.goalmanager.target_date_yyyy_mm_dd` — Message API call: prompt()
  - context: `rompt("Milestone description:"); const dateStr = prompt("Target date (YYYY-MM-DD):"); if (title && description &`
- [489:66] (JSXText) `No milestones yet` → key: `common.goalmanager.no_milestones_yet` — Static JSX text node
  - context: `ngth === 0 ? ( <p className="text-sm text-muted-foreground">No milestones yet</p> ) : ( <div className`
- [525:44] (MessageAPI) `Enter current progress value:` → key: `common.goalmanager.enter_current_progress_value` — Message API call: prompt()
  - context: `onClick={() => { const value = prompt("Enter current progress value:"); const notes = prompt("Pr`
- [526:44] (MessageAPI) `Progress notes (optional):` → key: `common.goalmanager.progress_notes_optional` — Message API call: prompt()
  - context: `pt("Enter current progress value:"); const notes = prompt("Progress notes (optional):"); if (value) {`
- [533:21] (JSXText) `Update Progress` → key: `common.goalmanager.update_progress` — Static JSX text node
  - context: `<TrendingUp className="h-4 w-4 mr-1" /> Update Progress </Button> </div>`

### src/components/InteractiveDataVisualization.tsx
- [165:26] (MessageAPI) `[InteractiveDataVisualization] analytics error` → key: `common.interactivedatavisualization.interactivedatavisualization_analytics_error` — Message API call: error()
  - context: `'analytics_ui_error_' + String(error), 60_000, () => { try { logger.error('[InteractiveDataVisualization] analytics error', { error }); } catch {} });`
- [259:20] (MessageAPI) `Export failed` → key: `common.interactivedatavisualization.export_failed` — Message API call: error()
  - context: `oUpperCase()} exported successfully\`); } catch (error) { logger.error('Export failed', { error }); toast.error('Failed to export interactive ana`
- [260:19] (MessageAPI) `Failed to export interactive analytics data` → key: `common.interactivedatavisualization.failed_to_export_interactive_analytics` — Message API call: error()
  - context: `tch (error) { logger.error('Export failed', { error }); toast.error('Failed to export interactive analytics data'); } finally { setIsExpor`
- [260:19] (MessageAPI) `Failed to export interactive analytics data` → key: `common.interactivedatavisualization.failed_to_export_interactive_analytics` — sonner toast.error()
  - context: `tch (error) { logger.error('Export failed', { error }); toast.error('Failed to export interactive analytics data'); } finally { setIsExpor`
- [285:123] (JSXAttribute) `Loading chart` → key: `common.interactivedatavisualization.loading_chart` — Static aria-label attribute
  - context: `Name="h-[360px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label="Loading chart" />}> <EChartContainerLazy option={option} height=`
- [291:121] (JSXAttribute) `Loading chart` → key: `common.interactivedatavisualization.loading_chart` — Static aria-label attribute
  - context: `Name="h-[360px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label="Loading chart" />}> <TrendsChartLazy chartData={chartData} selecte`
- [297:121] (JSXAttribute) `Loading heatmap` → key: `common.interactivedatavisualization.loading_heatmap` — Static aria-label attribute
  - context: `Name="h-[420px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label="Loading heatmap" />}> <CorrelationHeatmapLazy correlationMatrix={a`
- [303:121] (JSXAttribute) `Loading patterns` → key: `common.interactivedatavisualization.loading_patterns` — Static aria-label attribute
  - context: `Name="h-[360px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label="Loading patterns" />}> <PatternAnalysisViewLazy {...analysisData}`

### src/components/MockDataLoader.tsx
- [84:21] (MessageAPI) `Mock data loaded successfully!` → key: `common.mockdataloader.mock_data_loaded_successfully` — Message API call: success()
  - context: `ario}" with ${stats.entriesCount} tracking entries\`; toast.success('Mock data loaded successfully!', { description, });`
- [84:21] (MessageAPI) `Mock data loaded successfully!` → key: `common.mockdataloader.mock_data_loaded_successfully` — sonner toast.success()
  - context: `ario}" with ${stats.entriesCount} tracking entries\`; toast.success('Mock data loaded successfully!', { description, });`
- [97:19] (MessageAPI) `Failed to load mock data` → key: `common.mockdataloader.failed_to_load_mock_data` — Message API call: error()
  - context: `{ clearInterval(progressIntervalRef.current); } toast.error('Failed to load mock data', { description: error instanceof Error ? erro`
- [97:19] (MessageAPI) `Failed to load mock data` → key: `common.mockdataloader.failed_to_load_mock_data` — sonner toast.error()
  - context: `{ clearInterval(progressIntervalRef.current); } toast.error('Failed to load mock data', { description: error instanceof Error ? erro`
- [114:21] (MessageAPI) `Mock data cleared successfully!` → key: `common.mockdataloader.mock_data_cleared_successfully` — Message API call: success()
  - context: `() => { try { clearMockDataFromStorage(); toast.success('Mock data cleared successfully!'); // Dispatch a custom event to f`
- [114:21] (MessageAPI) `Mock data cleared successfully!` → key: `common.mockdataloader.mock_data_cleared_successfully` — sonner toast.success()
  - context: `() => { try { clearMockDataFromStorage(); toast.success('Mock data cleared successfully!'); // Dispatch a custom event to f`
- [120:19] (MessageAPI) `Failed to clear mock data` → key: `common.mockdataloader.failed_to_clear_mock_data` — Message API call: error()
  - context: `CustomEvent('mockDataLoaded')); } catch (error) { toast.error('Failed to clear mock data', { description: error instanceof Error ? err`
- [120:19] (MessageAPI) `Failed to clear mock data` → key: `common.mockdataloader.failed_to_clear_mock_data` — sonner toast.error()
  - context: `CustomEvent('mockDataLoaded')); } catch (error) { toast.error('Failed to clear mock data', { description: error instanceof Error ? err`
- [138:11] (JSXText) `Mock Data for Testing` → key: `common.mockdataloader.mock_data_for_testing` — Static JSX text node
  - context: `enter gap-2"> <Database className="h-5 w-5 text-primary" /> Mock Data for Testing </CardTitle> </CardHeader> <CardConten`
- [143:11] (JSXText) `Load realistic test data to explore pattern analysis and correlation features.
          Mock data includes 3 students with 3-6 months of tracking data each.` → key: `common.mockdataloader.load_realistic_test_data_to` — Static JSX text node
  - context: `="space-y-4"> <div className="text-sm text-muted-foreground"> Load realistic test data to explore pattern analysis and correlation features.`
- [150:48] (JSXText) `Students to be created:` → key: `common.mockdataloader.students_to_be_created` — Static JSX text node
  - context: `<div className="space-y-2"> <div className="text-sm font-medium">Students to be created:</div> <div className="space-y-1">`
- [164:50] (JSXText) `Current Data:` → key: `common.mockdataloader.current_data` — Static JSX text node
  - context: `uted/50 rounded-lg space-y-1"> <div className="text-sm font-medium">Current Data:</div> <div className="text-xs text-muted-foreground sp`
- [166:20] (JSXText) `•` → key: `common.mockdataloader.` — Static JSX text node
  - context: `<div className="text-xs text-muted-foreground space-y-1"> <div>• {currentStats.studentsCount} students</div> <div>• {currentStats`
- [167:20] (JSXText) `•` → key: `common.mockdataloader.` — Static JSX text node
  - context: `<div>• {currentStats.studentsCount} students</div> <div>• {currentStats.entriesCount} tracking entries</div> {hasMockData`
- [167:50] (JSXText) `tracking entries` → key: `common.mockdataloader.tracking_entries` — Static JSX text node
  - context: `.studentsCount} students</div> <div>• {currentStats.entriesCount} tracking entries</div> {hasMockData && <div className="text-orange`
- [168:64] (JSXText) `• Contains mock data` → key: `common.mockdataloader.contains_mock_data` — Static JSX text node
  - context: `ng entries</div> {hasMockData && <div className="text-orange-600">• Contains mock data</div>} </div> </div> )}`
- [182:42] (JSXAttribute) `Select scenario` → key: `common.mockdataloader.select_scenario` — Static placeholder attribute
  - context: `<SelectTrigger className="w-full"> <SelectValue placeholder="Select scenario" /> </SelectTrigger> <SelectContent`
- [185:41] (JSXText) `All (Emma, Lars, Astrid)` → key: `common.mockdataloader.all_emma_lars_astrid` — Static JSX text node
  - context: `tTrigger> <SelectContent> <SelectItem value="all">All (Emma, Lars, Astrid)</SelectItem> <SelectItem value="emma">E`
- [186:42] (JSXText) `Emma (mild anxiety, improving)` → key: `common.mockdataloader.emma_mild_anxiety_improving` — Static JSX text node
  - context: `>All (Emma, Lars, Astrid)</SelectItem> <SelectItem value="emma">Emma (mild anxiety, improving)</SelectItem> <SelectItem value="l`
- [187:42] (JSXText) `Lars (sensory challenges)` → key: `common.mockdataloader.lars_sensory_challenges` — Static JSX text node
  - context: `(mild anxiety, improving)</SelectItem> <SelectItem value="lars">Lars (sensory challenges)</SelectItem> <SelectItem value="astrid`
- [188:44] (JSXText) `Astrid (steady improvement)` → key: `common.mockdataloader.astrid_steady_improvement` — Static JSX text node
  - context: `rs (sensory challenges)</SelectItem> <SelectItem value="astrid">Astrid (steady improvement)</SelectItem> </SelectContent>`
- [197:60] (JSXText) `Loading mock data...` → key: `common.mockdataloader.loading_mock_data` — Static JSX text node
  - context: `assName="space-y-2"> <div className="text-sm text-muted-foreground">Loading mock data...</div> <Progress value={loadingProgress} classNa`
- [210:13] (JSXText) `Load Mock Data` → key: `common.mockdataloader.load_mock_data` — Static JSX text node
  - context: `Data} > <Database className="h-4 w-4 mr-2" /> Load Mock Data </Button> {hasMockData && ( <Ale`
- [222:19] (JSXText) `Clear All` → key: `common.mockdataloader.clear_all` — Static JSX text node
  - context: `> <Trash2 className="h-4 w-4 mr-2" /> Clear All </Button> </AlertDialogTrigger>`
- [227:37] (JSXText) `Clear All Data?` → key: `common.mockdataloader.clear_all_data` — Static JSX text node
  - context: `ontent> <AlertDialogHeader> <AlertDialogTitle>Clear All Data?</AlertDialogTitle> <AlertDialogDescription>`
- [229:21] (JSXText) `This will permanently delete all student data and tracking entries. 
                    This action cannot be undone.` → key: `common.mockdataloader.this_will_permanently_delete_all` — Static JSX text node
  - context: `lertDialogTitle> <AlertDialogDescription> This will permanently delete all student data and tracking entries.`
- [237:21] (JSXText) `Clear All Data` → key: `common.mockdataloader.clear_all_data` — Static JSX text node
  - context: `e"> <Trash2 className="h-4 w-4 mr-2" /> Clear All Data </AlertDialogAction> </AlertDia`
- [247:53] (JSXText) `Features you can test:` → key: `common.mockdataloader.features_you_can_test` — Static JSX text node
  - context: `-3 border-t border-border"> <div className="text-sm font-medium mb-2">Features you can test:</div> <div className="text-xs text-muted-foregr`
- [249:18] (JSXText) `• Emotion pattern recognition` → key: `common.mockdataloader.emotion_pattern_recognition` — Static JSX text node
  - context: `<div className="text-xs text-muted-foreground space-y-1"> <div>• Emotion pattern recognition</div> <div>• Sensory input correlation`
- [250:18] (JSXText) `• Sensory input correlations` → key: `common.mockdataloader.sensory_input_correlations` — Static JSX text node
  - context: `ace-y-1"> <div>• Emotion pattern recognition</div> <div>• Sensory input correlations</div> <div>• Environmental factor analy`
- [251:18] (JSXText) `• Environmental factor analysis` → key: `common.mockdataloader.environmental_factor_analysis` — Static JSX text node
  - context: `tion</div> <div>• Sensory input correlations</div> <div>• Environmental factor analysis</div> <div>• Predictive insights & t`
- [252:18] (JSXText) `• Predictive insights & trends` → key: `common.mockdataloader.predictive_insights_trends` — Static JSX text node
  - context: `s</div> <div>• Environmental factor analysis</div> <div>• Predictive insights & trends</div> <div>• Interactive data visuali`
- [253:18] (JSXText) `• Interactive data visualization` → key: `common.mockdataloader.interactive_data_visualization` — Static JSX text node
  - context: `is</div> <div>• Predictive insights & trends</div> <div>• Interactive data visualization</div> <div>• Alert system & anomaly`
- [254:18] (JSXText) `• Alert system & anomaly detection` → key: `common.mockdataloader.alert_system_anomaly_detection` — Static JSX text node
  - context: `</div> <div>• Interactive data visualization</div> <div>• Alert system & anomaly detection</div> </div> </div> <`

### src/components/POCBadge.tsx
- [6:75] (JSXText) `POC Mode` → key: `common.pocbadge.poc_mode` — Static JSX text node
  - context: `urn ( <Badge variant="outline" className="uppercase tracking-wider text-xs">POC Mode</Badge> ); };`

### src/components/PaginatedSessionsList.tsx
- [60:14] (JSXText) `No sessions available in the selected period.` → key: `common.paginatedsessionslist.no_sessions_available_in_the` — Static JSX text node
  - context: `<CardContent className="py-16 text-center text-muted-foreground"> <p>No sessions available in the selected period.</p> </CardContent> <`
- [93:13] (JSXText) `Loading sessions...` → key: `common.paginatedsessionslist.loading_sessions` — Static JSX text node
  - context: `( <div className="text-center p-8 text-muted-foreground"> Loading sessions... </div> ) : ( <div> {`
- [114:27] (JSXText) `Environmental data` → key: `common.paginatedsessionslist.environmental_data` — Static JSX text node
  - context: `<Badge variant="outline" className="text-xs"> Environmental data </Badge> )}`
- [153:32] (JSXAttribute) `First page` → key: `common.paginatedsessionslist.first_page` — Static aria-label attribute
  - context: `variant="ghost" size="icon" aria-label="First page" onClick={goToFirstPage} dis`
- [163:32] (JSXAttribute) `Previous page` → key: `common.paginatedsessionslist.previous_page` — Static aria-label attribute
  - context: `variant="ghost" size="icon" aria-label="Previous page" onClick={goToPreviousPage}`
- [196:32] (JSXAttribute) `Next page` → key: `common.paginatedsessionslist.next_page` — Static aria-label attribute
  - context: `variant="ghost" size="icon" aria-label="Next page" onClick={goToNextPage} disab`
- [206:32] (JSXAttribute) `Last page` → key: `common.paginatedsessionslist.last_page` — Static aria-label attribute
  - context: `variant="ghost" size="icon" aria-label="Last page" onClick={goToLastPage} disab`

### src/components/PeriodComparison.tsx
- [211:19] (JSXText) `Most common changed from` → key: `common.periodcomparison.most_common_changed_from` — Static JSX text node
  - context: `dge> <span className="text-muted-foreground"> Most common changed from <span className="font-medium">{comparisonStats.mostComm`
- [221:19] (JSXText) `Average intensity` → key: `common.periodcomparison.average_intensity` — Static JSX text node
  - context: `dge> <span className="text-muted-foreground"> Average intensity{" "} {currentStats.avgEmotionIntensity > com`
- [234:19] (JSXText) `Sensory seeking behavior` → key: `common.periodcomparison.sensory_seeking_behavior` — Static JSX text node
  - context: `dge> <span className="text-muted-foreground"> Sensory seeking behavior{" "} {currentStats.seekingRatio > com`

### src/components/StorageManager.tsx
- [34:21] (MessageAPI) `Old data cleared successfully` → key: `common.storagemanager.old_data_cleared_successfully` — Message API call: success()
  - context: `=> { try { storageUtils.clearOldTrackingData(30); toast.success('Old data cleared successfully'); refreshStats(); } catch (error) {`
- [34:21] (MessageAPI) `Old data cleared successfully` → key: `common.storagemanager.old_data_cleared_successfully` — sonner toast.success()
  - context: `=> { try { storageUtils.clearOldTrackingData(30); toast.success('Old data cleared successfully'); refreshStats(); } catch (error) {`
- [37:20] (MessageAPI) `Failed to clear old tracking data` → key: `common.storagemanager.failed_to_clear_old_tracking` — Message API call: error()
  - context: `successfully'); refreshStats(); } catch (error) { logger.error('Failed to clear old tracking data', error); toast.error('Failed to clear`
- [38:19] (MessageAPI) `Failed to clear old data` → key: `common.storagemanager.failed_to_clear_old_data` — Message API call: error()
  - context: `logger.error('Failed to clear old tracking data', error); toast.error('Failed to clear old data'); } }; const handleClearNonEssential = () =>`
- [38:19] (MessageAPI) `Failed to clear old data` → key: `common.storagemanager.failed_to_clear_old_data` — sonner toast.error()
  - context: `logger.error('Failed to clear old tracking data', error); toast.error('Failed to clear old data'); } }; const handleClearNonEssential = () =>`
- [45:21] (MessageAPI) `Non-essential data cleared` → key: `common.storagemanager.non_essential_data_cleared` — Message API call: success()
  - context: `=> { try { storageUtils.clearNonEssentialData(); toast.success('Non-essential data cleared'); refreshStats(); } catch (error) {`
- [45:21] (MessageAPI) `Non-essential data cleared` → key: `common.storagemanager.non_essential_data_cleared` — sonner toast.success()
  - context: `=> { try { storageUtils.clearNonEssentialData(); toast.success('Non-essential data cleared'); refreshStats(); } catch (error) {`
- [48:20] (MessageAPI) `Failed to clear non-essential data` → key: `common.storagemanager.failed_to_clear_non_essential` — Message API call: error()
  - context: `data cleared'); refreshStats(); } catch (error) { logger.error('Failed to clear non-essential data', error); toast.error('Failed to clear`
- [49:19] (MessageAPI) `Failed to clear non-essential data` → key: `common.storagemanager.failed_to_clear_non_essential` — Message API call: error()
  - context: `logger.error('Failed to clear non-essential data', error); toast.error('Failed to clear non-essential data'); } }; /** * Handle clearing al`
- [49:19] (MessageAPI) `Failed to clear non-essential data` → key: `common.storagemanager.failed_to_clear_non_essential` — sonner toast.error()
  - context: `logger.error('Failed to clear non-essential data', error); toast.error('Failed to clear non-essential data'); } }; /** * Handle clearing al`
- [61:40] (MessageAPI) `Are you sure you want to clear ALL data? This cannot be undone!` → key: `common.storagemanager.are_you_sure_you_want` — Message API call: confirm()
  - context: `using a custom modal component try { const confirmed = window.confirm('Are you sure you want to clear ALL data? This cannot be undone!'); if (co`
- [65:25] (MessageAPI) `All data cleared` → key: `common.storagemanager.all_data_cleared` — Message API call: success()
  - context: `) { try { dataStorage.clearAllData(); toast.success('All data cleared'); // Use window.location.replace for better history`
- [65:25] (MessageAPI) `All data cleared` → key: `common.storagemanager.all_data_cleared` — sonner toast.success()
  - context: `) { try { dataStorage.clearAllData(); toast.success('All data cleared'); // Use window.location.replace for better history`
- [69:24] (MessageAPI) `Failed to clear all data` → key: `common.storagemanager.failed_to_clear_all_data` — Message API call: error()
  - context: `window.location.replace('/'); } catch (error) { logger.error('Failed to clear all data', error); toast.error('Failed to clear all d`
- [70:23] (MessageAPI) `Failed to clear all data` → key: `common.storagemanager.failed_to_clear_all_data` — Message API call: error()
  - context: `logger.error('Failed to clear all data', error); toast.error('Failed to clear all data'); } } } catch (error) { // Ha`
- [70:23] (MessageAPI) `Failed to clear all data` → key: `common.storagemanager.failed_to_clear_all_data` — sonner toast.error()
  - context: `logger.error('Failed to clear all data', error); toast.error('Failed to clear all data'); } } } catch (error) { // Ha`
- [75:20] (MessageAPI) `Confirmation dialog failed` → key: `common.storagemanager.confirmation_dialog_failed` — Message API call: error()
  - context: `s where confirm might fail (e.g., in some test environments) logger.error('Confirmation dialog failed', error); toast.error('Could not show confirma`
- [76:19] (MessageAPI) `Could not show confirmation dialog` → key: `common.storagemanager.could_not_show_confirmation_dialog` — Message API call: error()
  - context: `nts) logger.error('Confirmation dialog failed', error); toast.error('Could not show confirmation dialog'); } }; const formatBytes = (bytes:`
- [76:19] (MessageAPI) `Could not show confirmation dialog` → key: `common.storagemanager.could_not_show_confirmation_dialog` — sonner toast.error()
  - context: `nts) logger.error('Confirmation dialog failed', error); toast.error('Could not show confirmation dialog'); } }; const formatBytes = (bytes:`
- [95:11] (JSXText) `Storage Management` → key: `common.storagemanager.storage_management` — Static JSX text node
  - context: `"flex items-center gap-2"> <Database className="h-5 w-5" /> Storage Management </CardTitle> <CardDescription> Mana`
- [98:11] (JSXText) `Manage your local storage to ensure smooth operation` → key: `common.storagemanager.manage_your_local_storage_to` — Static JSX text node
  - context: `Storage Management </CardTitle> <CardDescription> Manage your local storage to ensure smooth operation </CardDescription>`
- [104:44] (JSXText) `Storage Usage` → key: `common.storagemanager.storage_usage` — Static JSX text node
  - context: `{/* Storage Usage */} <div> <h3 className="font-medium mb-2">Storage Usage</h3> <div className="space-y-2"> <div classN`
- [108:53] (JSXText) `/ ~5 MB` → key: `common.storagemanager.5_mb` — Static JSX text node
  - context: `<span>Used</span> <span>{formatBytes(storageInfo.used)} / ~5 MB</span> </div> <div className="w-full">`
- [121:44] (JSXText) `Data Statistics` → key: `common.storagemanager.data_statistics` — Static JSX text node
  - context: `{/* Storage Stats */} <div> <h3 className="font-medium mb-2">Data Statistics</h3> <div className="grid grid-cols-2 gap-2 text-sm">`
- [152:13] (JSXText) `Clear data older than 30 days` → key: `common.storagemanager.clear_data_older_than_30` — Static JSX text node
  - context: `-start" > <Trash2 className="h-4 w-4 mr-2" /> Clear data older than 30 days </Button> <Button`
- [160:13] (JSXText) `Clear non-essential data` → key: `common.storagemanager.clear_non_essential_data` — Static JSX text node
  - context: `-start" > <Trash2 className="h-4 w-4 mr-2" /> Clear non-essential data </Button> <Button varia`
- [168:13] (JSXText) `Clear ALL data (irreversible)` → key: `common.storagemanager.clear_all_data_irreversible` — Static JSX text node
  - context: `-start" > <Trash2 className="h-4 w-4 mr-2" /> Clear ALL data (irreversible) </Button> </div> {stora`
- [176:15] (JSXText) `Storage is healthy with sufficient space available.` → key: `common.storagemanager.storage_is_healthy_with_sufficient` — Static JSX text node
  - context: `CheckCircle className="h-4 w-4" /> <AlertDescription> Storage is healthy with sufficient space available. </AlertDescripti`

### src/components/TestingDebugPanel.tsx
- [202:21] (MessageAPI) `System tests completed successfully` → key: `common.testingdebugpanel.system_tests_completed_successfully` — Message API call: success()
  - context: `ilable" }; setTestResults([...results]); toast.success("System tests completed successfully"); } catch (error) { logge`
- [202:21] (MessageAPI) `System tests completed successfully` → key: `common.testingdebugpanel.system_tests_completed_successfully` — sonner toast.success()
  - context: `ilable" }; setTestResults([...results]); toast.success("System tests completed successfully"); } catch (error) { logge`
- [205:20] (MessageAPI) `System test error` → key: `common.testingdebugpanel.system_test_error` — Message API call: error()
  - context: `tests completed successfully"); } catch (error) { logger.error('System test error', { error }); results.push({ name: "Test Error"`
- [212:19] (MessageAPI) `Some tests failed` → key: `common.testingdebugpanel.some_tests_failed` — Message API call: error()
  - context: `nknown error'}\` }); setTestResults([...results]); toast.error("Some tests failed"); } finally { setIsRunningTests(false); } };`
- [212:19] (MessageAPI) `Some tests failed` → key: `common.testingdebugpanel.some_tests_failed` — sonner toast.error()
  - context: `nknown error'}\` }); setTestResults([...results]); toast.error("Some tests failed"); } finally { setIsRunningTests(false); } };`
- [241:19] (MessageAPI) `Analytics cache cleared successfully` → key: `common.testingdebugpanel.analytics_cache_cleared_successfully` — Message API call: success()
  - context: `) => { analyticsWorker.clearCache(); uiCache.clear(); toast.success("Analytics cache cleared successfully"); }, [analyticsWorker, uiCache]); co`
- [241:19] (MessageAPI) `Analytics cache cleared successfully` → key: `common.testingdebugpanel.analytics_cache_cleared_successfully` — sonner toast.success()
  - context: `) => { analyticsWorker.clearCache(); uiCache.clear(); toast.success("Analytics cache cleared successfully"); }, [analyticsWorker, uiCache]); co`
- [256:13] (JSXText) `System Testing & Debug Panel` → key: `common.testingdebugpanel.system_testing_debug_panel` — Static JSX text node
  - context: `="flex items-center gap-2"> <Bug className="h-5 w-5" /> System Testing & Debug Panel </CardTitle> </CardHeader>`
- [262:15] (JSXText) `Test current system functionality and data integrity` → key: `common.testingdebugpanel.test_current_system_functionality_and` — Static JSX text node
  - context: `tween"> <p className="text-sm text-muted-foreground"> Test current system functionality and data integrity </p>`
- [269:26] (JSXAttribute) `Run system tests` → key: `common.testingdebugpanel.run_system_tests` — Static aria-label attribute
  - context: `size="sm" variant="outline" aria-label="Run system tests" title="Run system tests" >`
- [270:21] (JSXAttribute) `Run system tests` → key: `common.testingdebugpanel.run_system_tests` — Static title attribute
  - context: `riant="outline" aria-label="Run system tests" title="Run system tests" > {isRunningTests ? (`
- [275:54] (JSXText) `Running Tests...` → key: `common.testingdebugpanel.running_tests` — Static JSX text node
  - context: `w-4 mr-2 animate-spin" /> <span className="hidden sm:inline">Running Tests...</span> </> ) : (`
- [280:54] (JSXText) `Run System Tests` → key: `common.testingdebugpanel.run_system_tests` — Static JSX text node
  - context: `lassName="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Run System Tests</span> </> )} </Butto`
- [288:51] (JSXText) `Test Results:` → key: `common.testingdebugpanel.test_results` — Static JSX text node
  - context: `<div className="space-y-3"> <h4 className="text-sm font-medium">Test Results:</h4> {testResults.map((result) => (`
- [307:54] (JSXText) `Quick Stats:` → key: `common.testingdebugpanel.quick_stats` — Static JSX text node
  - context: `4 border-t border-border"> <h4 className="text-sm font-medium mb-2">Quick Stats:</h4> <div className="grid grid-cols-3 gap-3 text-center`
- [331:13] (JSXText) `Analytics Cache Management` → key: `common.testingdebugpanel.analytics_cache_management` — Static JSX text node
  - context: `ex items-center gap-2"> <Archive className="h-5 w-5" /> Analytics Cache Management </CardTitle> </CardHeader>`
- [340:57] (JSXText) `Cache Hit Rate` → key: `common.testingdebugpanel.cache_hit_rate` — Static JSX text node
  - context: `enter justify-between"> <span className="text-sm font-medium">Cache Hit Rate</span> <div className="flex items-center gap-2"`
- [349:69] (JSXText) `Cache Size` → key: `common.testingdebugpanel.cache_size` — Static JSX text node
  - context: `flex-col"> <span className="text-xs text-muted-foreground">Cache Size</span> <span className="text-lg font-semibold">{c`
- [353:69] (JSXText) `Memory Usage` → key: `common.testingdebugpanel.memory_usage` — Static JSX text node
  - context: `flex-col"> <span className="text-xs text-muted-foreground">Memory Usage</span> <span className="text-lg font-semibold">`
- [381:53] (JSXText) `Cache Actions` → key: `common.testingdebugpanel.cache_actions` — Static JSX text node
  - context: `t border-border space-y-3"> <h4 className="text-sm font-medium">Cache Actions</h4> <div className="flex gap-2">`
- [388:30] (JSXAttribute) `Clear all analytics cache` → key: `common.testingdebugpanel.clear_all_analytics_cache` — Static aria-label attribute
  - context: `leClearCache} className="flex-1" aria-label="Clear all analytics cache" title="Clear all analytics cache"`
- [389:25] (JSXAttribute) `Clear all analytics cache` → key: `common.testingdebugpanel.clear_all_analytics_cache` — Static title attribute
  - context: `aria-label="Clear all analytics cache" title="Clear all analytics cache" > <Trash2 classNam`
- [392:54] (JSXText) `Clear All Cache` → key: `common.testingdebugpanel.clear_all_cache` — Static JSX text node
  - context: `lassName="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Clear All Cache</span> </Button> <Button`
- [399:30] (JSXAttribute) `Clean expired cache entries` → key: `common.testingdebugpanel.clean_expired_cache_entries` — Static aria-label attribute
  - context: `he.cleanup()} className="flex-1" aria-label="Clean expired cache entries" title="Clean expired cache entri`
- [400:25] (JSXAttribute) `Clean expired cache entries` → key: `common.testingdebugpanel.clean_expired_cache_entries` — Static title attribute
  - context: `aria-label="Clean expired cache entries" title="Clean expired cache entries" > <RefreshCw cla`
- [403:54] (JSXText) `Clean Expired` → key: `common.testingdebugpanel.clean_expired` — Static JSX text node
  - context: `lassName="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Clean Expired</span> </Button> </div>`
- [408:22] (JSXText) `• Cache TTL: 5 minutes` → key: `common.testingdebugpanel.cache_ttl_5_minutes` — Static JSX text node
  - context: `<div className="text-xs text-muted-foreground"> <p>• Cache TTL: 5 minutes</p> <p>• Eviction: LRU (Least Recently`
- [409:22] (JSXText) `• Eviction: LRU (Least Recently Used)` → key: `common.testingdebugpanel.eviction_lru_least_recently_used` — Static JSX text node
  - context: `reground"> <p>• Cache TTL: 5 minutes</p> <p>• Eviction: LRU (Least Recently Used)</p> <p>• Invalidations:`
- [410:22] (JSXText) `• Invalidations:` → key: `common.testingdebugpanel.invalidations` — Static JSX text node
  - context: `<p>• Eviction: LRU (Least Recently Used)</p> <p>• Invalidations: {cacheStats.invalidations || 0}</p> </div>`

### src/components/TestingToolsSection.tsx
- [20:44] (JSXText) `Testing & Development Tools` → key: `common.testingtoolssection.testing_development_tools` — Static JSX text node
  - context: `v className="space-y-6"> <div> <h2 className="text-2xl font-bold">Testing & Development Tools</h2> <p className="text-muted-foreground">`
- [22:11] (JSXText) `Tools for testing pattern analysis features and debugging data issues` → key: `common.testingtoolssection.tools_for_testing_pattern_analysis` — Static JSX text node
  - context: `Development Tools</h2> <p className="text-muted-foreground"> Tools for testing pattern analysis features and debugging data issues </`
- [32:15] (JSXText) `Mock Data Generator` → key: `common.testingtoolssection.mock_data_generator` — Static JSX text node
  - context: `p-2"> <Database className="h-5 w-5 text-primary" /> Mock Data Generator </CardTitle> </CardHeader> <`
- [37:15] (JSXText) `Load realistic test data to explore pattern analysis features` → key: `common.testingtoolssection.load_realistic_test_data_to` — Static JSX text node
  - context: `t> <p className="text-sm text-muted-foreground mb-4"> Load realistic test data to explore pattern analysis features </p>`
- [43:19] (JSXText) `Load Mock Data` → key: `common.testingtoolssection.load_mock_data` — Static JSX text node
  - context: `-90"> <Database className="h-4 w-4 mr-2" /> Load Mock Data </Button> </DialogTrigger>`
- [48:32] (JSXText) `Mock Data for Testing & Analysis` → key: `common.testingtoolssection.mock_data_for_testing_analysis` — Static JSX text node
  - context: `overflow-y-auto"> <DialogHeader> <DialogTitle>Mock Data for Testing & Analysis</DialogTitle> <DialogDescript`
- [50:21] (JSXText) `Load realistic sample students and entries to explore features safely.` → key: `common.testingtoolssection.load_realistic_sample_students_and` — Static JSX text node
  - context: `nalysis</DialogTitle> <DialogDescription> Load realistic sample students and entries to explore features safely.`
- [64:15] (JSXText) `Debug Panel` → key: `common.testingtoolssection.debug_panel` — Static JSX text node
  - context: `er gap-2"> <Bug className="h-5 w-5 text-primary" /> Debug Panel </CardTitle> </CardHeader> <CardCont`
- [69:15] (JSXText) `Advanced debugging and data inspection tools` → key: `common.testingtoolssection.advanced_debugging_and_data_inspection` — Static JSX text node
  - context: `t> <p className="text-sm text-muted-foreground mb-4"> Advanced debugging and data inspection tools </p> <Dialo`
- [75:19] (JSXText) `Open Debug Panel` → key: `common.testingtoolssection.open_debug_panel` — Static JSX text node
  - context: `="w-full"> <Bug className="h-4 w-4 mr-2" /> Open Debug Panel </Button> </DialogTrigger>`
- [80:32] (JSXText) `Debug & Data Inspection` → key: `common.testingtoolssection.debug_data_inspection` — Static JSX text node
  - context: `overflow-y-auto"> <DialogHeader> <DialogTitle>Debug & Data Inspection</DialogTitle> <DialogDescription>`
- [82:21] (JSXText) `Advanced debugging tools for inspecting state, storage, and analytics.` → key: `common.testingtoolssection.advanced_debugging_tools_for_inspecting` — Static JSX text node
  - context: `pection</DialogTitle> <DialogDescription> Advanced debugging tools for inspecting state, storage, and analytics.`
- [96:15] (JSXText) `Pattern Analysis Testing Guide` → key: `common.testingtoolssection.pattern_analysis_testing_guide` — Static JSX text node
  - context: `gap-2"> <Beaker className="h-5 w-5 text-primary" /> Pattern Analysis Testing Guide </CardTitle> </CardHeader>`
- [102:17] (JSXText) `To test pattern analysis features effectively:` → key: `common.testingtoolssection.to_test_pattern_analysis_features` — Static JSX text node
  - context: `4"> <p className="text-sm text-muted-foreground"> To test pattern analysis features effectively: </p>`
- [106:60] (JSXText) `Data Requirements:` → key: `common.testingtoolssection.data_requirements` — Static JSX text node
  - context: `<div> <h4 className="font-medium text-sm mb-2">Data Requirements:</h4> <ul className="text-xs text-muted-fore`
- [108:25] (JSXText) `• At least 10 tracking entries for basic patterns` → key: `common.testingtoolssection.at_least_10_tracking_entries` — Static JSX text node
  - context: `ul className="text-xs text-muted-foreground space-y-1"> <li>• At least 10 tracking entries for basic patterns</li> <li>•`
- [109:25] (JSXText) `• 30+ entries for correlation analysis` → key: `common.testingtoolssection.30_entries_for_correlation_analysis` — Static JSX text node
  - context: `>• At least 10 tracking entries for basic patterns</li> <li>• 30+ entries for correlation analysis</li> <li>• 90+ entrie`
- [110:25] (JSXText) `• 90+ entries for predictive insights` → key: `common.testingtoolssection.90_entries_for_predictive_insights` — Static JSX text node
  - context: `<li>• 30+ entries for correlation analysis</li> <li>• 90+ entries for predictive insights</li> <li>• Multiple st`
- [111:25] (JSXText) `• Multiple students for comparative analysis` → key: `common.testingtoolssection.multiple_students_for_comparative_analysis` — Static JSX text node
  - context: `<li>• 90+ entries for predictive insights</li> <li>• Multiple students for comparative analysis</li> </ul>`
- [115:60] (JSXText) `Features to Test:` → key: `common.testingtoolssection.features_to_test` — Static JSX text node
  - context: `<div> <h4 className="font-medium text-sm mb-2">Features to Test:</h4> <ul className="text-xs text-muted-foreg`
- [117:25] (JSXText) `• Emotion trend analysis` → key: `common.testingtoolssection.emotion_trend_analysis` — Static JSX text node
  - context: `ul className="text-xs text-muted-foreground space-y-1"> <li>• Emotion trend analysis</li> <li>• Sensory correlation matr`
- [118:25] (JSXText) `• Sensory correlation matrices` → key: `common.testingtoolssection.sensory_correlation_matrices` — Static JSX text node
  - context: `> <li>• Emotion trend analysis</li> <li>• Sensory correlation matrices</li> <li>• Environmental impa`
- [119:25] (JSXText) `• Environmental impact patterns` → key: `common.testingtoolssection.environmental_impact_patterns` — Static JSX text node
  - context: `<li>• Sensory correlation matrices</li> <li>• Environmental impact patterns</li> <li>• Anomaly detection`
- [120:25] (JSXText) `• Anomaly detection alerts` → key: `common.testingtoolssection.anomaly_detection_alerts` — Static JSX text node
  - context: `<li>• Environmental impact patterns</li> <li>• Anomaly detection alerts</li> </ul> </div>`

### src/components/Visualization3D.tsx
- [60:13] (JSXText) `×` → key: `common.visualization3d.` — Static JSX text node
  - context: `ground transition-colors motion-reduce:transition-none" > × </button> </div> <p className="font-medium">{point.l`
- [360:11] (JSXText) `3D Correlation Visualization` → key: `common.visualization3d.3d_correlation_visualization` — Static JSX text node
  - context: `Name="flex items-center gap-2"> <Eye className="h-5 w-5" /> 3D Correlation Visualization </CardTitle> </CardHeader> <Car`
- [373:17] (JSXText) `X Axis` → key: `common.visualization3d.x_axis` — Static JSX text node
  - context: `block" htmlFor={xAxisTriggerId} > X Axis </label> <Select value={xAxis} onValueChange=`
- [395:17] (JSXText) `Y Axis` → key: `common.visualization3d.y_axis` — Static JSX text node
  - context: `block" htmlFor={yAxisTriggerId} > Y Axis </label> <Select value={yAxis} onValueChange=`
- [417:17] (JSXText) `Z Axis` → key: `common.visualization3d.z_axis` — Static JSX text node
  - context: `block" htmlFor={zAxisTriggerId} > Z Axis </label> <Select value={zAxis} onValueChange=`
- [441:17] (JSXText) `Color By` → key: `common.visualization3d.color_by` — Static JSX text node
  - context: `ock" htmlFor={colorByTriggerId} > Color By </label> <Select value={colorBy} onValueCha`
- [460:17] (JSXText) `Filter Category` → key: `common.visualization3d.filter_category` — Static JSX text node
  - context: `htmlFor={filterCategoryTriggerId} > Filter Category </label> <Select value={filterCatego`
- [477:17] (JSXText) `Point Size:` → key: `common.visualization3d.point_size` — Static JSX text node
  - context: `={pointSizeLabelId} className="text-sm font-medium mb-1 block"> Point Size: {pointSize.toFixed(2)} </p> <Slider`
- [496:15] (JSXText) `Reduced motion enabled` → key: `common.visualization3d.reduced_motion_enabled` — Static JSX text node
  - context: `text-amber-800 dark:text-amber-200 px-3 py-1 rounded-md text-sm"> Reduced motion enabled </div> )} <Canvas`
- [598:45] (JSXText) `Low → High` → key: `common.visualization3d.low_high` — Static JSX text node
  - context: `a-yellow-500 to-red-500 rounded" /> <span className="text-xs">Low → High</span> </div> )} </div>`
- [607:18] (JSXText) `Total Sessions:` → key: `common.visualization3d.total_sessions` — Static JSX text node
  - context: `ace-y-1"> <p>Points: {filteredPoints.length}</p> <p>Total Sessions: {trackingEntries.length}</p> </div> </div>`

### src/components/VisualizationControls.tsx
- [107:11] (JSXText) `Interactive Data Analysis -` → key: `common.visualizationcontrols.interactive_data_analysis` — Static JSX text node
  - context: `"flex items-center gap-2"> <Activity className="h-5 w-5" /> Interactive Data Analysis - {studentName} {filterCriteria.realtime &&`
- [115:61] (JSXAttribute) `Visualization controls` → key: `common.visualizationcontrols.visualization_controls` — Static aria-label attribute
  - context: `</CardTitle> <div className="flex items-center gap-2" aria-label="Visualization controls"> {/* Guided question chips */} <div`
- [152:62] (JSXAttribute) `Open filters panel` → key: `common.visualizationcontrols.open_filters_panel` — Static aria-label attribute
  - context: `etTrigger asChild> <Button variant="outline" size="sm" aria-label="Open filters panel" title="Open filters panel"> <Filter classNa`
- [152:89] (JSXAttribute) `Open filters panel` → key: `common.visualizationcontrols.open_filters_panel` — Static title attribute
  - context: `<Button variant="outline" size="sm" aria-label="Open filters panel" title="Open filters panel"> <Filter className="h-4 w-4 mr-2" />`
- [180:29] (JSXText) `Advanced Filters` → key: `common.visualizationcontrols.advanced_filters` — Static JSX text node
  - context: `-[400px] sm:w-[540px]"> <SheetHeader> <SheetTitle>Advanced Filters</SheetTitle> <SheetDescription>`
- [182:19] (JSXText) `Configure multi-dimensional filters for your data analysis` → key: `common.visualizationcontrols.configure_multi_dimensional_filters_for` — Static JSX text node
  - context: `anced Filters</SheetTitle> <SheetDescription> Configure multi-dimensional filters for your data analysis </She`
- [201:28] (JSXAttribute) `Select layout mode` → key: `common.visualizationcontrols.select_layout_mode` — Static aria-label attribute
  - context: `variant="outline" size="sm" aria-label="Select layout mode" title="Select layout mode"`
- [202:23] (JSXAttribute) `Select layout mode` → key: `common.visualizationcontrols.select_layout_mode` — Static title attribute
  - context: `size="sm" aria-label="Select layout mode" title="Select layout mode" data-testid="layout-mode-trigger"`
- [219:17] (JSXText) `Grid View` → key: `common.visualizationcontrols.grid_view` — Static JSX text node
  - context: `('grid')}> <Grid3x3 className="h-4 w-4 mr-2" /> Grid View </DropdownMenuItem> <DropdownMenuItem onCl`
- [223:17] (JSXText) `Focus Mode` → key: `common.visualizationcontrols.focus_mode` — Static JSX text node
  - context: `e('focus')}> <Focus className="h-4 w-4 mr-2" /> Focus Mode </DropdownMenuItem> <DropdownMenuItem onC`
- [234:62] (JSXAttribute) `View options` → key: `common.visualizationcontrols.view_options` — Static aria-label attribute
  - context: `nuTrigger asChild> <Button variant="outline" size="sm" aria-label="View options" title="View options"> <Settings className="h-4 w-`
- [234:83] (JSXAttribute) `View options` → key: `common.visualizationcontrols.view_options` — Static title attribute
  - context: `<Button variant="outline" size="sm" aria-label="View options" title="View options"> <Settings className="h-4 w-4 mr-2" />`
- [246:97] (JSXText) `2D: Emotional energy vs Sensory load (XY)` → key: `common.visualizationcontrols.2d_emotional_energy_vs_sensory` — Static JSX text node
  - context: `<DropdownMenuItem onClick={() => visualizationState.setProjectionPlane('xy')}>2D: Emotional energy vs Sensory load (XY)</DropdownMenuItem> <`
- [247:97] (JSXText) `2D: Emotional energy vs Time (XZ)` → key: `common.visualizationcontrols.2d_emotional_energy_vs_time` — Static JSX text node
  - context: `<DropdownMenuItem onClick={() => visualizationState.setProjectionPlane('xz')}>2D: Emotional energy vs Time (XZ)</DropdownMenuItem> <Dropdown`
- [248:97] (JSXText) `2D: Sensory load vs Time (YZ)` → key: `common.visualizationcontrols.2d_sensory_load_vs_time` — Static JSX text node
  - context: `<DropdownMenuItem onClick={() => visualizationState.setProjectionPlane('yz')}>2D: Sensory load vs Time (YZ)</DropdownMenuItem> </>`
- [268:17] (JSXText) `Clear Highlights` → key: `common.visualizationcontrols.clear_highlights` — Static JSX text node
  - context: `}}> <RefreshCw className="h-4 w-4 mr-2" /> Clear Highlights </DropdownMenuItem> </DropdownMenuCon`
- [275:85] (JSXAttribute) `Export analytics` → key: `common.visualizationcontrols.export_analytics` — Static aria-label attribute
  - context: `<Button variant="outline" size="sm" disabled={isExporting} aria-label="Export analytics" title="Export analytics"> <Download className`
- [275:110] (JSXAttribute) `Export analytics` → key: `common.visualizationcontrols.export_analytics` — Static title attribute
  - context: `="outline" size="sm" disabled={isExporting} aria-label="Export analytics" title="Export analytics"> <Download className="h-4 w-4 mr-2" />`
- [286:17] (JSXText) `Export as PDF` → key: `common.visualizationcontrols.export_as_pdf` — Static JSX text node
  - context: `> <FileText className="h-4 w-4 mr-2" /> Export as PDF </DropdownMenuItem> <DropdownMenuItem`
- [293:17] (JSXText) `Export as CSV` → key: `common.visualizationcontrols.export_as_csv` — Static JSX text node
  - context: `> <FileSpreadsheet className="h-4 w-4 mr-2" /> Export as CSV </DropdownMenuItem> <DropdownMenuItem`
- [300:17] (JSXText) `Export as JSON` → key: `common.visualizationcontrols.export_as_json` — Static JSX text node
  - context: `> <FileJson className="h-4 w-4 mr-2" /> Export as JSON </DropdownMenuItem> </DropdownMenuConte`
- [314:15] (JSXText) `Chart Type` → key: `common.visualizationcontrols.chart_type` — Static JSX text node
  - context: `-medium" htmlFor={chartTypeTriggerId} > Chart Type </label> <Select value={selectedChartType} on`
- [321:42] (JSXText) `Line Chart` → key: `common.visualizationcontrols.line_chart` — Static JSX text node
  - context: `Trigger> <SelectContent> <SelectItem value="line">Line Chart</SelectItem> <SelectItem value="area">Area Chart</Sel`
- [322:42] (JSXText) `Area Chart` → key: `common.visualizationcontrols.area_chart` — Static JSX text node
  - context: `m value="line">Line Chart</SelectItem> <SelectItem value="area">Area Chart</SelectItem> <SelectItem value="scatter">Scatter Plot`
- [323:45] (JSXText) `Scatter Plot` → key: `common.visualizationcontrols.scatter_plot` — Static JSX text node
  - context: `alue="area">Area Chart</SelectItem> <SelectItem value="scatter">Scatter Plot</SelectItem> <SelectItem value="composed">Combined<`
- [330:48] (JSXText) `Select Emotions` → key: `common.visualizationcontrols.select_emotions` — Static JSX text node
  - context: `<div className="space-y-2"> <p className="text-sm font-medium">Select Emotions</p> <div className="grid grid-cols-2 gap-2 w-64 p-2`
- [359:15] (JSXText) `Time Range` → key: `common.visualizationcontrols.time_range` — Static JSX text node
  - context: `-medium" htmlFor={timeRangeTriggerId} > Time Range </label> <Select value={selectedTimeRange} on`
- [366:40] (JSXText) `Last 7 days` → key: `common.visualizationcontrols.last_7_days` — Static JSX text node
  - context: `ctTrigger> <SelectContent> <SelectItem value="7d">Last 7 days</SelectItem> <SelectItem value="30d">Last 30 days</S`
- [367:41] (JSXText) `Last 30 days` → key: `common.visualizationcontrols.last_30_days` — Static JSX text node
  - context: `tem value="7d">Last 7 days</SelectItem> <SelectItem value="30d">Last 30 days</SelectItem> <SelectItem value="90d">Last 90 days</`
- [368:41] (JSXText) `Last 90 days` → key: `common.visualizationcontrols.last_90_days` — Static JSX text node
  - context: `m value="30d">Last 30 days</SelectItem> <SelectItem value="90d">Last 90 days</SelectItem> <SelectItem value="all">All time</Sele`
- [369:41] (JSXText) `All time` → key: `common.visualizationcontrols.all_time` — Static JSX text node
  - context: `m value="90d">Last 90 days</SelectItem> <SelectItem value="all">All time</SelectItem> </SelectContent> </Select>`
- [374:68] (JSXAttribute) `Data counts` → key: `common.visualizationcontrols.data_counts` — Static aria-label attribute
  - context: `</div> <div className="flex items-center gap-2 mt-8" aria-label="Data counts"> <Badge variant="outline" className="bg-success/10 tex`
- [379:51] (JSXText) `sensory inputs` → key: `common.visualizationcontrols.sensory_inputs` — Static JSX text node
  - context: `10 text-info border-info/20"> {filteredData.sensoryInputs.length} sensory inputs </Badge> <Badge variant="outline" classNa`

### src/components/analysis/CorrelationHeatmap.tsx
- [59:121] (JSXAttribute) `Loading heatmap` → key: `common.correlationheatmap.loading_heatmap` — Static aria-label attribute
  - context: `Name="h-[420px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label="Loading heatmap" />}> <EChartContainer option={option} height={420} />`

### src/components/analysis/PatternAnalysisView.tsx
- [68:23] (JSXAttribute) `Loading chart data` → key: `common.patternanalysisview.loading_chart_data` — Static aria-label attribute
  - context: `-destructive/30'; }; if (isAnalyzing) { return ( <div aria-label="Loading chart data" className="h-[400px] w-full"> <div className="h-ful`
- [79:14] (JSXText) `No patterns detected yet` → key: `common.patternanalysisview.no_patterns_detected_yet` — Static JSX text node
  - context: `"> <Zap className="h-16 w-16 mx-auto mb-4 opacity-50" /> <p>No patterns detected yet</p> <p className="text-sm">Need more data for`
- [80:34] (JSXText) `Need more data for pattern analysis` → key: `common.patternanalysisview.need_more_data_for_pattern` — Static JSX text node
  - context: `" /> <p>No patterns detected yet</p> <p className="text-sm">Need more data for pattern analysis</p> </div> </div> ); }`
- [92:13] (JSXText) `Detected Patterns (` → key: `common.patternanalysisview.detected_patterns` — Static JSX text node
  - context: `lex items-center gap-2"> <Target className="h-5 w-5" /> Detected Patterns ({patterns.length}) </h3> <div className="`
- [111:65] (JSXText) `% confident` → key: `common.patternanalysisview.confident` — Static JSX text node
  - context: `n.confidence)}> {Math.round(pattern.confidence * 100)}% confident </Badge> </div>`
- [141:13] (JSXText) `Predictive Insights (` → key: `common.patternanalysisview.predictive_insights` — Static JSX text node
  - context: `items-center gap-2"> <TrendingUp className="h-5 w-5" /> Predictive Insights ({predictiveInsights.length}) </h3> <div`
- [161:65] (JSXText) `% confidence` → key: `common.patternanalysisview.confidence` — Static JSX text node
  - context: `iant="outline"> {Math.round(insight.confidence * 100)}% confidence </Badge> </div>`
- [226:13] (JSXText) `Detected Anomalies (` → key: `common.patternanalysisview.detected_anomalies` — Static JSX text node
  - context: `ms-center gap-2"> <AlertTriangle className="h-5 w-5" /> Detected Anomalies ({anomalies.length}) </h3> <div className`

### src/components/analysis/TeacherInsightsPanel.tsx
- [33:54] (JSXText) `n/a` → key: `common.teacherinsightspanel.n_a` — Static JSX text node
  - context: `oBadge = (p?: number) => { if (!p && p !== 0) return <Badge variant="outline">n/a</Badge>; const pct = Math.round(p * 100); const variant = p >= 0.7 ? 'de`
- [64:11] (JSXText) `Insights for` → key: `common.teacherinsightspanel.insights_for` — Static JSX text node
  - context: `flex items-center gap-2"> <Lightbulb className="h-5 w-5" /> Insights for {student.name} </CardTitle> </CardHeader> <Card`
- [71:13] (JSXText) `You’re viewing:` → key: `common.teacherinsightspanel.you_re_viewing` — Static JSX text node
  - context: `eset && ( <div className="text-sm text-muted-foreground"> You’re viewing: <span className="font-medium">{activePreset.replaceAll('_',' ')}`
- [77:13] (JSXText) `Limited data — results may change as more sessions are recorded. Try tracking for at least 7 days and 10 sessions for stronger findings.` → key: `common.teacherinsightspanel.limited_data_results_may_change` — Static JSX text node
  - context: `&& ( <div className="p-3 rounded-lg bg-muted/40 text-sm"> Limited data — results may change as more sessions are recorded. Try tracking fo`
- [86:17] (JSXText) `Pattern detected` → key: `common.teacherinsightspanel.pattern_detected` — Static JSX text node
  - context: `nter gap-2"> <TrendingUp className="h-4 w-4" /> Pattern detected </div> {scoreToBadge(topPattern.con`
- [97:61] (JSXText) `↔` → key: `common.teacherinsightspanel.` — Static JSX text node
  - context: `">Correlation</div> <div className="text-sm mt-1">{topCorr.factor1} ↔ {topCorr.factor2}</div> <div className="text-xs text-muted-foregro`
- [98:60] (JSXText) `r =` → key: `common.teacherinsightspanel.r` — Static JSX text node
  - context: `pCorr.factor2}</div> <div className="text-xs text-muted-foreground">r = {topCorr.correlation.toFixed(2)} ({topCorr.significance})</div> </`
- [105:68] (JSXText) `Recent Anomaly` → key: `common.teacherinsightspanel.recent_anomaly` — Static JSX text node
  - context: `ont-medium"> <AlertTriangle className="h-4 w-4 text-amber-600" /> Recent Anomaly </div> <div className="text-sm mt-1">{ano`
- [112:105] (JSXText) `Create Goal` → key: `common.teacherinsightspanel.create_goal` — Static JSX text node
  - context: `t="outline" size="sm" onClick={onCreateGoal}><Target className="h-4 w-4 mr-1" />Create Goal</Button> <Button variant="outline" size="sm" onClick={onAd`
- [113:75] (JSXText) `Add Intervention` → key: `common.teacherinsightspanel.add_intervention` — Static JSX text node
  - context: `tton> <Button variant="outline" size="sm" onClick={onAddIntervention}>Add Intervention</Button> <Button variant="outline" size="sm" onClick=`
- [114:73] (JSXText) `Schedule Break` → key: `common.teacherinsightspanel.schedule_break` — Static JSX text node
  - context: `Button> <Button variant="outline" size="sm" onClick={onScheduleBreak}>Schedule Break</Button> <Button variant="outline" size="sm" onClick={o`
- [115:74] (JSXText) `Track Now` → key: `common.teacherinsightspanel.track_now` — Static JSX text node
  - context: `utton> <Button variant="outline" size="sm" onClick={onJumpToTracking}>Track Now</Button> </div> <div className="text-xs text-muted-fo`
- [119:28] (JSXText) `sessions,` → key: `common.teacherinsightspanel.sessions` — Static JSX text node
  - context: `<div className="text-xs text-muted-foreground pt-2"> Data: {sessions} sessions, {emotions} emotions </div> </CardContent> </Card>`

### src/components/dev/EnvDebug.tsx
- [29:20] (JSXText) `Env / AI Debug` → key: `common.envdebug.env_ai_debug` — Static JSX text node
  - context: `="bg-gradient-card border-0 shadow-soft"> <CardHeader> <CardTitle>Env / AI Debug</CardTitle> </CardHeader> <CardContent className="tex`
- [32:14] (JSXText) `AI enabled (loadAiConfig):` → key: `common.envdebug.ai_enabled_loadaiconfig` — Static JSX text node
  - context: `</CardHeader> <CardContent className="text-sm space-y-1"> <div>AI enabled (loadAiConfig): <strong>{String(ai.enabled)}</strong></div> <`
- [33:14] (JSXText) `Model (loadAiConfig):` → key: `common.envdebug.model_loadaiconfig` — Static JSX text node
  - context: `nabled (loadAiConfig): <strong>{String(ai.enabled)}</strong></div> <div>Model (loadAiConfig): <code>{ai.modelName || '(none)'}</code></div> <div`
- [34:14] (JSXText) `API key present (loadAiConfig):` → key: `common.envdebug.api_key_present_loadaiconfig` — Static JSX text node
  - context: `odel (loadAiConfig): <code>{ai.modelName || '(none)'}</code></div> <div>API key present (loadAiConfig): <strong>{String(!!ai.apiKey)}</strong> <span cla`
- [35:14] (JSXText) `Base URL (loadAiConfig):` → key: `common.envdebug.base_url_loadaiconfig` — Static JSX text node
  - context: `assName="text-muted-foreground">({masked(ai.apiKey)})</span></div> <div>Base URL (loadAiConfig): <code>{String((ai as any).baseUrl || 'https://openroute`
- [36:14] (JSXText) `Local only (loadAiConfig):` → key: `common.envdebug.local_only_loadaiconfig` — Static JSX text node
  - context: `i as any).baseUrl || 'https://openrouter.ai/api/v1')}</code></div> <div>Local only (loadAiConfig): <strong>{String((ai as any).localOnly || false)}</str`
- [37:31] (JSXText) `AI enabled (live env):` → key: `common.envdebug.ai_enabled_live_env` — Static JSX text node
  - context: `g((ai as any).localOnly || false)}</strong></div> <div className="mt-2">AI enabled (live env): <strong>{String(aiLive.enabled)}</strong></div> <`
- [38:14] (JSXText) `Model (live env):` → key: `common.envdebug.model_live_env` — Static JSX text node
  - context: `nabled (live env): <strong>{String(aiLive.enabled)}</strong></div> <div>Model (live env): <code>{aiLive.modelName}</code></div> <div>API key pre`
- [39:14] (JSXText) `API key present (live env):` → key: `common.envdebug.api_key_present_live_env` — Static JSX text node
  - context: `<div>Model (live env): <code>{aiLive.modelName}</code></div> <div>API key present (live env): <strong>{String(!!aiLive.apiKey)}</strong> <span cla`
- [40:14] (JSXText) `Base URL (live env):` → key: `common.envdebug.base_url_live_env` — Static JSX text node
  - context: `ame="text-muted-foreground">({masked(aiLive.apiKey)})</span></div> <div>Base URL (live env): <code>{aiLive.baseUrl}</code></div> <div className=`
- [41:53] (JSXText) `Live Vite env:` → key: `common.envdebug.live_vite_env` — Static JSX text node
  - context: `iLive.baseUrl}</code></div> <div className="mt-2 text-muted-foreground">Live Vite env:</div> <div>VITE_OPENROUTER_API_KEY present: <strong>{Stri`
- [42:14] (JSXText) `VITE_OPENROUTER_API_KEY present:` → key: `common.envdebug.vite_openrouter_api_key_present` — Static JSX text node
  - context: `<div className="mt-2 text-muted-foreground">Live Vite env:</div> <div>VITE_OPENROUTER_API_KEY present: <strong>{String(!!env.VITE_OPENROUTER_API_KEY)}`
- [43:14] (JSXText) `VITE_AI_ANALYSIS_ENABLED:` → key: `common.envdebug.vite_ai_analysis_enabled` — Static JSX text node
  - context: `d-foreground">({masked(env.VITE_OPENROUTER_API_KEY)})</span></div> <div>VITE_AI_ANALYSIS_ENABLED: <code>{String(env.VITE_AI_ANALYSIS_ENABLED)}</code></d`
- [47:31] (JSXText) `localStorage OPENROUTER_API_KEY present:` → key: `common.envdebug.localstorage_openrouter_api_key_present` — Static JSX text node
  - context: `nv.VITE_AI_BASE_URL || '(default)')}</code></div> <div className="mt-1">localStorage OPENROUTER_API_KEY present: <strong>{String(!!lsKey)}</strong> <spa`
- [48:56] (JSXText) `Tip: set with` → key: `common.envdebug.tip_set_with` — Static JSX text node
  - context: `ed(lsKey)})</span></div> <div className="text-xs text-muted-foreground">Tip: set with <code>localStorage.setItem('OPENROUTER_API_KEY', 'sk-or-…')</code>`
- [48:76] (JSXText) `localStorage.setItem('OPENROUTER_API_KEY', 'sk-or-…')` → key: `common.envdebug.localstorage_setitem_openrouter_api_key` — Static JSX text node
  - context: `div> <div className="text-xs text-muted-foreground">Tip: set with <code>localStorage.setItem('OPENROUTER_API_KEY', 'sk-or-…')</code></div> <div`
- [49:48] (JSXText) `Note: Module-level constants can be stale after env changes; the app uses live env shown above.` → key: `common.envdebug.note_module_level_constants_can` — Static JSX text node
  - context: `PI_KEY', 'sk-or-…')</code></div> <div className="text-muted-foreground">Note: Module-level constants can be stale after env changes; the app uses live e`
- [54:45] (JSXText) `AI Telemetry` → key: `common.envdebug.ai_telemetry` — Static JSX text node
  - context: `-4 pt-3 border-t border-border/50"> <div className="font-medium mb-1">AI Telemetry</div> {(() => { const s = aiMetrics.summary()`
- [64:22] (JSXText) `JSON valid:` → key: `common.envdebug.json_valid` — Static JSX text node
  - context: `<div>Retries: <strong>{s.retries}</strong></div> <div>JSON valid: <strong>{s.jsonValid}</strong></div> <div>Parse erro`
- [65:22] (JSXText) `Parse errors:` → key: `common.envdebug.parse_errors` — Static JSX text node
  - context: `<div>JSON valid: <strong>{s.jsonValid}</strong></div> <div>Parse errors: <strong>{s.jsonParseErrors}</strong></div> <div>Va`
- [66:22] (JSXText) `Validate errors:` → key: `common.envdebug.validate_errors` — Static JSX text node
  - context: `v>Parse errors: <strong>{s.jsonParseErrors}</strong></div> <div>Validate errors: <strong>{s.jsonValidateErrors}</strong></div> <`
- [67:22] (JSXText) `Avg latency:` → key: `common.envdebug.avg_latency` — Static JSX text node
  - context: `date errors: <strong>{s.jsonValidateErrors}</strong></div> <div>Avg latency: <strong>{s.avgLatency} ms</strong></div> <div class`
- [68:45] (JSXText) `JSON gyldighet (global):` → key: `common.envdebug.json_gyldighet_global` — Static JSX text node
  - context: `ng>{s.avgLatency} ms</strong></div> <div className="col-span-2">JSON gyldighet (global): <strong>{pct}%</strong></div> <div clas`
- [69:67] (JSXText) `Sist oppdatert:` → key: `common.envdebug.sist_oppdatert` — Static JSX text node
  - context: `strong></div> <div className="col-span-2 text-muted-foreground">Sist oppdatert: {new Date(s.lastUpdated).toLocaleString()}</div> <`
- [74:83] (JSXText) `Reset telemetry` → key: `common.envdebug.reset_telemetry` — Static JSX text node
  - context: `<Button size="sm" variant="outline" onClick={() => aiMetrics.reset()}>Reset telemetry</Button> </div> </div> </CardContent>`

### src/components/dev/ModelDiagnosticsPanel.tsx
- [177:20] (MessageAPI) `[ModelDiagnosticsPanel] Failed to run time-series CV` → key: `common.modeldiagnosticspanel.modeldiagnosticspanel_failed_to_run_time` — Message API call: error()
  - context: `const err = e instanceof Error ? e : new Error(String(e)); logger.error('[ModelDiagnosticsPanel] Failed to run time-series CV', { error: err }); a`
- [216:30] (JSXAttribute) `model-diagnostics-heading` → key: `common.modeldiagnosticspanel.model_diagnostics_heading` — Static aria-labelledby attribute
  - context: `st itemHeight = 56; // px per item row return ( <section aria-labelledby="model-diagnostics-heading" role="region" className={props.className}> <a`

### src/components/layouts/ResizableSplitLayout.tsx
- [64:47] (MessageAPI) `[UI] split.collapse.change` → key: `common.resizablesplitlayout.ui_split_collapse_change` — Message API call: info()
  - context: `dRight(v); persist(ratio, v); try { onCollapsedChange?.(v); logger.info('[UI] split.collapse.change', { collapsed: v }); } catch {} }; const clampR`
- [80:42] (MessageAPI) `[UI] split.drag.start` → key: `common.resizablesplitlayout.ui_split_drag_start` — Message API call: info()
  - context: `startRatio = ratio; let frame = 0; try { onResizeStart?.(); logger.info('[UI] split.drag.start'); } catch {} const move = (clientX: number) => {`
- [97:47] (MessageAPI) `[UI] split.drag.end` → key: `common.resizablesplitlayout.ui_split_drag_end` — Message API call: info()
  - context: `; const onPointerUp = () => { try { onResizeEnd?.(ratio); logger.info('[UI] split.drag.end', { ratio }); } catch {} persist(ratio); window`
- [158:22] (JSXAttribute) `Dra for å endre størrelse` → key: `common.resizablesplitlayout.dra_for_endre_st_rrelse` — Static aria-label attribute
  - context: `outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Dra for å endre størrelse" title="Dra for å endre størrelse • Dobbelt`
- [159:17] (JSXAttribute) `Dra for å endre størrelse • Dobbeltklikk for å nullstille • Enter for å skjule/vis` → key: `common.resizablesplitlayout.dra_for_endre_st_rrelse` — Static title attribute
  - context: `ble:ring-ring" aria-label="Dra for å endre størrelse" title="Dra for å endre størrelse • Dobbeltklikk for å nullstille • Enter for å skjule/`

### src/components/layouts/VisualizationLayouts.tsx
- [21:36] (JSXText) `Select visualizations to display` → key: `common.visualizationlayouts.select_visualizations_to_display` — Static JSX text node
  - context: `sName="h-16 w-16 mx-auto mb-4 opacity-50" /> <p className="text-lg">Select visualizations to display</p> <p className="text-sm">Choose f`
- [22:36] (JSXText) `Choose from the options above` → key: `common.visualizationlayouts.choose_from_the_options_above` — Static JSX text node
  - context: `ext-lg">Select visualizations to display</p> <p className="text-sm">Choose from the options above</p> </div> </CardContent>`
- [49:36] (JSXText) `Select a visualization to focus on` → key: `common.visualizationlayouts.select_a_visualization_to_focus` — Static JSX text node
  - context: `sName="h-16 w-16 mx-auto mb-4 opacity-50" /> <p className="text-lg">Select a visualization to focus on</p> <p className="text-sm">Choose`
- [50:36] (JSXText) `Choose from the options above` → key: `common.visualizationlayouts.choose_from_the_options_above` — Static JSX text node
  - context: `t-lg">Select a visualization to focus on</p> <p className="text-sm">Choose from the options above</p> </div> </CardContent>`

### src/components/lazy/LazyInteractiveDataVisualization.tsx
- [12:9] (JSXText) `Loading Interactive Visualization...` → key: `common.lazyinteractivedatavisualization.loading_interactive_visualization` — Static JSX text node
  - context: `s-center gap-2"> <Activity className="h-5 w-5 animate-pulse" /> Loading Interactive Visualization... </CardTitle> </CardHeader> <C`
- [39:9] (JSXText) `Failed to load Interactive Visualization` → key: `common.lazyinteractivedatavisualization.failed_to_load_interactive_visualization` — Static JSX text node
  - context: `er gap-2 text-destructive"> <AlertCircle className="h-5 w-5" /> Failed to load Interactive Visualization </CardTitle> </CardHeader>`
- [44:9] (JSXText) `The interactive data visualization component could not be loaded. 
        This might be due to missing dependencies or a temporary loading issue.` → key: `common.lazyinteractivedatavisualization.the_interactive_data_visualization_component` — Static JSX text node
  - context: `> <CardContent> <p className="text-sm text-muted-foreground"> The interactive data visualization component could not be loaded. This`
- [48:9] (JSXText) `Please refresh the page or contact support if the issue persists.` → key: `common.lazyinteractivedatavisualization.please_refresh_the_page_or` — Static JSX text node
  - context: `ue. </p> <p className="text-sm text-muted-foreground mt-2"> Please refresh the page or contact support if the issue persists. </p>`

### src/components/lazy/LazyLoadWrapper.tsx
- [21:56] (JSXText) `Loading component...` → key: `common.lazyloadwrapper.loading_component` — Static JSX text node
  - context: `to mb-4 text-primary" /> <p className="text-sm text-muted-foreground">Loading component...</p> </div> </div> <div className="space`
- [37:53] (JSXText) `Failed to load component` → key: `common.lazyloadwrapper.failed_to_load_component` — Static JSX text node
  - context: `iv className="text-center"> <p className="text-destructive font-medium">Failed to load component</p> <p className="text-sm text-muted-foreground`
- [39:11] (JSXText) `Please refresh the page or try again later.` → key: `common.lazyloadwrapper.please_refresh_the_page_or` — Static JSX text node
  - context: `ponent</p> <p className="text-sm text-muted-foreground mt-2"> Please refresh the page or try again later. </p> </div> </Card`
- [81:18] (MessageAPI) `LazyLoadWrapper Error:` → key: `common.lazyloadwrapper.lazyloadwrapper_error` — Message API call: error()
  - context: `componentDidCatch(error: Error, errorInfo: React.ErrorInfo) { logger.error('LazyLoadWrapper Error:', error, errorInfo); } render() { if (this.stat`

### src/components/lazy/LazyReportBuilder.tsx
- [11:9] (JSXText) `Loading Report Builder...` → key: `common.lazyreportbuilder.loading_report_builder` — Static JSX text node
  - context: `s-center gap-2"> <FileText className="h-5 w-5 animate-pulse" /> Loading Report Builder... </CardTitle> </CardHeader> <CardContent`

### src/components/lazy/LazyVisualization3D.tsx
- [27:9] (JSXText) `3D Correlation Visualization` → key: `common.lazyvisualization3d.3d_correlation_visualization` — Static JSX text node
  - context: `lassName="flex items-center gap-2"> <Eye className="h-5 w-5" /> 3D Correlation Visualization </CardTitle> </CardHeader> <CardConte`
- [52:58] (JSXText) `Loading 3D visualization...` → key: `common.lazyvisualization3d.loading_3d_visualization` — Static JSX text node
  - context: `d-full mx-auto"></div> <p className="text-sm text-muted-foreground">Loading 3D visualization...</p> </div> </div> </div>`

### src/components/tegn/TegnXPBar.tsx
- [7:90] (JSXAttribute) `XP progress` → key: `common.tegnxpbar.xp_progress` — Static aria-label attribute
  - context: `className="w-full bg-muted/50 border border-border rounded-full h-3" aria-label="XP progress"> <div className="bg-primary h-3 rounded-full transit`
- [17:73] (JSXText) `·` → key: `common.tegnxpbar.` — Static JSX text node
  - context: `/> <div className="mt-1 text-xs text-muted-foreground">Level {level} · {progressThisLevel}/100 XP</div> </div> ); };`
- [17:94] (JSXText) `/100 XP` → key: `common.tegnxpbar.100_xp` — Static JSX text node
  - context: `assName="mt-1 text-xs text-muted-foreground">Level {level} · {progressThisLevel}/100 XP</div> </div> ); };`

### src/components/tegn/WebcamPreview.tsx
- [51:20] (JSXAttribute) `Webcam preview` → key: `common.webcampreview.webcam_preview` — Static aria-label attribute
  - context: `rrored && 'scale-x-[-1]')} playsInline muted aria-label="Webcam preview" /> </div> ); };`

### src/components/ui/date-range-picker.tsx
- [68:21] (JSXText) `Pick a date range` → key: `common.date_range_picker.pick_a_date_range` — Static JSX text node
  - context: `t(date.from, "LLL dd, y") ) ) : ( <span>Pick a date range</span> )} </Button> </PopoverTri`

### src/components/ui/dialog.tsx
- [136:60] (JSXText) `Dialog content` → key: `common.dialog.dialog_content` — Static JSX text node
  - context: `sureDescription && ( <DialogPrimitive.Description className="sr-only">Dialog content</DialogPrimitive.Description> )} {children}`

### src/components/ui/sheet.tsx
- [105:59] (JSXText) `Sidebar drawer` → key: `common.sheet.sidebar_drawer` — Static JSX text node
  - context: `nsureDescription && ( <SheetPrimitive.Description className="sr-only">Sidebar drawer</SheetPrimitive.Description> )} {children}`

### src/components/ui/sidebar.tsx
- [280:33] (JSXText) `Toggle Sidebar` → key: `common.sidebar.toggle_sidebar` — Static JSX text node
  - context: `}} {...props} > <PanelLeft /> <span className="sr-only">Toggle Sidebar</span> </Button> ) }) SidebarTrigger.displayName = "Sidebar`
- [296:18] (JSXAttribute) `Toggle Sidebar` → key: `common.sidebar.toggle_sidebar` — Static aria-label attribute
  - context: `return ( <button ref={ref} data-sidebar="rail" aria-label="Toggle Sidebar" tabIndex={-1} onClick={toggleSidebar} title="`
- [299:13] (JSXAttribute) `Toggle Sidebar` → key: `common.sidebar.toggle_sidebar` — Static title attribute
  - context: `="Toggle Sidebar" tabIndex={-1} onClick={toggleSidebar} title="Toggle Sidebar" className={cn( "absolute inset-y-0 z-20 hidden w-`

### src/config/loaders/analytics.loader.ts
- [209:17] (MessageAPI) `analytics.loader hot-reloaded: cache invalidated` → key: `common.analytics_loader.analytics_loader_hot_reloaded_cache` — Message API call: info()
  - context: `t(() => { cachedConfig = null; cacheStamp = Date.now(); logger.info('analytics.loader hot-reloaded: cache invalidated'); }); } // Optional: consu`

### src/config/validators/analytics.validator.ts
- [37:18] (MessageAPI) `analytics.config validation failed; using fallback defaults` → key: `common.analytics_validator.analytics_config_validation_failed_using` — Message API call: error()
  - context: `sult.error); // Log once with normalized diagnostics try { logger.error('analytics.config validation failed; using fallback defaults', { errors,`

### src/pages/KreativiumAI.tsx
- [209:20] (MessageAPI) `[KreativiumAI] load students failed` → key: `common.kreativiumai.kreativiumai_load_students_failed` — Message API call: error()
  - context: `ngth && !studentId) setStudentId(s[0].id); } catch (e) { logger.error('[KreativiumAI] load students failed', e as Error); setStudents([]); }`
- [412:22] (MessageAPI) `[KreativiumAI] Failed to resolve sources` → key: `common.kreativiumai.kreativiumai_failed_to_resolve_sources` — Message API call: error()
  - context: `setResolvedSources(sourceMap); } catch (e) { logger.error('[KreativiumAI] Failed to resolve sources', e as Error); } }`
- [521:77] (JSXText) `År:` → key: `common.kreativiumai.r` — Static JSX text node
  - context: `p>} {source.year && <p className="text-xs text-muted-foreground mt-1">År: {source.year}</p>} </TooltipContent> </Tooltip> ); });`
- [553:52] (JSXText) `Kreativium‑AI` → key: `common.kreativiumai.kreativium_ai` — Static JSX text node
  - context: `</div> <div> <h1 className="text-2xl font-bold">Kreativium‑AI</h1> <p className="text-sm text-muted-foreground">Lo`
- [554:60] (JSXText) `Lokal LLM for mønstre, korrelasjoner og tiltak` → key: `common.kreativiumai.lokal_llm_for_m_nstre` — Static JSX text node
  - context: `">Kreativium‑AI</h1> <p className="text-sm text-muted-foreground">Lokal LLM for mønstre, korrelasjoner og tiltak</p> <p className="t`
- [555:246] (JSXText) `•` → key: `common.kreativiumai.` — Static JSX text node
  - context: `nter gap-1 text-[11px] rounded px-1.5 py-0.5 border border-muted-foreground/30">• {tAnalytics('interface.fromUiCache')}</span>)}</p> </div>`
- [580:44] (JSXAttribute) `Velg elev` → key: `common.kreativiumai.velg_elev` — Static placeholder attribute
  - context: `dentSelectLabelId} > <SelectValue placeholder="Velg elev" /> </SelectTrigger> <SelectContent>`
- [606:42] (JSXText) `Siste 7 dager` → key: `common.kreativiumai.siste_7_dager` — Static JSX text node
  - context: `igger> <SelectContent> <SelectItem value="7d">Siste 7 dager</SelectItem> <SelectItem value="30d">Siste 30 da`
- [607:43] (JSXText) `Siste 30 dager` → key: `common.kreativiumai.siste_30_dager` — Static JSX text node
  - context: `value="7d">Siste 7 dager</SelectItem> <SelectItem value="30d">Siste 30 dager</SelectItem> <SelectItem value="90d">Siste 90 d`
- [608:43] (JSXText) `Siste 90 dager` → key: `common.kreativiumai.siste_90_dager` — Static JSX text node
  - context: `lue="30d">Siste 30 dager</SelectItem> <SelectItem value="90d">Siste 90 dager</SelectItem> <SelectItem value="all">Hele histo`
- [609:43] (JSXText) `Hele historikken` → key: `common.kreativiumai.hele_historikken` — Static JSX text node
  - context: `lue="90d">Siste 90 dager</SelectItem> <SelectItem value="all">Hele historikken</SelectItem> </SelectContent> </S`
- [648:19] (JSXText) `IEP-trygg modus` → key: `common.kreativiumai.iep_trygg_modus` — Static JSX text node
  - context: `ssName="text-sm text-muted-foreground" htmlFor={iepToggleId}> IEP-trygg modus </label> <TooltipProvider>`
- [655:36] (JSXAttribute) `IEP-trygg modus` → key: `common.kreativiumai.iep_trygg_modus` — Static aria-label attribute
  - context: `gle id={iepToggleId} aria-label="IEP-trygg modus" pressed={iepSafeMode}`
- [668:26] (JSXText) `IEP-trygg modus sikrer pedagogiske anbefalinger` → key: `common.kreativiumai.iep_trygg_modus_sikrer_pedagogiske` — Static JSX text node
  - context: `</TooltipTrigger> <TooltipContent> <p>IEP-trygg modus sikrer pedagogiske anbefalinger</p> <p cla`
- [669:46] (JSXText) `uten medisinske/kliniske råd` → key: `common.kreativiumai.uten_medisinske_kliniske_r_d` — Static JSX text node
  - context: `ikrer pedagogiske anbefalinger</p> <p className="text-xs">uten medisinske/kliniske råd</p> </TooltipContent>`
- [676:57] (JSXText) `Test AI` → key: `common.kreativiumai.test_ai` — Static JSX text node
  - context: `ing} className="w-1/2"> <RefreshCw className="h-4 w-4 mr-2" />Test AI </Button> <Button onClick={analyze} disa`
- [679:52] (JSXText) `Kjør analyse` → key: `common.kreativiumai.kj_r_analyse` — Static JSX text node
  - context: `tudentId} className="w-1/2"> <Play className="h-4 w-4 mr-2" />Kjør analyse </Button> <Button onClick={refreshA`
- [682:57] (JSXText) `Oppdater (forbi cache)` → key: `common.kreativiumai.oppdater_forbi_cache` — Static JSX text node
  - context: `ame="w-full sm:w-auto"> <RefreshCw className="h-4 w-4 mr-2" />Oppdater (forbi cache) </Button> {compareEnabled`
- [708:68] (JSXText) `Sist registrert` → key: `common.kreativiumai.sist_registrert` — Static JSX text node
  - context: `<div> <div className="text-xs text-muted-foreground">Sist registrert</div> <div className="font-medium">{dataQual`
- [712:68] (JSXText) `Dager siden` → key: `common.kreativiumai.dager_siden` — Static JSX text node
  - context: `<div> <div className="text-xs text-muted-foreground">Dager siden</div> <div className="font-medium">{dataQuality.`
- [720:73] (JSXText) `Balanse (tid på dagen)` → key: `common.kreativiumai.balanse_tid_p_dagen` — Static JSX text node
  - context: `pan-4"> <div className="text-xs text-muted-foreground mb-1">Balanse (tid på dagen)</div> <div className="flex items-cent`
- [726:80] (JSXText) `•` → key: `common.kreativiumai.` — Static JSX text node
  - context: `{i < 2 && <span className="text-muted-foreground/40">•</span>} </div> ))}`
- [734:117] (JSXText) `Ingen data funnet for valgt periode.` → key: `common.kreativiumai.ingen_data_funnet_for_valgt` — Static JSX text node
  - context: `items-center gap-2 text-muted-foreground"><AlertTriangle className="h-4 w-4" />Ingen data funnet for valgt periode.</div> )} </CardCo`
- [818:96] (JSXText) `Nøkkelfunn` → key: `common.kreativiumai.n_kkelfunn` — Static JSX text node
  - context: `<CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" />Nøkkelfunn</CardTitle> </CardHeader> <CardContent cl`
- [825:66] (JSXText) `Ingen nøkkelfunn rapportert.` → key: `common.kreativiumai.ingen_n_kkelfunn_rapportert` — Static JSX text node
  - context: `</ul> ) : <p className="text-sm text-muted-foreground">Ingen nøkkelfunn rapportert.</p>} </CardContent> </Car`
- [831:93] (JSXText) `Mønstre` → key: `common.kreativiumai.m_nstre` — Static JSX text node
  - context: `<CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" />Mønstre</CardTitle> </CardHeader> <CardContent class`
- [845:67] (JSXText) `Ingen mønstre identifisert.` → key: `common.kreativiumai.ingen_m_nstre_identifisert` — Static JSX text node
  - context: `); }) : <p className="text-sm text-muted-foreground">Ingen mønstre identifisert.</p>} </CardContent> </Card`
- [851:96] (JSXText) `Tiltak og anbefalinger` → key: `common.kreativiumai.tiltak_og_anbefalinger` — Static JSX text node
  - context: `<CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" />Tiltak og anbefalinger</CardTitle> </CardHeader> <To`
- [868:82] (JSXText) `Källor:` → key: `common.kreativiumai.k_llor` — Static JSX text node
  - context: `<span className="text-xs text-muted-foreground mr-2">Källor:</span> <div className="flex flex-wrap gap-1`
- [886:66] (JSXText) `Ingen anbefalinger rapportert.` → key: `common.kreativiumai.ingen_anbefalinger_rapportert` — Static JSX text node
  - context: `</ul> ) : <p className="text-sm text-muted-foreground">Ingen anbefalinger rapportert.</p>} </CardContent> <`
- [895:49] (JSXText) `AI‑metadata •` → key: `common.kreativiumai.ai_metadata` — Static JSX text node
  - context: `Name="flex items-center gap-2"> <Info className="h-4 w-4" />AI‑metadata • <span className="font-normal text-muted-foreground">{displayModelN`
- [905:26] (JSXText) `Tokens: prompt` → key: `common.kreativiumai.tokens_prompt` — Static JSX text node
  - context: `s)} ms</div>} {results.ai.usage && ( <div>Tokens: prompt {results.ai.usage.promptTokens ?? 0} • completion {results.ai.usa`
- [905:78] (JSXText) `• completion` → key: `common.kreativiumai.completion` — Static JSX text node
  - context: `( <div>Tokens: prompt {results.ai.usage.promptTokens ?? 0} • completion {results.ai.usage.completionTokens ?? 0} • total {results.ai.usage.`
- [905:132] (JSXText) `• total` → key: `common.kreativiumai.total` — Static JSX text node
  - context: `.usage.promptTokens ?? 0} • completion {results.ai.usage.completionTokens ?? 0} • total {results.ai.usage.totalTokens ?? 0}</div> )}`
- [908:26] (JSXText) `Cache: read` → key: `common.kreativiumai.cache_read` — Static JSX text node
  - context: `|| (results.ai.usage.cacheWriteTokens ?? 0) > 0) && ( <div>Cache: read {results.ai.usage.cacheReadTokens ?? 0} • write {results.ai.usage.ca`
- [908:78] (JSXText) `• write` → key: `common.kreativiumai.write` — Static JSX text node
  - context: `( <div>Cache: read {results.ai.usage.cacheReadTokens ?? 0} • write {results.ai.usage.cacheWriteTokens ?? 0}</div> )}`
- [910:131] (JSXText) `JSON‑gyldighet (global):` → key: `common.kreativiumai.json_gyldighet_global` — Static JSX text node
  - context: `ics.summary(); const pct = Math.round((s.jsonValidity || 0) * 100); return <div>JSON‑gyldighet (global): {pct}%</div>; } catch { return null; } })()}`

### src/pages/NotFound.tsx
- [14:18] (MessageAPI) `404 Error: User attempted to access non-existent route` → key: `common.notfound.404_error_user_attempted_to` — Message API call: error()
  - context: `; const { tCommon } = useTranslation(); useEffect(() => { logger.error("404 Error: User attempted to access non-existent route", { path: location`

### src/pages/ReportsClean.tsx
- [98:20] (MessageAPI) `Reports: failed to load data for export` → key: `common.reportsclean.reports_failed_to_load_data` — Message API call: error()
  - context: `ts, trackingEntries, goals } as const; } catch (error) { logger.error('Reports: failed to load data for export', { error }); return { students:`
- [129:20] (MessageAPI) `System CSV export failed` → key: `common.reportsclean.system_csv_export_failed` — Message API call: error()
  - context: `tSettings('dataExport.success_csv'))); } catch (error) { logger.error('System CSV export failed', { error }); toast.error(tSettings('dataExport.`
- [162:20] (MessageAPI) `System JSON export failed` → key: `common.reportsclean.system_json_export_failed` — Message API call: error()
  - context: `Settings('dataExport.success_json'))); } catch (error) { logger.error('System JSON export failed', { error }); toast.error(tSettings('dataExport`
- [194:20] (MessageAPI) `System backup failed` → key: `common.reportsclean.system_backup_failed` — Message API call: error()
  - context: `ttings('dataExport.success_backup'))); } catch (error) { logger.error('System backup failed', { error }); toast.error(tSettings('dataExport.erro`

### src/pages/ReportsHub.tsx
- [50:34] (JSXAttribute) `reports-templates-heading` → key: `common.reportshub.reports_templates_heading` — Static aria-labelledby attribute
  - context: `</Link> </div> </header> <section aria-labelledby="reports-templates-heading" className="space-y-4"> <h2 id="reports-tem`

### src/pages/SignLearnPage.tsx
- [41:42] (JSXText) `Vis dette tegnet:` → key: `common.signlearnpage.vis_dette_tegnet` — Static JSX text node
  - context: `t-foreground flex items-center gap-2"> <Hand className="h-5 w-5" /> Vis dette tegnet: <span className="text-primary">{current.word}</span>`
- [53:53] (JSXAttribute) `Neste tegn` → key: `common.signlearnpage.neste_tegn` — Static aria-label attribute
  - context: `sit'} </Button> <Button onClick={handleNext} aria-label="Neste tegn">👍 Jeg gjorde det!</Button> </div> <div classNa`
- [53:66] (JSXText) `👍 Jeg gjorde det!` → key: `common.signlearnpage.jeg_gjorde_det` — Static JSX text node
  - context: `</Button> <Button onClick={handleNext} aria-label="Neste tegn">👍 Jeg gjorde det!</Button> </div> <div className="space-y-2`
- [57:46] (JSXText) `Kameraveiledning kommer – øv selv foreløpig` → key: `common.signlearnpage.kameraveiledning_kommer_v_selv_forel` — Static JSX text node
  - context: `reground flex items-center gap-2"> <Camera className="h-4 w-4" /> Kameraveiledning kommer – øv selv foreløpig </div> <Webc`

### src/pages/TegnLayout.tsx
- [20:25] (JSXAttribute) `Tegn til Tale navigation` → key: `common.tegnlayout.tegn_til_tale_navigation` — Static aria-label attribute
  - context: `</h1> <LanguageSettings /> </header> <nav aria-label="Tegn til Tale navigation" className="flex gap-2"> <NavLink to="." end`

### src/workers/analytics.worker.ts
- [225:26] (MessageAPI) `[analytics.worker] Cache clear command failed` → key: `common.analytics_worker.analytics_worker_cache_clear_command` — Message API call: error()
  - context: `s AnalyticsWorkerMessage); } } catch (err) { try { logger.error('[analytics.worker] Cache clear command failed', err as Error); } catch {} }`
- [429:18] (MessageAPI) `[analytics.worker] error` → key: `common.analytics_worker.analytics_worker_error` — Message API call: error()
  - context: `own as AnalyticsWorkerMessage); } catch (error) { try { logger.error('[analytics.worker] error', error); } catch (e) { /* ignore logging fa`
- [433:18] (MessageAPI) `Error in analytics worker:` → key: `common.analytics_worker.error_in_analytics_worker` — Message API call: error()
  - context: `r); } catch (e) { /* ignore logging failure */ } logger.error('Error in analytics worker:', error); // Post an error message back to the m`

## Namespace: dashboard

### src/components/layouts/DashboardLayout.tsx
- [139:107] (JSXText) `↔` → key: `dashboard.dashboardlayout.` — Static JSX text node
  - context: `air.factor1.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} ↔{' '} {pair.factor2.replace(/([A-Z])/g, ' $1').replace(`

### src/components/profile-sections/DashboardSection.tsx
- [89:13] (JSXText) `Sammendrag av` → key: `dashboard.dashboardsection.sammendrag_av` — Static JSX text node
  - context: `bold">Oversikt</h2> <p className="text-muted-foreground"> Sammendrag av {student.name}s data og aktivitet </p> </div>`
- [89:41] (JSXText) `s data og aktivitet` → key: `dashboard.dashboardsection.s_data_og_aktivitet` — Static JSX text node
  - context: `<p className="text-muted-foreground"> Sammendrag av {student.name}s data og aktivitet </p> </div> <Button onCl`
- [186:60] (JSXText) `Samlet kvalitetsscore` → key: `dashboard.dashboardsection.samlet_kvalitetsscore` — Static JSX text node
  - context: `"> <div> <p className="text-sm text-muted-foreground">Samlet kvalitetsscore</p> <p className="text-3xl font-bold">{dataQ`
- [247:15] (JSXText) `AI-genererte innsikter` → key: `dashboard.dashboardsection.ai_genererte_innsikter` — Static JSX text node
  - context: `"> <TrendingUp className="h-5 w-5 animate-pulse" /> AI-genererte innsikter </CardTitle> </CardHeader>`
- [262:15] (JSXText) `AI-genererte innsikter` → key: `dashboard.dashboardsection.ai_genererte_innsikter` — Static JSX text node
  - context: `s-center gap-2"> <TrendingUp className="h-5 w-5" /> AI-genererte innsikter </CardTitle> </CardHeader>`
- [280:54] (JSXText) `Nylige økter` → key: `dashboard.dashboardsection.nylige_kter` — Static JSX text node
  - context: `gth > 0 && ( <div> <h3 className="text-lg font-semibold mb-4">Nylige økter</h3> <PaginatedSessionsList sessions={filteredData.entrie`

## Namespace: settings

### src/pages/Settings.tsx
- [26:65] (JSXAttribute) `Settings navigation` → key: `settings.settings.settings_navigation` — Static aria-label attribute
  - context: `-cols-4 gap-6"> <aside className="md:col-span-1 space-y-2" aria-label="Settings navigation"> <ul className="text-sm"> <li> <`

## Namespace: student

### src/components/StudentProfileSidebar.tsx
- [145:13] (JSXText) `Verktøy` → key: `student.studentprofilesidebar.verkt_y` — Static JSX text node
  - context: `foreground text-xs font-medium uppercase tracking-wider px-3 py-2"> Verktøy </SidebarGroupLabel> <SidebarGroupContent>`

### src/components/profile-sections/ToolsSection.tsx
- [90:44] (JSXText) `Verktøy` → key: `student.toolssection.verkt_y` — Static JSX text node
  - context: `6"> {/* Header */} <div> <h2 className="text-2xl font-bold">Verktøy</h2> <p className="text-muted-foreground"> Avanserte v`
- [92:11] (JSXText) `Avanserte verktøy for søk, maler og sammenligning` → key: `student.toolssection.avanserte_verkt_y_for_s` — Static JSX text node
  - context: `font-bold">Verktøy</h2> <p className="text-muted-foreground"> Avanserte verktøy for søk, maler og sammenligning </p> </div>`

### src/pages/AddStudent.tsx
- [60:20] (MessageAPI) `Error adding student:` → key: `student.addstudent.error_adding_student` — Message API call: error()
  - context: `dent.success'))); navigate('/'); } catch (error) { logger.error('Error adding student:', error); const errorMessage = error instanceof Err`

### src/pages/EnhancedTrackStudent.tsx
- [141:20] (MessageAPI) `Save session error` → key: `student.enhancedtrackstudent.save_session_error` — Message API call: error()
  - context: `navigate(\`/student/${student.id}\`); } catch (error) { logger.error('Save session error', { error }); toast.error(String(tTracking('session.sa`
- [261:26] (JSXText) `Session Data Review` → key: `student.enhancedtrackstudent.session_data_review` — Static JSX text node
  - context: `th > 0) && ( <Card> <CardHeader> <CardTitle>Session Data Review</CardTitle> </CardHeader> <CardConte`

### src/pages/StudentProfile.original.tsx
- [178:21] (MessageAPI) `Auto-seeding minimal demo data for mock route` → key: `student.studentprofile_original.auto_seeding_minimal_demo_data` — Message API call: info()
  - context: `.current = true; setIsSeedingData(true); try { logger.info('Auto-seeding minimal demo data for mock route', { studentId });`
- [194:22] (MessageAPI) `Failed to auto-seed mock data` → key: `student.studentprofile_original.failed_to_auto_seed_mock` — Message API call: error()
  - context: `reloadData(); } } catch (error) { logger.error('Failed to auto-seed mock data', { error, studentId }); toast.error(Stri`
- [243:24] (MessageAPI) `Error generating insights` → key: `student.studentprofile_original.error_generating_insights` — Message API call: error()
  - context: `} } catch (error) { if (!signal.aborted) { logger.error('Error generating insights', { error }); setInsights(null);`
- [273:26] (MessageAPI) `[SAFE] analyticsManager.triggerAnalyticsForStudent failed` → key: `student.studentprofile_original.safe_analyticsmanager_triggeranalyticsforstudent_failed` — Message API call: error()
  - context: `} }) .catch((err) => { logger.error('[SAFE] analyticsManager.triggerAnalyticsForStudent failed', { error: err, stude`
- [285:24] (MessageAPI) `[SAFE] analyticsManager.initializeStudentAnalytics failed` → key: `student.studentprofile_original.safe_analyticsmanager_initializestudentanalytics_failed` — Message API call: error()
  - context: `entAnalytics done'); } } catch (err) { logger.error('[SAFE] analyticsManager.initializeStudentAnalytics failed', { error: err, stude`
- [290:20] (MessageAPI) `[SAFE] analyticsManager outer try/catch caught error` → key: `student.studentprofile_original.safe_analyticsmanager_outer_try_catch` — Message API call: error()
  - context: `/ Extra safety net; never rethrow from analytics side-effect logger.error('[SAFE] analyticsManager outer try/catch caught error', { error: err }); }`
- [357:20] (MessageAPI) `Export error` → key: `student.studentprofile_original.export_error` — Message API call: error()
  - context: `(tCommon('status.success'))); } catch (error: unknown) { logger.error('Export error', { error }); const errorMessage = error instanceof Error ?`
- [381:20] (MessageAPI) `Backup error` → key: `student.studentprofile_original.backup_error` — Message API call: error()
  - context: `ss(String(tCommon('status.success'))); } catch (error) { logger.error('Backup error', { error }); toast.error(String(tCommon('error.title')));`

### src/pages/StudentProfile.tsx
- [180:21] (MessageAPI) `Auto-seeding minimal demo data for mock route` → key: `student.studentprofile.auto_seeding_minimal_demo_data` — Message API call: info()
  - context: `.current = true; setIsSeedingData(true); try { logger.info('Auto-seeding minimal demo data for mock route', { studentId });`
- [189:23] (MessageAPI) `Demo data created successfully` → key: `student.studentprofile.demo_data_created_successfully` — Message API call: success()
  - context: `); // Show non-intrusive success message toast.success('Demo data created successfully', { description: 'Sample data has been`
- [189:23] (MessageAPI) `Demo data created successfully` → key: `student.studentprofile.demo_data_created_successfully` — sonner toast.success()
  - context: `); // Show non-intrusive success message toast.success('Demo data created successfully', { description: 'Sample data has been`
- [198:22] (MessageAPI) `Failed to auto-seed mock data` → key: `student.studentprofile.failed_to_auto_seed_mock` — Message API call: error()
  - context: `reloadData(); } } catch (error) { logger.error('Failed to auto-seed mock data', { error, studentId }); toast.error('Fai`
- [199:21] (MessageAPI) `Failed to create demo data` → key: `student.studentprofile.failed_to_create_demo_data` — Message API call: error()
  - context: `ror('Failed to auto-seed mock data', { error, studentId }); toast.error('Failed to create demo data', { description: 'Please try loading mock`
- [199:21] (MessageAPI) `Failed to create demo data` → key: `student.studentprofile.failed_to_create_demo_data` — sonner toast.error()
  - context: `ror('Failed to auto-seed mock data', { error, studentId }); toast.error('Failed to create demo data', { description: 'Please try loading mock`
- [249:24] (MessageAPI) `Error generating insights` → key: `student.studentprofile.error_generating_insights` — Message API call: error()
  - context: `} } catch (error) { if (!signal.aborted) { logger.error('Error generating insights', { error }); setInsights(null);`
- [251:23] (MessageAPI) `Failed to generate insights` → key: `student.studentprofile.failed_to_generate_insights` — Message API call: error()
  - context: `ating insights', { error }); setInsights(null); toast.error('Failed to generate insights'); } } finally { if (!signal.`
- [251:23] (MessageAPI) `Failed to generate insights` → key: `student.studentprofile.failed_to_generate_insights` — sonner toast.error()
  - context: `ating insights', { error }); setInsights(null); toast.error('Failed to generate insights'); } } finally { if (!signal.`
- [279:26] (MessageAPI) `[SAFE] analyticsManager.triggerAnalyticsForStudent failed` → key: `student.studentprofile.safe_analyticsmanager_triggeranalyticsforstudent_failed` — Message API call: error()
  - context: `} }) .catch((err) => { logger.error('[SAFE] analyticsManager.triggerAnalyticsForStudent failed', { error: err, stude`
- [291:24] (MessageAPI) `[SAFE] analyticsManager.initializeStudentAnalytics failed` → key: `student.studentprofile.safe_analyticsmanager_initializestudentanalytics_failed` — Message API call: error()
  - context: `entAnalytics done'); } } catch (err) { logger.error('[SAFE] analyticsManager.initializeStudentAnalytics failed', { error: err, stude`
- [296:20] (MessageAPI) `[SAFE] analyticsManager outer try/catch caught error` → key: `student.studentprofile.safe_analyticsmanager_outer_try_catch` — Message API call: error()
  - context: `/ Extra safety net; never rethrow from analytics side-effect logger.error('[SAFE] analyticsManager outer try/catch caught error', { error: err }); }`
- [357:25] (MessageAPI) `Report exported as PDF` → key: `student.studentprofile.report_exported_as_pdf` — Message API call: success()
  - context: `await analyticsExport.exportTo('pdf', exportData); toast.success('Report exported as PDF'); return; } case 'csv': {`
- [357:25] (MessageAPI) `Report exported as PDF` → key: `student.studentprofile.report_exported_as_pdf` — sonner toast.success()
  - context: `await analyticsExport.exportTo('pdf', exportData); toast.success('Report exported as PDF'); return; } case 'csv': {`
- [383:20] (MessageAPI) `Export error` → key: `student.studentprofile.export_error` — Message API call: error()
  - context: `as ${format.toUpperCase()}\`); } catch (error: unknown) { logger.error('Export error', { error }); const errorMessage = error instanceof Error ?`
- [405:21] (MessageAPI) `Backup created successfully` → key: `student.studentprofile.backup_created_successfully` — Message API call: success()
  - context: `]/g, '-')}.json\`; downloadBlob(backupBlob, filename); toast.success('Backup created successfully'); } catch (error) { logger.error('Backup`
- [405:21] (MessageAPI) `Backup created successfully` → key: `student.studentprofile.backup_created_successfully` — sonner toast.success()
  - context: `]/g, '-')}.json\`; downloadBlob(backupBlob, filename); toast.success('Backup created successfully'); } catch (error) { logger.error('Backup`
- [407:20] (MessageAPI) `Backup error` → key: `student.studentprofile.backup_error` — Message API call: error()
  - context: `uccess('Backup created successfully'); } catch (error) { logger.error('Backup error', { error }); toast.error('Backup failed. Please try again.'`
- [408:19] (MessageAPI) `Backup failed. Please try again.` → key: `student.studentprofile.backup_failed_please_try_again` — Message API call: error()
  - context: `atch (error) { logger.error('Backup error', { error }); toast.error('Backup failed. Please try again.'); } }, [student, trackingEntries, allEm`
- [408:19] (MessageAPI) `Backup failed. Please try again.` → key: `student.studentprofile.backup_failed_please_try_again` — sonner toast.error()
  - context: `atch (error) { logger.error('Backup error', { error }); toast.error('Backup failed. Please try again.'); } }, [student, trackingEntries, allEm`

### src/pages/StudentProfileOptimized.tsx
- [123:23] (MessageAPI) `Demo data created successfully` → key: `student.studentprofileoptimized.demo_data_created_successfully` — Message API call: success()
  - context: `window.dispatchEvent(new CustomEvent('mockDataLoaded')); toast.success('Demo data created successfully'); if (reloadData) reloadData(); }`
- [123:23] (MessageAPI) `Demo data created successfully` → key: `student.studentprofileoptimized.demo_data_created_successfully` — sonner toast.success()
  - context: `window.dispatchEvent(new CustomEvent('mockDataLoaded')); toast.success('Demo data created successfully'); if (reloadData) reloadData(); }`
- [126:22] (MessageAPI) `Failed to auto-seed mock data` → key: `student.studentprofileoptimized.failed_to_auto_seed_mock` — Message API call: error()
  - context: `if (reloadData) reloadData(); } catch (error) { logger.error('Failed to auto-seed mock data', { error, studentId }); toast.error('Fai`
- [127:21] (MessageAPI) `Failed to create demo data` → key: `student.studentprofileoptimized.failed_to_create_demo_data` — Message API call: error()
  - context: `ror('Failed to auto-seed mock data', { error, studentId }); toast.error('Failed to create demo data'); } finally { setIsSeedingData(false)`
- [127:21] (MessageAPI) `Failed to create demo data` → key: `student.studentprofileoptimized.failed_to_create_demo_data` — sonner toast.error()
  - context: `ror('Failed to auto-seed mock data', { error, studentId }); toast.error('Failed to create demo data'); } finally { setIsSeedingData(false)`
- [154:26] (MessageAPI) `Failed to get insights` → key: `student.studentprofileoptimized.failed_to_get_insights` — Message API call: error()
  - context: `ewInsights); } } catch (error) { logger.error('Failed to get insights', { error }); } finally { setIsLoa`
- [212:20] (MessageAPI) `Export error` → key: `student.studentprofileoptimized.export_error` — Message API call: error()
  - context: `essfully as ${format.toUpperCase()}\`); } catch (error) { logger.error('Export error', { error }); toast.error(\`Export failed: ${error instanceof`

### src/pages/TrackStudent.tsx
- [42:19] (MessageAPI) `Emotion recorded!` → key: `student.trackstudent.emotion_recorded` — Message API call: success()
  - context: `| 'timestamp'>) => { setEmotions([...emotions, emotion]); toast.success("Emotion recorded!"); }; const handleSensoryAdd = (sensory: Omit<SensoryEnt`
- [42:19] (MessageAPI) `Emotion recorded!` → key: `student.trackstudent.emotion_recorded` — sonner toast.success()
  - context: `| 'timestamp'>) => { setEmotions([...emotions, emotion]); toast.success("Emotion recorded!"); }; const handleSensoryAdd = (sensory: Omit<SensoryEnt`
- [47:19] (MessageAPI) `Sensory input recorded!` → key: `student.trackstudent.sensory_input_recorded` — Message API call: success()
  - context: `mp'>) => { setSensoryInputs([...sensoryInputs, sensory]); toast.success("Sensory input recorded!"); }; const handleEnvironmentalAdd = (environmenta`
- [47:19] (MessageAPI) `Sensory input recorded!` → key: `student.trackstudent.sensory_input_recorded` — sonner toast.success()
  - context: `mp'>) => { setSensoryInputs([...sensoryInputs, sensory]); toast.success("Sensory input recorded!"); }; const handleEnvironmentalAdd = (environmenta`
- [52:19] (MessageAPI) `Environmental conditions recorded!` → key: `student.trackstudent.environmental_conditions_recorded` — Message API call: success()
  - context: `| 'timestamp'>) => { setEnvironmentalData(environmental); toast.success("Environmental conditions recorded!"); }; const handleSaveSession = async (`
- [52:19] (MessageAPI) `Environmental conditions recorded!` → key: `student.trackstudent.environmental_conditions_recorded` — sonner toast.success()
  - context: `| 'timestamp'>) => { setEnvironmentalData(environmental); toast.success("Environmental conditions recorded!"); }; const handleSaveSession = async (`
- [100:20] (MessageAPI) `Failed to save tracking session` → key: `student.trackstudent.failed_to_save_tracking_session` — Message API call: error()
  - context: `navigate(\`/student/${student.id}\`); } catch (error) { logger.error('Failed to save tracking session', { error }); toast.error(String(tTrackin`

## Namespace: tracking

### src/components/EmotionTracker.tsx
- [131:70] (JSXText) `Specific Feeling (Optional)` → key: `tracking.emotiontracker.specific_feeling_optional` — Static JSX text node
  - context: `<div> <h3 className="text-sm font-medium text-foreground mb-3">Specific Feeling (Optional)</h3> <div className="flex flex-wrap gap-`
- [187:70] (JSXText) `Duration (minutes)` → key: `tracking.emotiontracker.duration_minutes` — Static JSX text node
  - context: `<div> <h3 className="text-sm font-medium text-foreground mb-3">Duration (minutes)</h3> <div className="flex gap-2"> <`
- [205:29] (JSXAttribute) `How long did it last?` → key: `tracking.emotiontracker.how_long_did_it_last` — Static placeholder attribute
  - context: `999 minutes } }} placeholder="How long did it last?" className="w-32 px-3 py-2 border border-`
- [209:28] (JSXAttribute) `Duration in minutes` → key: `tracking.emotiontracker.duration_in_minutes` — Static aria-label attribute
  - context: `t" min="0" max="999" aria-label="Duration in minutes" aria-describedby="duration-help"`
- [232:70] (JSXText) `How did it develop?` → key: `tracking.emotiontracker.how_did_it_develop` — Static JSX text node
  - context: `<div> <h3 className="text-sm font-medium text-foreground mb-3">How did it develop?</h3> <div className="flex gap-2">`
- [264:68] (JSXText) `Utløsere (Valgfritt)` → key: `tracking.emotiontracker.utl_sere_valgfritt` — Static JSX text node
  - context: `<div> <h3 className="text-sm font-medium text-foreground mb-3">Utløsere (Valgfritt)</h3> <div className="flex gap-2 mb-2">`
- [271:27] (JSXAttribute) `Legg til en utløser...` → key: `tracking.emotiontracker.legg_til_en_utl_ser` — Static placeholder attribute
  - context: `ress={(e) => e.key === 'Enter' && handleAddTrigger()} placeholder="Legg til en utløser..." aria-label="Legg til ny utløser"`
- [272:26] (JSXAttribute) `Legg til ny utløser` → key: `tracking.emotiontracker.legg_til_ny_utl_ser` — Static aria-label attribute
  - context: `()} placeholder="Legg til en utløser..." aria-label="Legg til ny utløser" className="flex-1 px-3 py-2 border border-bo`
- [287:27] (JSXText) `×` → key: `tracking.emotiontracker.` — Static JSX text node
  - context: `={() => handleRemoveTrigger(trigger)} > {trigger} × </Badge> ))} </div> </div>`
- [299:25] (JSXAttribute) `Ytterligere observasjoner...` → key: `tracking.emotiontracker.ytterligere_observasjoner` — Static placeholder attribute
  - context: `onChange={(e) => setNotes(e.target.value)} placeholder="Ytterligere observasjoner..." className="font-dyslexia bg-input bor`

### src/components/EnvironmentalTracker.tsx
- [52:19] (MessageAPI) `Please fill out all required fields (lighting, activity, weather, time of day).` → key: `tracking.environmentaltracker.please_fill_out_all_required` — Message API call: error()
  - context: `(!lighting || !classroomActivity || !weather || !timeOfDay) { toast.error('Please fill out all required fields (lighting, activity, weather, time of day).`
- [101:80] (JSXText) `°C` → key: `tracking.environmentaltracker.c` — Static JSX text node
  - context: `{String(tTracking('environmental.temperature'))}: {roomTemperature}°C </Label> <Slider value={[roomTemperature]}`
- [112:19] (JSXText) `15°C` → key: `tracking.environmentaltracker.15_c` — Static JSX text node
  - context: `assName="flex justify-between text-xs text-muted-foreground"> <span>15°C</span> <span>30°C</span> </div> </div>`
- [113:19] (JSXText) `30°C` → key: `tracking.environmentaltracker.30_c` — Static JSX text node
  - context: `text-xs text-muted-foreground"> <span>15°C</span> <span>30°C</span> </div> </div> {/* Lighting */} <d`

### src/components/QuickEntryTemplates.tsx
- [167:20] (MessageAPI) `Failed to parse saved templates, using defaults` → key: `tracking.quickentrytemplates.failed_to_parse_saved_templates` — Message API call: error()
  - context: `catch (error) { // Log error and fall back to defaults logger.error('Failed to parse saved templates, using defaults', error); return defaultT`
- [201:20] (MessageAPI) `Failed to save templates to localStorage` → key: `tracking.quickentrytemplates.failed_to_save_templates_to` — Message API call: error()
  - context: `or) { // Handle quota exceeded or other storage errors logger.error('Failed to save templates to localStorage', error); toast.error('Failed to`
- [202:19] (MessageAPI) `Failed to save template changes. Storage may be full.` → key: `tracking.quickentrytemplates.failed_to_save_template_changes` — Message API call: error()
  - context: `ger.error('Failed to save templates to localStorage', error); toast.error('Failed to save template changes. Storage may be full.'); } }; const ap`
- [202:19] (MessageAPI) `Failed to save template changes. Storage may be full.` → key: `tracking.quickentrytemplates.failed_to_save_template_changes` — sonner toast.error()
  - context: `ger.error('Failed to save templates to localStorage', error); toast.error('Failed to save template changes. Storage may be full.'); } }; const ap`
- [237:19] (MessageAPI) `Cannot delete default templates` → key: `tracking.quickentrytemplates.cannot_delete_default_templates` — Message API call: error()
  - context: `ind(t => t.id === templateId); if (template?.isDefault) { toast.error("Cannot delete default templates"); return; } const updatedTe`
- [237:19] (MessageAPI) `Cannot delete default templates` → key: `tracking.quickentrytemplates.cannot_delete_default_templates` — sonner toast.error()
  - context: `ind(t => t.id === templateId); if (template?.isDefault) { toast.error("Cannot delete default templates"); return; } const updatedTe`
- [243:19] (MessageAPI) `Template deleted` → key: `tracking.quickentrytemplates.template_deleted` — Message API call: success()
  - context: `=> t.id !== templateId); saveTemplates(updatedTemplates); toast.success("Template deleted"); }; const createTemplate = () => { if (!newTemplate`
- [243:19] (MessageAPI) `Template deleted` → key: `tracking.quickentrytemplates.template_deleted` — sonner toast.success()
  - context: `=> t.id !== templateId); saveTemplates(updatedTemplates); toast.success("Template deleted"); }; const createTemplate = () => { if (!newTemplate`
- [248:19] (MessageAPI) `Template name is required` → key: `tracking.quickentrytemplates.template_name_is_required` — Message API call: error()
  - context: `createTemplate = () => { if (!newTemplate.name?.trim()) { toast.error("Template name is required"); return; } const template: QuickTemp`
- [248:19] (MessageAPI) `Template name is required` → key: `tracking.quickentrytemplates.template_name_is_required` — sonner toast.error()
  - context: `createTemplate = () => { if (!newTemplate.name?.trim()) { toast.error("Template name is required"); return; } const template: QuickTemp`
- [275:19] (MessageAPI) `Template created successfully` → key: `tracking.quickentrytemplates.template_created_successfully` — Message API call: success()
  - context: `false, usageCount: 0 }); setIsCreating(false); toast.success("Template created successfully"); }; const getCategoryColor = (category: st`
- [275:19] (MessageAPI) `Template created successfully` → key: `tracking.quickentrytemplates.template_created_successfully` — sonner toast.success()
  - context: `false, usageCount: 0 }); setIsCreating(false); toast.success("Template created successfully"); }; const getCategoryColor = (category: st`
- [303:13] (JSXText) `Quick Entry Templates` → key: `tracking.quickentrytemplates.quick_entry_templates` — Static JSX text node
  - context: `center gap-2"> <Zap className="h-5 w-5 text-primary" /> Quick Entry Templates </CardTitle> <Dialog open={isCreating}`
- [307:62] (JSXAttribute) `Create new template` → key: `tracking.quickentrytemplates.create_new_template` — Static aria-label attribute
  - context: `ogTrigger asChild> <Button size="sm" variant="outline" aria-label="Create new template" title="Create new template"> <Plus classNa`
- [307:90] (JSXAttribute) `Create new template` → key: `tracking.quickentrytemplates.create_new_template` — Static title attribute
  - context: `<Button size="sm" variant="outline" aria-label="Create new template" title="Create new template"> <Plus className="h-4 w-4 mr-2" />`
- [309:52] (JSXText) `New Template` → key: `tracking.quickentrytemplates.new_template` — Static JSX text node
  - context: `className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">New Template</span> </Button> </DialogTrigger>`
- [314:30] (JSXText) `Create Quick Entry Template` → key: `tracking.quickentrytemplates.create_quick_entry_template` — Static JSX text node
  - context: `className="max-w-md"> <DialogHeader> <DialogTitle>Create Quick Entry Template</DialogTitle> <DialogDescription>`
- [316:19] (JSXText) `Define a name, optional description, category, and default values.` → key: `tracking.quickentrytemplates.define_a_name_optional_description` — Static JSX text node
  - context: `ry Template</DialogTitle> <DialogDescription> Define a name, optional description, category, and default values.`
- [321:83] (JSXText) `Template Name` → key: `tracking.quickentrytemplates.template_name` — Static JSX text node
  - context: `<label className="text-sm font-medium" htmlFor={templateNameId}>Template Name</label> <Input id={templateN`
- [324:33] (JSXAttribute) `e.g., Sensory Overload Response` → key: `tracking.quickentrytemplates.e_g_sensory_overload_response` — Static placeholder attribute
  - context: `<Input id={templateNameId} placeholder="e.g., Sensory Overload Response" value={newTemplate.name ||`
- [333:33] (JSXAttribute) `Brief description of when to use this template` → key: `tracking.quickentrytemplates.brief_description_of_when_to` — Static placeholder attribute
  - context: `id={templateDescriptionId} placeholder="Brief description of when to use this template" value={newT`
- [371:21] (JSXText) `Create Template` → key: `tracking.quickentrytemplates.create_template` — Static JSX text node
  - context: `Button> <Button onClick={createTemplate}> Create Template </Button> </div>`
- [430:23] (JSXText) `Apply Template` → key: `tracking.quickentrytemplates.apply_template` — Static JSX text node
  - context: `className="flex-1 mr-2" > Apply Template </Button>`
- [438:38] (JSXAttribute) `Edit template` → key: `tracking.quickentrytemplates.edit_template` — Static aria-label attribute
  - context: `variant="ghost" aria-label="Edit template" title="Edit template"`
- [439:33] (JSXAttribute) `Edit template` → key: `tracking.quickentrytemplates.edit_template` — Static title attribute
  - context: `aria-label="Edit template" title="Edit template" onClick={() => setEditingTemplate(temp`
- [447:38] (JSXAttribute) `Delete template` → key: `tracking.quickentrytemplates.delete_template` — Static aria-label attribute
  - context: `variant="ghost" aria-label="Delete template" title="Delete template"`
- [448:33] (JSXAttribute) `Delete template` → key: `tracking.quickentrytemplates.delete_template` — Static title attribute
  - context: `aria-label="Delete template" title="Delete template" onClick={() => deleteTemplate(templa`
- [465:16] (JSXText) `No quick entry templates yet` → key: `tracking.quickentrytemplates.no_quick_entry_templates_yet` — Static JSX text node
  - context: `<Zap className="h-12 w-12 mx-auto mb-3 opacity-50" /> <p>No quick entry templates yet</p> <p className="text-sm">Create templ`
- [466:36] (JSXText) `Create templates for common tracking scenarios` → key: `tracking.quickentrytemplates.create_templates_for_common_tracking` — Static JSX text node
  - context: `<p>No quick entry templates yet</p> <p className="text-sm">Create templates for common tracking scenarios</p> </div> )}`

### src/components/SensoryTracker.tsx
- [185:26] (JSXAttribute) `Manual intensity input` → key: `tracking.sensorytracker.manual_intensity_input` — Static aria-label attribute
  - context: `className="w-16 px-2 py-1 mt-2 rounded border" aria-label="Manual intensity input" /> </div> )} {/*`
- [193:70] (JSXText) `Body Location (Optional)` → key: `tracking.sensorytracker.body_location_optional` — Static JSX text node
  - context: `<div> <h3 className="text-sm font-medium text-foreground mb-3">Body Location (Optional)</h3> <div className="flex flex-wrap gap-2">`
- [222:70] (JSXText) `Coping Strategies Used` → key: `tracking.sensorytracker.coping_strategies_used` — Static JSX text node
  - context: `<div> <h3 className="text-sm font-medium text-foreground mb-3">Coping Strategies Used</h3> <div className="flex gap-2 mb-2">`
- [229:29] (JSXAttribute) `Add a coping strategy...` → key: `tracking.sensorytracker.add_a_coping_strategy` — Static placeholder attribute
  - context: `=> e.key === 'Enter' && handleAddCopingStrategy()} placeholder="Add a coping strategy..." aria-label="Legg til mestringsstrateg`
- [230:28] (JSXAttribute) `Legg til mestringsstrategi` → key: `tracking.sensorytracker.legg_til_mestringsstrategi` — Static aria-label attribute
  - context: `placeholder="Add a coping strategy..." aria-label="Legg til mestringsstrategi" className="flex-1 px-3 py-2 border`
- [261:30] (JSXText) `×` → key: `tracking.sensorytracker.` — Static JSX text node
  - context: `eRemoveCopingStrategy(strategy)} > {strategy} × </Badge> ))} </div> </div>`
- [270:68] (JSXText) `Miljø (Valgfritt)` → key: `tracking.sensorytracker.milj_valgfritt` — Static JSX text node
  - context: `<div> <h3 className="text-sm font-medium text-foreground mb-3">Miljø (Valgfritt)</h3> <input type="text" valu`
- [275:25] (JSXAttribute) `f.eks. Klasserom, Lekeplass, Bibliotek...` → key: `tracking.sensorytracker.f_eks_klasserom_lekeplass_bibliotek` — Static placeholder attribute
  - context: `onChange={(e) => setEnvironment(e.target.value)} placeholder="f.eks. Klasserom, Lekeplass, Bibliotek..." aria-label="Beskriv milj`
- [276:24] (JSXAttribute) `Beskriv miljøet` → key: `tracking.sensorytracker.beskriv_milj_et` — Static aria-label attribute
  - context: `placeholder="f.eks. Klasserom, Lekeplass, Bibliotek..." aria-label="Beskriv miljøet" className="w-full px-3 py-2 border border-border r`
- [287:25] (JSXAttribute) `Ytterligere observasjoner om den sensoriske responsen...` → key: `tracking.sensorytracker.ytterligere_observasjoner_om_den_sensoriske` — Static placeholder attribute
  - context: `onChange={(e) => setNotes(e.target.value)} placeholder="Ytterligere observasjoner om den sensoriske responsen..." className`

### src/components/TimelineVisualization.tsx
- [536:13] (JSXText) `Timeline Visualization` → key: `tracking.timelinevisualization.timeline_visualization` — Static JSX text node
  - context: `flex items-center gap-2"> <Clock className="h-5 w-5" /> Timeline Visualization </CardTitle> <div className="flex ite`
- [547:26] (JSXAttribute) `Reset view` → key: `tracking.timelinevisualization.reset_view` — Static aria-label attribute
  - context: `size="icon" variant="ghost" aria-label="Reset view" title="Reset view" onClick={() => {`
- [548:21] (JSXAttribute) `Reset view` → key: `tracking.timelinevisualization.reset_view` — Static title attribute
  - context: `variant="ghost" aria-label="Reset view" title="Reset view" onClick={() => { setZoomLevel(1);`
- [569:28] (JSXAttribute) `Zoom out` → key: `tracking.timelinevisualization.zoom_out` — Static aria-label attribute
  - context: `size="icon" variant="ghost" aria-label="Zoom out" title="Zoom out" onClick={() => handl`
- [570:23] (JSXAttribute) `Zoom out` → key: `tracking.timelinevisualization.zoom_out` — Static title attribute
  - context: `variant="ghost" aria-label="Zoom out" title="Zoom out" onClick={() => handleZoom(-0.5)} disa`
- [582:28] (JSXAttribute) `Zoom in` → key: `tracking.timelinevisualization.zoom_in` — Static aria-label attribute
  - context: `size="icon" variant="ghost" aria-label="Zoom in" title="Zoom in" onClick={() => handleZ`
- [583:23] (JSXAttribute) `Zoom in` → key: `tracking.timelinevisualization.zoom_in` — Static title attribute
  - context: `variant="ghost" aria-label="Zoom in" title="Zoom in" onClick={() => handleZoom(0.5)} disabl`
- [596:28] (JSXAttribute) `Pan left` → key: `tracking.timelinevisualization.pan_left` — Static aria-label attribute
  - context: `size="icon" variant="ghost" aria-label="Pan left" title="Pan left" onClick={() => handl`
- [597:23] (JSXAttribute) `Pan left` → key: `tracking.timelinevisualization.pan_left` — Static title attribute
  - context: `variant="ghost" aria-label="Pan left" title="Pan left" onClick={() => handlePan(50)} >`
- [605:28] (JSXAttribute) `Pan right` → key: `tracking.timelinevisualization.pan_right` — Static aria-label attribute
  - context: `size="icon" variant="ghost" aria-label="Pan right" title="Pan right" onClick={() => han`
- [606:23] (JSXAttribute) `Pan right` → key: `tracking.timelinevisualization.pan_right` — Static title attribute
  - context: `variant="ghost" aria-label="Pan right" title="Pan right" onClick={() => handlePan(-50)} >`
- [756:54] (JSXText) `Data Streams` → key: `tracking.timelinevisualization.data_streams` — Static JSX text node
  - context: `rounded-lg p-3 shadow-lg"> <h4 className="font-medium text-sm mb-2">Data Streams</h4> <div className="space-y-1"> {dataStr`

## False positives

- src/components/analysis/PatternAnalysisView.tsx [109:79] (JSXText) `Pattern` — Looks like an identifier or existing key
- src/components/analysis/PatternAnalysisView.tsx [115:25] (JSXText) `Frequency:` — Looks like an identifier or existing key
- src/components/analysis/PatternAnalysisView.tsx [115:56] (JSXText) `occurrences` — Looks like an identifier or existing key
- src/components/analysis/PatternAnalysisView.tsx [119:62] (JSXText) `Recommendations:` — Looks like an identifier or existing key
- src/components/analysis/PatternAnalysisView.tsx [171:67] (JSXText) `Prediction:` — Looks like an identifier or existing key
- src/components/analysis/PatternAnalysisView.tsx [195:62] (JSXText) `Recommendations:` — Looks like an identifier or existing key
- src/components/analysis/PatternAnalysisView.tsx [209:29] (JSXText) `Severity:` — Looks like an identifier or existing key
- src/components/analysis/PatternAnalysisView.tsx [242:71] (JSXText) `Anomaly` — Looks like an identifier or existing key
- src/components/analysis/PatternAnalysisView.tsx [244:25] (JSXText) `Severity:` — Looks like an identifier or existing key
- src/components/analysis/TeacherInsightsPanel.tsx [96:42] (JSXText) `Correlation` — Looks like an identifier or existing key
- src/components/analysis/TeacherInsightsPanel.tsx [119:11] (JSXText) `Data:` — Looks like an identifier or existing key
- src/components/analysis/TeacherInsightsPanel.tsx [119:49] (JSXText) `emotions` — Looks like an identifier or existing key
- src/components/analytics-panels/ChatComposer.tsx [64:96] (JSXText) `Send` — Looks like an identifier or existing key
- src/components/analytics-panels/EntryDetailsDrawer.tsx [51:23] (JSXText) `Detaljer` — Looks like an identifier or existing key
- src/components/analytics-panels/EntryDetailsDrawer.tsx [64:46] (JSXText) `Notat` — Looks like an identifier or existing key
- src/components/analytics-panels/EntryDetailsDrawer.tsx [80:54] (JSXText) `Sensorikk` — Looks like an identifier or existing key
- src/components/analytics-panels/EntryDetailsDrawer.tsx [90:54] (JSXText) `Kontekst` — Looks like an identifier or existing key
- src/components/analytics-panels/ExplanationChat.tsx [154:63] (JSXText) `AI` — Looks like an identifier or existing key
- src/components/analytics-panels/ExplanationChat.tsx [256:55] (JSXText) `Henvisninger` — Looks like an identifier or existing key
- src/components/analytics-panels/ExplanationContent.tsx [39:46] (JSXText) `Kopier` — Looks like an identifier or existing key
- src/components/analytics-panels/ExplanationContent.tsx [49:50] (JSXText) `Rapport` — Looks like an identifier or existing key
- src/components/analytics-panels/ExplanationDock.tsx [77:20] (JSXText) `Forklaring` — Looks like an identifier or existing key
- src/components/analytics-panels/ExplanationSheet.tsx [66:23] (JSXText) `Forklaring` — Looks like an identifier or existing key
- src/components/analytics-panels/ExplanationTabs.tsx [111:39] (JSXText) `Chat` — Looks like an identifier or existing key
- src/components/analytics-panels/ExplanationTabs.tsx [112:41] (JSXText) `Kilder` — Looks like an identifier or existing key
- src/components/analytics-panels/ExplanationTabs.tsx [113:47] (JSXText) `Henvisninger` — Looks like an identifier or existing key
- src/components/analytics-panels/ExplanationTabs.tsx [213:62] (JSXText) `Henvisninger` — Looks like an identifier or existing key
- src/components/analytics/panels/ExplorePanel.tsx [32:30] (JSXAttribute) `explore-title` — Looks like an identifier or existing key
- src/components/analytics/panels/OverviewPanel.tsx [52:32] (JSXAttribute) `overview-title` — Looks like an identifier or existing key
- src/components/AnalyticsSettings.tsx [494:28] (JSXText) `Emotion:` — Looks like an identifier or existing key
- src/components/AnalyticsSettings.tsx [494:89] (JSXText) `x` — Looks like an identifier or existing key
- src/components/AnalyticsSettings.tsx [495:28] (JSXText) `Frequency:` — Looks like an identifier or existing key
- src/components/AnalyticsSettings.tsx [495:84] (JSXText) `x` — Looks like an identifier or existing key
- src/components/AnalyticsSettings.tsx [496:28] (JSXText) `Anomaly:` — Looks like an identifier or existing key
- src/components/AnalyticsSettings.tsx [496:80] (JSXText) `x` — Looks like an identifier or existing key
- src/components/AnalyticsSettings.tsx [527:98] (JSXText) `days` — Looks like an identifier or existing key
- src/components/AnalyticsSettings.tsx [546:93] (JSXText) `days` — Looks like an identifier or existing key
- src/components/AnalyticsSettings.tsx [565:91] (JSXText) `days` — Looks like an identifier or existing key
- src/components/AnalyticsSettings.tsx [623:70] (JSXText) `Version` — Looks like an identifier or existing key
- src/components/AnalyticsSettings.tsx [634:72] (JSXText) `Accuracy` — Looks like an identifier or existing key
- src/components/AnalyticsSettings.tsx [664:37] (JSXText) `Training...` — Looks like an identifier or existing key
- src/components/AnalyticsSettings.tsx [669:37] (JSXText) `Retrain` — Looks like an identifier or existing key
- src/components/AnalyticsSettings.tsx [682:37] (JSXText) `Deleting...` — Looks like an identifier or existing key
- src/components/AnalyticsSettings.tsx [704:35] (JSXText) `Training...` — Looks like an identifier or existing key
- src/components/AnalyticsSettings.tsx [767:84] (JSXText) `min` — Looks like an identifier or existing key
- src/components/AnalyticsSettings.tsx [848:17] (JSXText) `Cancel` — Looks like an identifier or existing key
- src/components/AnalyticsStatusIndicator.tsx [154:11] (JSXText) `Analytics:` — Looks like an identifier or existing key
- src/components/AnalyticsStatusIndicator.tsx [158:13] (JSXText) `Updated` — Looks like an identifier or existing key
- src/components/AnalyticsStatusIndicator.tsx [181:13] (JSXText) `Refresh` — Looks like an identifier or existing key
- src/components/AnalyticsStatusIndicator.tsx [260:21] (JSXText) `Auto-Updates` — Looks like an identifier or existing key
- src/components/ComparisonSummary.tsx [607:129] (JSXText) `ms` — Looks like an identifier or existing key
- src/components/DataCollectionRoadmap.tsx [143:13] (JSXText) `Datainnsamlingskart` — Looks like an identifier or existing key
- src/components/DataCollectionRoadmap.tsx [161:11] (JSXText) `Datainnsamlingskart` — Looks like an identifier or existing key
- src/components/DataCollectionRoadmap.tsx [173:59] (JSXText) `av` — Looks like an identifier or existing key
- src/components/DataCollectionRoadmap.tsx [178:55] (JSXText) `Datapunkter:` — Looks like an identifier or existing key
- src/components/DataCollectionRoadmap.tsx [182:55] (JSXText) `Dager:` — Looks like an identifier or existing key
- src/components/DataCollectionRoadmap.tsx [203:23] (JSXText) `Fremgang` — Looks like an identifier or existing key
- src/components/DataCollectionRoadmap.tsx [209:19] (JSXText) `Datapunkter:` — Looks like an identifier or existing key
- src/components/DataCollectionRoadmap.tsx [212:19] (JSXText) `Dager:` — Looks like an identifier or existing key
- src/components/DataCollectionRoadmap.tsx [260:56] (JSXText) `datapunkter` — Looks like an identifier or existing key
- src/components/DataCollectionRoadmap.tsx [261:50] (JSXText) `dager` — Looks like an identifier or existing key
- src/components/DataCollectionRoadmap.tsx [263:29] (JSXText) `Estimert:` — Looks like an identifier or existing key
- src/components/DataQualityFeedback.tsx [213:13] (JSXText) `Datakvalitet` — Looks like an identifier or existing key
- src/components/DataQualityFeedback.tsx [231:11] (JSXText) `Datakvalitet` — Looks like an identifier or existing key
- src/components/DataRequirementsCalculator.tsx [181:81] (JSXText) `sikkerhet` — Looks like an identifier or existing key
- src/components/DataRequirementsCalculator.tsx [200:25] (JSXText) `Datapunkter` — Looks like an identifier or existing key
- src/components/DataRequirementsCalculator.tsx [213:25] (JSXText) `Tidsperiode` — Looks like an identifier or existing key
- src/components/DataRequirementsCalculator.tsx [214:86] (JSXText) `dager` — Looks like an identifier or existing key
- src/components/DataRequirementsCalculator.tsx [229:68] (JSXText) `Tidsestimat` — Looks like an identifier or existing key
- src/components/DataRequirementsCalculator.tsx [232:17] (JSXText) `Med` — Looks like an identifier or existing key
- src/components/DataRequirementsCalculator.tsx [233:91] (JSXText) `innen` — Looks like an identifier or existing key
- src/components/DataRequirementsCalculator.tsx [261:98] (JSXText) `dager` — Looks like an identifier or existing key
- src/components/DataRequirementsCalculator.tsx [284:69] (JSXText) `Anbefalinger` — Looks like an identifier or existing key
- src/components/DateRangeSelector.tsx [174:44] (JSXText) `Selected:` — Looks like an identifier or existing key
- src/components/dev/EnvDebug.tsx [44:14] (JSXText) `VITE_AI_MODEL_NAME:` — Looks like an identifier or existing key
- src/components/dev/EnvDebug.tsx [45:14] (JSXText) `VITE_AI_LOCAL_ONLY:` — Looks like an identifier or existing key
- src/components/dev/EnvDebug.tsx [46:14] (JSXText) `VITE_AI_BASE_URL:` — Looks like an identifier or existing key
- src/components/dev/EnvDebug.tsx [50:14] (JSXText) `Mode:` — Looks like an identifier or existing key
- src/components/dev/EnvDebug.tsx [60:22] (JSXText) `Requests:` — Looks like an identifier or existing key
- src/components/dev/EnvDebug.tsx [61:22] (JSXText) `Success:` — Looks like an identifier or existing key
- src/components/dev/EnvDebug.tsx [62:22] (JSXText) `Failures:` — Looks like an identifier or existing key
- src/components/dev/EnvDebug.tsx [63:22] (JSXText) `Retries:` — Looks like an identifier or existing key
- src/components/dev/EnvDebug.tsx [67:58] (JSXText) `ms` — Looks like an identifier or existing key
- src/components/EmotionTracker.tsx [210:34] (JSXAttribute) `duration-help` — Looks like an identifier or existing key
- src/components/EmotionTracker.tsx [240:17] (JSXText) `Sudden` — Looks like an identifier or existing key
- src/components/EmotionTracker.tsx [248:17] (JSXText) `Gradual` — Looks like an identifier or existing key
- src/components/EmotionTracker.tsx [256:17] (JSXText) `Unknown` — Looks like an identifier or existing key
- src/components/EnhancedDataVisualization.tsx [79:58] (JSXText) `Displaying` — Looks like an identifier or existing key
- src/components/EnhancedDataVisualization.tsx [82:129] (JSXText) `Emotions` — Looks like an identifier or existing key
- src/components/EnhancedDataVisualization.tsx [83:127] (JSXText) `Sensory` — Looks like an identifier or existing key
- src/components/ExportDialog.tsx [65:66] (JSXAttribute) `format-help` — Looks like an identifier or existing key
- src/components/ExportDialog.tsx [69:41] (JSXText) `PDF` — Looks like an identifier or existing key
- src/components/ExportDialog.tsx [70:41] (JSXText) `CSV` — Looks like an identifier or existing key
- src/components/ExportDialog.tsx [71:42] (JSXText) `JSON` — Looks like an identifier or existing key
- src/components/ExportDialog.tsx [79:68] (JSXAttribute) `template-help` — Looks like an identifier or existing key
- src/components/ExportDialog.tsx [93:67] (JSXAttribute) `quality-help` — Looks like an identifier or existing key
- src/components/ExportDialog.tsx [110:66] (JSXAttribute) `scheme-help` — Looks like an identifier or existing key
- src/components/ExportDialog.tsx [130:32] (JSXAttribute) `raw-help` — Looks like an identifier or existing key
- src/components/GoalManager.tsx [320:43] (JSXText) `Category` — Looks like an identifier or existing key
- src/components/GoalManager.tsx [326:52] (JSXText) `Behavioral` — Looks like an identifier or existing key
- src/components/GoalManager.tsx [327:50] (JSXText) `Academic` — Looks like an identifier or existing key
- src/components/GoalManager.tsx [328:48] (JSXText) `Social` — Looks like an identifier or existing key
- src/components/GoalManager.tsx [329:49] (JSXText) `Sensory` — Looks like an identifier or existing key
- src/components/GoalManager.tsx [330:55] (JSXText) `Communication` — Looks like an identifier or existing key
- src/components/GoalManager.tsx [383:19] (JSXText) `Cancel` — Looks like an identifier or existing key
- src/components/GoalManager.tsx [442:59] (JSXText) `Progress` — Looks like an identifier or existing key
- src/components/GoalManager.tsx [460:27] (JSXText) `Created:` — Looks like an identifier or existing key
- src/components/GoalManager.tsx [464:27] (JSXText) `Target:` — Looks like an identifier or existing key
- src/components/GoalManager.tsx [471:49] (JSXText) `Milestones` — Looks like an identifier or existing key
- src/components/GoalManager.tsx [485:23] (JSXText) `Add` — Looks like an identifier or existing key
- src/components/layouts/ResizableSplitLayout.tsx [148:20] (JSXAttribute) `Resizer` — Looks like an identifier or existing key
- src/components/MockDataLoader.tsx [166:51] (JSXText) `students` — Looks like an identifier or existing key
- src/components/MockDataLoader.tsx [176:50] (JSXText) `Scenario` — Looks like an identifier or existing key
- src/components/MockDataLoader.tsx [234:38] (JSXText) `Cancel` — Looks like an identifier or existing key
- src/components/PaginatedSessionsList.tsx [72:19] (JSXText) `Showing` — Looks like an identifier or existing key
- src/components/PaginatedSessionsList.tsx [72:51] (JSXText) `of` — Looks like an identifier or existing key
- src/components/PaginatedSessionsList.tsx [103:62] (JSXText) `at` — Looks like an identifier or existing key
- src/components/PaginatedSessionsList.tsx [107:49] (JSXText) `emotions` — Looks like an identifier or existing key
- src/components/PaginatedSessionsList.tsx [110:54] (JSXText) `sensory` — Looks like an identifier or existing key
- src/components/PaginatedSessionsList.tsx [133:56] (JSXText) `more` — Looks like an identifier or existing key
- src/components/PaginatedSessionsList.tsx [146:19] (JSXText) `Page` — Looks like an identifier or existing key
- src/components/PaginatedSessionsList.tsx [146:38] (JSXText) `of` — Looks like an identifier or existing key
- src/components/PeriodComparison.tsx [178:17] (JSXText) `vs` — Looks like an identifier or existing key
- src/components/PeriodComparison.tsx [197:17] (JSXText) `vs` — Looks like an identifier or existing key
- src/components/PeriodComparison.tsx [209:62] (JSXText) `Emotion` — Looks like an identifier or existing key
- src/components/PeriodComparison.tsx [211:117] (JSXText) `to` — Looks like an identifier or existing key
- src/components/PeriodComparison.tsx [219:62] (JSXText) `Intensity` — Looks like an identifier or existing key
- src/components/PeriodComparison.tsx [222:120] (JSXText) `by` — Looks like an identifier or existing key
- src/components/PeriodComparison.tsx [224:115] (JSXText) `points` — Looks like an identifier or existing key
- src/components/PeriodComparison.tsx [232:62] (JSXText) `Sensory` — Looks like an identifier or existing key
- src/components/PeriodComparison.tsx [235:106] (JSXText) `by` — Looks like an identifier or existing key
- src/components/profile-sections/DashboardSection.tsx [87:46] (JSXText) `Oversikt` — Looks like an identifier or existing key
- src/components/profile-sections/DashboardSection.tsx [106:13] (JSXText) `Analysestatus` — Looks like an identifier or existing key
- src/components/profile-sections/DashboardSection.tsx [180:13] (JSXText) `Datakvalitet` — Looks like an identifier or existing key
- src/components/ProgressDashboard.tsx [229:85] (JSXText) `achieved` — Looks like an identifier or existing key
- src/components/ProgressDashboard.tsx [280:41] (JSXText) `Overview` — Looks like an identifier or existing key
- src/components/ProgressDashboard.tsx [281:39] (JSXText) `Trends` — Looks like an identifier or existing key
- src/components/ProgressDashboard.tsx [282:43] (JSXText) `Categories` — Looks like an identifier or existing key
- src/components/ProgressDashboard.tsx [283:43] (JSXText) `Priorities` — Looks like an identifier or existing key
- src/components/ProgressDashboard.tsx [357:29] (JSXText) `Updated` — Looks like an identifier or existing key
- src/components/ProgressDashboard.tsx [469:67] (JSXText) `goals` — Looks like an identifier or existing key
- src/components/ProgressDashboard.tsx [474:51] (JSXText) `achieved` — Looks like an identifier or existing key
- src/components/ProgressDashboard.tsx [506:31] (JSXText) `Progress` — Looks like an identifier or existing key
- src/components/QuickEntryTemplates.tsx [330:90] (JSXText) `Description` — Looks like an identifier or existing key
- src/components/QuickEntryTemplates.tsx [344:21] (JSXText) `Category` — Looks like an identifier or existing key
- src/components/QuickEntryTemplates.tsx [357:51] (JSXText) `Morning` — Looks like an identifier or existing key
- src/components/QuickEntryTemplates.tsx [358:54] (JSXText) `Transition` — Looks like an identifier or existing key
- src/components/QuickEntryTemplates.tsx [359:52] (JSXText) `Learning` — Looks like an identifier or existing key
- src/components/QuickEntryTemplates.tsx [360:49] (JSXText) `Break` — Looks like an identifier or existing key
- src/components/QuickEntryTemplates.tsx [361:53] (JSXText) `Afternoon` — Looks like an identifier or existing key
- src/components/QuickEntryTemplates.tsx [362:50] (JSXText) `Custom` — Looks like an identifier or existing key
- src/components/QuickEntryTemplates.tsx [368:21] (JSXText) `Cancel` — Looks like an identifier or existing key
- src/components/QuickEntryTemplates.tsx [418:59] (JSXText) `more` — Looks like an identifier or existing key
- src/components/StorageManager.tsx [107:21] (JSXText) `Used` — Looks like an identifier or existing key
- src/components/StorageManager.tsx [123:18] (JSXText) `Students:` — Looks like an identifier or existing key
- src/components/StorageManager.tsx [124:18] (JSXText) `Entries:` — Looks like an identifier or existing key
- src/components/StorageManager.tsx [125:18] (JSXText) `Goals:` — Looks like an identifier or existing key
- src/components/StorageManager.tsx [126:18] (JSXText) `Alerts:` — Looks like an identifier or existing key
- src/components/StudentProfileSidebar.tsx [110:13] (JSXText) `Hovedseksjoner` — Looks like an identifier or existing key
- src/components/tegn/TegnXPBar.tsx [17:59] (JSXText) `Level` — Looks like an identifier or existing key
- src/components/TestingDebugPanel.tsx [311:62] (JSXText) `Students` — Looks like an identifier or existing key
- src/components/TestingDebugPanel.tsx [315:62] (JSXText) `Entries` — Looks like an identifier or existing key
- src/components/TestingDebugPanel.tsx [319:62] (JSXText) `Analytics` — Looks like an identifier or existing key
- src/components/TestingDebugPanel.tsx [364:66] (JSXText) `Hits` — Looks like an identifier or existing key
- src/components/TestingDebugPanel.tsx [369:66] (JSXText) `Misses` — Looks like an identifier or existing key
- src/components/TestingDebugPanel.tsx [374:66] (JSXText) `Sets` — Looks like an identifier or existing key
- src/components/TimelineVisualization.tsx [541:17] (JSXText) `Live` — Looks like an identifier or existing key
- src/components/TimelineVisualization.tsx [633:32] (JSXText) `x` — Looks like an identifier or existing key
- src/components/TimelineVisualization.tsx [647:17] (JSXText) `Emotions` — Looks like an identifier or existing key
- src/components/TimelineVisualization.tsx [657:17] (JSXText) `Sensory` — Looks like an identifier or existing key
- src/components/TimelineVisualization.tsx [667:17] (JSXText) `Anomalies` — Looks like an identifier or existing key
- src/components/TimelineVisualization.tsx [676:65] (JSXText) `minutes` — Looks like an identifier or existing key
- src/components/TimelineVisualization.tsx [773:18] (JSXText) `Events:` — Looks like an identifier or existing key
- src/components/TimelineVisualization.tsx [774:18] (JSXText) `Zoom:` — Looks like an identifier or existing key
- src/components/TimelineVisualization.tsx [776:20] (JSXText) `Selection:` — Looks like an identifier or existing key
- src/components/TimelineVisualization.tsx [776:91] (JSXText) `min` — Looks like an identifier or existing key
- src/components/ui/Breadcrumbs.tsx [19:21] (JSXAttribute) `Breadcrumb` — Looks like an identifier or existing key
- src/components/ui/dialog.tsx [133:54] (JSXText) `Dialog` — Looks like an identifier or existing key
- src/components/ui/dialog.tsx [141:37] (JSXText) `Close` — Looks like an identifier or existing key
- src/components/ui/sheet.tsx [102:53] (JSXText) `Menu` — Looks like an identifier or existing key
- src/components/ui/sheet.tsx [110:37] (JSXText) `Close` — Looks like an identifier or existing key
- src/components/Visualization3D.tsx [448:48] (JSXText) `Category` — Looks like an identifier or existing key
- src/components/Visualization3D.tsx [449:49] (JSXText) `Intensity` — Looks like an identifier or existing key
- src/components/Visualization3D.tsx [467:43] (JSXText) `All` — Looks like an identifier or existing key
- src/components/Visualization3D.tsx [468:47] (JSXText) `Emotions` — Looks like an identifier or existing key
- src/components/Visualization3D.tsx [469:47] (JSXText) `Sensory` — Looks like an identifier or existing key
- src/components/Visualization3D.tsx [470:53] (JSXText) `Environmental` — Looks like an identifier or existing key
- src/components/Visualization3D.tsx [577:54] (JSXText) `Legend` — Looks like an identifier or existing key
- src/components/Visualization3D.tsx [583:47] (JSXText) `Emotions` — Looks like an identifier or existing key
- src/components/Visualization3D.tsx [587:47] (JSXText) `Sensory` — Looks like an identifier or existing key
- src/components/Visualization3D.tsx [591:47] (JSXText) `Environmental` — Looks like an identifier or existing key
- src/components/Visualization3D.tsx [606:18] (JSXText) `Points:` — Looks like an identifier or existing key
- src/components/VisualizationControls.tsx [111:15] (JSXText) `Live` — Looks like an identifier or existing key
- src/components/VisualizationControls.tsx [154:17] (JSXText) `Filters` — Looks like an identifier or existing key
- src/components/VisualizationControls.tsx [173:21] (JSXText) `Active` — Looks like an identifier or existing key
- src/components/VisualizationControls.tsx [209:17] (JSXText) `Layout` — Looks like an identifier or existing key
- src/components/VisualizationControls.tsx [215:17] (JSXText) `Dashboard` — Looks like an identifier or existing key
- src/components/VisualizationControls.tsx [227:17] (JSXText) `Comparison` — Looks like an identifier or existing key
- src/components/VisualizationControls.tsx [236:17] (JSXText) `View` — Looks like an identifier or existing key
- src/components/VisualizationControls.tsx [261:17] (JSXText) `Picture-in-Picture` — Looks like an identifier or existing key
- src/components/VisualizationControls.tsx [324:46] (JSXText) `Combined` — Looks like an identifier or existing key
- src/components/VisualizationControls.tsx [376:46] (JSXText) `emotions` — Looks like an identifier or existing key
- src/components/VisualizationControls.tsx [382:53] (JSXText) `sessions` — Looks like an identifier or existing key
- src/components/VisualizationControls.tsx [386:45] (JSXText) `new` — Looks like an identifier or existing key
- src/pages/EnhancedTrackStudent.tsx [236:83] (JSXText) `m` — Looks like an identifier or existing key
- src/pages/KreativiumAI.tsx [555:67] (JSXText) `Modell:` — Looks like an identifier or existing key
- src/pages/KreativiumAI.tsx [572:17] (JSXText) `Elev` — Looks like an identifier or existing key
- src/pages/KreativiumAI.tsx [595:17] (JSXText) `Tidsrom` — Looks like an identifier or existing key
- src/pages/KreativiumAI.tsx [686:66] (JSXText) `Sammenligning...` — Looks like an identifier or existing key
- src/pages/KreativiumAI.tsx [698:94] (JSXText) `Datakvalitet` — Looks like an identifier or existing key
- src/pages/KreativiumAI.tsx [704:68] (JSXText) `Datapunkter` — Looks like an identifier or existing key
- src/pages/KreativiumAI.tsx [716:68] (JSXText) `Fullstendighet` — Looks like an identifier or existing key
- src/pages/KreativiumAI.tsx [729:83] (JSXText) `score:` — Looks like an identifier or existing key
- src/pages/KreativiumAI.tsx [902:24] (JSXText) `Modell:` — Looks like an identifier or existing key
- src/pages/KreativiumAI.tsx [903:57] (JSXText) `Latens:` — Looks like an identifier or existing key
- src/pages/KreativiumAI.tsx [903:100] (JSXText) `ms` — Looks like an identifier or existing key
- src/pages/KreativiumAI.tsx [912:26] (JSXText) `Forbehold:` — Looks like an identifier or existing key
- src/pages/SignIndexPage.tsx [33:28] (JSXAttribute) `sign-search-status` — Looks like an identifier or existing key

## Out of scope (non-UI / developer-only)

- src/contexts/TrackingContext.tsx [203:23] (MessageAPI) `Session timed out due to inactivity` — Non-UI layer
- src/contexts/TrackingContext.tsx [203:23] (MessageAPI) `Session timed out due to inactivity` — Non-UI layer
- src/contexts/TrackingContext.tsx [208:17] (MessageAPI) `[TrackingContext] Started new session` — Non-UI layer
- src/contexts/TrackingContext.tsx [235:17] (MessageAPI) `[TrackingContext] Ended session` — Non-UI layer
- src/contexts/TrackingContext.tsx [256:17] (MessageAPI) `[TrackingContext] Paused session` — Non-UI layer
- src/contexts/TrackingContext.tsx [281:17] (MessageAPI) `[TrackingContext] Resumed session` — Non-UI layer
- src/contexts/TrackingContext.tsx [312:23] (MessageAPI) `Session timed out due to inactivity` — Non-UI layer
- src/contexts/TrackingContext.tsx [312:23] (MessageAPI) `Session timed out due to inactivity` — Non-UI layer
- src/contexts/TrackingContext.tsx [364:23] (MessageAPI) `Session timed out due to inactivity` — Non-UI layer
- src/contexts/TrackingContext.tsx [364:23] (MessageAPI) `Session timed out due to inactivity` — Non-UI layer
- src/contexts/TrackingContext.tsx [491:21] (MessageAPI) `Session saved successfully` — Non-UI layer
- src/contexts/TrackingContext.tsx [491:21] (MessageAPI) `Session saved successfully` — Non-UI layer
- src/contexts/TrackingContext.tsx [492:19] (MessageAPI) `[TrackingContext] Session saved` — Non-UI layer
- src/contexts/TrackingContext.tsx [499:20] (MessageAPI) `[TrackingContext] Failed to save session` — Non-UI layer
- src/contexts/TrackingContext.tsx [500:19] (MessageAPI) `Failed to save session` — Non-UI layer
- src/contexts/TrackingContext.tsx [500:19] (MessageAPI) `Failed to save session` — Non-UI layer
- src/contexts/TrackingContext.tsx [543:16] (MessageAPI) `Session discarded` — Non-UI layer
- src/contexts/TrackingContext.tsx [543:16] (MessageAPI) `Session discarded` — Non-UI layer
- src/contexts/TrackingContext.tsx [544:17] (MessageAPI) `[TrackingContext] Session discarded` — Non-UI layer
- src/contexts/TrackingContext.tsx [553:19] (MessageAPI) `Session not found` — Non-UI layer
- src/contexts/TrackingContext.tsx [553:19] (MessageAPI) `Session not found` — Non-UI layer
- src/contexts/TrackingContext.tsx [558:19] (MessageAPI) `Session recovered` — Non-UI layer
- src/contexts/TrackingContext.tsx [558:19] (MessageAPI) `Session recovered` — Non-UI layer
- src/contexts/TrackingContext.tsx [559:17] (MessageAPI) `[TrackingContext] Session recovered` — Non-UI layer
- src/hooks/useAnalyticsWorker.ts [95:20] (MessageAPI) `[useAnalyticsWorker] Worker runtime error, switching to fallback` — Non-UI layer
- src/hooks/useAnalyticsWorker.ts [132:17] (MessageAPI) `[useAnalyticsWorker] Analytics worker initialized successfully` — Non-UI layer
- src/hooks/useAnalyticsWorker.ts [135:18] (MessageAPI) `[useAnalyticsWorker] Failed to initialize worker` — Non-UI layer
- src/hooks/useAnalyticsWorker.ts [399:26] (MessageAPI) `[useAnalyticsWorker] Failed handling worker message` — Non-UI layer
- src/hooks/useAnalyticsWorker.ts [404:24] (MessageAPI) `[useAnalyticsWorker] messageerror from analytics worker` — Non-UI layer
- src/hooks/useAnalyticsWorker.ts [524:22] (MessageAPI) `[useAnalyticsWorker] AI analysis path failed` — Non-UI layer
- src/hooks/useAnalyticsWorker.ts [531:24] (MessageAPI) `[useAnalyticsWorker] Fallback after AI failure also failed` — Non-UI layer
- src/hooks/useAnalyticsWorker.ts [565:22] (MessageAPI) `[useAnalyticsWorker] Fallback failed` — Non-UI layer
- src/hooks/useAnalyticsWorker.ts [600:22] (MessageAPI) `[useAnalyticsWorker] watchdog timeout: worker did not respond, attempting fallback` — Non-UI layer
- src/hooks/useAnalyticsWorker.ts [620:22] (MessageAPI) `[useAnalyticsWorker] Fallback failed after watchdog timeout` — Non-UI layer
- src/hooks/useAnalyticsWorker.ts [699:20] (MessageAPI) `[WORKER_MESSAGE] Failed to post message to worker, falling back to sync` — Non-UI layer
- src/hooks/useAnalyticsWorker.ts [713:22] (MessageAPI) `[useAnalyticsWorker] Fallback processing failed after worker post error` — Non-UI layer
- src/hooks/useDashboardData.ts [35:20] (MessageAPI) `Dashboard: Error loading students` — Non-UI layer
- src/hooks/useDashboardData.ts [114:20] (MessageAPI) `Dashboard: Error calculating statistics` — Non-UI layer
- src/hooks/useDataAnalysis.ts [57:22] (MessageAPI) `Pattern analysis failed in useDataAnalysis hook` — Non-UI layer
- src/hooks/useFilteredData.ts [124:20] (MessageAPI) `useFilteredData failed` — Non-UI layer
- src/hooks/usePerformanceMonitor.ts [373:17] (MessageAPI) `[Performance Report]` — Non-UI layer
- src/hooks/usePinnedAlerts.ts [24:18] (MessageAPI) `usePinnedAlerts: failed to read from localStorage` — Non-UI layer
- src/hooks/usePinnedAlerts.ts [34:18] (MessageAPI) `usePinnedAlerts: failed to write to localStorage` — Non-UI layer
- src/hooks/useRealtimeData.ts [292:21] (MessageAPI) `Real-time data connection would be established here` — Non-UI layer
- src/hooks/useStudentData.ts [79:20] (MessageAPI) `Failed to load student data:` — Non-UI layer
- src/lib/ai/openrouterClient.ts [171:21] (MessageAPI) `[OpenRouter] Request start` — Developer-only log or non-UI message in lib/
- src/lib/ai/openrouterClient.ts [318:19] (MessageAPI) `[OpenRouter] Request success` — Developer-only log or non-UI message in lib/
- src/lib/ai/openrouterClient.ts [454:19] (MessageAPI) `[OpenRouter] JSON-mode success` — Developer-only log or non-UI message in lib/
- src/lib/alertSystem.ts [160:20] (MessageAPI) `Error saving alerts:` — Developer-only log or non-UI message in lib/
- src/lib/alertSystem.ts [177:22] (MessageAPI) `Failed to save alerts even after cleanup:` — Developer-only log or non-UI message in lib/
- src/lib/alertSystem.ts [205:20] (MessageAPI) `Error loading alerts:` — Developer-only log or non-UI message in lib/
- src/lib/alertSystem.ts [254:20] (MessageAPI) `Error marking alert as viewed:` — Developer-only log or non-UI message in lib/
- src/lib/alertSystem.ts [282:20] (MessageAPI) `Error resolving alert:` — Developer-only log or non-UI message in lib/
- src/lib/alertSystem.ts [298:20] (MessageAPI) `Error deleting alert:` — Developer-only log or non-UI message in lib/
- src/lib/alertSystem.ts [315:20] (MessageAPI) `Error loading alert settings:` — Developer-only log or non-UI message in lib/
- src/lib/alertSystem.ts [332:20] (MessageAPI) `Error updating alert settings:` — Developer-only log or non-UI message in lib/
- src/lib/alertSystem.ts [393:20] (MessageAPI) `Error cleaning up old alerts:` — Developer-only log or non-UI message in lib/
- src/lib/analysis/heuristicAnalysisEngine.ts [129:20] (MessageAPI) `[HeuristicAnalysisEngine] analyzeStudent: invalid studentId` — Developer-only log or non-UI message in lib/
- src/lib/analysis/heuristicAnalysisEngine.ts [189:20] (MessageAPI) `[HeuristicAnalysisEngine] analyzeStudent failed` — Developer-only log or non-UI message in lib/
- src/lib/analysis/llmAnalysisEngine.ts [175:20] (MessageAPI) `[LLMAnalysisEngine] analyzeStudent: invalid studentId` — Developer-only log or non-UI message in lib/
- src/lib/analysis/llmAnalysisEngine.ts [340:20] (MessageAPI) `[LLMAnalysisEngine] analyzeStudent failed` — Developer-only log or non-UI message in lib/
- src/lib/analysis/llmUtils.ts [102:18] (MessageAPI) `[LLM] validateOrRepairAiReport failed` — Developer-only log or non-UI message in lib/
- src/lib/analysis/mapReduce.ts [169:18] (MessageAPI) `[mapReduce] reduceSummariesToFinalReport failed` — Developer-only log or non-UI message in lib/
- src/lib/analysis/mapReduce.ts [205:18] (MessageAPI) `[mapReduce] analyzeLargePeriod error` — Developer-only log or non-UI message in lib/
- src/lib/analyticsConfig.ts [517:20] (MessageAPI) `Failed to import configuration:` — Developer-only log or non-UI message in lib/
- src/lib/analyticsConfig.ts [537:20] (MessageAPI) `Failed to load analytics configuration:` — Developer-only log or non-UI message in lib/
- src/lib/analyticsConfig.ts [554:24] (MessageAPI) `Failed to save analytics configuration:` — Developer-only log or non-UI message in lib/
- src/lib/analyticsConfig.ts [558:20] (MessageAPI) `Failed to save analytics configuration:` — Developer-only log or non-UI message in lib/
- src/lib/analyticsConfigOverride.ts [9:15] (MessageAPI) `Applying development analytics configuration for better pattern detection` — Developer-only log or non-UI message in lib/
- src/lib/analyticsConfigOverride.ts [70:18] (MessageAPI) `Failed to apply development analytics config (non-fatal):` — Developer-only log or non-UI message in lib/
- src/lib/analyticsConfigValidation.ts [63:18] (MessageAPI) `[analyticsConfigValidation] Invalid analytics configuration detected. Falling back to defaults.` — Developer-only log or non-UI message in lib/
- src/lib/analyticsExport.ts [349:24] (MessageAPI) `Error adding chart export to PDF:` — Developer-only log or non-UI message in lib/
- src/lib/analyticsExport.ts [373:24] (MessageAPI) `Error adding chart to PDF:` — Developer-only log or non-UI message in lib/
- src/lib/analyticsManager.ts [86:18] (MessageAPI) `[analyticsManager] ensureUniversalAnalyticsInitialization failed` — Developer-only log or non-UI message in lib/
- src/lib/analyticsManager.ts [272:20] (MessageAPI) `[analyticsManager] initializeStudentAnalytics failed` — Developer-only log or non-UI message in lib/
- src/lib/analyticsManager.ts [368:21] (MessageAPI) `[analyticsManager] Manager TTL cache disabled; not storing results.` — Developer-only log or non-UI message in lib/
- src/lib/analyticsManager.ts [404:20] (MessageAPI) `[analyticsManager] generateAnalytics: invalid student` — Developer-only log or non-UI message in lib/
- src/lib/analyticsManager.ts [580:20] (MessageAPI) `[analyticsManager] triggerAnalyticsForStudent failed` — Developer-only log or non-UI message in lib/
- src/lib/analyticsManager.ts [751:19] (MessageAPI) `[analyticsManager] Cleared all analytics caches` — Developer-only log or non-UI message in lib/
- src/lib/analyticsManager.ts [754:20] (MessageAPI) `[analyticsManager] clearAllAnalyticsCaches failed` — Developer-only log or non-UI message in lib/
- src/lib/analyticsManager.ts [780:19] (MessageAPI) `[analyticsManager] Cleared student caches` — Developer-only log or non-UI message in lib/
- src/lib/analyticsManager.ts [783:20] (MessageAPI) `[analyticsManager] clearStudentCaches failed` — Developer-only log or non-UI message in lib/
- src/lib/analyticsManager.ts [794:58] (MessageAPI) `Error saving analytics profiles:` — Developer-only log or non-UI message in lib/
- src/lib/analyticsManager.ts [975:18] (MessageAPI) `[analyticsManager.orchestrator] getInsights failed` — Developer-only log or non-UI message in lib/
- src/lib/analyticsManagerLite.ts [26:20] (MessageAPI) `[analyticsManagerLite] Failed to initialize student` — Developer-only log or non-UI message in lib/
- src/lib/analyticsPrecomputation.ts [278:30] (MessageAPI) `[PrecomputationManager] Task failed` — Developer-only log or non-UI message in lib/
- src/lib/analyticsProfiles.ts [40:18] (MessageAPI) `[analyticsProfiles] Failed to load profiles` — Developer-only log or non-UI message in lib/
- src/lib/analyticsProfiles.ts [62:18] (MessageAPI) `[analyticsProfiles] Failed to save profiles` — Developer-only log or non-UI message in lib/
- src/lib/analyticsProfiles.ts [104:17] (MessageAPI) `[analyticsProfiles] Cleared all profiles` — Developer-only log or non-UI message in lib/
- src/lib/analyticsProfiles.ts [106:18] (MessageAPI) `[analyticsProfiles] Failed to clear all profiles` — Developer-only log or non-UI message in lib/
- src/lib/analyticsProfiles.ts [120:17] (MessageAPI) `[analyticsProfiles] Cleared student profile` — Developer-only log or non-UI message in lib/
- src/lib/analyticsProfiles.ts [132:15] (MessageAPI) `[analyticsProfiles] Reset profiles to default state` — Developer-only log or non-UI message in lib/
- src/lib/analyticsWorkerFallback.ts [55:24] (MessageAPI) `Fallback: Manager-based analytics failed; continuing with local processing` — Developer-only log or non-UI message in lib/
- src/lib/analyticsWorkerFallback.ts [78:24] (MessageAPI) `Fallback: Error analyzing emotion patterns` — Developer-only log or non-UI message in lib/
- src/lib/analyticsWorkerFallback.ts [89:24] (MessageAPI) `Fallback: Error analyzing sensory patterns` — Developer-only log or non-UI message in lib/
- src/lib/analyticsWorkerFallback.ts [101:24] (MessageAPI) `Fallback: Error analyzing correlations` — Developer-only log or non-UI message in lib/
- src/lib/analyticsWorkerFallback.ts [118:24] (MessageAPI) `Fallback: Error generating predictive insights` — Developer-only log or non-UI message in lib/
- src/lib/analyticsWorkerFallback.ts [131:24] (MessageAPI) `Fallback: Error detecting anomalies` — Developer-only log or non-UI message in lib/
- src/lib/analyticsWorkerFallback.ts [148:20] (MessageAPI) `Fallback analytics failed` — Developer-only log or non-UI message in lib/
- src/lib/apiConnectivityValidator.ts [101:17] (MessageAPI) `[apiConnectivityValidator] Connectivity OK for model` — Developer-only log or non-UI message in lib/
- src/lib/apiConnectivityValidator.ts [136:20] (MessageAPI) `[apiConnectivityValidator] Connectivity failed` — Developer-only log or non-UI message in lib/
- src/lib/cacheManager.ts [53:19] (MessageAPI) `[cacheManager] Starting global cache clear` — Developer-only log or non-UI message in lib/
- src/lib/cacheManager.ts [86:19] (MessageAPI) `[cacheManager] Global cache clear completed` — Developer-only log or non-UI message in lib/
- src/lib/cacheManager.ts [100:20] (MessageAPI) `[cacheManager] Failed to clear all caches` — Developer-only log or non-UI message in lib/
- src/lib/cacheManager.ts [121:19] (MessageAPI) `[cacheManager] Starting student cache clear` — Developer-only log or non-UI message in lib/
- src/lib/cacheManager.ts [156:19] (MessageAPI) `[cacheManager] Student cache clear completed` — Developer-only log or non-UI message in lib/
- src/lib/cacheManager.ts [172:20] (MessageAPI) `[cacheManager] Failed to clear student caches` — Developer-only log or non-UI message in lib/
- src/lib/cacheManager.ts [188:17] (MessageAPI) `[cacheManager] Clearing caches by type` — Developer-only log or non-UI message in lib/
- src/lib/chartUtils.ts [125:20] (MessageAPI) `Invalid chart data row:` — Developer-only log or non-UI message in lib/
- src/lib/dataStorage.ts [363:20] (MessageAPI) `Failed to parse student data from localStorage` — Developer-only log or non-UI message in lib/
- src/lib/dataStorage.ts [432:9] (MessageAPI) `Failed to parse tracking entries from localStorage` — Developer-only log or non-UI message in lib/
- src/lib/dataStorage.ts [778:20] (MessageAPI) `Error deleting student:` — Developer-only log or non-UI message in lib/
- src/lib/diagnostics.ts [160:18] (MessageAPI) `[DIAGNOSTIC] Worker Timeout!` — Developer-only log or non-UI message in lib/
- src/lib/enhancedPatternAnalysis.ts [93:20] (MessageAPI) `Failed to initialize ML models:` — Developer-only log or non-UI message in lib/
- src/lib/enhancedPatternAnalysis.ts [183:22] (MessageAPI) `ML emotion prediction failed:` — Developer-only log or non-UI message in lib/
- src/lib/enhancedPatternAnalysis.ts [248:22] (MessageAPI) `ML sensory prediction failed:` — Developer-only log or non-UI message in lib/
- src/lib/enhancedPatternAnalysis.ts [927:20] (MessageAPI) `Baseline clustering failed:` — Developer-only log or non-UI message in lib/
- src/lib/errorHandler.ts [94:22] (MessageAPI) `Error in custom error handler` — Developer-only log or non-UI message in lib/
- src/lib/errorHandler.ts [166:22] (MessageAPI) `Critical error occurred` — Developer-only log or non-UI message in lib/
- src/lib/errorHandler.ts [173:22] (MessageAPI) `Application error` — Developer-only log or non-UI message in lib/
- src/lib/errorHandler.ts [199:30] (MessageAPI) `Retry handler failed` — Developer-only log or non-UI message in lib/
- src/lib/errorHandler.ts [245:23] (MessageAPI) `Issue resolved` — Developer-only log or non-UI message in lib/
- src/lib/errorHandler.ts [245:23] (MessageAPI) `Issue resolved` — Developer-only log or non-UI message in lib/
- src/lib/errorHandler.ts [250:22] (MessageAPI) `Recovery strategy failed` — Developer-only log or non-UI message in lib/
- src/lib/inlineWorker.ts [47:18] (MessageAPI) `Failed to create inline worker:` — Developer-only log or non-UI message in lib/
- src/lib/insights/unified.ts [46:18] (MessageAPI) `[insights/unified] computeInsights: invalid inputs` — Developer-only log or non-UI message in lib/
- src/lib/insights/unified.ts [108:18] (MessageAPI) `[insights/unified] computeInsights failed` — Developer-only log or non-UI message in lib/
- src/lib/mockData.ts [268:17] (MessageAPI) `seedMinimalDemoData: seeded enhanced demo data` — Developer-only log or non-UI message in lib/
- src/lib/mockData.ts [270:18] (MessageAPI) `seedMinimalDemoData: failed to seed demo data` — Developer-only log or non-UI message in lib/
- src/lib/mockDataGenerator.ts [246:18] (MessageAPI) `Generated invalid emotion entry:` — Developer-only log or non-UI message in lib/
- src/lib/mockDataGenerator.ts [278:18] (MessageAPI) `Generated invalid sensory entry:` — Developer-only log or non-UI message in lib/
- src/lib/mockDataGenerator.ts [629:22] (MessageAPI) `Generated invalid tracking entry for scenario` — Developer-only log or non-UI message in lib/
- src/lib/mockDataGenerator.ts [636:18] (MessageAPI) `Failed to load scenario data` — Developer-only log or non-UI message in lib/
- src/lib/mockDataGenerator.ts [662:22] (MessageAPI) `Generated invalid tracking entry during bulk mock load` — Developer-only log or non-UI message in lib/
- src/lib/mockDataGenerator.ts [669:18] (MessageAPI) `Failed to load mock data:` — Developer-only log or non-UI message in lib/
- src/lib/mockDataGenerator.ts [690:18] (MessageAPI) `Failed to clear mock data:` — Developer-only log or non-UI message in lib/
- src/lib/modelEvaluation.ts [164:24] (MessageAPI) `[modelEvaluation] onupgradeneeded failed` — Developer-only log or non-UI message in lib/
- src/lib/sessionManager.ts [138:17] (MessageAPI) `[SessionManager] Created new session` — Developer-only log or non-UI message in lib/
- src/lib/sessionManager.ts [260:17] (MessageAPI) `[SessionManager] Completed session` — Developer-only log or non-UI message in lib/
- src/lib/sessionManager.ts [283:17] (MessageAPI) `[SessionManager] Abandoned session` — Developer-only log or non-UI message in lib/
- src/lib/sessionManager.ts [296:17] (MessageAPI) `[SessionManager] Paused session` — Developer-only log or non-UI message in lib/
- src/lib/sessionManager.ts [310:17] (MessageAPI) `[SessionManager] Resumed session` — Developer-only log or non-UI message in lib/
- src/lib/sessionManager.ts [348:22] (MessageAPI) `[SessionManager] Failed to recover session` — Developer-only log or non-UI message in lib/
- src/lib/sessionManager.ts [355:19] (MessageAPI) `[SessionManager] Recovered sessions` — Developer-only log or non-UI message in lib/
- src/lib/sessionManager.ts [456:20] (MessageAPI) `[SessionManager] Failed to persist session` — Developer-only log or non-UI message in lib/
- src/lib/sessionManager.ts [485:20] (MessageAPI) `[SessionManager] Failed to load session history` — Developer-only log or non-UI message in lib/
- src/lib/sessionManager.ts [497:20] (MessageAPI) `[SessionManager] Failed to save session history` — Developer-only log or non-UI message in lib/
- src/lib/sessionManager.ts [525:17] (MessageAPI) `[SessionManager] Updated validation rules` — Developer-only log or non-UI message in lib/
- src/lib/sessionManager.ts [533:17] (MessageAPI) `[SessionManager] Updated quality threshold` — Developer-only log or non-UI message in lib/
- src/lib/sessionManager.ts [557:17] (MessageAPI) `[SessionManager] Cleared all sessions` — Developer-only log or non-UI message in lib/
- src/lib/startupValidation.ts [117:22] (MessageAPI) `[startupValidation] Model connectivity test failed` — Developer-only log or non-UI message in lib/
- src/lib/startupValidation.ts [121:21] (MessageAPI) `[startupValidation] Model connectivity OK` — Developer-only log or non-UI message in lib/
- src/lib/storageUtils.ts [55:20] (MessageAPI) `Error clearing old data:` — Developer-only log or non-UI message in lib/
- src/lib/tracking/saveTrackingEntry.ts [37:20] (MessageAPI) `[saveTrackingEntry] Failed to save entry` — Developer-only log or non-UI message in lib/
- src/lib/tracking/saveTrackingEntry.ts [66:18] (MessageAPI) `[saveTrackingEntry] Unexpected failure` — Developer-only log or non-UI message in lib/
- src/lib/universalAnalyticsInitializer.ts [45:20] (MessageAPI) `Error initializing universal analytics:` — Developer-only log or non-UI message in lib/
- src/lib/universalAnalyticsInitializer.ts [101:92] (MessageAPI) `Auto-initialization failed:` — Developer-only log or non-UI message in lib/
- src/lib/utils.ts [29:18] (MessageAPI) `downloadBlob called in a non-browser environment` — Developer-only log or non-UI message in lib/
- src/lib/utils.ts [47:18] (MessageAPI) `downloadBlob failed` — Developer-only log or non-UI message in lib/
- src/lib/validation/dataLeakage.ts [166:21] (MessageAPI) `[DataLeakageDetector] Potential leakage risk` — Developer-only log or non-UI message in lib/
- src/lib/validation/dataLeakage.ts [176:20] (MessageAPI) `[DataLeakageDetector] Strict mode abort due to leakage` — Developer-only log or non-UI message in lib/

## Appendix: Offenders by file

### src/components/AdvancedFilterPanel.tsx

- [395:47] (JSXAttribute) Static aria-label attribute: `Select triggers to include`
  - context: `}} > <SelectTrigger aria-label="Select triggers to include"> <SelectValue placeholder="Se`
- [396:48] (JSXAttribute) Static placeholder attribute: `Select triggers to include`
  - context: `el="Select triggers to include"> <SelectValue placeholder="Select triggers to include" /> </SelectTrigger>`
- [697:30] (JSXAttribute) Static aria-label attribute: `Filter name`
  - context: `eholder={String(tCommon('filterNamePlaceholder'))} aria-label="Filter name" value={filterName} onChange={(`
- [745:42] (JSXAttribute) Static aria-label attribute: `Delete saved filter`
  - context: `variant="ghost" aria-label="Delete saved filter" title="Delete saved filter"`
- [746:37] (JSXAttribute) Static title attribute: `Delete saved filter`
  - context: `aria-label="Delete saved filter" title="Delete saved filter" onClick={() => onDeleteFilte`

### src/components/AlertManager.tsx

- [81:20] (MessageAPI) Message API call: error(): `Failed to resolve alert`
  - context: `tAnalytics('alerts.resolveSuccess'))); } catch (error) { logger.error('Failed to resolve alert', error); toast.error(String(tAnalytics('alerts.r`
- [215:68] (JSXText) Static JSX text node: `•`
  - context: `tart gap-2"> <span className="text-primary">•</span> <span>{rec}</span>`
- [265:54] (JSXText) Static JSX text node: `•`
  - context: `="flex items-start gap-2"> <span className="text-primary">•</span> <span>{recommendation}</span>`

### src/components/AnalyticsDashboard.tsx

- [152:22] (MessageAPI) Message API call: error(): `Error coercing timestamp:`
  - context: `} return new Date(); } catch (error) { logger.error('Error coercing timestamp:', v, error); return new Date(); } }`
- [163:20] (MessageAPI) Message API call: error(): `Error normalizing filteredData:`
  - context: `amp: coerce(s.timestamp) })), }; } catch (error) { logger.error('Error normalizing filteredData:', error); return { entries: [], emotions:`
- [194:20] (MessageAPI) Message API call: error(): `[AnalyticsDashboard] Demo seed failed`
  - context: `ta, { useAI, student: analyticsStudent }); } catch (e) { logger.error('[AnalyticsDashboard] Demo seed failed', { error: e }); toast.error(String`
- [284:78] (MessageAPI) Message API call: error(): `[AnalyticsDashboard] Analytics error surfaced to user`
  - context: `n; doOnce('analytics_ui_error_' + String(error), 60_000, () => logger.error('[AnalyticsDashboard] Analytics error surfaced to user', { error })); }, [erro`
- [364:26] (MessageAPI) Message API call: error(): `Failed to collect chart exports`
  - context: `turn usableExports; } catch (collectError) { logger.error('Failed to collect chart exports', collectError); toast.error(String`
- [401:20] (MessageAPI) Message API call: error(): `Export failed:`
  - context: `uccessMessageKey[format]))); }); } catch (error) { logger.error('Export failed:', error); toast.error(String(tAnalytics('export.failure'))`
- [442:46] (JSXAttribute) Static aria-labelledby attribute: `analytics-dashboard-title`
  - context: `tics('skipToContent'))} </a> <section role="region" aria-labelledby="analytics-dashboard-title" className="space-y-6"> {error && !isAnalyzing`
- [808:23] (MessageAPI) Message API call: error(): `Error comparing timestamps in AnalyticsDashboard memo:`
  - context: `return prevTime === nextTime; } catch (error) { logger.error('Error comparing timestamps in AnalyticsDashboard memo:', error); retur`

### src/components/AnalyticsSettings.tsx

- [75:20] (MessageAPI) Message API call: error(): `Failed to load ML model status`
  - context: `tatus(); setModelStatus(status); } catch (error) { logger.error('Failed to load ML model status', { error }); toast.error("Failed to load`
- [76:19] (MessageAPI) Message API call: error(): `Failed to load ML models: Could not retrieve model status. Some features may be unavailable.`
  - context: `logger.error('Failed to load ML model status', { error }); toast.error("Failed to load ML models: Could not retrieve model status. Some features may be`
- [76:19] (MessageAPI) sonner toast.error(): `Failed to load ML models: Could not retrieve model status. Some features may be unavailable.`
  - context: `logger.error('Failed to load ML model status', { error }); toast.error("Failed to load ML models: Could not retrieve model status. Some features may be`
- [113:19] (MessageAPI) Message API call: success(): `Analytics configuration has been updated`
  - context: `Config.updateConfig(config); setHasUnsavedChanges(false); toast.success("Analytics configuration has been updated"); }; const handleReset = () => {`
- [113:19] (MessageAPI) sonner toast.success(): `Analytics configuration has been updated`
  - context: `Config.updateConfig(config); setHasUnsavedChanges(false); toast.success("Analytics configuration has been updated"); }; const handleReset = () => {`
- [120:19] (MessageAPI) Message API call: success(): `Settings have been reset to defaults`
  - context: `tSelectedPreset('balanced'); setHasUnsavedChanges(false); toast.success("Settings have been reset to defaults"); }; const handleExport = () => {`
- [120:19] (MessageAPI) sonner toast.success(): `Settings have been reset to defaults`
  - context: `tSelectedPreset('balanced'); setHasUnsavedChanges(false); toast.success("Settings have been reset to defaults"); }; const handleExport = () => {`
- [135:19] (MessageAPI) Message API call: success(): `Configuration saved to analytics-config.json`
  - context: `ument.body.removeChild(a); URL.revokeObjectURL(url); toast.success("Configuration saved to analytics-config.json"); }; const MAX_IMPORT_BYTES`
- [135:19] (MessageAPI) sonner toast.success(): `Configuration saved to analytics-config.json`
  - context: `ument.body.removeChild(a); URL.revokeObjectURL(url); toast.success("Configuration saved to analytics-config.json"); }; const MAX_IMPORT_BYTES`
- [146:19] (MessageAPI) Message API call: error(): `Configuration file exceeds the 5 MB limit`
  - context: `if (!file) return; if (file.size > MAX_IMPORT_BYTES) { toast.error('Configuration file exceeds the 5 MB limit'); event.target.value = '';`
- [146:19] (MessageAPI) sonner toast.error(): `Configuration file exceeds the 5 MB limit`
  - context: `if (!file) return; if (file.size > MAX_IMPORT_BYTES) { toast.error('Configuration file exceeds the 5 MB limit'); event.target.value = '';`
- [152:19] (MessageAPI) Message API call: error(): `Only JSON configuration files are supported`
  - context: `if (file.type && !ALLOWED_IMPORT_TYPES.has(file.type)) { toast.error('Only JSON configuration files are supported'); event.target.value = '';`
- [152:19] (MessageAPI) sonner toast.error(): `Only JSON configuration files are supported`
  - context: `if (file.type && !ALLOWED_IMPORT_TYPES.has(file.type)) { toast.error('Only JSON configuration files are supported'); event.target.value = '';`
- [163:25] (MessageAPI) Message API call: success(): `Successfully imported configuration`
  - context: `nfig(content)) { setHasUnsavedChanges(false); toast.success("Successfully imported configuration"); } else { toast.error("`
- [163:25] (MessageAPI) sonner toast.success(): `Successfully imported configuration`
  - context: `nfig(content)) { setHasUnsavedChanges(false); toast.success("Successfully imported configuration"); } else { toast.error("`
- [165:23] (MessageAPI) Message API call: error(): `Invalid configuration file`
  - context: `("Successfully imported configuration"); } else { toast.error("Invalid configuration file"); } } catch (_error) { toast.`
- [165:23] (MessageAPI) sonner toast.error(): `Invalid configuration file`
  - context: `("Successfully imported configuration"); } else { toast.error("Invalid configuration file"); } } catch (_error) { toast.`
- [168:21] (MessageAPI) Message API call: error(): `Failed to read configuration file`
  - context: `id configuration file"); } } catch (_error) { toast.error("Failed to read configuration file"); } event.target.value = '';`
- [168:21] (MessageAPI) sonner toast.error(): `Failed to read configuration file`
  - context: `id configuration file"); } } catch (_error) { toast.error("Failed to read configuration file"); } event.target.value = '';`
- [209:19] (MessageAPI) Message API call: error(): `Failed to delete model`
  - context: `${modelType} model has been removed\`); } catch (_error) { toast.error("Failed to delete model"); } finally { setIsDeletingModel(null); }`
- [209:19] (MessageAPI) sonner toast.error(): `Failed to delete model`
  - context: `${modelType} model has been removed\`); } catch (_error) { toast.error("Failed to delete model"); } finally { setIsDeletingModel(null); }`
- [331:52] (JSXText) Static JSX text node: `Pattern Analysis Thresholds`
  - context: `<CardHeader> <CardTitle className="text-base">Pattern Analysis Thresholds</CardTitle> <CardDescription>`
- [333:21] (JSXText) Static JSX text node: `Adjust minimum requirements and thresholds for pattern detection`
  - context: `Thresholds</CardTitle> <CardDescription> Adjust minimum requirements and thresholds for pattern detection`
- [339:54] (JSXText) Static JSX text node: `Minimum Data Points`
  - context: `sName="flex items-center"> <Label htmlFor="minDataPoints">Minimum Data Points</Label> {renderTooltip("Minimum number`
- [358:61] (JSXText) Static JSX text node: `Correlation Threshold`
  - context: `flex items-center"> <Label htmlFor="correlationThreshold">Correlation Threshold</Label> {renderTooltip("Minimum corr`
- [377:57] (JSXText) Static JSX text node: `Concern Frequency Threshold`
  - context: `me="flex items-center"> <Label htmlFor="concernFrequency">Concern Frequency Threshold</Label> {renderTooltip("Percen`
- [398:52] (JSXText) Static JSX text node: `Enhanced Analysis Thresholds`
  - context: `<CardHeader> <CardTitle className="text-base">Enhanced Analysis Thresholds</CardTitle> <CardDescription>`
- [400:21] (JSXText) Static JSX text node: `Configure advanced pattern detection and anomaly thresholds`
  - context: `Thresholds</CardTitle> <CardDescription> Configure advanced pattern detection and anomaly thresholds </`
- [406:57] (JSXText) Static JSX text node: `Anomaly Detection Sensitivity`
  - context: `me="flex items-center"> <Label htmlFor="anomalyThreshold">Anomaly Detection Sensitivity</Label> {renderTooltip("Numb`
- [419:110] (JSXText) Static JSX text node: `σ`
  - context: `lassName="w-12 text-right">{config.enhancedAnalysis.anomalyThreshold.toFixed(2)}σ</span> </div> </div>`
- [425:54] (JSXText) Static JSX text node: `Minimum Sample Size`
  - context: `sName="flex items-center"> <Label htmlFor="minSampleSize">Minimum Sample Size</Label> {renderTooltip("Minimum data p`
- [448:52] (JSXText) Static JSX text node: `Alert Sensitivity`
  - context: `<CardHeader> <CardTitle className="text-base">Alert Sensitivity</CardTitle> <CardDescription>`
- [450:21] (JSXText) Static JSX text node: `Control how sensitive the system is to potential issues`
  - context: `Sensitivity</CardTitle> <CardDescription> Control how sensitive the system is to potential issues </Card`
- [462:54] (JSXText) Static JSX text node: `Low Sensitivity`
  - context: `<div> <p className="font-medium">Low Sensitivity</p> <p className="text-sm text-muted-f`
- [464:29] (JSXText) Static JSX text node: `Only alert for significant patterns with high confidence`
  - context: `<p className="text-sm text-muted-foreground"> Only alert for significant patterns with high confidence`
- [472:54] (JSXText) Static JSX text node: `Medium Sensitivity`
  - context: `<div> <p className="font-medium">Medium Sensitivity</p> <p className="text-sm text-mute`
- [474:29] (JSXText) Static JSX text node: `Balanced approach to pattern detection and alerts`
  - context: `<p className="text-sm text-muted-foreground"> Balanced approach to pattern detection and alerts </p>`
- [482:54] (JSXText) Static JSX text node: `High Sensitivity`
  - context: `<div> <p className="font-medium">High Sensitivity</p> <p className="text-sm text-muted-`
- [484:29] (JSXText) Static JSX text node: `Alert for subtle patterns and potential concerns early`
  - context: `<p className="text-sm text-muted-foreground"> Alert for subtle patterns and potential concerns early`
- [492:78] (JSXText) Static JSX text node: `Current Multipliers:`
  - context: `"> <p className="text-sm font-medium text-muted-foreground">Current Multipliers:</p> <div className="grid grid-cols-3 ga`
- [494:28] (JSXText) Static JSX text node: `Emotion:`
  - context: `<div className="grid grid-cols-3 gap-2 text-sm"> <div>Emotion: {config.alertSensitivity.emotionIntensityMultiplier}x</div>`
- [494:89] (JSXText) Static JSX text node: `x`
  - context: `<div>Emotion: {config.alertSensitivity.emotionIntensityMultiplier}x</div> <div>Frequency: {config.alertSensitivity.frequency`
- [495:28] (JSXText) Static JSX text node: `Frequency:`
  - context: `.alertSensitivity.emotionIntensityMultiplier}x</div> <div>Frequency: {config.alertSensitivity.frequencyMultiplier}x</div>`
- [495:84] (JSXText) Static JSX text node: `x`
  - context: `<div>Frequency: {config.alertSensitivity.frequencyMultiplier}x</div> <div>Anomaly: {config.alertSensitivity.anomalyMult`
- [496:28] (JSXText) Static JSX text node: `Anomaly:`
  - context: `{config.alertSensitivity.frequencyMultiplier}x</div> <div>Anomaly: {config.alertSensitivity.anomalyMultiplier}x</div>`
- [496:80] (JSXText) Static JSX text node: `x`
  - context: `<div>Anomaly: {config.alertSensitivity.anomalyMultiplier}x</div> </div> </div> </Ca`
- [506:52] (JSXText) Static JSX text node: `Analysis Time Windows`
  - context: `<CardHeader> <CardTitle className="text-base">Analysis Time Windows</CardTitle> <CardDescription>`
- [508:21] (JSXText) Static JSX text node: `Configure the time periods used for different analyses`
  - context: `ime Windows</CardTitle> <CardDescription> Configure the time periods used for different analyses </CardD`
- [514:56] (JSXText) Static JSX text node: `Default Analysis Period`
  - context: `ame="flex items-center"> <Label htmlFor="defaultAnalysis">Default Analysis Period</Label> {renderTooltip("Standard t`
- [527:98] (JSXText) Static JSX text node: `days`
  - context: `<span className="w-16 text-right">{config.timeWindows.defaultAnalysisDays} days</span> </div> </div>`
- [533:51] (JSXText) Static JSX text node: `Recent Data Window`
  - context: `lassName="flex items-center"> <Label htmlFor="recentData">Recent Data Window</Label> {renderTooltip("Time window for`
- [546:93] (JSXText) Static JSX text node: `days`
  - context: `<span className="w-16 text-right">{config.timeWindows.recentDataDays} days</span> </div> </div>`
- [552:49] (JSXText) Static JSX text node: `Long-term Analysis Window`
  - context: `className="flex items-center"> <Label htmlFor="longTerm">Long-term Analysis Window</Label> {renderTooltip("Extended`
- [565:91] (JSXText) Static JSX text node: `days`
  - context: `<span className="w-16 text-right">{config.timeWindows.longTermDays} days</span> </div> </div>`
- [578:23] (JSXText) Static JSX text node: `Machine Learning Models`
  - context: `p-2"> <Brain className="h-4 w-4" /> Machine Learning Models </span> <div cla`
- [581:83] (JSXText) Static JSX text node: `Enable ML`
  - context: `<Label htmlFor="ml-enabled" className="text-sm font-normal">Enable ML</Label> <Switch id="ml-e`
- [590:21] (JSXText) Static JSX text node: `Manage AI-powered prediction models for enhanced analytics`
  - context: `</CardTitle> <CardDescription> Manage AI-powered prediction models for enhanced analytics </C`
- [598:68] (JSXText) Static JSX text node: `Loading ML models...`
  - context: `reground" /> <span className="ml-2 text-muted-foreground">Loading ML models...</span> </div> ) : (`
- [623:70] (JSXText) Static JSX text node: `Version`
  - context: `<div> <p className="text-muted-foreground">Version</p> <p className="font-medium">{model.ve`
- [627:70] (JSXText) Static JSX text node: `Last Trained`
  - context: `<div> <p className="text-muted-foreground">Last Trained</p> <p className="font-medium">`
- [634:72] (JSXText) Static JSX text node: `Accuracy`
  - context: `<div> <p className="text-muted-foreground">Accuracy</p> <p className="font-medium">{(mode`
- [639:70] (JSXText) Static JSX text node: `Data Points`
  - context: `<div> <p className="text-muted-foreground">Data Points</p> <p className="font-medium">{mode`
- [647:75] (JSXText) Static JSX text node: `Model Performance`
  - context: `-sm"> <span className="text-muted-foreground">Model Performance</span> <span>{(model.accurac`
- [664:37] (JSXText) Static JSX text node: `Training...`
  - context: `r2 className="h-3 w-3 mr-1 animate-spin" /> Training... </>`
- [669:37] (JSXText) Static JSX text node: `Retrain`
  - context: `<RefreshCw className="h-3 w-3 mr-1" /> Retrain </> )}`
- [682:37] (JSXText) Static JSX text node: `Deleting...`
  - context: `r2 className="h-3 w-3 mr-1 animate-spin" /> Deleting... </>`
- [693:31] (JSXText) Static JSX text node: `No model trained yet. Model will be trained automatically when sufficient data is available.`
  - context: `p className="text-sm text-muted-foreground mb-3"> No model trained yet. Model will be trained automatically when sufficient data i`
- [704:35] (JSXText) Static JSX text node: `Training...`
  - context: `der2 className="h-3 w-3 mr-1 animate-spin" /> Training... </> )`
- [709:35] (JSXText) Static JSX text node: `Train Model`
  - context: `<Brain className="h-3 w-3 mr-1" /> Train Model </> )}`
- [723:23] (JSXText) Static JSX text node: `About Machine Learning`
  - context: `ap-2"> <Info className="h-4 w-4" /> About Machine Learning </h5> <p classNam`
- [726:23] (JSXText) Static JSX text node: `ML models enhance predictions by learning from historical patterns. They require:`
  - context: `<p className="text-sm text-muted-foreground"> ML models enhance predictions by learning from historical patterns. They require`
- [729:27] (JSXText) Static JSX text node: `• Emotion prediction: 7+ days of data`
  - context: `sName="text-sm text-muted-foreground space-y-1 ml-4"> <li>• Emotion prediction: 7+ days of data</li> <li>• Sensory r`
- [730:27] (JSXText) Static JSX text node: `• Sensory response: 10+ tracking sessions`
  - context: `<li>• Emotion prediction: 7+ days of data</li> <li>• Sensory response: 10+ tracking sessions</li> <li>• Basel`
- [731:27] (JSXText) Static JSX text node: `• Baseline clustering: 10+ tracking entries`
  - context: `<li>• Sensory response: 10+ tracking sessions</li> <li>• Baseline clustering: 10+ tracking entries</li> </ul>`
- [734:23] (JSXText) Static JSX text node: `Models are trained locally in your browser and improve over time as more data is collected.`
  - context: `<p className="text-sm text-muted-foreground"> Models are trained locally in your browser and improve over time as more data is`
- [746:52] (JSXText) Static JSX text node: `Cache Settings`
  - context: `<CardHeader> <CardTitle className="text-base">Cache Settings</CardTitle> <CardDescription>`
- [748:21] (JSXText) Static JSX text node: `Configure performance optimization settings`
  - context: `he Settings</CardTitle> <CardDescription> Configure performance optimization settings </CardDescription>`
- [754:49] (JSXText) Static JSX text node: `Cache Duration`
  - context: `className="flex items-center"> <Label htmlFor="cacheTTL">Cache Duration</Label> {renderTooltip("How long to keep ca`
- [767:84] (JSXText) Static JSX text node: `min`
  - context: `<span className="w-16 text-right">{config.cache.ttl / 60000} min</span> </div> </div>`
- [773:30] (JSXText) Static JSX text node: `Invalidate cache on config change`
  - context: `<div className="flex items-center"> <Label>Invalidate cache on config change</Label> {renderTooltip("`
- [785:52] (JSXText) Static JSX text node: `Import/Export Configuration`
  - context: `<CardHeader> <CardTitle className="text-base">Import/Export Configuration</CardTitle> <CardDescription>`
- [787:21] (JSXText) Static JSX text node: `Save and share your configuration settings`
  - context: `nfiguration</CardTitle> <CardDescription> Save and share your configuration settings </CardDescription>`
- [797:21] (JSXText) Static JSX text node: `Export Config`
  - context: `> <Download className="h-4 w-4" /> Export Config </Button> <`
- [808:25] (JSXText) Static JSX text node: `Import Config`
  - context: `<Upload className="h-4 w-4" /> Import Config </span> </Button>`
- [816:34] (JSXAttribute) Static aria-label attribute: `Import configuration file`
  - context: `onChange={handleImport} aria-label="Import configuration file" className="hidden"`
- [833:15] (JSXText) Static JSX text node: `Reset to Defaults`
  - context: `-2" > <RotateCcw className="h-4 w-4" /> Reset to Defaults </Button> <div className=`
- [840:19] (JSXText) Static JSX text node: `Unsaved changes`
  - context: `r-4"> <AlertTriangle className="h-4 w-4" /> Unsaved changes </p> )}`
- [848:17] (JSXText) Static JSX text node: `Cancel`
  - context: `nt="outline" onClick={onClose} > Cancel </Button> <Button`
- [857:17] (JSXText) Static JSX text node: `Save Changes`
  - context: `2" > <Save className="h-4 w-4" /> Save Changes </Button> </div> </div>`

### src/components/AnalyticsStatusIndicator.tsx

- [119:20] (MessageAPI) Message API call: error(): `Error refreshing analytics`
  - context: `; } loadAnalyticsStatus(); } catch (error) { logger.error('Error refreshing analytics', error); } finally { setIsRefreshing(fals`
- [154:11] (JSXText) Static JSX text node: `Analytics:`
  - context: `<Badge variant={getStatusColor(status)} className="text-xs"> Analytics: {getStatusText(status)} </Badge> {status.lastAnalyzed`
- [158:13] (JSXText) Static JSX text node: `Updated`
  - context: `zed && ( <span className="text-xs text-muted-foreground"> Updated {formatDistanceToNow(status.lastAnalyzed, { addSuffix: true })}`
- [171:13] (JSXText) Static JSX text node: `Analytics Status`
  - context: `flex items-center gap-2"> <Brain className="h-5 w-5" /> Analytics Status {studentId && \` - ${analyticsStatus[0]?.studentName`
- [181:13] (JSXText) Static JSX text node: `Refresh`
  - context: `className={\`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}\`} /> Refresh </Button> </div> </CardHeader> <CardConten`
- [189:16] (JSXText) Static JSX text node: `No analytics data available`
  - context: `<Activity className="h-8 w-8 mx-auto mb-2 opacity-50" /> <p>No analytics data available</p> </div> ) : ( <div cl`
- [208:27] (JSXText) Static JSX text node: `Data Available`
  - context: `<BarChart3 className="h-3 w-3 mr-1" /> Data Available </Badge> ) : (`
- [213:27] (JSXText) Static JSX text node: `Collecting Data`
  - context: `<Clock className="h-3 w-3 mr-1" /> Collecting Data </Badge> )}`
- [223:25] (JSXText) Static JSX text node: `Last updated:`
  - context: `{status.lastAnalyzed ? ( <> Last updated:<br /> {formatDistanceToNow(status.lastAnal`
- [236:66] (JSXText) Static JSX text node: `Active Analytics Systems:`
  - context: `order-border"> <h4 className="font-medium text-foreground mb-3">Active Analytics Systems:</h4> <div className="grid grid-cols-2`
- [240:21] (JSXText) Static JSX text node: `Pattern Analysis`
  - context: `<CheckCircle className="h-4 w-4 text-green-600" /> Pattern Analysis </div> <div className="flex`
- [244:21] (JSXText) Static JSX text node: `Correlation Analysis`
  - context: `<CheckCircle className="h-4 w-4 text-green-600" /> Correlation Analysis </div> <div className="`
- [248:21] (JSXText) Static JSX text node: `Predictive Insights`
  - context: `<CheckCircle className="h-4 w-4 text-green-600" /> Predictive Insights </div> <div className="f`
- [252:21] (JSXText) Static JSX text node: `Anomaly Detection`
  - context: `<CheckCircle className="h-4 w-4 text-green-600" /> Anomaly Detection </div> <div className="fle`
- [256:21] (JSXText) Static JSX text node: `Alert System`
  - context: `<CheckCircle className="h-4 w-4 text-green-600" /> Alert System </div> <div className="flex ite`
- [260:21] (JSXText) Static JSX text node: `Auto-Updates`
  - context: `<CheckCircle className="h-4 w-4 text-green-600" /> Auto-Updates </div> </div> </div`

### src/components/ComparisonSummary.tsx

- [352:27] (JSXText) Static JSX text node: `Δ`
  - context: `der-emerald-200' : 'text-rose-700 border-rose-200')}> Δ {(c.deltaStrength * 100).toFixed(0)}% </Badge>`
- [359:101] (JSXText) Static JSX text node: `→`
  - context: `{tAnalytics('interface.impactChange')} {String(c.impactChange.from || '—')} → {String(c.impactChange.to || '—')} </div>`
- [435:37] (JSXText) Static JSX text node: `Δ strength:`
  - context: `"text-[13px] mt-1 flex items-center gap-2"> <span>Δ strength: {(c.deltaStrength ?? 0).toFixed(2)}</span>`
- [436:112] (JSXText) Static JSX text node: `→`
  - context: `c.impactChange && <Badge variant="outline">{String(c.impactChange.from || '—')} → {String(c.impactChange.to || '—')}</Badge>} </div>`
- [443:74] (JSXAttribute) Static aria-label attribute: `Vis flere endrede mønstre`
  - context: `mt-1"> <Button size="sm" variant="outline" aria-label="Vis flere endrede mønstre" onClick={() => setPatLimit(p => p + 8)}>Vis flere</B`
- [443:142] (JSXText) Static JSX text node: `Vis flere`
  - context: `aria-label="Vis flere endrede mønstre" onClick={() => setPatLimit(p => p + 8)}>Vis flere</Button> </div> )}`
- [457:165] (JSXText) Static JSX text node: `–`
  - context: `ground">{tAnalytics('interface.none')}</li> : removed.map(r => <li key={r.name}>– {r.name}</li>)} </ul> </`
- [487:74] (JSXAttribute) Static aria-label attribute: `Vis flere korrelasjonsendringer`
  - context: `mt-1"> <Button size="sm" variant="outline" aria-label="Vis flere korrelasjonsendringer" onClick={() => setCorrLimit(p => p + 8)}>Vis f`
- [487:149] (JSXText) Static JSX text node: `Vis flere`
  - context: `abel="Vis flere korrelasjonsendringer" onClick={() => setCorrLimit(p => p + 8)}>Vis flere</Button> </div> )}`
- [493:71] (JSXText) Static JSX text node: `Nye korrelasjoner`
  - context: `<div> <div className="text-sm font-medium mb-1">Nye korrelasjoner</div> <ul className="text-sm space`
- [499:71] (JSXText) Static JSX text node: `Fjernede korrelasjoner`
  - context: `<div> <div className="text-sm font-medium mb-1">Fjernede korrelasjoner</div> <ul className="text-sm`
- [501:164] (JSXText) Static JSX text node: `–`
  - context: `eground">{tAnalytics('interface.none')}</li> : removed.map(r => <li key={r.key}>– {r.variables.join(' × ')}</li>)} </ul>`
- [536:98] (JSXAttribute) Static aria-label attribute: `Vis flere nye tiltak`
  - context: `<div className="mt-1"><Button size="sm" variant="outline" aria-label="Vis flere nye tiltak" onClick={() => setIntAddedLimit(p => p + 8)}>Vis flere</B`
- [536:166] (JSXText) Static JSX text node: `Vis flere`
  - context: `aria-label="Vis flere nye tiltak" onClick={() => setIntAddedLimit(p => p + 8)}>Vis flere</Button></div> )} </`
- [556:98] (JSXAttribute) Static aria-label attribute: `Vis flere fjernede tiltak`
  - context: `<div className="mt-1"><Button size="sm" variant="outline" aria-label="Vis flere fjernede tiltak" onClick={() => setIntRemovedLimit(p => p + 8)}>Vis f`
- [556:173] (JSXText) Static JSX text node: `Vis flere`
  - context: `abel="Vis flere fjernede tiltak" onClick={() => setIntRemovedLimit(p => p + 8)}>Vis flere</Button></div> )} </`
- [562:69] (JSXText) Static JSX text node: `Endret tillit`
  - context: `<div> <div className="text-sm font-medium mb-1">Endret tillit</div> <ul className="text-sm space-y-1">`
- [566:42] (JSXText) Static JSX text node: `: Δ`
  - context: `<li key={c.title}> {c.title}: Δ {(c.deltaConfidence ?? 0).toFixed(2)} </li>`
- [599:74] (JSXText) Static JSX text node: `–`
  - context: `) => ( <li key={\`removed-${s}\`} className="text-rose-700">– {s}</li> ))} </ul> </div`
- [607:129] (JSXText) Static JSX text node: `ms`
  - context: `estampDifference')}: <Trend value={(content as any).summary.recencyMs.delta} /> ms </div> </div> )}`

### src/components/ConfidenceIndicator.tsx

- [104:19] (JSXText) Static JSX text node: `•`
  - context: `key={explanation} className="text-xs text-muted-foreground"> • {explanation} </div> ))} </div>`

### src/components/DataCollectionRoadmap.tsx

- [143:13] (JSXText) Static JSX text node: `Datainnsamlingskart`
  - context: `x items-center gap-2"> <Calendar className="h-5 w-5" /> Datainnsamlingskart </CardTitle> </CardHeader> <CardCo`
- [149:13] (JSXText) Static JSX text node: `Start datainnsamlingen for å se ditt fremgangskart mot høyere sikkerhetsnivåer.`
  - context: `foreground" /> <p className="text-muted-foreground mb-4"> Start datainnsamlingen for å se ditt fremgangskart mot høyere sikkerhetsnivåer.`
- [161:11] (JSXText) Static JSX text node: `Datainnsamlingskart`
  - context: `"flex items-center gap-2"> <Calendar className="h-5 w-5" /> Datainnsamlingskart </CardTitle> <div className="text-sm text-mu`
- [164:11] (JSXText) Static JSX text node: `Fremgang mot høyere sikkerhetsnivå gjennom systematisk datainnsamling`
  - context: `</CardTitle> <div className="text-sm text-muted-foreground"> Fremgang mot høyere sikkerhetsnivå gjennom systematisk datainnsamling </`
- [171:43] (JSXText) Static JSX text node: `Din fremgang`
  - context: `x items-center justify-between mb-2"> <span className="font-medium">Din fremgang</span> <Badge variant="outline"> {milesto`
- [173:59] (JSXText) Static JSX text node: `av`
  - context: `ge variant="outline"> {milestones.filter(m => m.achieved).length} av {milestones.length} milepæler </Badge> </div>`
- [173:82] (JSXText) Static JSX text node: `milepæler`
  - context: `{milestones.filter(m => m.achieved).length} av {milestones.length} milepæler </Badge> </div> <div className="grid g`
- [178:55] (JSXText) Static JSX text node: `Datapunkter:`
  - context: `xt-sm"> <div> <span className="text-muted-foreground">Datapunkter: </span> <span className="font-medium">{currentStatus.`
- [182:55] (JSXText) Static JSX text node: `Dager:`
  - context: `</div> <div> <span className="text-muted-foreground">Dager: </span> <span className="font-medium">{currentStatus.daysSp`
- [196:45] (JSXText) Static JSX text node: `Neste mål:`
  - context: `</div> <div> <h4 className="font-medium">Neste mål: {nextMilestone.title}</h4> <p className="text-sm text`
- [203:23] (JSXText) Static JSX text node: `Fremgang`
  - context: `iv className="flex items-center justify-between text-sm"> <span>Fremgang</span> <span>{Math.round(nextMilestone.progress)}%</spa`
- [209:19] (JSXText) Static JSX text node: `Datapunkter:`
  - context: `2 gap-4 text-xs text-muted-foreground"> <div> Datapunkter: {currentStatus.dataPoints}/{nextMilestone.targetDataPoints}`
- [212:19] (JSXText) Static JSX text node: `Dager:`
  - context: `argetDataPoints} </div> <div> Dager: {currentStatus.daysSpan}/{nextMilestone.targetDays} </div`
- [220:17] (JSXText) Static JSX text node: `Estimert ferdigdato:`
  - context: `"> <Calendar className="h-4 w-4 inline mr-1" /> Estimert ferdigdato: {formatDate(nextMilestone.estimatedDate)} </d`
- [228:39] (JSXText) Static JSX text node: `Komplett veikart`
  - context: `e */} <div className="space-y-4"> <h4 className="font-medium">Komplett veikart</h4> <div className="relative"> {/* Timel`
- [260:56] (JSXText) Static JSX text node: `datapunkter`
  - context: `text-muted-foreground"> <span>{milestone.targetDataPoints} datapunkter</span> <span>{milestone.targetDays} dager</span>`
- [261:50] (JSXText) Static JSX text node: `dager`
  - context: `DataPoints} datapunkter</span> <span>{milestone.targetDays} dager</span> {milestone.estimatedDate && !milestone.achieved`
- [263:29] (JSXText) Static JSX text node: `Estimert:`
  - context: `milestone.estimatedDate && !milestone.achieved && ( <span>Estimert: {formatDate(milestone.estimatedDate)}</span> )}`

### src/components/DataQualityFeedback.tsx

- [213:13] (JSXText) Static JSX text node: `Datakvalitet`
  - context: `items-center gap-2"> <BarChart3 className="h-5 w-5" /> Datakvalitet </CardTitle> </CardHeader> <CardContent c`
- [219:13] (JSXText) Static JSX text node: `Ingen data tilgjengelig for kvalitetsvurdering`
  - context: `uted-foreground" /> <p className="text-muted-foreground"> Ingen data tilgjengelig for kvalitetsvurdering </p> </CardCont`
- [231:11] (JSXText) Static JSX text node: `Datakvalitet`
  - context: `flex items-center gap-2"> <BarChart3 className="h-5 w-5" /> Datakvalitet </CardTitle> <div className="flex items-center gap-`
- [235:61] (JSXText) Static JSX text node: `Samlet score:`
  - context: `tems-center gap-2"> <span className="text-sm text-muted-foreground">Samlet score:</span> <Badge variant={overallScore >= 80 ? 'default'`
- [267:23] (JSXText) Static JSX text node: `•`
  - context: `y={\`${metric.id}-${rec}\`} className="text-xs opacity-90"> • {rec} </p> ))} </div>`
- [278:44] (JSXText) Static JSX text node: `Samlet vurdering`
  - context: `/20 dark:to-blue-950/20 rounded-lg"> <h4 className="font-medium mb-2">Samlet vurdering</h4> <p className="text-sm text-muted-foreground mb-3`
- [289:51] (JSXText) Static JSX text node: `Prioriterte forbedringer:`
  - context: `<div className="space-y-2"> <h5 className="text-sm font-medium">Prioriterte forbedringer:</h5> {qualityMetrics .fi`

### src/components/DataRequirementsCalculator.tsx

- [140:13] (JSXText) Static JSX text node: `Datakrav for sikkerhetsnivå`
  - context: `lex items-center gap-2"> <Target className="h-5 w-5" /> Datakrav for sikkerhetsnivå </CardTitle> </CardHeader>`
- [146:13] (JSXText) Static JSX text node: `Ingen data registrert ennå. Start med å samle data for å se fremgang mot sikkerhetsnivåer.`
  - context: `foreground" /> <p className="text-muted-foreground mb-4"> Ingen data registrert ennå. Start med å samle data for å se fremgang mot sikkerh`
- [149:13] (JSXText) Static JSX text node: `Start datainnsamling`
  - context: `kkerhetsnivåer. </p> <Button variant="outline"> Start datainnsamling </Button> </CardContent> </Card>`
- [161:11] (JSXText) Static JSX text node: `Datakrav for sikkerhetsnivå`
  - context: `e="flex items-center gap-2"> <Target className="h-5 w-5" /> Datakrav for sikkerhetsnivå </CardTitle> <div className="flex it`
- [164:44] (JSXText) Static JSX text node: `datapunkter samlet`
  - context: `ap-4 text-sm text-muted-foreground"> <span>{currentStatus.dataPoints} datapunkter samlet</span> <span>{currentStatus.daysSpan} dager med dat`
- [165:42] (JSXText) Static JSX text node: `dager med data`
  - context: `.dataPoints} datapunkter samlet</span> <span>{currentStatus.daysSpan} dager med data</span> </div> </CardHeader> <CardContent clas`
- [172:40] (JSXText) Static JSX text node: `Nåværende sikkerhetsnivå`
  - context: `bg-muted/50 rounded-lg"> <div> <p className="font-medium">Nåværende sikkerhetsnivå</p> <p className="text-sm text-muted-foregr`
- [181:81] (JSXText) Static JSX text node: `sikkerhet`
  - context: `{currentLevel >= 3 ? 'Høy' : currentLevel >= 1 ? 'Middels' : 'Lav'} sikkerhet </Badge> </div> {/* Progress toward next le`
- [189:43] (JSXText) Static JSX text node: `Fremgang mot`
  - context: `="flex items-center justify-between"> <h4 className="font-medium">Fremgang mot {nextTarget.requirement.description}</h4> <span class`
- [191:50] (JSXText) Static JSX text node: `% fullført`
  - context: `ext-sm text-muted-foreground"> {Math.round(nextTarget.progress)}% fullført </span> </div> <Pr`
- [200:25] (JSXText) Static JSX text node: `Datapunkter`
  - context: `className="flex items-center justify-between text-sm"> <span>Datapunkter</span> <span>{nextTarget.dataPoints.current} / {ne`
- [206:52] (JSXText) Static JSX text node: `flere datapunkter trengs`
  - context: `t-xs text-muted-foreground"> {nextTarget.dataPoints.needed} flere datapunkter trengs </p> )}`
- [213:25] (JSXText) Static JSX text node: `Tidsperiode`
  - context: `className="flex items-center justify-between text-sm"> <span>Tidsperiode</span> <span>{nextTarget.days.current} / {nextTarg`
- [214:86] (JSXText) Static JSX text node: `dager`
  - context: `<span>{nextTarget.days.current} / {nextTarget.requirement.minDays} dager</span> </div> <Progress value={nextTarget.`
- [219:46] (JSXText) Static JSX text node: `flere dager trengs`
  - context: `e="text-xs text-muted-foreground"> {nextTarget.days.needed} flere dager trengs </p> )} </div`
- [229:68] (JSXText) Static JSX text node: `Tidsestimat`
  - context: `ext-info" /> <span className="font-medium text-info-foreground">Tidsestimat</span> </div> <p className="text-sm text`
- [232:17] (JSXText) Static JSX text node: `Med`
  - context: `> <p className="text-sm text-info-foreground/80"> Med {getRecommendedRate()} datapunkt(er) per dag vil du nå{' '}`
- [232:44] (JSXText) Static JSX text node: `datapunkt(er) per dag vil du nå`
  - context: `e="text-sm text-info-foreground/80"> Med {getRecommendedRate()} datapunkt(er) per dag vil du nå{' '} <span className="font-mediu`
- [233:91] (JSXText) Static JSX text node: `innen`
  - context: `<span className="font-medium">{nextTarget.requirement.description}</span> innen{' '} <span className="font-medium">{formatDate(nextTarget.`
- [243:39] (JSXText) Static JSX text node: `Alle sikkerhetsnivåer`
  - context: `w */} <div className="space-y-3"> <h4 className="font-medium">Alle sikkerhetsnivåer</h4> {progressCalculations.map((calc) => (`
- [261:54] (JSXText) Static JSX text node: `datapunkter over`
  - context: `xs text-muted-foreground"> {calc.requirement.minDataPoints} datapunkter over {calc.requirement.minDays} dager </p>`
- [261:98] (JSXText) Static JSX text node: `dager`
  - context: `{calc.requirement.minDataPoints} datapunkter over {calc.requirement.minDays} dager </p> </div> </div>`
- [271:42] (JSXText) Static JSX text node: `dager igjen`
  - context: `="text-xs text-muted-foreground mt-1"> ~{calc.daysToTarget} dager igjen </p> )} </div>`
- [284:69] (JSXText) Static JSX text node: `Anbefalinger`
  - context: `primary" /> <span className="font-medium text-primary-foreground">Anbefalinger</span> </div> <ul className="text-sm text-p`
- [287:19] (JSXText) Static JSX text node: `• Samle`
  - context: `<ul className="text-sm text-primary-foreground/80 space-y-1"> <li>• Samle {getRecommendedRate()} datapunkt(er) per dag for optimal fremgang</li>`
- [287:50] (JSXText) Static JSX text node: `datapunkt(er) per dag for optimal fremgang`
  - context: `mary-foreground/80 space-y-1"> <li>• Samle {getRecommendedRate()} datapunkt(er) per dag for optimal fremgang</li> <li>• Registrer da`
- [288:19] (JSXText) Static JSX text node: `• Registrer data konsekvent for bedre mønstergjenkjenning`
  - context: `mendedRate()} datapunkt(er) per dag for optimal fremgang</li> <li>• Registrer data konsekvent for bedre mønstergjenkjenning</li> <li`
- [289:19] (JSXText) Static JSX text node: `• Inkluder både følelser og sensoriske opplevelser i hver økt`
  - context: `Registrer data konsekvent for bedre mønstergjenkjenning</li> <li>• Inkluder både følelser og sensoriske opplevelser i hver økt</li>`
- [290:19] (JSXText) Static JSX text node: `• Noter miljøfaktorer for å identifisere sammenhenger`
  - context: `luder både følelser og sensoriske opplevelser i hver økt</li> <li>• Noter miljøfaktorer for å identifisere sammenhenger</li> </ul>`

### src/components/DateRangeSelector.tsx

- [122:36] (JSXAttribute) Static placeholder attribute: `Quick select`
  - context: `lassName="w-[160px] bg-input border-border"> <SelectValue placeholder="Quick select" /> </SelectTrigger> <SelectContent> {pr`
- [154:21] (JSXText) Static JSX text node: `Pick a date range`
  - context: `eRange.from, "LLL dd, y") ) ) : ( <span>Pick a date range</span> )} <ChevronDown className="ml-a`
- [174:44] (JSXText) Static JSX text node: `Selected:`
  - context: `ame="text-sm text-muted-foreground"> <span className="hidden md:inline">Selected: </span> <span className="font-medium text-foreground">{selecte`

### src/components/DevErrorBanner.tsx

- [46:22] (MessageAPI) Message API call: error(): `Dev error captured`
  - context: `// Record through central logger; recursion guarded above logger.error('Dev error captured', ...args); } catch (e) { logger.error('Error`
- [48:22] (MessageAPI) Message API call: error(): `Error in DevErrorBanner console.error interceptor`
  - context: `.error('Dev error captured', ...args); } catch (e) { logger.error('Error in DevErrorBanner console.error interceptor', e); } finally {`
- [61:20] (MessageAPI) Message API call: error(): `Window error`
  - context: `=> c + 1); // Log window errors through central logger logger.error('Window error', e.error || new Error(e.message)); }; const onUnhandledRe`
- [70:20] (MessageAPI) Message API call: error(): `Unhandled promise rejection`
  - context: `1); // Log unhandled rejections through central logger logger.error('Unhandled promise rejection', reason instanceof Error ? reason : new Error(msg)`

### src/components/EmotionTracker.tsx

- [131:70] (JSXText) Static JSX text node: `Specific Feeling (Optional)`
  - context: `<div> <h3 className="text-sm font-medium text-foreground mb-3">Specific Feeling (Optional)</h3> <div className="flex flex-wrap gap-`
- [187:70] (JSXText) Static JSX text node: `Duration (minutes)`
  - context: `<div> <h3 className="text-sm font-medium text-foreground mb-3">Duration (minutes)</h3> <div className="flex gap-2"> <`
- [205:29] (JSXAttribute) Static placeholder attribute: `How long did it last?`
  - context: `999 minutes } }} placeholder="How long did it last?" className="w-32 px-3 py-2 border border-`
- [209:28] (JSXAttribute) Static aria-label attribute: `Duration in minutes`
  - context: `t" min="0" max="999" aria-label="Duration in minutes" aria-describedby="duration-help"`
- [210:34] (JSXAttribute) Static aria-describedby attribute: `duration-help`
  - context: `aria-label="Duration in minutes" aria-describedby="duration-help" /> <div className="flex gap-1">`
- [232:70] (JSXText) Static JSX text node: `How did it develop?`
  - context: `<div> <h3 className="text-sm font-medium text-foreground mb-3">How did it develop?</h3> <div className="flex gap-2">`
- [240:17] (JSXText) Static JSX text node: `Sudden`
  - context: `en')} className="font-dyslexia" > Sudden </Button> <Button variant={es`
- [248:17] (JSXText) Static JSX text node: `Gradual`
  - context: `al')} className="font-dyslexia" > Gradual </Button> <Button variant={e`
- [256:17] (JSXText) Static JSX text node: `Unknown`
  - context: `wn')} className="font-dyslexia" > Unknown </Button> </div> </div> )}`
- [264:68] (JSXText) Static JSX text node: `Utløsere (Valgfritt)`
  - context: `<div> <h3 className="text-sm font-medium text-foreground mb-3">Utløsere (Valgfritt)</h3> <div className="flex gap-2 mb-2">`
- [271:27] (JSXAttribute) Static placeholder attribute: `Legg til en utløser...`
  - context: `ress={(e) => e.key === 'Enter' && handleAddTrigger()} placeholder="Legg til en utløser..." aria-label="Legg til ny utløser"`
- [272:26] (JSXAttribute) Static aria-label attribute: `Legg til ny utløser`
  - context: `()} placeholder="Legg til en utløser..." aria-label="Legg til ny utløser" className="flex-1 px-3 py-2 border border-bo`
- [287:27] (JSXText) Static JSX text node: `×`
  - context: `={() => handleRemoveTrigger(trigger)} > {trigger} × </Badge> ))} </div> </div>`
- [299:25] (JSXAttribute) Static placeholder attribute: `Ytterligere observasjoner...`
  - context: `onChange={(e) => setNotes(e.target.value)} placeholder="Ytterligere observasjoner..." className="font-dyslexia bg-input bor`

### src/components/EnhancedDataVisualization.tsx

- [66:63] (JSXText) Static JSX text node: `No data to display`
  - context: `uted-foreground"> <h3 className="text-lg font-semibold">No data to display</h3> <p className="text-sm">There is`
- [67:48] (JSXText) Static JSX text node: `There is no`
  - context: `emibold">No data to display</h3> <p className="text-sm">There is no {dataType} data available for {studentName}.</p>`
- [67:71] (JSXText) Static JSX text node: `data available for`
  - context: `play</h3> <p className="text-sm">There is no {dataType} data available for {studentName}.</p> </div>`
- [78:77] (JSXText) Static JSX text node: `Enhanced Data Insights for`
  - context: `iv> <h2 className="text-2xl font-bold text-card-foreground">Enhanced Data Insights for {studentName}</h2> <p className="`
- [79:58] (JSXText) Static JSX text node: `Displaying`
  - context: `for {studentName}</h2> <p className="text-muted-foreground">Displaying {dataType}</p> </div> <div className=`
- [82:129] (JSXText) Static JSX text node: `Emotions`
  - context: `taType('emotions')} variant={dataType === 'emotions' ? 'default' : 'secondary'}>Emotions</Button> <Button onClick={() => setDataType('sensor`
- [83:127] (JSXText) Static JSX text node: `Sensory`
  - context: `DataType('sensory')} variant={dataType === 'sensory' ? 'default' : 'secondary'}>Sensory</Button> </div> </div> <motion.`
- [89:19] (JSXText) Static JSX text node: `Lightweight stub preview — charts library removed as unused`
  - context: `x items-center justify-center text-sm text-muted-foreground"> Lightweight stub preview — charts library removed as unused </di`

### src/components/EnvironmentalTracker.tsx

- [52:19] (MessageAPI) Message API call: error(): `Please fill out all required fields (lighting, activity, weather, time of day).`
  - context: `(!lighting || !classroomActivity || !weather || !timeOfDay) { toast.error('Please fill out all required fields (lighting, activity, weather, time of day).`
- [101:80] (JSXText) Static JSX text node: `°C`
  - context: `{String(tTracking('environmental.temperature'))}: {roomTemperature}°C </Label> <Slider value={[roomTemperature]}`
- [112:19] (JSXText) Static JSX text node: `15°C`
  - context: `assName="flex justify-between text-xs text-muted-foreground"> <span>15°C</span> <span>30°C</span> </div> </div>`
- [113:19] (JSXText) Static JSX text node: `30°C`
  - context: `text-xs text-muted-foreground"> <span>15°C</span> <span>30°C</span> </div> </div> {/* Lighting */} <d`

### src/components/ErrorBoundary.tsx

- [94:18] (MessageAPI) Message API call: error(): `[ErrorBoundary] Component error caught`
  - context: `ronment configuration and doesn't log to console in production logger.error('[ErrorBoundary] Component error caught', { error: { message: erro`
- [128:21] (MessageAPI) Message API call: error(): `An unexpected error occurred`
  - context: `ble; also emit a dev-only minimal toast payload try { toast.error('An unexpected error occurred', { description: import.meta.env.DEV &&`
- [128:21] (MessageAPI) sonner toast.error(): `An unexpected error occurred`
  - context: `ble; also emit a dev-only minimal toast payload try { toast.error('An unexpected error occurred', { description: import.meta.env.DEV &&`
- [158:13] (MessageAPI) Message API call: toast(): `Page automatically refreshed after multiple errors`
  - context: `this.resetTimeoutId = setTimeout(() => { this.handleRetry(); toast('Page automatically refreshed after multiple errors'); }, 5000); }; /**`
- [158:13] (MessageAPI) sonner toast(): `Page automatically refreshed after multiple errors`
  - context: `this.resetTimeoutId = setTimeout(() => { this.handleRetry(); toast('Page automatically refreshed after multiple errors'); }, 5000); }; /**`
- [204:17] (JSXText) Static JSX text node: `Something went wrong`
  - context: `ructive"> <AlertTriangle className="h-5 w-5" /> Something went wrong </CardTitle> </CardHeader>`
- [209:17] (JSXText) Static JSX text node: `An unexpected error occurred. The application may not be working correctly.`
  - context: `4"> <p className="text-sm text-muted-foreground"> An unexpected error occurred. The application may not be working correctly.`
- [214:67] (JSXText) Static JSX text node: `Error Details`
  - context: `me="text-xs"> <summary className="cursor-pointer font-medium">Error Details</summary> <pre className="mt-2 p-2 bg-muted roun`
- [225:19] (JSXText) Static JSX text node: `Try Again`
  - context: `lt"> <RefreshCw className="h-4 w-4 mr-2" /> Try Again </Button> <Button o`
- [232:19] (JSXText) Static JSX text node: `Reload Page`
  - context: `> <RefreshCw className="h-4 w-4 mr-2" /> Reload Page </Button> <Button`
- [239:19] (JSXText) Static JSX text node: `Go Home`
  - context: `> <Home className="h-4 w-4 mr-2" /> Go Home </Button> </div>`
- [245:19] (JSXText) Static JSX text node: `Auto-refreshing in 5 seconds...`
  - context: `<p className="text-xs text-muted-foreground"> Auto-refreshing in 5 seconds... </p> )}`

### src/components/ErrorWrapper.tsx

- [16:15] (JSXText) Static JSX text node: `Something went wrong loading this component`
  - context: `text-destructive"> <AlertTriangle className="h-5 w-5" /> <span>Something went wrong loading this component</span> </div> </CardConten`

### src/components/ExportDialog.tsx

- [65:66] (JSXAttribute) Static aria-describedby attribute: `format-help`
  - context: `={inProgress}> <SelectTrigger id="export-format" aria-describedby="format-help"> <SelectValue placeholder={t('export.options.selec`
- [69:41] (JSXText) Static JSX text node: `PDF`
  - context: `tTrigger> <SelectContent> <SelectItem value="pdf">PDF</SelectItem> <SelectItem value="csv">CSV</SelectItem>`
- [70:41] (JSXText) Static JSX text node: `CSV`
  - context: `SelectItem value="pdf">PDF</SelectItem> <SelectItem value="csv">CSV</SelectItem> <SelectItem value="json">JSON</SelectItem>`
- [71:42] (JSXText) Static JSX text node: `JSON`
  - context: `electItem value="csv">CSV</SelectItem> <SelectItem value="json">JSON</SelectItem> </SelectContent> </Select>`
- [79:68] (JSXAttribute) Static aria-describedby attribute: `template-help`
  - context: `inProgress}> <SelectTrigger id="export-template" aria-describedby="template-help"> <SelectValue placeholder={t('export.options.sel`
- [93:67] (JSXAttribute) Static aria-describedby attribute: `quality-help`
  - context: `inProgress}> <SelectTrigger id="export-quality" aria-describedby="quality-help"> <SelectValue placeholder={t('export.options.sele`
- [110:66] (JSXAttribute) Static aria-describedby attribute: `scheme-help`
  - context: `| inProgress}> <SelectTrigger id="export-scheme" aria-describedby="scheme-help"> <SelectValue placeholder={t('export.options.selec`
- [130:32] (JSXAttribute) Static aria-describedby attribute: `raw-help`
  - context: `tIncludeRaw} disabled={inProgress} aria-describedby="raw-help" /> </div> {inProgress && (`

### src/components/GoalManager.tsx

- [97:19] (MessageAPI) Message API call: error(): `Please fill in all required fields`
  - context: `.description.trim() || !newGoal.measurableObjective.trim()) { toast.error("Please fill in all required fields"); return; } // Validate targ`
- [97:19] (MessageAPI) sonner toast.error(): `Please fill in all required fields`
  - context: `.description.trim() || !newGoal.measurableObjective.trim()) { toast.error("Please fill in all required fields"); return; } // Validate targ`
- [103:19] (MessageAPI) Message API call: error(): `Please select a target date`
  - context: `} // Validate target date if (!newGoal.targetDate) { toast.error("Please select a target date"); return; } const targetDate = new`
- [103:19] (MessageAPI) sonner toast.error(): `Please select a target date`
  - context: `} // Validate target date if (!newGoal.targetDate) { toast.error("Please select a target date"); return; } const targetDate = new`
- [109:19] (MessageAPI) Message API call: error(): `Invalid target date`
  - context: `e(newGoal.targetDate); if (isNaN(targetDate.getTime())) { toast.error("Invalid target date"); return; } // Ensure target date is in the`
- [109:19] (MessageAPI) sonner toast.error(): `Invalid target date`
  - context: `e(newGoal.targetDate); if (isNaN(targetDate.getTime())) { toast.error("Invalid target date"); return; } // Ensure target date is in the`
- [117:19] (MessageAPI) Message API call: error(): `Target date must be in the future`
  - context: `today.setHours(0, 0, 0, 0); if (targetDate < today) { toast.error("Target date must be in the future"); return; } // Validate basel`
- [117:19] (MessageAPI) sonner toast.error(): `Target date must be in the future`
  - context: `today.setHours(0, 0, 0, 0); if (targetDate < today) { toast.error("Target date must be in the future"); return; } // Validate basel`
- [123:19] (MessageAPI) Message API call: error(): `Target value must be greater than baseline value`
  - context: `alues if (newGoal.targetValue <= newGoal.baselineValue) { toast.error("Target value must be greater than baseline value"); return; } co`
- [123:19] (MessageAPI) sonner toast.error(): `Target value must be greater than baseline value`
  - context: `alues if (newGoal.targetValue <= newGoal.baselineValue) { toast.error("Target value must be greater than baseline value"); return; } co`
- [155:19] (MessageAPI) Message API call: success(): `Goal created successfully!`
  - context: `loadGoals(); resetForm(); setShowCreateDialog(false); toast.success("Goal created successfully!"); onGoalUpdate?.(); }; const updateGoal =`
- [155:19] (MessageAPI) sonner toast.success(): `Goal created successfully!`
  - context: `loadGoals(); resetForm(); setShowCreateDialog(false); toast.success("Goal created successfully!"); onGoalUpdate?.(); }; const updateGoal =`
- [189:19] (MessageAPI) Message API call: success(): `Progress updated!`
  - context: `urrentProgress: Math.max(0, Math.min(100, progress)) }); toast.success("Progress updated!"); }; const addMilestone = (goalId: string, title: strin`
- [189:19] (MessageAPI) sonner toast.success(): `Progress updated!`
  - context: `urrentProgress: Math.max(0, Math.min(100, progress)) }); toast.success("Progress updated!"); }; const addMilestone = (goalId: string, title: strin`
- [208:19] (MessageAPI) Message API call: success(): `Milestone added!`
  - context: `milestones: [...goal.milestones, newMilestone] }); toast.success("Milestone added!"); }; const completeMilestone = (goalId: string, mileston`
- [208:19] (MessageAPI) sonner toast.success(): `Milestone added!`
  - context: `milestones: [...goal.milestones, newMilestone] }); toast.success("Milestone added!"); }; const completeMilestone = (goalId: string, mileston`
- [222:19] (MessageAPI) Message API call: success(): `Milestone completed! 🎉`
  - context: `; updateGoal(goalId, { milestones: updatedMilestones }); toast.success("Milestone completed! 🎉"); }; /** * Delete a goal with proper confirmat`
- [222:19] (MessageAPI) sonner toast.success(): `Milestone completed! 🎉`
  - context: `; updateGoal(goalId, { milestones: updatedMilestones }); toast.success("Milestone completed! 🎉"); }; /** * Delete a goal with proper confirmat`
- [244:23] (MessageAPI) Message API call: success(): `Goal deleted`
  - context: `dataStorage.saveGoal(updatedGoal); loadGoals(); toast.success("Goal deleted"); onGoalUpdate?.(); } } catch (error) { l`
- [244:23] (MessageAPI) sonner toast.success(): `Goal deleted`
  - context: `dataStorage.saveGoal(updatedGoal); loadGoals(); toast.success("Goal deleted"); onGoalUpdate?.(); } } catch (error) { l`
- [248:20] (MessageAPI) Message API call: error(): `Failed to delete goal`
  - context: `d"); onGoalUpdate?.(); } } catch (error) { logger.error('Failed to delete goal', error); toast.error('Failed to delete goal. Pleas`
- [249:19] (MessageAPI) Message API call: error(): `Failed to delete goal. Please try again.`
  - context: `(error) { logger.error('Failed to delete goal', error); toast.error('Failed to delete goal. Please try again.'); } }; const resetForm = ()`
- [249:19] (MessageAPI) sonner toast.error(): `Failed to delete goal. Please try again.`
  - context: `(error) { logger.error('Failed to delete goal', error); toast.error('Failed to delete goal. Please try again.'); } }; const resetForm = ()`
- [292:62] (JSXText) Static JSX text node: `IEP Goals`
  - context: `en"> <div> <h2 className="text-2xl font-bold text-foreground">IEP Goals</h2> <p className="text-muted-foreground">Track and monitor`
- [293:48] (JSXText) Static JSX text node: `Track and monitor`
  - context: `text-foreground">IEP Goals</h2> <p className="text-muted-foreground">Track and monitor {student.name}'s progress toward educational objectives</p>`
- [293:80] (JSXText) Static JSX text node: `'s progress toward educational objectives`
  - context: `<p className="text-muted-foreground">Track and monitor {student.name}'s progress toward educational objectives</p> </div> <Dialog ope`
- [299:15] (JSXText) Static JSX text node: `New Goal`
  - context: `0 font-dyslexia"> <Plus className="h-4 w-4 mr-2" /> New Goal </Button> </DialogTrigger> <DialogConte`
- [304:28] (JSXText) Static JSX text node: `Create New IEP Goal`
  - context: `nt className="max-w-2xl"> <DialogHeader> <DialogTitle>Create New IEP Goal</DialogTitle> <DialogDescription>`
- [306:17] (JSXText) Static JSX text node: `Enter goal details, targets, and measurable objectives.`
  - context: `te New IEP Goal</DialogTitle> <DialogDescription> Enter goal details, targets, and measurable objectives. </DialogDe`
- [311:40] (JSXText) Static JSX text node: `Goal Title *`
  - context: `assName="space-y-4"> <div> <Label htmlFor="title">Goal Title *</Label> <Input id="title"`
- [316:31] (JSXAttribute) Static placeholder attribute: `e.g., Improve emotional regulation during transitions`
  - context: `al(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g., Improve emotional regulation during transitions" />`
- [320:43] (JSXText) Static JSX text node: `Category`
  - context: `</div> <div> <Label htmlFor="category">Category</Label> <Select value={newGoal.category} onValueChange=`
- [326:52] (JSXText) Static JSX text node: `Behavioral`
  - context: `<SelectContent> <SelectItem value="behavioral">Behavioral</SelectItem> <SelectItem value="academic">Academi`
- [327:50] (JSXText) Static JSX text node: `Academic`
  - context: `ioral">Behavioral</SelectItem> <SelectItem value="academic">Academic</SelectItem> <SelectItem value="social">Social</Sel`
- [328:48] (JSXText) Static JSX text node: `Social`
  - context: `"academic">Academic</SelectItem> <SelectItem value="social">Social</SelectItem> <SelectItem value="sensory">Sensory</Sel`
- [329:49] (JSXText) Static JSX text node: `Sensory`
  - context: `ue="social">Social</SelectItem> <SelectItem value="sensory">Sensory</SelectItem> <SelectItem value="communication">Commu`
- [330:55] (JSXText) Static JSX text node: `Communication`
  - context: `ory">Sensory</SelectItem> <SelectItem value="communication">Communication</SelectItem> </SelectContent> </`
- [335:46] (JSXText) Static JSX text node: `Description *`
  - context: `</div> <div> <Label htmlFor="description">Description *</Label> <Textarea id="descriptio`
- [340:31] (JSXAttribute) Static placeholder attribute: `Detailed description of what the student will achieve...`
  - context: `v => ({ ...prev, description: e.target.value }))} placeholder="Detailed description of what the student will achieve..." />`
- [344:45] (JSXText) Static JSX text node: `Measurable Objective *`
  - context: `</div> <div> <Label htmlFor="measurable">Measurable Objective *</Label> <Textarea id="m`
- [349:31] (JSXAttribute) Static placeholder attribute: `How will progress be measured? Include specific criteria...`
  - context: `...prev, measurableObjective: e.target.value }))} placeholder="How will progress be measured? Include specific criteria..." />`
- [354:45] (JSXText) Static JSX text node: `Baseline Value`
  - context: `ols-2 gap-4"> <div> <Label htmlFor="baseline">Baseline Value</Label> <Input id="baseline`
- [363:43] (JSXText) Static JSX text node: `Target Value`
  - context: `</div> <div> <Label htmlFor="target">Target Value</Label> <Input id="target"`
- [373:45] (JSXText) Static JSX text node: `Target Date`
  - context: `</div> <div> <Label htmlFor="targetDate">Target Date</Label> <Input id="targetDate"`
- [383:19] (JSXText) Static JSX text node: `Cancel`
  - context: `onClick={() => { resetForm(); setShowCreateDialog(false); }}> Cancel </Button> <Button onClick={createGoal}>Cr`
- [385:46] (JSXText) Static JSX text node: `Create Goal`
  - context: `Cancel </Button> <Button onClick={createGoal}>Create Goal</Button> </div> </div> </DialogC`
- [397:72] (JSXText) Static JSX text node: `No IEP Goals Yet`
  - context: `mb-4" /> <h3 className="text-xl font-semibold text-foreground mb-2">No IEP Goals Yet</h3> <p className="text-muted-foreground text-cente`
- [399:15] (JSXText) Static JSX text node: `Start by creating your first IEP goal to track`
  - context: `<p className="text-muted-foreground text-center mb-6 max-w-md"> Start by creating your first IEP goal to track {student.name}'s educational prog`
- [399:76] (JSXText) Static JSX text node: `'s educational progress.`
  - context: `md"> Start by creating your first IEP goal to track {student.name}'s educational progress. </p> <Button onClick={() => set`
- [403:15] (JSXText) Static JSX text node: `Create First Goal`
  - context: `0 font-dyslexia"> <Plus className="h-4 w-4 mr-2" /> Create First Goal </Button> </CardContent> </Card>`
- [429:68] (JSXAttribute) Static aria-label attribute: `Edit goal`
  - context: `flex gap-2"> <Button variant="ghost" size="icon" aria-label="Edit goal" title="Edit goal"> <Edit className="h-4 w-4" /`
- [429:86] (JSXAttribute) Static title attribute: `Edit goal`
  - context: `<Button variant="ghost" size="icon" aria-label="Edit goal" title="Edit goal"> <Edit className="h-4 w-4" />`
- [432:68] (JSXAttribute) Static aria-label attribute: `Delete goal`
  - context: `</Button> <Button variant="ghost" size="icon" aria-label="Delete goal" title="Delete goal" onClick={() => deleteGoal(goal.id)}>`
- [432:88] (JSXAttribute) Static title attribute: `Delete goal`
  - context: `<Button variant="ghost" size="icon" aria-label="Delete goal" title="Delete goal" onClick={() => deleteGoal(goal.id)}> <Trash2`
- [442:59] (JSXText) Static JSX text node: `Progress`
  - context: `ustify-between mb-2"> <span className="text-sm font-medium">Progress</span> <span className="text-sm text-muted-foregrou`
- [450:52] (JSXText) Static JSX text node: `Measurable Objective`
  - context: `<div className="mb-4"> <h4 className="font-medium mb-2">Measurable Objective</h4> <p className="text-sm text-muted-for`
- [460:27] (JSXText) Static JSX text node: `Created:`
  - context: `ndarIcon className="h-4 w-4 text-muted-foreground" /> <span>Created: {format(goal.createdDate, 'MMM dd, yyyy')}</span> </d`
- [464:27] (JSXText) Static JSX text node: `Target:`
  - context: `rosshair className="h-4 w-4 text-muted-foreground" /> <span>Target: {format(goal.targetDate, 'MMM dd, yyyy')}</span> </div`
- [471:49] (JSXText) Static JSX text node: `Milestones`
  - context: `s-center justify-between mb-2"> <h4 className="font-medium">Milestones</h4> <Button variant="outl`
- [476:46] (MessageAPI) Message API call: prompt(): `Milestone title:`
  - context: `onClick={() => { const title = prompt("Milestone title:"); const description = prompt("Milesto`
- [477:52] (MessageAPI) Message API call: prompt(): `Milestone description:`
  - context: `prompt("Milestone title:"); const description = prompt("Milestone description:"); const dateStr = prompt("Targe`
- [478:48] (MessageAPI) Message API call: prompt(): `Target date (YYYY-MM-DD):`
  - context: `rompt("Milestone description:"); const dateStr = prompt("Target date (YYYY-MM-DD):"); if (title && description &`
- [485:23] (JSXText) Static JSX text node: `Add`
  - context: `> <Plus className="h-3 w-3 mr-1" /> Add </Button> </div> {go`
- [489:66] (JSXText) Static JSX text node: `No milestones yet`
  - context: `ngth === 0 ? ( <p className="text-sm text-muted-foreground">No milestones yet</p> ) : ( <div className`
- [525:44] (MessageAPI) Message API call: prompt(): `Enter current progress value:`
  - context: `onClick={() => { const value = prompt("Enter current progress value:"); const notes = prompt("Pr`
- [526:44] (MessageAPI) Message API call: prompt(): `Progress notes (optional):`
  - context: `pt("Enter current progress value:"); const notes = prompt("Progress notes (optional):"); if (value) {`
- [533:21] (JSXText) Static JSX text node: `Update Progress`
  - context: `<TrendingUp className="h-4 w-4 mr-1" /> Update Progress </Button> </div>`

### src/components/InteractiveDataVisualization.tsx

- [165:26] (MessageAPI) Message API call: error(): `[InteractiveDataVisualization] analytics error`
  - context: `'analytics_ui_error_' + String(error), 60_000, () => { try { logger.error('[InteractiveDataVisualization] analytics error', { error }); } catch {} });`
- [259:20] (MessageAPI) Message API call: error(): `Export failed`
  - context: `oUpperCase()} exported successfully\`); } catch (error) { logger.error('Export failed', { error }); toast.error('Failed to export interactive ana`
- [260:19] (MessageAPI) Message API call: error(): `Failed to export interactive analytics data`
  - context: `tch (error) { logger.error('Export failed', { error }); toast.error('Failed to export interactive analytics data'); } finally { setIsExpor`
- [260:19] (MessageAPI) sonner toast.error(): `Failed to export interactive analytics data`
  - context: `tch (error) { logger.error('Export failed', { error }); toast.error('Failed to export interactive analytics data'); } finally { setIsExpor`
- [285:123] (JSXAttribute) Static aria-label attribute: `Loading chart`
  - context: `Name="h-[360px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label="Loading chart" />}> <EChartContainerLazy option={option} height=`
- [291:121] (JSXAttribute) Static aria-label attribute: `Loading chart`
  - context: `Name="h-[360px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label="Loading chart" />}> <TrendsChartLazy chartData={chartData} selecte`
- [297:121] (JSXAttribute) Static aria-label attribute: `Loading heatmap`
  - context: `Name="h-[420px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label="Loading heatmap" />}> <CorrelationHeatmapLazy correlationMatrix={a`
- [303:121] (JSXAttribute) Static aria-label attribute: `Loading patterns`
  - context: `Name="h-[360px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label="Loading patterns" />}> <PatternAnalysisViewLazy {...analysisData}`

### src/components/MockDataLoader.tsx

- [84:21] (MessageAPI) Message API call: success(): `Mock data loaded successfully!`
  - context: `ario}" with ${stats.entriesCount} tracking entries\`; toast.success('Mock data loaded successfully!', { description, });`
- [84:21] (MessageAPI) sonner toast.success(): `Mock data loaded successfully!`
  - context: `ario}" with ${stats.entriesCount} tracking entries\`; toast.success('Mock data loaded successfully!', { description, });`
- [97:19] (MessageAPI) Message API call: error(): `Failed to load mock data`
  - context: `{ clearInterval(progressIntervalRef.current); } toast.error('Failed to load mock data', { description: error instanceof Error ? erro`
- [97:19] (MessageAPI) sonner toast.error(): `Failed to load mock data`
  - context: `{ clearInterval(progressIntervalRef.current); } toast.error('Failed to load mock data', { description: error instanceof Error ? erro`
- [114:21] (MessageAPI) Message API call: success(): `Mock data cleared successfully!`
  - context: `() => { try { clearMockDataFromStorage(); toast.success('Mock data cleared successfully!'); // Dispatch a custom event to f`
- [114:21] (MessageAPI) sonner toast.success(): `Mock data cleared successfully!`
  - context: `() => { try { clearMockDataFromStorage(); toast.success('Mock data cleared successfully!'); // Dispatch a custom event to f`
- [120:19] (MessageAPI) Message API call: error(): `Failed to clear mock data`
  - context: `CustomEvent('mockDataLoaded')); } catch (error) { toast.error('Failed to clear mock data', { description: error instanceof Error ? err`
- [120:19] (MessageAPI) sonner toast.error(): `Failed to clear mock data`
  - context: `CustomEvent('mockDataLoaded')); } catch (error) { toast.error('Failed to clear mock data', { description: error instanceof Error ? err`
- [138:11] (JSXText) Static JSX text node: `Mock Data for Testing`
  - context: `enter gap-2"> <Database className="h-5 w-5 text-primary" /> Mock Data for Testing </CardTitle> </CardHeader> <CardConten`
- [143:11] (JSXText) Static JSX text node: `Load realistic test data to explore pattern analysis and correlation features.
          Mock data includes 3 students with 3-6 months of tracking data each.`
  - context: `="space-y-4"> <div className="text-sm text-muted-foreground"> Load realistic test data to explore pattern analysis and correlation features.`
- [150:48] (JSXText) Static JSX text node: `Students to be created:`
  - context: `<div className="space-y-2"> <div className="text-sm font-medium">Students to be created:</div> <div className="space-y-1">`
- [164:50] (JSXText) Static JSX text node: `Current Data:`
  - context: `uted/50 rounded-lg space-y-1"> <div className="text-sm font-medium">Current Data:</div> <div className="text-xs text-muted-foreground sp`
- [166:20] (JSXText) Static JSX text node: `•`
  - context: `<div className="text-xs text-muted-foreground space-y-1"> <div>• {currentStats.studentsCount} students</div> <div>• {currentStats`
- [166:51] (JSXText) Static JSX text node: `students`
  - context: `-muted-foreground space-y-1"> <div>• {currentStats.studentsCount} students</div> <div>• {currentStats.entriesCount} tracking entries`
- [167:20] (JSXText) Static JSX text node: `•`
  - context: `<div>• {currentStats.studentsCount} students</div> <div>• {currentStats.entriesCount} tracking entries</div> {hasMockData`
- [167:50] (JSXText) Static JSX text node: `tracking entries`
  - context: `.studentsCount} students</div> <div>• {currentStats.entriesCount} tracking entries</div> {hasMockData && <div className="text-orange`
- [168:64] (JSXText) Static JSX text node: `• Contains mock data`
  - context: `ng entries</div> {hasMockData && <div className="text-orange-600">• Contains mock data</div>} </div> </div> )}`
- [176:50] (JSXText) Static JSX text node: `Scenario`
  - context: `<div className="space-y-1"> <div className="text-sm font-medium">Scenario</div> <Select value={selectedScenario}`
- [182:42] (JSXAttribute) Static placeholder attribute: `Select scenario`
  - context: `<SelectTrigger className="w-full"> <SelectValue placeholder="Select scenario" /> </SelectTrigger> <SelectContent`
- [185:41] (JSXText) Static JSX text node: `All (Emma, Lars, Astrid)`
  - context: `tTrigger> <SelectContent> <SelectItem value="all">All (Emma, Lars, Astrid)</SelectItem> <SelectItem value="emma">E`
- [186:42] (JSXText) Static JSX text node: `Emma (mild anxiety, improving)`
  - context: `>All (Emma, Lars, Astrid)</SelectItem> <SelectItem value="emma">Emma (mild anxiety, improving)</SelectItem> <SelectItem value="l`
- [187:42] (JSXText) Static JSX text node: `Lars (sensory challenges)`
  - context: `(mild anxiety, improving)</SelectItem> <SelectItem value="lars">Lars (sensory challenges)</SelectItem> <SelectItem value="astrid`
- [188:44] (JSXText) Static JSX text node: `Astrid (steady improvement)`
  - context: `rs (sensory challenges)</SelectItem> <SelectItem value="astrid">Astrid (steady improvement)</SelectItem> </SelectContent>`
- [197:60] (JSXText) Static JSX text node: `Loading mock data...`
  - context: `assName="space-y-2"> <div className="text-sm text-muted-foreground">Loading mock data...</div> <Progress value={loadingProgress} classNa`
- [210:13] (JSXText) Static JSX text node: `Load Mock Data`
  - context: `Data} > <Database className="h-4 w-4 mr-2" /> Load Mock Data </Button> {hasMockData && ( <Ale`
- [222:19] (JSXText) Static JSX text node: `Clear All`
  - context: `> <Trash2 className="h-4 w-4 mr-2" /> Clear All </Button> </AlertDialogTrigger>`
- [227:37] (JSXText) Static JSX text node: `Clear All Data?`
  - context: `ontent> <AlertDialogHeader> <AlertDialogTitle>Clear All Data?</AlertDialogTitle> <AlertDialogDescription>`
- [229:21] (JSXText) Static JSX text node: `This will permanently delete all student data and tracking entries. 
                    This action cannot be undone.`
  - context: `lertDialogTitle> <AlertDialogDescription> This will permanently delete all student data and tracking entries.`
- [234:38] (JSXText) Static JSX text node: `Cancel`
  - context: `eader> <AlertDialogFooter> <AlertDialogCancel>Cancel</AlertDialogCancel> <AlertDialogAction onClick={handleC`
- [237:21] (JSXText) Static JSX text node: `Clear All Data`
  - context: `e"> <Trash2 className="h-4 w-4 mr-2" /> Clear All Data </AlertDialogAction> </AlertDia`
- [247:53] (JSXText) Static JSX text node: `Features you can test:`
  - context: `-3 border-t border-border"> <div className="text-sm font-medium mb-2">Features you can test:</div> <div className="text-xs text-muted-foregr`
- [249:18] (JSXText) Static JSX text node: `• Emotion pattern recognition`
  - context: `<div className="text-xs text-muted-foreground space-y-1"> <div>• Emotion pattern recognition</div> <div>• Sensory input correlation`
- [250:18] (JSXText) Static JSX text node: `• Sensory input correlations`
  - context: `ace-y-1"> <div>• Emotion pattern recognition</div> <div>• Sensory input correlations</div> <div>• Environmental factor analy`
- [251:18] (JSXText) Static JSX text node: `• Environmental factor analysis`
  - context: `tion</div> <div>• Sensory input correlations</div> <div>• Environmental factor analysis</div> <div>• Predictive insights & t`
- [252:18] (JSXText) Static JSX text node: `• Predictive insights & trends`
  - context: `s</div> <div>• Environmental factor analysis</div> <div>• Predictive insights & trends</div> <div>• Interactive data visuali`
- [253:18] (JSXText) Static JSX text node: `• Interactive data visualization`
  - context: `is</div> <div>• Predictive insights & trends</div> <div>• Interactive data visualization</div> <div>• Alert system & anomaly`
- [254:18] (JSXText) Static JSX text node: `• Alert system & anomaly detection`
  - context: `</div> <div>• Interactive data visualization</div> <div>• Alert system & anomaly detection</div> </div> </div> <`

### src/components/POCBadge.tsx

- [6:75] (JSXText) Static JSX text node: `POC Mode`
  - context: `urn ( <Badge variant="outline" className="uppercase tracking-wider text-xs">POC Mode</Badge> ); };`

### src/components/PaginatedSessionsList.tsx

- [60:14] (JSXText) Static JSX text node: `No sessions available in the selected period.`
  - context: `<CardContent className="py-16 text-center text-muted-foreground"> <p>No sessions available in the selected period.</p> </CardContent> <`
- [72:19] (JSXText) Static JSX text node: `Showing`
  - context: `Name="flex items-center gap-2 text-sm text-muted-foreground"> <span>Showing {startIndex}-{endIndex} of {totalItems}</span> <Select`
- [72:51] (JSXText) Static JSX text node: `of`
  - context: `xt-sm text-muted-foreground"> <span>Showing {startIndex}-{endIndex} of {totalItems}</span> <Select value={pageSize.toStrin`
- [93:13] (JSXText) Static JSX text node: `Loading sessions...`
  - context: `( <div className="text-center p-8 text-muted-foreground"> Loading sessions... </div> ) : ( <div> {`
- [103:62] (JSXText) Static JSX text node: `at`
  - context: `text-foreground"> {entry.timestamp.toLocaleDateString()} at {entry.timestamp.toLocaleTimeString()} </span>`
- [107:49] (JSXText) Static JSX text node: `emotions`
  - context: `="outline" className="text-xs"> {entry.emotions.length} emotions </Badge> <Badge variant="ou`
- [110:54] (JSXText) Static JSX text node: `sensory`
  - context: `line" className="text-xs"> {entry.sensoryInputs.length} sensory </Badge> {entry.environmenta`
- [114:27] (JSXText) Static JSX text node: `Environmental data`
  - context: `<Badge variant="outline" className="text-xs"> Environmental data </Badge> )}`
- [133:56] (JSXText) Static JSX text node: `more`
  - context: `ne" className="text-xs"> +{entry.emotions.length - 3} more </Badge> )}`
- [146:19] (JSXText) Static JSX text node: `Page`
  - context: `<div className="text-sm text-muted-foreground"> Page {currentPage} of {totalPages} </div>`
- [146:38] (JSXText) Static JSX text node: `of`
  - context: `className="text-sm text-muted-foreground"> Page {currentPage} of {totalPages} </div> <div cla`
- [153:32] (JSXAttribute) Static aria-label attribute: `First page`
  - context: `variant="ghost" size="icon" aria-label="First page" onClick={goToFirstPage} dis`
- [163:32] (JSXAttribute) Static aria-label attribute: `Previous page`
  - context: `variant="ghost" size="icon" aria-label="Previous page" onClick={goToPreviousPage}`
- [196:32] (JSXAttribute) Static aria-label attribute: `Next page`
  - context: `variant="ghost" size="icon" aria-label="Next page" onClick={goToNextPage} disab`
- [206:32] (JSXAttribute) Static aria-label attribute: `Last page`
  - context: `variant="ghost" size="icon" aria-label="Last page" onClick={goToLastPage} disab`

### src/components/PeriodComparison.tsx

- [178:17] (JSXText) Static JSX text node: `vs`
  - context: `-muted-foreground"> <span>{currentRange.label}</span> <span>vs</span> <span>{comparisonRange.label}</span> </div> </`
- [197:17] (JSXText) Static JSX text node: `vs`
  - context: `<div className="text-xs text-muted-foreground mt-1"> vs {metric.format ? metric.format(metric.previous) : metric.previous}`
- [209:62] (JSXText) Static JSX text node: `Emotion`
  - context: `er gap-2 text-sm"> <Badge variant="outline" className="text-xs">Emotion</Badge> <span className="text-muted-foreground">`
- [211:19] (JSXText) Static JSX text node: `Most common changed from`
  - context: `dge> <span className="text-muted-foreground"> Most common changed from <span className="font-medium">{comparisonStats.mostComm`
- [211:117] (JSXText) Static JSX text node: `to`
  - context: `d from <span className="font-medium">{comparisonStats.mostCommonEmotion}</span> to{" "} <span className="font-medium">{currentStats.mostCommon`
- [219:62] (JSXText) Static JSX text node: `Intensity`
  - context: `er gap-2 text-sm"> <Badge variant="outline" className="text-xs">Intensity</Badge> <span className="text-muted-foreground">`
- [221:19] (JSXText) Static JSX text node: `Average intensity`
  - context: `dge> <span className="text-muted-foreground"> Average intensity{" "} {currentStats.avgEmotionIntensity > com`
- [222:120] (JSXText) Static JSX text node: `by`
  - context: `ionIntensity > comparisonStats.avgEmotionIntensity ? "increased" : "decreased"} by{" "} <span className="font-medium"> {Ma`
- [224:115] (JSXText) Static JSX text node: `points`
  - context: `entStats.avgEmotionIntensity - comparisonStats.avgEmotionIntensity).toFixed(1)} points </span> </span> </div>`
- [232:62] (JSXText) Static JSX text node: `Sensory`
  - context: `er gap-2 text-sm"> <Badge variant="outline" className="text-xs">Sensory</Badge> <span className="text-muted-foreground">`
- [234:19] (JSXText) Static JSX text node: `Sensory seeking behavior`
  - context: `dge> <span className="text-muted-foreground"> Sensory seeking behavior{" "} {currentStats.seekingRatio > com`
- [235:106] (JSXText) Static JSX text node: `by`
  - context: `tStats.seekingRatio > comparisonStats.seekingRatio ? "increased" : "decreased"} by{" "} <span className="font-medium"> {Ma`

### src/components/ProgressDashboard.tsx

- [221:56] (JSXText) Static JSX text node: `Total Goals`
  - context: `between space-y-0 pb-2"> <CardTitle className="text-sm font-medium">Total Goals</CardTitle> <Crosshair className="h-4 w-4 text-muted-for`
- [229:45] (JSXText) Static JSX text node: `active,`
  - context: `me="text-xs text-muted-foreground"> {progressMetrics.activeGoals} active, {progressMetrics.achievedGoals} achieved </p> </Ca`
- [229:85] (JSXText) Static JSX text node: `achieved`
  - context: `{progressMetrics.activeGoals} active, {progressMetrics.achievedGoals} achieved </p> </CardContent> </Card> <Car`
- [236:56] (JSXText) Static JSX text node: `Overall Progress`
  - context: `between space-y-0 pb-2"> <CardTitle className="text-sm font-medium">Overall Progress</CardTitle> <TrendingUp className="h-4 w-4 text-mut`
- [249:56] (JSXText) Static JSX text node: `On Track`
  - context: `between space-y-0 pb-2"> <CardTitle className="text-sm font-medium">On Track</CardTitle> <CheckCircle className="h-4 w-4 text-green-500"`
- [257:15] (JSXText) Static JSX text node: `goals meeting expectations`
  - context: `</div> <p className="text-xs text-muted-foreground"> goals meeting expectations </p> </CardContent> </C`
- [264:56] (JSXText) Static JSX text node: `At Risk`
  - context: `between space-y-0 pb-2"> <CardTitle className="text-sm font-medium">At Risk</CardTitle> <Clock className="h-4 w-4 text-red-500" />`
- [272:15] (JSXText) Static JSX text node: `goals needing attention`
  - context: `</div> <p className="text-xs text-muted-foreground"> goals needing attention </p> </CardContent> </Card`
- [280:41] (JSXText) Static JSX text node: `Overview`
  - context: `st className="grid w-full grid-cols-4"> <TabsTrigger value="overview">Overview</TabsTrigger> <TabsTrigger value="trends">Trends</TabsTrigger`
- [281:39] (JSXText) Static JSX text node: `Trends`
  - context: `r value="overview">Overview</TabsTrigger> <TabsTrigger value="trends">Trends</TabsTrigger> <TabsTrigger value="categories">Categories</TabsT`
- [282:43] (JSXText) Static JSX text node: `Categories`
  - context: `r value="trends">Trends</TabsTrigger> <TabsTrigger value="categories">Categories</TabsTrigger> <TabsTrigger value="priorities">Priorities</T`
- [283:43] (JSXText) Static JSX text node: `Priorities`
  - context: `"categories">Categories</TabsTrigger> <TabsTrigger value="priorities">Priorities</TabsTrigger> </TabsList> <TabsContent value="overvi`
- [290:26] (JSXText) Static JSX text node: `Progress Trends (Last 3 Months)`
  - context: `t-card border-0 shadow-soft"> <CardHeader> <CardTitle>Progress Trends (Last 3 Months)</CardTitle> </CardHeader>`
- [294:33] (JSXAttribute) Static aria-label attribute: `Loading trends chart`
  - context: `rdContent> {isAnalyzingTrends ? ( <div aria-label="Loading trends chart" className="h-[300px] w-full"> <div clas`
- [322:135] (JSXAttribute) Static aria-label attribute: `Loading progress trends`
  - context: `Name="h-[300px] rounded-md border bg-card motion-safe:animate-pulse" aria-label="Loading progress trends" />}> <EChartContainer`
- [326:34] (JSXAttribute) Static aria-label attribute: `Progress trends line chart`
  - context: `={option} height={300} aria-label="Progress trends line chart" exportRegistration={{ id: 'pr`
- [338:26] (JSXText) Static JSX text node: `Recent Goal Updates`
  - context: `t-card border-0 shadow-soft"> <CardHeader> <CardTitle>Recent Goal Updates</CardTitle> </CardHeader> <CardConte`
- [357:29] (JSXText) Static JSX text node: `Updated`
  - context: `<p className="text-sm text-muted-foreground"> Updated {format(latestPoint.timestamp, 'MMM dd, yyyy')}`
- [376:26] (JSXText) Static JSX text node: `Goal Completion Trends`
  - context: `t-card border-0 shadow-soft"> <CardHeader> <CardTitle>Goal Completion Trends</CardTitle> </CardHeader> <CardCo`
- [401:137] (JSXAttribute) Static aria-label attribute: `Loading category chart`
  - context: `Name="h-[300px] rounded-md border bg-card motion-safe:animate-pulse" aria-label="Loading category chart" />}> <EChartContainer`
- [405:36] (JSXAttribute) Static aria-label attribute: `Goal completion by category bar chart`
  - context: `tion} height={300} aria-label="Goal completion by category bar chart" exportRegistrati`
- [419:28] (JSXText) Static JSX text node: `Progress by Category`
  - context: `rd border-0 shadow-soft"> <CardHeader> <CardTitle>Progress by Category</CardTitle> </CardHeader> <Card`
- [446:137] (JSXAttribute) Static aria-label attribute: `Loading donut chart`
  - context: `Name="h-[250px] rounded-md border bg-card motion-safe:animate-pulse" aria-label="Loading donut chart" />}> <EChartContainer`
- [450:36] (JSXAttribute) Static aria-label attribute: `Progress by category donut chart`
  - context: `tion} height={250} aria-label="Progress by category donut chart" exportRegistration={{`
- [461:28] (JSXText) Static JSX text node: `Category Breakdown`
  - context: `rd border-0 shadow-soft"> <CardHeader> <CardTitle>Category Breakdown</CardTitle> </CardHeader> <CardCo`
- [469:67] (JSXText) Static JSX text node: `goals`
  - context: `egory}</span> <Badge variant="outline">{category.count} goals</Badge> </div> <Progress value`
- [473:50] (JSXText) Static JSX text node: `% average progress`
  - context: `ext-xs text-muted-foreground"> <span>{category.progress}% average progress</span> <span>{category.achieved} achi`
- [474:51] (JSXText) Static JSX text node: `achieved`
  - context: `ess}% average progress</span> <span>{category.achieved} achieved</span> </div> </div>`
- [487:26] (JSXText) Static JSX text node: `Priority Goals Requiring Attention`
  - context: `t-card border-0 shadow-soft"> <CardHeader> <CardTitle>Priority Goals Requiring Attention</CardTitle> </CardHeader>`
- [506:31] (JSXText) Static JSX text node: `Progress`
  - context: `<div className="flex justify-between text-sm"> <span>Progress</span> <span>{Math.round(goal.currentProgress)}`
- [513:25] (JSXText) Static JSX text node: `⚠️ This goal is past its target date and may need review or extension.`
  - context: `uctive/20 rounded text-sm text-destructive-foreground"> ⚠️ This goal is past its target date and may need review or extension.`
- [518:25] (JSXText) Static JSX text node: `📈 Consider increasing intervention intensity to meet target date.`
  - context: `er-warning/20 rounded text-sm text-warning-foreground"> 📈 Consider increasing intervention intensity to meet target date.`
- [526:80] (JSXText) Static JSX text node: `All goals are on track!`
  - context: `<p className="text-lg font-medium text-success-foreground">All goals are on track!</p> <p className="text-muted-foregro`
- [527:58] (JSXText) Static JSX text node: `Great work keeping`
  - context: `oals are on track!</p> <p className="text-muted-foreground">Great work keeping {student.name}'s progress moving forward.</p>`
- [527:91] (JSXText) Static JSX text node: `'s progress moving forward.`
  - context: `<p className="text-muted-foreground">Great work keeping {student.name}'s progress moving forward.</p> </div> )}`

### src/components/QuickEntryTemplates.tsx

- [167:20] (MessageAPI) Message API call: error(): `Failed to parse saved templates, using defaults`
  - context: `catch (error) { // Log error and fall back to defaults logger.error('Failed to parse saved templates, using defaults', error); return defaultT`
- [201:20] (MessageAPI) Message API call: error(): `Failed to save templates to localStorage`
  - context: `or) { // Handle quota exceeded or other storage errors logger.error('Failed to save templates to localStorage', error); toast.error('Failed to`
- [202:19] (MessageAPI) Message API call: error(): `Failed to save template changes. Storage may be full.`
  - context: `ger.error('Failed to save templates to localStorage', error); toast.error('Failed to save template changes. Storage may be full.'); } }; const ap`
- [202:19] (MessageAPI) sonner toast.error(): `Failed to save template changes. Storage may be full.`
  - context: `ger.error('Failed to save templates to localStorage', error); toast.error('Failed to save template changes. Storage may be full.'); } }; const ap`
- [237:19] (MessageAPI) Message API call: error(): `Cannot delete default templates`
  - context: `ind(t => t.id === templateId); if (template?.isDefault) { toast.error("Cannot delete default templates"); return; } const updatedTe`
- [237:19] (MessageAPI) sonner toast.error(): `Cannot delete default templates`
  - context: `ind(t => t.id === templateId); if (template?.isDefault) { toast.error("Cannot delete default templates"); return; } const updatedTe`
- [243:19] (MessageAPI) Message API call: success(): `Template deleted`
  - context: `=> t.id !== templateId); saveTemplates(updatedTemplates); toast.success("Template deleted"); }; const createTemplate = () => { if (!newTemplate`
- [243:19] (MessageAPI) sonner toast.success(): `Template deleted`
  - context: `=> t.id !== templateId); saveTemplates(updatedTemplates); toast.success("Template deleted"); }; const createTemplate = () => { if (!newTemplate`
- [248:19] (MessageAPI) Message API call: error(): `Template name is required`
  - context: `createTemplate = () => { if (!newTemplate.name?.trim()) { toast.error("Template name is required"); return; } const template: QuickTemp`
- [248:19] (MessageAPI) sonner toast.error(): `Template name is required`
  - context: `createTemplate = () => { if (!newTemplate.name?.trim()) { toast.error("Template name is required"); return; } const template: QuickTemp`
- [275:19] (MessageAPI) Message API call: success(): `Template created successfully`
  - context: `false, usageCount: 0 }); setIsCreating(false); toast.success("Template created successfully"); }; const getCategoryColor = (category: st`
- [275:19] (MessageAPI) sonner toast.success(): `Template created successfully`
  - context: `false, usageCount: 0 }); setIsCreating(false); toast.success("Template created successfully"); }; const getCategoryColor = (category: st`
- [303:13] (JSXText) Static JSX text node: `Quick Entry Templates`
  - context: `center gap-2"> <Zap className="h-5 w-5 text-primary" /> Quick Entry Templates </CardTitle> <Dialog open={isCreating}`
- [307:62] (JSXAttribute) Static aria-label attribute: `Create new template`
  - context: `ogTrigger asChild> <Button size="sm" variant="outline" aria-label="Create new template" title="Create new template"> <Plus classNa`
- [307:90] (JSXAttribute) Static title attribute: `Create new template`
  - context: `<Button size="sm" variant="outline" aria-label="Create new template" title="Create new template"> <Plus className="h-4 w-4 mr-2" />`
- [309:52] (JSXText) Static JSX text node: `New Template`
  - context: `className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">New Template</span> </Button> </DialogTrigger>`
- [314:30] (JSXText) Static JSX text node: `Create Quick Entry Template`
  - context: `className="max-w-md"> <DialogHeader> <DialogTitle>Create Quick Entry Template</DialogTitle> <DialogDescription>`
- [316:19] (JSXText) Static JSX text node: `Define a name, optional description, category, and default values.`
  - context: `ry Template</DialogTitle> <DialogDescription> Define a name, optional description, category, and default values.`
- [321:83] (JSXText) Static JSX text node: `Template Name`
  - context: `<label className="text-sm font-medium" htmlFor={templateNameId}>Template Name</label> <Input id={templateN`
- [324:33] (JSXAttribute) Static placeholder attribute: `e.g., Sensory Overload Response`
  - context: `<Input id={templateNameId} placeholder="e.g., Sensory Overload Response" value={newTemplate.name ||`
- [330:90] (JSXText) Static JSX text node: `Description`
  - context: `<label className="text-sm font-medium" htmlFor={templateDescriptionId}>Description</label> <Textarea id={template`
- [333:33] (JSXAttribute) Static placeholder attribute: `Brief description of when to use this template`
  - context: `id={templateDescriptionId} placeholder="Brief description of when to use this template" value={newT`
- [344:21] (JSXText) Static JSX text node: `Category`
  - context: `htmlFor={templateCategoryTriggerId} > Category </label> <Select`
- [357:51] (JSXText) Static JSX text node: `Morning`
  - context: `<SelectContent> <SelectItem value="morning">Morning</SelectItem> <SelectItem value="transition">Transi`
- [358:54] (JSXText) Static JSX text node: `Transition`
  - context: `ning">Morning</SelectItem> <SelectItem value="transition">Transition</SelectItem> <SelectItem value="learning">Learn`
- [359:52] (JSXText) Static JSX text node: `Learning`
  - context: `ion">Transition</SelectItem> <SelectItem value="learning">Learning</SelectItem> <SelectItem value="break">Break</Sel`
- [360:49] (JSXText) Static JSX text node: `Break`
  - context: `learning">Learning</SelectItem> <SelectItem value="break">Break</SelectItem> <SelectItem value="afternoon">Afternoon`
- [361:53] (JSXText) Static JSX text node: `Afternoon`
  - context: `="break">Break</SelectItem> <SelectItem value="afternoon">Afternoon</SelectItem> <SelectItem value="custom">Custom</`
- [362:50] (JSXText) Static JSX text node: `Custom`
  - context: `ernoon">Afternoon</SelectItem> <SelectItem value="custom">Custom</SelectItem> </SelectContent> </Sel`
- [368:21] (JSXText) Static JSX text node: `Cancel`
  - context: `ton variant="outline" onClick={() => setIsCreating(false)}> Cancel </Button> <Button onClick={createTemp`
- [371:21] (JSXText) Static JSX text node: `Create Template`
  - context: `Button> <Button onClick={createTemplate}> Create Template </Button> </div>`
- [418:59] (JSXText) Static JSX text node: `more`
  - context: `className="text-xs"> +{template.emotions.length - 2} more </Badge> )}`
- [430:23] (JSXText) Static JSX text node: `Apply Template`
  - context: `className="flex-1 mr-2" > Apply Template </Button>`
- [438:38] (JSXAttribute) Static aria-label attribute: `Edit template`
  - context: `variant="ghost" aria-label="Edit template" title="Edit template"`
- [439:33] (JSXAttribute) Static title attribute: `Edit template`
  - context: `aria-label="Edit template" title="Edit template" onClick={() => setEditingTemplate(temp`
- [447:38] (JSXAttribute) Static aria-label attribute: `Delete template`
  - context: `variant="ghost" aria-label="Delete template" title="Delete template"`
- [448:33] (JSXAttribute) Static title attribute: `Delete template`
  - context: `aria-label="Delete template" title="Delete template" onClick={() => deleteTemplate(templa`
- [465:16] (JSXText) Static JSX text node: `No quick entry templates yet`
  - context: `<Zap className="h-12 w-12 mx-auto mb-3 opacity-50" /> <p>No quick entry templates yet</p> <p className="text-sm">Create templ`
- [466:36] (JSXText) Static JSX text node: `Create templates for common tracking scenarios`
  - context: `<p>No quick entry templates yet</p> <p className="text-sm">Create templates for common tracking scenarios</p> </div> )}`

### src/components/ReportBuilder.tsx

- [474:15] (JSXText) Static JSX text node: `Create Report`
  - context: `nt-dyslexia"> <FileText className="h-4 w-4 mr-2" /> Create Report </Button> </DialogTrigger> <Dialog`

### src/components/SensoryTracker.tsx

- [185:26] (JSXAttribute) Static aria-label attribute: `Manual intensity input`
  - context: `className="w-16 px-2 py-1 mt-2 rounded border" aria-label="Manual intensity input" /> </div> )} {/*`
- [193:70] (JSXText) Static JSX text node: `Body Location (Optional)`
  - context: `<div> <h3 className="text-sm font-medium text-foreground mb-3">Body Location (Optional)</h3> <div className="flex flex-wrap gap-2">`
- [222:70] (JSXText) Static JSX text node: `Coping Strategies Used`
  - context: `<div> <h3 className="text-sm font-medium text-foreground mb-3">Coping Strategies Used</h3> <div className="flex gap-2 mb-2">`
- [229:29] (JSXAttribute) Static placeholder attribute: `Add a coping strategy...`
  - context: `=> e.key === 'Enter' && handleAddCopingStrategy()} placeholder="Add a coping strategy..." aria-label="Legg til mestringsstrateg`
- [230:28] (JSXAttribute) Static aria-label attribute: `Legg til mestringsstrategi`
  - context: `placeholder="Add a coping strategy..." aria-label="Legg til mestringsstrategi" className="flex-1 px-3 py-2 border`
- [261:30] (JSXText) Static JSX text node: `×`
  - context: `eRemoveCopingStrategy(strategy)} > {strategy} × </Badge> ))} </div> </div>`
- [270:68] (JSXText) Static JSX text node: `Miljø (Valgfritt)`
  - context: `<div> <h3 className="text-sm font-medium text-foreground mb-3">Miljø (Valgfritt)</h3> <input type="text" valu`
- [275:25] (JSXAttribute) Static placeholder attribute: `f.eks. Klasserom, Lekeplass, Bibliotek...`
  - context: `onChange={(e) => setEnvironment(e.target.value)} placeholder="f.eks. Klasserom, Lekeplass, Bibliotek..." aria-label="Beskriv milj`
- [276:24] (JSXAttribute) Static aria-label attribute: `Beskriv miljøet`
  - context: `placeholder="f.eks. Klasserom, Lekeplass, Bibliotek..." aria-label="Beskriv miljøet" className="w-full px-3 py-2 border border-border r`
- [287:25] (JSXAttribute) Static placeholder attribute: `Ytterligere observasjoner om den sensoriske responsen...`
  - context: `onChange={(e) => setNotes(e.target.value)} placeholder="Ytterligere observasjoner om den sensoriske responsen..." className`

### src/components/StorageManager.tsx

- [34:21] (MessageAPI) Message API call: success(): `Old data cleared successfully`
  - context: `=> { try { storageUtils.clearOldTrackingData(30); toast.success('Old data cleared successfully'); refreshStats(); } catch (error) {`
- [34:21] (MessageAPI) sonner toast.success(): `Old data cleared successfully`
  - context: `=> { try { storageUtils.clearOldTrackingData(30); toast.success('Old data cleared successfully'); refreshStats(); } catch (error) {`
- [37:20] (MessageAPI) Message API call: error(): `Failed to clear old tracking data`
  - context: `successfully'); refreshStats(); } catch (error) { logger.error('Failed to clear old tracking data', error); toast.error('Failed to clear`
- [38:19] (MessageAPI) Message API call: error(): `Failed to clear old data`
  - context: `logger.error('Failed to clear old tracking data', error); toast.error('Failed to clear old data'); } }; const handleClearNonEssential = () =>`
- [38:19] (MessageAPI) sonner toast.error(): `Failed to clear old data`
  - context: `logger.error('Failed to clear old tracking data', error); toast.error('Failed to clear old data'); } }; const handleClearNonEssential = () =>`
- [45:21] (MessageAPI) Message API call: success(): `Non-essential data cleared`
  - context: `=> { try { storageUtils.clearNonEssentialData(); toast.success('Non-essential data cleared'); refreshStats(); } catch (error) {`
- [45:21] (MessageAPI) sonner toast.success(): `Non-essential data cleared`
  - context: `=> { try { storageUtils.clearNonEssentialData(); toast.success('Non-essential data cleared'); refreshStats(); } catch (error) {`
- [48:20] (MessageAPI) Message API call: error(): `Failed to clear non-essential data`
  - context: `data cleared'); refreshStats(); } catch (error) { logger.error('Failed to clear non-essential data', error); toast.error('Failed to clear`
- [49:19] (MessageAPI) Message API call: error(): `Failed to clear non-essential data`
  - context: `logger.error('Failed to clear non-essential data', error); toast.error('Failed to clear non-essential data'); } }; /** * Handle clearing al`
- [49:19] (MessageAPI) sonner toast.error(): `Failed to clear non-essential data`
  - context: `logger.error('Failed to clear non-essential data', error); toast.error('Failed to clear non-essential data'); } }; /** * Handle clearing al`
- [61:40] (MessageAPI) Message API call: confirm(): `Are you sure you want to clear ALL data? This cannot be undone!`
  - context: `using a custom modal component try { const confirmed = window.confirm('Are you sure you want to clear ALL data? This cannot be undone!'); if (co`
- [65:25] (MessageAPI) Message API call: success(): `All data cleared`
  - context: `) { try { dataStorage.clearAllData(); toast.success('All data cleared'); // Use window.location.replace for better history`
- [65:25] (MessageAPI) sonner toast.success(): `All data cleared`
  - context: `) { try { dataStorage.clearAllData(); toast.success('All data cleared'); // Use window.location.replace for better history`
- [69:24] (MessageAPI) Message API call: error(): `Failed to clear all data`
  - context: `window.location.replace('/'); } catch (error) { logger.error('Failed to clear all data', error); toast.error('Failed to clear all d`
- [70:23] (MessageAPI) Message API call: error(): `Failed to clear all data`
  - context: `logger.error('Failed to clear all data', error); toast.error('Failed to clear all data'); } } } catch (error) { // Ha`
- [70:23] (MessageAPI) sonner toast.error(): `Failed to clear all data`
  - context: `logger.error('Failed to clear all data', error); toast.error('Failed to clear all data'); } } } catch (error) { // Ha`
- [75:20] (MessageAPI) Message API call: error(): `Confirmation dialog failed`
  - context: `s where confirm might fail (e.g., in some test environments) logger.error('Confirmation dialog failed', error); toast.error('Could not show confirma`
- [76:19] (MessageAPI) Message API call: error(): `Could not show confirmation dialog`
  - context: `nts) logger.error('Confirmation dialog failed', error); toast.error('Could not show confirmation dialog'); } }; const formatBytes = (bytes:`
- [76:19] (MessageAPI) sonner toast.error(): `Could not show confirmation dialog`
  - context: `nts) logger.error('Confirmation dialog failed', error); toast.error('Could not show confirmation dialog'); } }; const formatBytes = (bytes:`
- [95:11] (JSXText) Static JSX text node: `Storage Management`
  - context: `"flex items-center gap-2"> <Database className="h-5 w-5" /> Storage Management </CardTitle> <CardDescription> Mana`
- [98:11] (JSXText) Static JSX text node: `Manage your local storage to ensure smooth operation`
  - context: `Storage Management </CardTitle> <CardDescription> Manage your local storage to ensure smooth operation </CardDescription>`
- [104:44] (JSXText) Static JSX text node: `Storage Usage`
  - context: `{/* Storage Usage */} <div> <h3 className="font-medium mb-2">Storage Usage</h3> <div className="space-y-2"> <div classN`
- [107:21] (JSXText) Static JSX text node: `Used`
  - context: `<div className="flex justify-between text-sm"> <span>Used</span> <span>{formatBytes(storageInfo.used)} / ~5 MB</span>`
- [108:53] (JSXText) Static JSX text node: `/ ~5 MB`
  - context: `<span>Used</span> <span>{formatBytes(storageInfo.used)} / ~5 MB</span> </div> <div className="w-full">`
- [121:44] (JSXText) Static JSX text node: `Data Statistics`
  - context: `{/* Storage Stats */} <div> <h3 className="font-medium mb-2">Data Statistics</h3> <div className="grid grid-cols-2 gap-2 text-sm">`
- [123:18] (JSXText) Static JSX text node: `Students:`
  - context: `h3> <div className="grid grid-cols-2 gap-2 text-sm"> <div>Students: {stats.studentsCount}</div> <div>Entries: {stats.entriesCo`
- [124:18] (JSXText) Static JSX text node: `Entries:`
  - context: `xt-sm"> <div>Students: {stats.studentsCount}</div> <div>Entries: {stats.entriesCount}</div> <div>Goals: {stats.goalsCount}</`
- [125:18] (JSXText) Static JSX text node: `Goals:`
  - context: `nt}</div> <div>Entries: {stats.entriesCount}</div> <div>Goals: {stats.goalsCount}</div> <div>Alerts: {stats.alertsCount}</di`
- [126:18] (JSXText) Static JSX text node: `Alerts:`
  - context: `sCount}</div> <div>Goals: {stats.goalsCount}</div> <div>Alerts: {stats.alertsCount}</div> </div> </div> {/* W`
- [152:13] (JSXText) Static JSX text node: `Clear data older than 30 days`
  - context: `-start" > <Trash2 className="h-4 w-4 mr-2" /> Clear data older than 30 days </Button> <Button`
- [160:13] (JSXText) Static JSX text node: `Clear non-essential data`
  - context: `-start" > <Trash2 className="h-4 w-4 mr-2" /> Clear non-essential data </Button> <Button varia`
- [168:13] (JSXText) Static JSX text node: `Clear ALL data (irreversible)`
  - context: `-start" > <Trash2 className="h-4 w-4 mr-2" /> Clear ALL data (irreversible) </Button> </div> {stora`
- [176:15] (JSXText) Static JSX text node: `Storage is healthy with sufficient space available.`
  - context: `CheckCircle className="h-4 w-4" /> <AlertDescription> Storage is healthy with sufficient space available. </AlertDescripti`

### src/components/StudentProfileSidebar.tsx

- [110:13] (JSXText) Static JSX text node: `Hovedseksjoner`
  - context: `foreground text-xs font-medium uppercase tracking-wider px-3 py-2"> Hovedseksjoner </SidebarGroupLabel> <SidebarGroupContent>`
- [145:13] (JSXText) Static JSX text node: `Verktøy`
  - context: `foreground text-xs font-medium uppercase tracking-wider px-3 py-2"> Verktøy </SidebarGroupLabel> <SidebarGroupContent>`

### src/components/TestingDebugPanel.tsx

- [202:21] (MessageAPI) Message API call: success(): `System tests completed successfully`
  - context: `ilable" }; setTestResults([...results]); toast.success("System tests completed successfully"); } catch (error) { logge`
- [202:21] (MessageAPI) sonner toast.success(): `System tests completed successfully`
  - context: `ilable" }; setTestResults([...results]); toast.success("System tests completed successfully"); } catch (error) { logge`
- [205:20] (MessageAPI) Message API call: error(): `System test error`
  - context: `tests completed successfully"); } catch (error) { logger.error('System test error', { error }); results.push({ name: "Test Error"`
- [212:19] (MessageAPI) Message API call: error(): `Some tests failed`
  - context: `nknown error'}\` }); setTestResults([...results]); toast.error("Some tests failed"); } finally { setIsRunningTests(false); } };`
- [212:19] (MessageAPI) sonner toast.error(): `Some tests failed`
  - context: `nknown error'}\` }); setTestResults([...results]); toast.error("Some tests failed"); } finally { setIsRunningTests(false); } };`
- [241:19] (MessageAPI) Message API call: success(): `Analytics cache cleared successfully`
  - context: `) => { analyticsWorker.clearCache(); uiCache.clear(); toast.success("Analytics cache cleared successfully"); }, [analyticsWorker, uiCache]); co`
- [241:19] (MessageAPI) sonner toast.success(): `Analytics cache cleared successfully`
  - context: `) => { analyticsWorker.clearCache(); uiCache.clear(); toast.success("Analytics cache cleared successfully"); }, [analyticsWorker, uiCache]); co`
- [256:13] (JSXText) Static JSX text node: `System Testing & Debug Panel`
  - context: `="flex items-center gap-2"> <Bug className="h-5 w-5" /> System Testing & Debug Panel </CardTitle> </CardHeader>`
- [262:15] (JSXText) Static JSX text node: `Test current system functionality and data integrity`
  - context: `tween"> <p className="text-sm text-muted-foreground"> Test current system functionality and data integrity </p>`
- [269:26] (JSXAttribute) Static aria-label attribute: `Run system tests`
  - context: `size="sm" variant="outline" aria-label="Run system tests" title="Run system tests" >`
- [270:21] (JSXAttribute) Static title attribute: `Run system tests`
  - context: `riant="outline" aria-label="Run system tests" title="Run system tests" > {isRunningTests ? (`
- [275:54] (JSXText) Static JSX text node: `Running Tests...`
  - context: `w-4 mr-2 animate-spin" /> <span className="hidden sm:inline">Running Tests...</span> </> ) : (`
- [280:54] (JSXText) Static JSX text node: `Run System Tests`
  - context: `lassName="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Run System Tests</span> </> )} </Butto`
- [288:51] (JSXText) Static JSX text node: `Test Results:`
  - context: `<div className="space-y-3"> <h4 className="text-sm font-medium">Test Results:</h4> {testResults.map((result) => (`
- [307:54] (JSXText) Static JSX text node: `Quick Stats:`
  - context: `4 border-t border-border"> <h4 className="text-sm font-medium mb-2">Quick Stats:</h4> <div className="grid grid-cols-3 gap-3 text-center`
- [311:62] (JSXText) Static JSX text node: `Students`
  - context: `ted-foreground" /> <p className="text-xs text-muted-foreground">Students</p> </div> <div> <Database`
- [315:62] (JSXText) Static JSX text node: `Entries`
  - context: `ted-foreground" /> <p className="text-xs text-muted-foreground">Entries</p> </div> <div> <BarChart3`
- [319:62] (JSXText) Static JSX text node: `Analytics`
  - context: `ted-foreground" /> <p className="text-xs text-muted-foreground">Analytics</p> </div> </div> </div> <`
- [331:13] (JSXText) Static JSX text node: `Analytics Cache Management`
  - context: `ex items-center gap-2"> <Archive className="h-5 w-5" /> Analytics Cache Management </CardTitle> </CardHeader>`
- [340:57] (JSXText) Static JSX text node: `Cache Hit Rate`
  - context: `enter justify-between"> <span className="text-sm font-medium">Cache Hit Rate</span> <div className="flex items-center gap-2"`
- [349:69] (JSXText) Static JSX text node: `Cache Size`
  - context: `flex-col"> <span className="text-xs text-muted-foreground">Cache Size</span> <span className="text-lg font-semibold">{c`
- [353:69] (JSXText) Static JSX text node: `Memory Usage`
  - context: `flex-col"> <span className="text-xs text-muted-foreground">Memory Usage</span> <span className="text-lg font-semibold">`
- [364:66] (JSXText) Static JSX text node: `Hits`
  - context: `tats.hits}</p> <p className="text-xs text-muted-foreground">Hits</p> </div> <div className="text-center`
- [369:66] (JSXText) Static JSX text node: `Misses`
  - context: `ts.misses}</p> <p className="text-xs text-muted-foreground">Misses</p> </div> <div className="text-cente`
- [374:66] (JSXText) Static JSX text node: `Sets`
  - context: `tats.sets}</p> <p className="text-xs text-muted-foreground">Sets</p> </div> </div> </div>`
- [381:53] (JSXText) Static JSX text node: `Cache Actions`
  - context: `t border-border space-y-3"> <h4 className="text-sm font-medium">Cache Actions</h4> <div className="flex gap-2">`
- [388:30] (JSXAttribute) Static aria-label attribute: `Clear all analytics cache`
  - context: `leClearCache} className="flex-1" aria-label="Clear all analytics cache" title="Clear all analytics cache"`
- [389:25] (JSXAttribute) Static title attribute: `Clear all analytics cache`
  - context: `aria-label="Clear all analytics cache" title="Clear all analytics cache" > <Trash2 classNam`
- [392:54] (JSXText) Static JSX text node: `Clear All Cache`
  - context: `lassName="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Clear All Cache</span> </Button> <Button`
- [399:30] (JSXAttribute) Static aria-label attribute: `Clean expired cache entries`
  - context: `he.cleanup()} className="flex-1" aria-label="Clean expired cache entries" title="Clean expired cache entri`
- [400:25] (JSXAttribute) Static title attribute: `Clean expired cache entries`
  - context: `aria-label="Clean expired cache entries" title="Clean expired cache entries" > <RefreshCw cla`
- [403:54] (JSXText) Static JSX text node: `Clean Expired`
  - context: `lassName="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Clean Expired</span> </Button> </div>`
- [408:22] (JSXText) Static JSX text node: `• Cache TTL: 5 minutes`
  - context: `<div className="text-xs text-muted-foreground"> <p>• Cache TTL: 5 minutes</p> <p>• Eviction: LRU (Least Recently`
- [409:22] (JSXText) Static JSX text node: `• Eviction: LRU (Least Recently Used)`
  - context: `reground"> <p>• Cache TTL: 5 minutes</p> <p>• Eviction: LRU (Least Recently Used)</p> <p>• Invalidations:`
- [410:22] (JSXText) Static JSX text node: `• Invalidations:`
  - context: `<p>• Eviction: LRU (Least Recently Used)</p> <p>• Invalidations: {cacheStats.invalidations || 0}</p> </div>`

### src/components/TestingToolsSection.tsx

- [20:44] (JSXText) Static JSX text node: `Testing & Development Tools`
  - context: `v className="space-y-6"> <div> <h2 className="text-2xl font-bold">Testing & Development Tools</h2> <p className="text-muted-foreground">`
- [22:11] (JSXText) Static JSX text node: `Tools for testing pattern analysis features and debugging data issues`
  - context: `Development Tools</h2> <p className="text-muted-foreground"> Tools for testing pattern analysis features and debugging data issues </`
- [32:15] (JSXText) Static JSX text node: `Mock Data Generator`
  - context: `p-2"> <Database className="h-5 w-5 text-primary" /> Mock Data Generator </CardTitle> </CardHeader> <`
- [37:15] (JSXText) Static JSX text node: `Load realistic test data to explore pattern analysis features`
  - context: `t> <p className="text-sm text-muted-foreground mb-4"> Load realistic test data to explore pattern analysis features </p>`
- [43:19] (JSXText) Static JSX text node: `Load Mock Data`
  - context: `-90"> <Database className="h-4 w-4 mr-2" /> Load Mock Data </Button> </DialogTrigger>`
- [48:32] (JSXText) Static JSX text node: `Mock Data for Testing & Analysis`
  - context: `overflow-y-auto"> <DialogHeader> <DialogTitle>Mock Data for Testing & Analysis</DialogTitle> <DialogDescript`
- [50:21] (JSXText) Static JSX text node: `Load realistic sample students and entries to explore features safely.`
  - context: `nalysis</DialogTitle> <DialogDescription> Load realistic sample students and entries to explore features safely.`
- [64:15] (JSXText) Static JSX text node: `Debug Panel`
  - context: `er gap-2"> <Bug className="h-5 w-5 text-primary" /> Debug Panel </CardTitle> </CardHeader> <CardCont`
- [69:15] (JSXText) Static JSX text node: `Advanced debugging and data inspection tools`
  - context: `t> <p className="text-sm text-muted-foreground mb-4"> Advanced debugging and data inspection tools </p> <Dialo`
- [75:19] (JSXText) Static JSX text node: `Open Debug Panel`
  - context: `="w-full"> <Bug className="h-4 w-4 mr-2" /> Open Debug Panel </Button> </DialogTrigger>`
- [80:32] (JSXText) Static JSX text node: `Debug & Data Inspection`
  - context: `overflow-y-auto"> <DialogHeader> <DialogTitle>Debug & Data Inspection</DialogTitle> <DialogDescription>`
- [82:21] (JSXText) Static JSX text node: `Advanced debugging tools for inspecting state, storage, and analytics.`
  - context: `pection</DialogTitle> <DialogDescription> Advanced debugging tools for inspecting state, storage, and analytics.`
- [96:15] (JSXText) Static JSX text node: `Pattern Analysis Testing Guide`
  - context: `gap-2"> <Beaker className="h-5 w-5 text-primary" /> Pattern Analysis Testing Guide </CardTitle> </CardHeader>`
- [102:17] (JSXText) Static JSX text node: `To test pattern analysis features effectively:`
  - context: `4"> <p className="text-sm text-muted-foreground"> To test pattern analysis features effectively: </p>`
- [106:60] (JSXText) Static JSX text node: `Data Requirements:`
  - context: `<div> <h4 className="font-medium text-sm mb-2">Data Requirements:</h4> <ul className="text-xs text-muted-fore`
- [108:25] (JSXText) Static JSX text node: `• At least 10 tracking entries for basic patterns`
  - context: `ul className="text-xs text-muted-foreground space-y-1"> <li>• At least 10 tracking entries for basic patterns</li> <li>•`
- [109:25] (JSXText) Static JSX text node: `• 30+ entries for correlation analysis`
  - context: `>• At least 10 tracking entries for basic patterns</li> <li>• 30+ entries for correlation analysis</li> <li>• 90+ entrie`
- [110:25] (JSXText) Static JSX text node: `• 90+ entries for predictive insights`
  - context: `<li>• 30+ entries for correlation analysis</li> <li>• 90+ entries for predictive insights</li> <li>• Multiple st`
- [111:25] (JSXText) Static JSX text node: `• Multiple students for comparative analysis`
  - context: `<li>• 90+ entries for predictive insights</li> <li>• Multiple students for comparative analysis</li> </ul>`
- [115:60] (JSXText) Static JSX text node: `Features to Test:`
  - context: `<div> <h4 className="font-medium text-sm mb-2">Features to Test:</h4> <ul className="text-xs text-muted-foreg`
- [117:25] (JSXText) Static JSX text node: `• Emotion trend analysis`
  - context: `ul className="text-xs text-muted-foreground space-y-1"> <li>• Emotion trend analysis</li> <li>• Sensory correlation matr`
- [118:25] (JSXText) Static JSX text node: `• Sensory correlation matrices`
  - context: `> <li>• Emotion trend analysis</li> <li>• Sensory correlation matrices</li> <li>• Environmental impa`
- [119:25] (JSXText) Static JSX text node: `• Environmental impact patterns`
  - context: `<li>• Sensory correlation matrices</li> <li>• Environmental impact patterns</li> <li>• Anomaly detection`
- [120:25] (JSXText) Static JSX text node: `• Anomaly detection alerts`
  - context: `<li>• Environmental impact patterns</li> <li>• Anomaly detection alerts</li> </ul> </div>`

### src/components/TimelineVisualization.tsx

- [536:13] (JSXText) Static JSX text node: `Timeline Visualization`
  - context: `flex items-center gap-2"> <Clock className="h-5 w-5" /> Timeline Visualization </CardTitle> <div className="flex ite`
- [541:17] (JSXText) Static JSX text node: `Live`
  - context: `<Badge variant="default" className="animate-pulse"> Live </Badge> )} <Button siz`
- [547:26] (JSXAttribute) Static aria-label attribute: `Reset view`
  - context: `size="icon" variant="ghost" aria-label="Reset view" title="Reset view" onClick={() => {`
- [548:21] (JSXAttribute) Static title attribute: `Reset view`
  - context: `variant="ghost" aria-label="Reset view" title="Reset view" onClick={() => { setZoomLevel(1);`
- [569:28] (JSXAttribute) Static aria-label attribute: `Zoom out`
  - context: `size="icon" variant="ghost" aria-label="Zoom out" title="Zoom out" onClick={() => handl`
- [570:23] (JSXAttribute) Static title attribute: `Zoom out`
  - context: `variant="ghost" aria-label="Zoom out" title="Zoom out" onClick={() => handleZoom(-0.5)} disa`
- [582:28] (JSXAttribute) Static aria-label attribute: `Zoom in`
  - context: `size="icon" variant="ghost" aria-label="Zoom in" title="Zoom in" onClick={() => handleZ`
- [583:23] (JSXAttribute) Static title attribute: `Zoom in`
  - context: `variant="ghost" aria-label="Zoom in" title="Zoom in" onClick={() => handleZoom(0.5)} disabl`
- [596:28] (JSXAttribute) Static aria-label attribute: `Pan left`
  - context: `size="icon" variant="ghost" aria-label="Pan left" title="Pan left" onClick={() => handl`
- [597:23] (JSXAttribute) Static title attribute: `Pan left`
  - context: `variant="ghost" aria-label="Pan left" title="Pan left" onClick={() => handlePan(50)} >`
- [605:28] (JSXAttribute) Static aria-label attribute: `Pan right`
  - context: `size="icon" variant="ghost" aria-label="Pan right" title="Pan right" onClick={() => han`
- [606:23] (JSXAttribute) Static title attribute: `Pan right`
  - context: `variant="ghost" aria-label="Pan right" title="Pan right" onClick={() => handlePan(-50)} >`
- [633:32] (JSXText) Static JSX text node: `x`
  - context: `<span className="text-sm text-muted-foreground"> {playbackSpeed}x </span> </div> {/* Stream visibility to`
- [647:17] (JSXText) Static JSX text node: `Emotions`
  - context: `> <Brain className="h-4 w-4 mr-1" /> Emotions </Toggle> <Toggle size="sm"`
- [657:17] (JSXText) Static JSX text node: `Sensory`
  - context: `> <Eye className="h-4 w-4 mr-1" /> Sensory </Toggle> <Toggle size="sm"`
- [667:17] (JSXText) Static JSX text node: `Anomalies`
  - context: `> <AlertCircle className="h-4 w-4 mr-1" /> Anomalies </Toggle> </div> </div>`
- [676:65] (JSXText) Static JSX text node: `minutes`
  - context: `="font-medium"> {differenceInMinutes(timeRange[1], timeRange[0])} minutes </span> <span>{format(timeRange[1], 'MMM dd, yyy`
- [756:54] (JSXText) Static JSX text node: `Data Streams`
  - context: `rounded-lg p-3 shadow-lg"> <h4 className="font-medium text-sm mb-2">Data Streams</h4> <div className="space-y-1"> {dataStr`
- [773:18] (JSXText) Static JSX text node: `Events:`
  - context: `-3 shadow-lg"> <div className="text-xs space-y-1"> <p>Events: {timelineEvents.length}</p> <p>Zoom: {Math.round(zoomLevel`
- [774:18] (JSXText) Static JSX text node: `Zoom:`
  - context: `ace-y-1"> <p>Events: {timelineEvents.length}</p> <p>Zoom: {Math.round(zoomLevel * 100)}%</p> {brushSelection && (`
- [776:20] (JSXText) Static JSX text node: `Selection:`
  - context: `nd(zoomLevel * 100)}%</p> {brushSelection && ( <p>Selection: {differenceInMinutes(brushSelection[1], brushSelection[0])} min</p>`
- [776:91] (JSXText) Static JSX text node: `min`
  - context: `<p>Selection: {differenceInMinutes(brushSelection[1], brushSelection[0])} min</p> )} </div> </div> </div>`

### src/components/Visualization3D.tsx

- [60:13] (JSXText) Static JSX text node: `×`
  - context: `ground transition-colors motion-reduce:transition-none" > × </button> </div> <p className="font-medium">{point.l`
- [360:11] (JSXText) Static JSX text node: `3D Correlation Visualization`
  - context: `Name="flex items-center gap-2"> <Eye className="h-5 w-5" /> 3D Correlation Visualization </CardTitle> </CardHeader> <Car`
- [373:17] (JSXText) Static JSX text node: `X Axis`
  - context: `block" htmlFor={xAxisTriggerId} > X Axis </label> <Select value={xAxis} onValueChange=`
- [395:17] (JSXText) Static JSX text node: `Y Axis`
  - context: `block" htmlFor={yAxisTriggerId} > Y Axis </label> <Select value={yAxis} onValueChange=`
- [417:17] (JSXText) Static JSX text node: `Z Axis`
  - context: `block" htmlFor={zAxisTriggerId} > Z Axis </label> <Select value={zAxis} onValueChange=`
- [441:17] (JSXText) Static JSX text node: `Color By`
  - context: `ock" htmlFor={colorByTriggerId} > Color By </label> <Select value={colorBy} onValueCha`
- [448:48] (JSXText) Static JSX text node: `Category`
  - context: `<SelectContent> <SelectItem value="category">Category</SelectItem> <SelectItem value="intensity">Intensity<`
- [449:49] (JSXText) Static JSX text node: `Intensity`
  - context: `category">Category</SelectItem> <SelectItem value="intensity">Intensity</SelectItem> </SelectContent> </Select>`
- [460:17] (JSXText) Static JSX text node: `Filter Category`
  - context: `htmlFor={filterCategoryTriggerId} > Filter Category </label> <Select value={filterCatego`
- [467:43] (JSXText) Static JSX text node: `All`
  - context: `gger> <SelectContent> <SelectItem value="all">All</SelectItem> <SelectItem value="emotion">Emotions</SelectI`
- [468:47] (JSXText) Static JSX text node: `Emotions`
  - context: `Item value="all">All</SelectItem> <SelectItem value="emotion">Emotions</SelectItem> <SelectItem value="sensory">Sensory</Sel`
- [469:47] (JSXText) Static JSX text node: `Sensory`
  - context: `e="emotion">Emotions</SelectItem> <SelectItem value="sensory">Sensory</SelectItem> <SelectItem value="environmental">Environ`
- [470:53] (JSXText) Static JSX text node: `Environmental`
  - context: `nsory">Sensory</SelectItem> <SelectItem value="environmental">Environmental</SelectItem> </SelectContent> </Sele`
- [477:17] (JSXText) Static JSX text node: `Point Size:`
  - context: `={pointSizeLabelId} className="text-sm font-medium mb-1 block"> Point Size: {pointSize.toFixed(2)} </p> <Slider`
- [496:15] (JSXText) Static JSX text node: `Reduced motion enabled`
  - context: `text-amber-800 dark:text-amber-200 px-3 py-1 rounded-md text-sm"> Reduced motion enabled </div> )} <Canvas`
- [577:54] (JSXText) Static JSX text node: `Legend`
  - context: `rounded-lg p-3 shadow-lg"> <h4 className="font-medium text-sm mb-2">Legend</h4> <div className="space-y-1"> {colorBy === '`
- [583:47] (JSXText) Static JSX text node: `Emotions`
  - context: `h-3 rounded-full bg-[#10B981]" /> <span className="text-xs">Emotions</span> </div> <div className="flex`
- [587:47] (JSXText) Static JSX text node: `Sensory`
  - context: `h-3 rounded-full bg-[#3B82F6]" /> <span className="text-xs">Sensory</span> </div> <div className="flex i`
- [591:47] (JSXText) Static JSX text node: `Environmental`
  - context: `h-3 rounded-full bg-[#F59E0B]" /> <span className="text-xs">Environmental</span> </div> </>`
- [598:45] (JSXText) Static JSX text node: `Low → High`
  - context: `a-yellow-500 to-red-500 rounded" /> <span className="text-xs">Low → High</span> </div> )} </div>`
- [606:18] (JSXText) Static JSX text node: `Points:`
  - context: `-3 shadow-lg"> <div className="text-xs space-y-1"> <p>Points: {filteredPoints.length}</p> <p>Total Sessions: {trackingEn`
- [607:18] (JSXText) Static JSX text node: `Total Sessions:`
  - context: `ace-y-1"> <p>Points: {filteredPoints.length}</p> <p>Total Sessions: {trackingEntries.length}</p> </div> </div>`

### src/components/VisualizationControls.tsx

- [107:11] (JSXText) Static JSX text node: `Interactive Data Analysis -`
  - context: `"flex items-center gap-2"> <Activity className="h-5 w-5" /> Interactive Data Analysis - {studentName} {filterCriteria.realtime &&`
- [111:15] (JSXText) Static JSX text node: `Live`
  - context: `mate-pulse ml-2"> <Wifi className="h-3 w-3 mr-1" /> Live </Badge> )} </CardTitle> <div classNa`
- [115:61] (JSXAttribute) Static aria-label attribute: `Visualization controls`
  - context: `</CardTitle> <div className="flex items-center gap-2" aria-label="Visualization controls"> {/* Guided question chips */} <div`
- [152:62] (JSXAttribute) Static aria-label attribute: `Open filters panel`
  - context: `etTrigger asChild> <Button variant="outline" size="sm" aria-label="Open filters panel" title="Open filters panel"> <Filter classNa`
- [152:89] (JSXAttribute) Static title attribute: `Open filters panel`
  - context: `<Button variant="outline" size="sm" aria-label="Open filters panel" title="Open filters panel"> <Filter className="h-4 w-4 mr-2" />`
- [154:17] (JSXText) Static JSX text node: `Filters`
  - context: `ers panel"> <Filter className="h-4 w-4 mr-2" /> Filters {Object.keys(filterCriteria).filter(k =>`
- [173:21] (JSXText) Static JSX text node: `Active`
  - context: `<Badge variant="default" className="ml-1"> Active </Badge> )} </Button>`
- [180:29] (JSXText) Static JSX text node: `Advanced Filters`
  - context: `-[400px] sm:w-[540px]"> <SheetHeader> <SheetTitle>Advanced Filters</SheetTitle> <SheetDescription>`
- [182:19] (JSXText) Static JSX text node: `Configure multi-dimensional filters for your data analysis`
  - context: `anced Filters</SheetTitle> <SheetDescription> Configure multi-dimensional filters for your data analysis </She`
- [201:28] (JSXAttribute) Static aria-label attribute: `Select layout mode`
  - context: `variant="outline" size="sm" aria-label="Select layout mode" title="Select layout mode"`
- [202:23] (JSXAttribute) Static title attribute: `Select layout mode`
  - context: `size="sm" aria-label="Select layout mode" title="Select layout mode" data-testid="layout-mode-trigger"`
- [209:17] (JSXText) Static JSX text node: `Layout`
  - context: `tMode === 'dashboard' && <Activity className="h-4 w-4 mr-2" />} Layout </Button> </DropdownMenuTrigger> <D`
- [215:17] (JSXText) Static JSX text node: `Dashboard`
  - context: `board')}> <Activity className="h-4 w-4 mr-2" /> Dashboard </DropdownMenuItem> <DropdownMenuItem onCl`
- [219:17] (JSXText) Static JSX text node: `Grid View`
  - context: `('grid')}> <Grid3x3 className="h-4 w-4 mr-2" /> Grid View </DropdownMenuItem> <DropdownMenuItem onCl`
- [223:17] (JSXText) Static JSX text node: `Focus Mode`
  - context: `e('focus')}> <Focus className="h-4 w-4 mr-2" /> Focus Mode </DropdownMenuItem> <DropdownMenuItem onC`
- [227:17] (JSXText) Static JSX text node: `Comparison`
  - context: `arison')}> <Columns className="h-4 w-4 mr-2" /> Comparison </DropdownMenuItem> </DropdownMenuContent>`
- [234:62] (JSXAttribute) Static aria-label attribute: `View options`
  - context: `nuTrigger asChild> <Button variant="outline" size="sm" aria-label="View options" title="View options"> <Settings className="h-4 w-`
- [234:83] (JSXAttribute) Static title attribute: `View options`
  - context: `<Button variant="outline" size="sm" aria-label="View options" title="View options"> <Settings className="h-4 w-4 mr-2" />`
- [236:17] (JSXText) Static JSX text node: `View`
  - context: `options"> <Settings className="h-4 w-4 mr-2" /> View </Button> </DropdownMenuTrigger> <Dro`
- [246:97] (JSXText) Static JSX text node: `2D: Emotional energy vs Sensory load (XY)`
  - context: `<DropdownMenuItem onClick={() => visualizationState.setProjectionPlane('xy')}>2D: Emotional energy vs Sensory load (XY)</DropdownMenuItem> <`
- [247:97] (JSXText) Static JSX text node: `2D: Emotional energy vs Time (XZ)`
  - context: `<DropdownMenuItem onClick={() => visualizationState.setProjectionPlane('xz')}>2D: Emotional energy vs Time (XZ)</DropdownMenuItem> <Dropdown`
- [248:97] (JSXText) Static JSX text node: `2D: Sensory load vs Time (YZ)`
  - context: `<DropdownMenuItem onClick={() => visualizationState.setProjectionPlane('yz')}>2D: Sensory load vs Time (YZ)</DropdownMenuItem> </>`
- [261:17] (JSXText) Static JSX text node: `Picture-in-Picture`
  - context: `<PictureInPicture2 className="h-4 w-4 mr-2" /> Picture-in-Picture </DropdownMenuItem> <DropdownMenu`
- [268:17] (JSXText) Static JSX text node: `Clear Highlights`
  - context: `}}> <RefreshCw className="h-4 w-4 mr-2" /> Clear Highlights </DropdownMenuItem> </DropdownMenuCon`
- [275:85] (JSXAttribute) Static aria-label attribute: `Export analytics`
  - context: `<Button variant="outline" size="sm" disabled={isExporting} aria-label="Export analytics" title="Export analytics"> <Download className`
- [275:110] (JSXAttribute) Static title attribute: `Export analytics`
  - context: `="outline" size="sm" disabled={isExporting} aria-label="Export analytics" title="Export analytics"> <Download className="h-4 w-4 mr-2" />`
- [286:17] (JSXText) Static JSX text node: `Export as PDF`
  - context: `> <FileText className="h-4 w-4 mr-2" /> Export as PDF </DropdownMenuItem> <DropdownMenuItem`
- [293:17] (JSXText) Static JSX text node: `Export as CSV`
  - context: `> <FileSpreadsheet className="h-4 w-4 mr-2" /> Export as CSV </DropdownMenuItem> <DropdownMenuItem`
- [300:17] (JSXText) Static JSX text node: `Export as JSON`
  - context: `> <FileJson className="h-4 w-4 mr-2" /> Export as JSON </DropdownMenuItem> </DropdownMenuConte`
- [314:15] (JSXText) Static JSX text node: `Chart Type`
  - context: `-medium" htmlFor={chartTypeTriggerId} > Chart Type </label> <Select value={selectedChartType} on`
- [321:42] (JSXText) Static JSX text node: `Line Chart`
  - context: `Trigger> <SelectContent> <SelectItem value="line">Line Chart</SelectItem> <SelectItem value="area">Area Chart</Sel`
- [322:42] (JSXText) Static JSX text node: `Area Chart`
  - context: `m value="line">Line Chart</SelectItem> <SelectItem value="area">Area Chart</SelectItem> <SelectItem value="scatter">Scatter Plot`
- [323:45] (JSXText) Static JSX text node: `Scatter Plot`
  - context: `alue="area">Area Chart</SelectItem> <SelectItem value="scatter">Scatter Plot</SelectItem> <SelectItem value="composed">Combined<`
- [324:46] (JSXText) Static JSX text node: `Combined`
  - context: `scatter">Scatter Plot</SelectItem> <SelectItem value="composed">Combined</SelectItem> </SelectContent> </Select>`
- [330:48] (JSXText) Static JSX text node: `Select Emotions`
  - context: `<div className="space-y-2"> <p className="text-sm font-medium">Select Emotions</p> <div className="grid grid-cols-2 gap-2 w-64 p-2`
- [359:15] (JSXText) Static JSX text node: `Time Range`
  - context: `-medium" htmlFor={timeRangeTriggerId} > Time Range </label> <Select value={selectedTimeRange} on`
- [366:40] (JSXText) Static JSX text node: `Last 7 days`
  - context: `ctTrigger> <SelectContent> <SelectItem value="7d">Last 7 days</SelectItem> <SelectItem value="30d">Last 30 days</S`
- [367:41] (JSXText) Static JSX text node: `Last 30 days`
  - context: `tem value="7d">Last 7 days</SelectItem> <SelectItem value="30d">Last 30 days</SelectItem> <SelectItem value="90d">Last 90 days</`
- [368:41] (JSXText) Static JSX text node: `Last 90 days`
  - context: `m value="30d">Last 30 days</SelectItem> <SelectItem value="90d">Last 90 days</SelectItem> <SelectItem value="all">All time</Sele`
- [369:41] (JSXText) Static JSX text node: `All time`
  - context: `m value="90d">Last 90 days</SelectItem> <SelectItem value="all">All time</SelectItem> </SelectContent> </Select>`
- [374:68] (JSXAttribute) Static aria-label attribute: `Data counts`
  - context: `</div> <div className="flex items-center gap-2 mt-8" aria-label="Data counts"> <Badge variant="outline" className="bg-success/10 tex`
- [376:46] (JSXText) Static JSX text node: `emotions`
  - context: `0 text-success border-success/20"> {filteredData.emotions.length} emotions </Badge> <Badge variant="outline" className="bg`
- [379:51] (JSXText) Static JSX text node: `sensory inputs`
  - context: `10 text-info border-info/20"> {filteredData.sensoryInputs.length} sensory inputs </Badge> <Badge variant="outline" classNa`
- [382:53] (JSXText) Static JSX text node: `sessions`
  - context: `primary border-primary/20"> {filteredData.trackingEntries.length} sessions </Badge> {filterCriteria.realtime && (`
- [386:45] (JSXText) Static JSX text node: `new`
  - context: `arning/80 text-warning-foreground"> {realtimeData.newDataCount} new </Badge> )} </div> </div>`

### src/components/analysis/CorrelationHeatmap.tsx

- [59:121] (JSXAttribute) Static aria-label attribute: `Loading heatmap`
  - context: `Name="h-[420px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label="Loading heatmap" />}> <EChartContainer option={option} height={420} />`

### src/components/analysis/PatternAnalysisView.tsx

- [68:23] (JSXAttribute) Static aria-label attribute: `Loading chart data`
  - context: `-destructive/30'; }; if (isAnalyzing) { return ( <div aria-label="Loading chart data" className="h-[400px] w-full"> <div className="h-ful`
- [79:14] (JSXText) Static JSX text node: `No patterns detected yet`
  - context: `"> <Zap className="h-16 w-16 mx-auto mb-4 opacity-50" /> <p>No patterns detected yet</p> <p className="text-sm">Need more data for`
- [80:34] (JSXText) Static JSX text node: `Need more data for pattern analysis`
  - context: `" /> <p>No patterns detected yet</p> <p className="text-sm">Need more data for pattern analysis</p> </div> </div> ); }`
- [92:13] (JSXText) Static JSX text node: `Detected Patterns (`
  - context: `lex items-center gap-2"> <Target className="h-5 w-5" /> Detected Patterns ({patterns.length}) </h3> <div className="`
- [109:79] (JSXText) Static JSX text node: `Pattern`
  - context: `> <h4 className="font-medium capitalize">{pattern.type} Pattern</h4> <Badge className={getConfidenceColor(patter`
- [111:65] (JSXText) Static JSX text node: `% confident`
  - context: `n.confidence)}> {Math.round(pattern.confidence * 100)}% confident </Badge> </div>`
- [115:25] (JSXText) Static JSX text node: `Frequency:`
  - context: `<p className="text-sm text-muted-foreground mb-2"> Frequency: {pattern.frequency} occurrences </p>`
- [115:56] (JSXText) Static JSX text node: `occurrences`
  - context: `-muted-foreground mb-2"> Frequency: {pattern.frequency} occurrences </p> {(pattern.recommend`
- [119:62] (JSXText) Static JSX text node: `Recommendations:`
  - context: `sName="space-y-1"> <p className="text-sm font-medium">Recommendations:</p> {(pattern.recommendations ?? []).`
- [141:13] (JSXText) Static JSX text node: `Predictive Insights (`
  - context: `items-center gap-2"> <TrendingUp className="h-5 w-5" /> Predictive Insights ({predictiveInsights.length}) </h3> <div`
- [161:65] (JSXText) Static JSX text node: `% confidence`
  - context: `iant="outline"> {Math.round(insight.confidence * 100)}% confidence </Badge> </div>`
- [171:67] (JSXText) Static JSX text node: `Prediction:`
  - context: `sName="mb-2"> <p className="text-sm font-medium mb-1">Prediction:</p> <div className="flex items-center gap-`
- [195:62] (JSXText) Static JSX text node: `Recommendations:`
  - context: `sName="space-y-1"> <p className="text-sm font-medium">Recommendations:</p> {insight.recommendations.slice(0,`
- [209:29] (JSXText) Static JSX text node: `Severity:`
  - context: `<Shield className="h-3 w-3" /> Severity: <span className="font-medium capitalize">{insight.severity}</span>`
- [226:13] (JSXText) Static JSX text node: `Detected Anomalies (`
  - context: `ms-center gap-2"> <AlertTriangle className="h-5 w-5" /> Detected Anomalies ({anomalies.length}) </h3> <div className`
- [242:71] (JSXText) Static JSX text node: `Anomaly`
  - context: `"flex-1"> <h4 className="font-medium mb-1">{anomaly.type} Anomaly</h4> <p className="text-sm text-muted-foreground m`
- [244:25] (JSXText) Static JSX text node: `Severity:`
  - context: `<p className="text-sm text-muted-foreground mb-2"> Severity: <span className="font-medium capitalize">{anomaly.severity}</span>`

### src/components/analysis/TeacherInsightsPanel.tsx

- [33:54] (JSXText) Static JSX text node: `n/a`
  - context: `oBadge = (p?: number) => { if (!p && p !== 0) return <Badge variant="outline">n/a</Badge>; const pct = Math.round(p * 100); const variant = p >= 0.7 ? 'de`
- [64:11] (JSXText) Static JSX text node: `Insights for`
  - context: `flex items-center gap-2"> <Lightbulb className="h-5 w-5" /> Insights for {student.name} </CardTitle> </CardHeader> <Card`
- [71:13] (JSXText) Static JSX text node: `You’re viewing:`
  - context: `eset && ( <div className="text-sm text-muted-foreground"> You’re viewing: <span className="font-medium">{activePreset.replaceAll('_',' ')}`
- [77:13] (JSXText) Static JSX text node: `Limited data — results may change as more sessions are recorded. Try tracking for at least 7 days and 10 sessions for stronger findings.`
  - context: `&& ( <div className="p-3 rounded-lg bg-muted/40 text-sm"> Limited data — results may change as more sessions are recorded. Try tracking fo`
- [86:17] (JSXText) Static JSX text node: `Pattern detected`
  - context: `nter gap-2"> <TrendingUp className="h-4 w-4" /> Pattern detected </div> {scoreToBadge(topPattern.con`
- [96:42] (JSXText) Static JSX text node: `Correlation`
  - context: `div className="p-3 rounded-lg border"> <div className="font-medium">Correlation</div> <div className="text-sm mt-1">{topCorr.factor1} ↔`
- [97:61] (JSXText) Static JSX text node: `↔`
  - context: `">Correlation</div> <div className="text-sm mt-1">{topCorr.factor1} ↔ {topCorr.factor2}</div> <div className="text-xs text-muted-foregro`
- [98:60] (JSXText) Static JSX text node: `r =`
  - context: `pCorr.factor2}</div> <div className="text-xs text-muted-foreground">r = {topCorr.correlation.toFixed(2)} ({topCorr.significance})</div> </`
- [105:68] (JSXText) Static JSX text node: `Recent Anomaly`
  - context: `ont-medium"> <AlertTriangle className="h-4 w-4 text-amber-600" /> Recent Anomaly </div> <div className="text-sm mt-1">{ano`
- [112:105] (JSXText) Static JSX text node: `Create Goal`
  - context: `t="outline" size="sm" onClick={onCreateGoal}><Target className="h-4 w-4 mr-1" />Create Goal</Button> <Button variant="outline" size="sm" onClick={onAd`
- [113:75] (JSXText) Static JSX text node: `Add Intervention`
  - context: `tton> <Button variant="outline" size="sm" onClick={onAddIntervention}>Add Intervention</Button> <Button variant="outline" size="sm" onClick=`
- [114:73] (JSXText) Static JSX text node: `Schedule Break`
  - context: `Button> <Button variant="outline" size="sm" onClick={onScheduleBreak}>Schedule Break</Button> <Button variant="outline" size="sm" onClick={o`
- [115:74] (JSXText) Static JSX text node: `Track Now`
  - context: `utton> <Button variant="outline" size="sm" onClick={onJumpToTracking}>Track Now</Button> </div> <div className="text-xs text-muted-fo`
- [119:11] (JSXText) Static JSX text node: `Data:`
  - context: `</div> <div className="text-xs text-muted-foreground pt-2"> Data: {sessions} sessions, {emotions} emotions </div> </CardConten`
- [119:28] (JSXText) Static JSX text node: `sessions,`
  - context: `<div className="text-xs text-muted-foreground pt-2"> Data: {sessions} sessions, {emotions} emotions </div> </CardContent> </Card>`
- [119:49] (JSXText) Static JSX text node: `emotions`
  - context: `xs text-muted-foreground pt-2"> Data: {sessions} sessions, {emotions} emotions </div> </CardContent> </Card> ); };`

### src/components/analytics-panels/ChatComposer.tsx

- [64:96] (JSXText) Static JSX text node: `Send`
  - context: `onClick={onSubmit} disabled={disabled || pending || value.trim().length === 0}>Send</Button> </div> </div> ); }`

### src/components/analytics-panels/CorrelationsPanel.tsx

- [72:131] (JSXAttribute) Static aria-label attribute: `Loading correlations`
  - context: `Name="h-[420px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label="Loading correlations" />}> <EChartContainer option={option} he`
- [97:49] (JSXText) Static JSX text node: `↔`
  - context: `="font-medium text-foreground"> {correlation.factor1} ↔ {correlation.factor2} </h4> <p`

### src/components/analytics-panels/EntryDetailsDrawer.tsx

- [51:23] (JSXText) Static JSX text node: `Detaljer`
  - context: `right" className="max-w-md w-full"> <SheetHeader> <SheetTitle>Detaljer</SheetTitle> </SheetHeader> {!source && ( <di`
- [54:63] (JSXText) Static JSX text node: `Ingen data`
  - context: `{!source && ( <div className="mt-4 text-sm text-muted-foreground">Ingen data</div> )} {source && ( <div className="mt-4`
- [64:46] (JSXText) Static JSX text node: `Notat`
  - context: `<div className="text-sm"> <div className="font-medium">Notat</div> <div className="whitespace-pre-wrap break-words">{so`
- [70:54] (JSXText) Static JSX text node: `Følelser`
  - context: `th ? ( <div> <div className="text-sm font-medium">Følelser</div> <ul className="mt-1 text-sm list-disc pl-5">`
- [80:54] (JSXText) Static JSX text node: `Sensorikk`
  - context: `th ? ( <div> <div className="text-sm font-medium">Sensorikk</div> <ul className="mt-1 text-sm list-disc pl-5">`
- [90:54] (JSXText) Static JSX text node: `Kontekst`
  - context: `t) ? ( <div> <div className="text-sm font-medium">Kontekst</div> <div className="text-sm text-muted-foreground">`
- [108:72] (JSXText) Static JSX text node: `Kopier som tekst`
  - context: `="pt-2"> <Button variant="outline" size="sm" onClick={copyAsText}>Kopier som tekst</Button> </div> </div> )} <`

### src/components/analytics-panels/ExplanationChat.tsx

- [78:19] (MessageAPI) Message API call: error(): `Kunne ikke hente AI-svar`
  - context: `{ textareaRef.current?.focus(); } catch {} } catch (e) { toast.error('Kunne ikke hente AI-svar'); } finally { setPending(false); } };`
- [78:19] (MessageAPI) sonner toast.error(): `Kunne ikke hente AI-svar`
  - context: `{ textareaRef.current?.focus(); } catch {} } catch (e) { toast.error('Kunne ikke hente AI-svar'); } finally { setPending(false); } };`
- [154:63] (JSXText) Static JSX text node: `AI`
  - context: `ustify-start'}\`}> {m.role !== 'user' && <span className="sr-only">AI</span>} <div className={\`rounded px-3 py-2 text-sm leading-rela`
- [161:28] (JSXAttribute) Static aria-label attribute: `Kopier melding`
  - context: `ded border text-muted-foreground hover:bg-accent/40" aria-label="Kopier melding" title="Kopier melding" onClick=`
- [162:23] (JSXAttribute) Static title attribute: `Kopier melding`
  - context: `bg-accent/40" aria-label="Kopier melding" title="Kopier melding" onClick={async () => { try {`
- [186:19] (JSXAttribute) Static title attribute: `Toggle kildeliste`
  - context: `n rounded px-1 py-1 text-muted-foreground hover:bg-accent/30" title="Toggle kildeliste" > <span className="font-medium">Kilder`
- [188:43] (JSXText) Static JSX text node: `Kilder fra data (`
  - context: `title="Toggle kildeliste" > <span className="font-medium">Kilder fra data ({sList.length})</span> <span className={\`inline-fle`
- [191:52] (JSXText) Static JSX text node: `Klikk for å skjule`
  - context: `{!sourcesCollapsed && ( <span className="hidden sm:inline">Klikk for å skjule</span> )} {sourcesCollapsed && (`
- [194:52] (JSXText) Static JSX text node: `Klikk for å vise`
  - context: `{sourcesCollapsed && ( <span className="hidden sm:inline">Klikk for å vise</span> )} <ChevronDown className={\``
- [244:83] (JSXText) Static JSX text node: `Kilder fra data (`
  - context: `<summary className="cursor-pointer select-none text-muted-foreground">Kilder fra data ({sources.length})</summary> <ul className="mt-2 lis`
- [256:55] (JSXText) Static JSX text node: `Henvisninger`
  - context: `bg-muted/30 p-2 text-xs"> <div className="mb-1 text-muted-foreground">Henvisninger</div> <div className="flex flex-wrap gap-1">`

### src/components/analytics-panels/ExplanationContent.tsx

- [36:24] (JSXAttribute) Static aria-label attribute: `Kopier tekst`
  - context: `onClick={() => hasText && onCopy?.(text as string)} aria-label="Kopier tekst" title="Kopier tekst" > <Copy cl`
- [37:19] (JSXAttribute) Static title attribute: `Kopier tekst`
  - context: `Copy?.(text as string)} aria-label="Kopier tekst" title="Kopier tekst" > <Copy className="h-4 w-4 mr-2" />Kopier`
- [39:46] (JSXText) Static JSX text node: `Kopier`
  - context: `title="Kopier tekst" > <Copy className="h-4 w-4 mr-2" />Kopier </Button> <Button variant="secondary"`
- [46:24] (JSXAttribute) Static aria-label attribute: `Legg til i rapport`
  - context: `Click={() => hasText && onAddToReport?.(text as string)} aria-label="Legg til i rapport" title="Legg til i rapport" >`
- [47:19] (JSXAttribute) Static title attribute: `Legg til i rapport`
  - context: `(text as string)} aria-label="Legg til i rapport" title="Legg til i rapport" > <FileText className="h-4 w-4 mr-2"`
- [49:50] (JSXText) Static JSX text node: `Rapport`
  - context: `egg til i rapport" > <FileText className="h-4 w-4 mr-2" />Rapport </Button> </div> </div> <div className="m`
- [56:48] (JSXText) Static JSX text node: `Henter forklaring…`
  - context: `{status === 'loading' && ( <p className="text-muted-foreground">Henter forklaring…</p> )} {status === 'error' && ( <p`

### src/components/analytics-panels/ExplanationDock.tsx

- [77:20] (JSXText) Static JSX text node: `Forklaring`
  - context: `return ( <Card className="h-full"> <CardHeader> <CardTitle>Forklaring</CardTitle> </CardHeader> <CardContent className="h-[calc`
- [81:107] (JSXAttribute) Static aria-label attribute: `Data readiness for sosiale triggere`
  - context: `adinessDetailsRef} className="mb-2 rounded border px-3 py-2 text-xs" aria-label="Data readiness for sosiale triggere"> <summary className="cursor-po`
- [84:17] (JSXText) Static JSX text node: `Data readiness for sosiale triggere:`
  - context: `s.label === 'partial' ? 'text-yellow-500' : 'text-orange-500'}> Data readiness for sosiale triggere: {Math.round(readiness.score * 100)}% ({read`
- [101:23] (JSXText) Static JSX text node: `Legg til sosiale eksempler (dev)`
  - context: `a(dataset.entries[0].studentId); }} > Legg til sosiale eksempler (dev) </Button>`
- [139:78] (JSXText) Static JSX text node: `Chat om forklaringen`
  - context: `"> <h5 className="mb-2 text-sm font-medium text-muted-foreground">Chat om forklaringen</h5> <ExplanationChat aiEnabl`

### src/components/analytics-panels/ExplanationSheet.tsx

- [66:23] (JSXText) Static JSX text node: `Forklaring`
  - context: `" className="h-[75vh] md:h-[80vh]"> <SheetHeader> <SheetTitle>Forklaring</SheetTitle> </SheetHeader> <div className="mt-2 h-[c`
- [98:80] (JSXText) Static JSX text node: `Chat om forklaringen`
  - context: `<h5 className="mb-2 text-sm font-medium text-muted-foreground">Chat om forklaringen</h5> <ExplanationChat aiE`

### src/components/analytics-panels/ExplanationTabs.tsx

- [67:23] (MessageAPI) Message API call: info(): `[UI] explanationV2.tabChange`
  - context: `ring) => { setTab(val); writeStorage('tab', val); try { logger.info('[UI] explanationV2.tabChange', { tab: val, pattern: patternTitle }); } catch {}`
- [111:39] (JSXText) Static JSX text node: `Chat`
  - context: `tify-between gap-2"> <TabsList> <TabsTrigger value="chat">Chat</TabsTrigger> <TabsTrigger value="kilder">Kilder</TabsTrigger>`
- [112:41] (JSXText) Static JSX text node: `Kilder`
  - context: `Trigger value="chat">Chat</TabsTrigger> <TabsTrigger value="kilder">Kilder</TabsTrigger> <TabsTrigger value="henvisninger">Henvisninger<`
- [113:47] (JSXText) Static JSX text node: `Henvisninger`
  - context: `lue="kilder">Kilder</TabsTrigger> <TabsTrigger value="henvisninger">Henvisninger</TabsTrigger> </TabsList> <div className="flex`
- [119:21] (JSXAttribute) Static title attribute: `Skjul alt`
  - context: `py-1 text-[11px] text-muted-foreground hover:bg-accent/40" title="Skjul alt" onClick={() => { try { window.dispatch`
- [121:103] (MessageAPI) Message API call: info(): `[UI] explanationV2.collapseAll`
  - context: `window.dispatchEvent(new CustomEvent('explanationV2:collapseAll')); logger.info('[UI] explanationV2.collapseAll'); } catch {} setShowAllKilder(f`
- [125:15] (JSXText) Static JSX text node: `Skjul alt`
  - context: `setShowAllKilder(false); }} > Skjul alt </button> <button type="button"`
- [130:21] (JSXAttribute) Static title attribute: `Vis alt`
  - context: `py-1 text-[11px] text-muted-foreground hover:bg-accent/40" title="Vis alt" onClick={() => { try { window.dispatchEv`
- [132:101] (MessageAPI) Message API call: info(): `[UI] explanationV2.expandAll`
  - context: `{ window.dispatchEvent(new CustomEvent('explanationV2:expandAll')); logger.info('[UI] explanationV2.expandAll'); } catch {} setShowAllKilder(tru`
- [136:15] (JSXText) Static JSX text node: `Vis alt`
  - context: `setShowAllKilder(true); }} > Vis alt </button> </div> </div> <TabsCont`
- [164:60] (JSXText) Static JSX text node: `Åpne fanen for å laste kilder…`
  - context: `!visited.kilder ? ( <div className="text-sm text-muted-foreground">Åpne fanen for å laste kilder…</div> ) : sourcesList.length === 0 ? (`
- [166:60] (JSXText) Static JSX text node: `Ingen kilder tilgjengelig.`
  - context: `ist.length === 0 ? ( <div className="text-sm text-muted-foreground">Ingen kilder tilgjengelig.</div> ) : ( <div className="spa`
- [170:64] (JSXText) Static JSX text node: `Kilder fra data (`
  - context: `ustify-between"> <div className="text-sm text-muted-foreground">Kilder fra data ({sourcesList.length})</div> <button`
- [208:60] (JSXText) Static JSX text node: `Åpne fanen for å vise henvisninger…`
  - context: `ted.henvisninger ? ( <div className="text-sm text-muted-foreground">Åpne fanen for å vise henvisninger…</div> ) : sourcesList.length === 0`
- [210:60] (JSXText) Static JSX text node: `Ingen henvisninger.`
  - context: `ist.length === 0 ? ( <div className="text-sm text-muted-foreground">Ingen henvisninger.</div> ) : ( <div className="space-y-2"`
- [213:62] (JSXText) Static JSX text node: `Henvisninger`
  - context: `sName="space-y-2"> <div className="text-sm text-muted-foreground">Henvisninger</div> <div className="flex flex-wrap gap-1">`

### src/components/analytics-panels/PatternsPanel.tsx

- [279:21] (MessageAPI) Message API call: success(): `Kopiert til utklippstavlen`
  - context: `try { await navigator.clipboard.writeText(text); toast.success('Kopiert til utklippstavlen'); } catch { toast.error('Kunne ikke kopie`
- [279:21] (MessageAPI) sonner toast.success(): `Kopiert til utklippstavlen`
  - context: `try { await navigator.clipboard.writeText(text); toast.success('Kopiert til utklippstavlen'); } catch { toast.error('Kunne ikke kopie`
- [281:19] (MessageAPI) Message API call: error(): `Kunne ikke kopiere`
  - context: `toast.success('Kopiert til utklippstavlen'); } catch { toast.error('Kunne ikke kopiere'); } }; const handleAddToReport = (text: string) =>`
- [281:19] (MessageAPI) sonner toast.error(): `Kunne ikke kopiere`
  - context: `toast.success('Kopiert til utklippstavlen'); } catch { toast.error('Kunne ikke kopiere'); } }; const handleAddToReport = (text: string) =>`
- [287:22] (MessageAPI) Message API call: info(): `Lagt til i rapportutkast`
  - context: `> { // Placeholder for integration with report builder try { toast.info('Lagt til i rapportutkast'); } catch {} }; const current = selectedKey ? ex`
- [287:22] (MessageAPI) sonner toast.info(): `Lagt til i rapportutkast`
  - context: `> { // Placeholder for integration with report builder try { toast.info('Lagt til i rapportutkast'); } catch {} }; const current = selectedKey ? ex`
- [577:68] (JSXText) Static JSX text node: `•`
  - context: `tart gap-2"> <span className="text-primary">•</span> <span>{rec}</span>`

### src/components/analytics/FiltersDrawer.tsx

- [200:31] (JSXText) Static JSX text node: `×`
  - context: `}))} > × </button> </Badge>`
- [238:31] (JSXText) Static JSX text node: `×`
  - context: `}))} > × </button> </Badge>`

### src/components/analytics/panels/AlertsPanel.tsx

- [135:20] (MessageAPI) Message API call: error(): `Failed to resolve alert in pinned rail`
  - context: `tAnalytics('alerts.resolveSuccess'))); } catch (error) { logger.error('Failed to resolve alert in pinned rail', error); toast.error(String(tAnal`

### src/components/analytics/panels/ExplorePanel.tsx

- [32:30] (JSXAttribute) Static aria-labelledby attribute: `explore-title`
  - context: `) => setPreset(next as ExplorePreset); return ( <section aria-labelledby="explore-title" className="relative"> <h2 id="explore-title" className="sr`

### src/components/analytics/panels/OverviewPanel.tsx

- [52:32] (JSXAttribute) Static aria-labelledby attribute: `overview-title`
  - context: `}, [insights]); return ( <ErrorBoundary> <section aria-labelledby="overview-title" className="space-y-6"> <header className="space-y-1">`
- [70:34] (JSXAttribute) Static aria-labelledby attribute: `overview-insights-title`
  - context: `Type} /> </Suspense> </div> <section aria-labelledby="overview-insights-title" className="space-y-3"> <h3 id="overview-insi`

### src/components/charts/EChartContainer.tsx

- [387:22] (MessageAPI) Message API call: error(): `[EChartContainer] Option normalization failed`
  - context: `tion; } catch (e) { if (import.meta?.env?.DEV) { logger.error("[EChartContainer] Option normalization failed", { error: e }); } re`
- [459:22] (MessageAPI) Message API call: error(): `[EChartContainer] Theme merge failed`
  - context: `tion; } catch (e) { if (import.meta?.env?.DEV) { logger.error("[EChartContainer] Theme merge failed", { error: e, optionP`

### src/components/charts/TrendsChart.tsx

- [37:16] (JSXText) Static JSX text node: `No data available for selected time range`
  - context: `<Activity className="h-16 w-16 mx-auto mb-4 opacity-50" /> <p>No data available for selected time range</p> <p className="text-xs`
- [38:41] (JSXText) Static JSX text node: `Try expanding the time range or adjusting filters`
  - context: `a available for selected time range</p> <p className="text-xs mt-1">Try expanding the time range or adjusting filters</p> </div> <`
- [79:123] (JSXAttribute) Static aria-label attribute: `Loading trends`
  - context: `Name="h-[400px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label="Loading trends" />}> <EChartContainer option={option}`
- [89:18] (MessageAPI) Message API call: error(): `TrendsChart.renderChart failed`
  - context: `/> </React.Suspense> ); } catch (error) { logger.error("TrendsChart.renderChart failed", { error }); return ( <div className=`
- [94:14] (JSXText) Static JSX text node: `Could not render chart`
  - context: `<Activity className="h-16 w-16 mx-auto mb-4 opacity-50" /> <p>Could not render chart</p> <p className="text-xs mt-1">An internal err`
- [95:39] (JSXText) Static JSX text node: `An internal error occurred while building the chart`
  - context: `> <p>Could not render chart</p> <p className="text-xs mt-1">An internal error occurred while building the chart</p> </div> </d`

### src/components/dev/EnvDebug.tsx

- [29:20] (JSXText) Static JSX text node: `Env / AI Debug`
  - context: `="bg-gradient-card border-0 shadow-soft"> <CardHeader> <CardTitle>Env / AI Debug</CardTitle> </CardHeader> <CardContent className="tex`
- [32:14] (JSXText) Static JSX text node: `AI enabled (loadAiConfig):`
  - context: `</CardHeader> <CardContent className="text-sm space-y-1"> <div>AI enabled (loadAiConfig): <strong>{String(ai.enabled)}</strong></div> <`
- [33:14] (JSXText) Static JSX text node: `Model (loadAiConfig):`
  - context: `nabled (loadAiConfig): <strong>{String(ai.enabled)}</strong></div> <div>Model (loadAiConfig): <code>{ai.modelName || '(none)'}</code></div> <div`
- [34:14] (JSXText) Static JSX text node: `API key present (loadAiConfig):`
  - context: `odel (loadAiConfig): <code>{ai.modelName || '(none)'}</code></div> <div>API key present (loadAiConfig): <strong>{String(!!ai.apiKey)}</strong> <span cla`
- [35:14] (JSXText) Static JSX text node: `Base URL (loadAiConfig):`
  - context: `assName="text-muted-foreground">({masked(ai.apiKey)})</span></div> <div>Base URL (loadAiConfig): <code>{String((ai as any).baseUrl || 'https://openroute`
- [36:14] (JSXText) Static JSX text node: `Local only (loadAiConfig):`
  - context: `i as any).baseUrl || 'https://openrouter.ai/api/v1')}</code></div> <div>Local only (loadAiConfig): <strong>{String((ai as any).localOnly || false)}</str`
- [37:31] (JSXText) Static JSX text node: `AI enabled (live env):`
  - context: `g((ai as any).localOnly || false)}</strong></div> <div className="mt-2">AI enabled (live env): <strong>{String(aiLive.enabled)}</strong></div> <`
- [38:14] (JSXText) Static JSX text node: `Model (live env):`
  - context: `nabled (live env): <strong>{String(aiLive.enabled)}</strong></div> <div>Model (live env): <code>{aiLive.modelName}</code></div> <div>API key pre`
- [39:14] (JSXText) Static JSX text node: `API key present (live env):`
  - context: `<div>Model (live env): <code>{aiLive.modelName}</code></div> <div>API key present (live env): <strong>{String(!!aiLive.apiKey)}</strong> <span cla`
- [40:14] (JSXText) Static JSX text node: `Base URL (live env):`
  - context: `ame="text-muted-foreground">({masked(aiLive.apiKey)})</span></div> <div>Base URL (live env): <code>{aiLive.baseUrl}</code></div> <div className=`
- [41:53] (JSXText) Static JSX text node: `Live Vite env:`
  - context: `iLive.baseUrl}</code></div> <div className="mt-2 text-muted-foreground">Live Vite env:</div> <div>VITE_OPENROUTER_API_KEY present: <strong>{Stri`
- [42:14] (JSXText) Static JSX text node: `VITE_OPENROUTER_API_KEY present:`
  - context: `<div className="mt-2 text-muted-foreground">Live Vite env:</div> <div>VITE_OPENROUTER_API_KEY present: <strong>{String(!!env.VITE_OPENROUTER_API_KEY)}`
- [43:14] (JSXText) Static JSX text node: `VITE_AI_ANALYSIS_ENABLED:`
  - context: `d-foreground">({masked(env.VITE_OPENROUTER_API_KEY)})</span></div> <div>VITE_AI_ANALYSIS_ENABLED: <code>{String(env.VITE_AI_ANALYSIS_ENABLED)}</code></d`
- [44:14] (JSXText) Static JSX text node: `VITE_AI_MODEL_NAME:`
  - context: `ENABLED: <code>{String(env.VITE_AI_ANALYSIS_ENABLED)}</code></div> <div>VITE_AI_MODEL_NAME: <code>{String(env.VITE_AI_MODEL_NAME)}</code></div>`
- [45:14] (JSXText) Static JSX text node: `VITE_AI_LOCAL_ONLY:`
  - context: `AI_MODEL_NAME: <code>{String(env.VITE_AI_MODEL_NAME)}</code></div> <div>VITE_AI_LOCAL_ONLY: <code>{String(env.VITE_AI_LOCAL_ONLY || false)}</code></div>`
- [46:14] (JSXText) Static JSX text node: `VITE_AI_BASE_URL:`
  - context: `ONLY: <code>{String(env.VITE_AI_LOCAL_ONLY || false)}</code></div> <div>VITE_AI_BASE_URL: <code>{String(env.VITE_AI_BASE_URL || '(default)')}</code></di`
- [47:31] (JSXText) Static JSX text node: `localStorage OPENROUTER_API_KEY present:`
  - context: `nv.VITE_AI_BASE_URL || '(default)')}</code></div> <div className="mt-1">localStorage OPENROUTER_API_KEY present: <strong>{String(!!lsKey)}</strong> <spa`
- [48:56] (JSXText) Static JSX text node: `Tip: set with`
  - context: `ed(lsKey)})</span></div> <div className="text-xs text-muted-foreground">Tip: set with <code>localStorage.setItem('OPENROUTER_API_KEY', 'sk-or-…')</code>`
- [48:76] (JSXText) Static JSX text node: `localStorage.setItem('OPENROUTER_API_KEY', 'sk-or-…')`
  - context: `div> <div className="text-xs text-muted-foreground">Tip: set with <code>localStorage.setItem('OPENROUTER_API_KEY', 'sk-or-…')</code></div> <div`
- [49:48] (JSXText) Static JSX text node: `Note: Module-level constants can be stale after env changes; the app uses live env shown above.`
  - context: `PI_KEY', 'sk-or-…')</code></div> <div className="text-muted-foreground">Note: Module-level constants can be stale after env changes; the app uses live e`
- [50:14] (JSXText) Static JSX text node: `Mode:`
  - context: `stale after env changes; the app uses live env shown above.</div> <div>Mode: <code>{String(env.MODE)}</code></div> {/* AI Telemetry */}`
- [54:45] (JSXText) Static JSX text node: `AI Telemetry`
  - context: `-4 pt-3 border-t border-border/50"> <div className="font-medium mb-1">AI Telemetry</div> {(() => { const s = aiMetrics.summary()`
- [60:22] (JSXText) Static JSX text node: `Requests:`
  - context: `className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs"> <div>Requests: <strong>{s.requests}</strong></div> <div>Success: <str`
- [61:22] (JSXText) Static JSX text node: `Success:`
  - context: `<div>Requests: <strong>{s.requests}</strong></div> <div>Success: <strong>{s.successes}</strong></div> <div>Failures: <st`
- [62:22] (JSXText) Static JSX text node: `Failures:`
  - context: `<div>Success: <strong>{s.successes}</strong></div> <div>Failures: <strong>{s.failures}</strong></div> <div>Retries: <str`
- [63:22] (JSXText) Static JSX text node: `Retries:`
  - context: `<div>Failures: <strong>{s.failures}</strong></div> <div>Retries: <strong>{s.retries}</strong></div> <div>JSON valid: <st`
- [64:22] (JSXText) Static JSX text node: `JSON valid:`
  - context: `<div>Retries: <strong>{s.retries}</strong></div> <div>JSON valid: <strong>{s.jsonValid}</strong></div> <div>Parse erro`
- [65:22] (JSXText) Static JSX text node: `Parse errors:`
  - context: `<div>JSON valid: <strong>{s.jsonValid}</strong></div> <div>Parse errors: <strong>{s.jsonParseErrors}</strong></div> <div>Va`
- [66:22] (JSXText) Static JSX text node: `Validate errors:`
  - context: `v>Parse errors: <strong>{s.jsonParseErrors}</strong></div> <div>Validate errors: <strong>{s.jsonValidateErrors}</strong></div> <`
- [67:22] (JSXText) Static JSX text node: `Avg latency:`
  - context: `date errors: <strong>{s.jsonValidateErrors}</strong></div> <div>Avg latency: <strong>{s.avgLatency} ms</strong></div> <div class`
- [67:58] (JSXText) Static JSX text node: `ms`
  - context: `Errors}</strong></div> <div>Avg latency: <strong>{s.avgLatency} ms</strong></div> <div className="col-span-2">JSON gyldighet (gl`
- [68:45] (JSXText) Static JSX text node: `JSON gyldighet (global):`
  - context: `ng>{s.avgLatency} ms</strong></div> <div className="col-span-2">JSON gyldighet (global): <strong>{pct}%</strong></div> <div clas`
- [69:67] (JSXText) Static JSX text node: `Sist oppdatert:`
  - context: `strong></div> <div className="col-span-2 text-muted-foreground">Sist oppdatert: {new Date(s.lastUpdated).toLocaleString()}</div> <`
- [74:83] (JSXText) Static JSX text node: `Reset telemetry`
  - context: `<Button size="sm" variant="outline" onClick={() => aiMetrics.reset()}>Reset telemetry</Button> </div> </div> </CardContent>`

### src/components/dev/ModelDiagnosticsPanel.tsx

- [177:20] (MessageAPI) Message API call: error(): `[ModelDiagnosticsPanel] Failed to run time-series CV`
  - context: `const err = e instanceof Error ? e : new Error(String(e)); logger.error('[ModelDiagnosticsPanel] Failed to run time-series CV', { error: err }); a`
- [216:30] (JSXAttribute) Static aria-labelledby attribute: `model-diagnostics-heading`
  - context: `st itemHeight = 56; // px per item row return ( <section aria-labelledby="model-diagnostics-heading" role="region" className={props.className}> <a`

### src/components/layouts/DashboardLayout.tsx

- [139:107] (JSXText) Static JSX text node: `↔`
  - context: `air.factor1.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} ↔{' '} {pair.factor2.replace(/([A-Z])/g, ' $1').replace(`

### src/components/layouts/ResizableSplitLayout.tsx

- [64:47] (MessageAPI) Message API call: info(): `[UI] split.collapse.change`
  - context: `dRight(v); persist(ratio, v); try { onCollapsedChange?.(v); logger.info('[UI] split.collapse.change', { collapsed: v }); } catch {} }; const clampR`
- [80:42] (MessageAPI) Message API call: info(): `[UI] split.drag.start`
  - context: `startRatio = ratio; let frame = 0; try { onResizeStart?.(); logger.info('[UI] split.drag.start'); } catch {} const move = (clientX: number) => {`
- [97:47] (MessageAPI) Message API call: info(): `[UI] split.drag.end`
  - context: `; const onPointerUp = () => { try { onResizeEnd?.(ratio); logger.info('[UI] split.drag.end', { ratio }); } catch {} persist(ratio); window`
- [148:20] (JSXAttribute) Static aria-label attribute: `Resizer`
  - context: `or" aria-orientation="vertical" tabIndex={0} aria-label="Resizer" onPointerDown={onPointerDown} onKeyDown={onKeyDown}`
- [158:22] (JSXAttribute) Static aria-label attribute: `Dra for å endre størrelse`
  - context: `outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Dra for å endre størrelse" title="Dra for å endre størrelse • Dobbelt`
- [159:17] (JSXAttribute) Static title attribute: `Dra for å endre størrelse • Dobbeltklikk for å nullstille • Enter for å skjule/vis`
  - context: `ble:ring-ring" aria-label="Dra for å endre størrelse" title="Dra for å endre størrelse • Dobbeltklikk for å nullstille • Enter for å skjule/`

### src/components/layouts/VisualizationLayouts.tsx

- [21:36] (JSXText) Static JSX text node: `Select visualizations to display`
  - context: `sName="h-16 w-16 mx-auto mb-4 opacity-50" /> <p className="text-lg">Select visualizations to display</p> <p className="text-sm">Choose f`
- [22:36] (JSXText) Static JSX text node: `Choose from the options above`
  - context: `ext-lg">Select visualizations to display</p> <p className="text-sm">Choose from the options above</p> </div> </CardContent>`
- [49:36] (JSXText) Static JSX text node: `Select a visualization to focus on`
  - context: `sName="h-16 w-16 mx-auto mb-4 opacity-50" /> <p className="text-lg">Select a visualization to focus on</p> <p className="text-sm">Choose`
- [50:36] (JSXText) Static JSX text node: `Choose from the options above`
  - context: `t-lg">Select a visualization to focus on</p> <p className="text-sm">Choose from the options above</p> </div> </CardContent>`

### src/components/lazy/LazyInteractiveDataVisualization.tsx

- [12:9] (JSXText) Static JSX text node: `Loading Interactive Visualization...`
  - context: `s-center gap-2"> <Activity className="h-5 w-5 animate-pulse" /> Loading Interactive Visualization... </CardTitle> </CardHeader> <C`
- [39:9] (JSXText) Static JSX text node: `Failed to load Interactive Visualization`
  - context: `er gap-2 text-destructive"> <AlertCircle className="h-5 w-5" /> Failed to load Interactive Visualization </CardTitle> </CardHeader>`
- [44:9] (JSXText) Static JSX text node: `The interactive data visualization component could not be loaded. 
        This might be due to missing dependencies or a temporary loading issue.`
  - context: `> <CardContent> <p className="text-sm text-muted-foreground"> The interactive data visualization component could not be loaded. This`
- [48:9] (JSXText) Static JSX text node: `Please refresh the page or contact support if the issue persists.`
  - context: `ue. </p> <p className="text-sm text-muted-foreground mt-2"> Please refresh the page or contact support if the issue persists. </p>`

### src/components/lazy/LazyLoadWrapper.tsx

- [21:56] (JSXText) Static JSX text node: `Loading component...`
  - context: `to mb-4 text-primary" /> <p className="text-sm text-muted-foreground">Loading component...</p> </div> </div> <div className="space`
- [37:53] (JSXText) Static JSX text node: `Failed to load component`
  - context: `iv className="text-center"> <p className="text-destructive font-medium">Failed to load component</p> <p className="text-sm text-muted-foreground`
- [39:11] (JSXText) Static JSX text node: `Please refresh the page or try again later.`
  - context: `ponent</p> <p className="text-sm text-muted-foreground mt-2"> Please refresh the page or try again later. </p> </div> </Card`
- [81:18] (MessageAPI) Message API call: error(): `LazyLoadWrapper Error:`
  - context: `componentDidCatch(error: Error, errorInfo: React.ErrorInfo) { logger.error('LazyLoadWrapper Error:', error, errorInfo); } render() { if (this.stat`

### src/components/lazy/LazyReportBuilder.tsx

- [11:9] (JSXText) Static JSX text node: `Loading Report Builder...`
  - context: `s-center gap-2"> <FileText className="h-5 w-5 animate-pulse" /> Loading Report Builder... </CardTitle> </CardHeader> <CardContent`

### src/components/lazy/LazyVisualization3D.tsx

- [27:9] (JSXText) Static JSX text node: `3D Correlation Visualization`
  - context: `lassName="flex items-center gap-2"> <Eye className="h-5 w-5" /> 3D Correlation Visualization </CardTitle> </CardHeader> <CardConte`
- [52:58] (JSXText) Static JSX text node: `Loading 3D visualization...`
  - context: `d-full mx-auto"></div> <p className="text-sm text-muted-foreground">Loading 3D visualization...</p> </div> </div> </div>`

### src/components/profile-sections/AnalyticsSection.tsx

- [126:29] (JSXAttribute) Static aria-labelledby attribute: `ai-analysis-toggle-label`
  - context: `efaults.available} aria-checked={useAI} aria-labelledby="ai-analysis-toggle-label" aria-describedby="ai-analysis-toggle-desc`
- [127:30] (JSXAttribute) Static aria-describedby attribute: `ai-analysis-toggle-desc`
  - context: `aria-labelledby="ai-analysis-toggle-label" aria-describedby="ai-analysis-toggle-desc" data-testid="ai-toggle" />`

### src/components/profile-sections/DashboardSection.tsx

- [87:46] (JSXText) Static JSX text node: `Oversikt`
  - context: `er justify-between"> <div> <h2 className="text-2xl font-bold">Oversikt</h2> <p className="text-muted-foreground"> Sammen`
- [89:13] (JSXText) Static JSX text node: `Sammendrag av`
  - context: `bold">Oversikt</h2> <p className="text-muted-foreground"> Sammendrag av {student.name}s data og aktivitet </p> </div>`
- [89:41] (JSXText) Static JSX text node: `s data og aktivitet`
  - context: `<p className="text-muted-foreground"> Sammendrag av {student.name}s data og aktivitet </p> </div> <Button onCl`
- [106:13] (JSXText) Static JSX text node: `Analysestatus`
  - context: `items-center gap-2"> <BarChart3 className="h-5 w-5" /> Analysestatus </CardTitle> </CardHeader> <CardContent>`
- [180:13] (JSXText) Static JSX text node: `Datakvalitet`
  - context: `"flex items-center gap-2"> <Info className="h-5 w-5" /> Datakvalitet </CardTitle> </CardHeader> <CardContent>`
- [186:60] (JSXText) Static JSX text node: `Samlet kvalitetsscore`
  - context: `"> <div> <p className="text-sm text-muted-foreground">Samlet kvalitetsscore</p> <p className="text-3xl font-bold">{dataQ`
- [247:15] (JSXText) Static JSX text node: `AI-genererte innsikter`
  - context: `"> <TrendingUp className="h-5 w-5 animate-pulse" /> AI-genererte innsikter </CardTitle> </CardHeader>`
- [262:15] (JSXText) Static JSX text node: `AI-genererte innsikter`
  - context: `s-center gap-2"> <TrendingUp className="h-5 w-5" /> AI-genererte innsikter </CardTitle> </CardHeader>`
- [280:54] (JSXText) Static JSX text node: `Nylige økter`
  - context: `gth > 0 && ( <div> <h3 className="text-lg font-semibold mb-4">Nylige økter</h3> <PaginatedSessionsList sessions={filteredData.entrie`

### src/components/profile-sections/ToolsSection.tsx

- [90:44] (JSXText) Static JSX text node: `Verktøy`
  - context: `6"> {/* Header */} <div> <h2 className="text-2xl font-bold">Verktøy</h2> <p className="text-muted-foreground"> Avanserte v`
- [92:11] (JSXText) Static JSX text node: `Avanserte verktøy for søk, maler og sammenligning`
  - context: `font-bold">Verktøy</h2> <p className="text-muted-foreground"> Avanserte verktøy for søk, maler og sammenligning </p> </div>`

### src/components/tegn/TegnXPBar.tsx

- [7:90] (JSXAttribute) Static aria-label attribute: `XP progress`
  - context: `className="w-full bg-muted/50 border border-border rounded-full h-3" aria-label="XP progress"> <div className="bg-primary h-3 rounded-full transit`
- [17:59] (JSXText) Static JSX text node: `Level`
  - context: `} progress\`} /> <div className="mt-1 text-xs text-muted-foreground">Level {level} · {progressThisLevel}/100 XP</div> </div> ); };`
- [17:73] (JSXText) Static JSX text node: `·`
  - context: `/> <div className="mt-1 text-xs text-muted-foreground">Level {level} · {progressThisLevel}/100 XP</div> </div> ); };`
- [17:94] (JSXText) Static JSX text node: `/100 XP`
  - context: `assName="mt-1 text-xs text-muted-foreground">Level {level} · {progressThisLevel}/100 XP</div> </div> ); };`

### src/components/tegn/WebcamPreview.tsx

- [51:20] (JSXAttribute) Static aria-label attribute: `Webcam preview`
  - context: `rrored && 'scale-x-[-1]')} playsInline muted aria-label="Webcam preview" /> </div> ); };`

### src/components/ui/Breadcrumbs.tsx

- [19:21] (JSXAttribute) Static aria-label attribute: `Breadcrumb`
  - context: `if (!items || items.length === 0) return null; return ( <nav aria-label="Breadcrumb" className={cn('text-xs text-muted-foreground', className)}> <`

### src/components/ui/date-range-picker.tsx

- [68:21] (JSXText) Static JSX text node: `Pick a date range`
  - context: `t(date.from, "LLL dd, y") ) ) : ( <span>Pick a date range</span> )} </Button> </PopoverTri`

### src/components/ui/dialog.tsx

- [133:54] (JSXText) Static JSX text node: `Dialog`
  - context: `{ensureTitle && ( <DialogPrimitive.Title className="sr-only">Dialog</DialogPrimitive.Title> )} {ensureDescription && (`
- [136:60] (JSXText) Static JSX text node: `Dialog content`
  - context: `sureDescription && ( <DialogPrimitive.Description className="sr-only">Dialog content</DialogPrimitive.Description> )} {children}`
- [141:37] (JSXText) Static JSX text node: `Close`
  - context: `round"> <X className="h-4 w-4" /> <span className="sr-only">Close</span> </DialogPrimitive.Close> </DialogPrimitive.Content>`

### src/components/ui/sheet.tsx

- [102:53] (JSXText) Static JSX text node: `Menu`
  - context: `> {ensureTitle && ( <SheetPrimitive.Title className="sr-only">Menu</SheetPrimitive.Title> )} {ensureDescription && (`
- [105:59] (JSXText) Static JSX text node: `Sidebar drawer`
  - context: `nsureDescription && ( <SheetPrimitive.Description className="sr-only">Sidebar drawer</SheetPrimitive.Description> )} {children}`
- [110:37] (JSXText) Static JSX text node: `Close`
  - context: `ndary"> <X className="h-4 w-4" /> <span className="sr-only">Close</span> </SheetPrimitive.Close> </SheetPrimitive.Content>`

### src/components/ui/sidebar.tsx

- [280:33] (JSXText) Static JSX text node: `Toggle Sidebar`
  - context: `}} {...props} > <PanelLeft /> <span className="sr-only">Toggle Sidebar</span> </Button> ) }) SidebarTrigger.displayName = "Sidebar`
- [296:18] (JSXAttribute) Static aria-label attribute: `Toggle Sidebar`
  - context: `return ( <button ref={ref} data-sidebar="rail" aria-label="Toggle Sidebar" tabIndex={-1} onClick={toggleSidebar} title="`
- [299:13] (JSXAttribute) Static title attribute: `Toggle Sidebar`
  - context: `="Toggle Sidebar" tabIndex={-1} onClick={toggleSidebar} title="Toggle Sidebar" className={cn( "absolute inset-y-0 z-20 hidden w-`

### src/config/loaders/analytics.loader.ts

- [209:17] (MessageAPI) Message API call: info(): `analytics.loader hot-reloaded: cache invalidated`
  - context: `t(() => { cachedConfig = null; cacheStamp = Date.now(); logger.info('analytics.loader hot-reloaded: cache invalidated'); }); } // Optional: consu`

### src/config/validators/analytics.validator.ts

- [37:18] (MessageAPI) Message API call: error(): `analytics.config validation failed; using fallback defaults`
  - context: `sult.error); // Log once with normalized diagnostics try { logger.error('analytics.config validation failed; using fallback defaults', { errors,`

### src/contexts/TrackingContext.tsx

- [203:23] (MessageAPI) Message API call: warning(): `Session timed out due to inactivity`
  - context: `ntax sessionTimeoutRef.current = setTimeout(() => { toast.warning('Session timed out due to inactivity'); endSession(true); }, newCo`
- [203:23] (MessageAPI) sonner toast.warning(): `Session timed out due to inactivity`
  - context: `ntax sessionTimeoutRef.current = setTimeout(() => { toast.warning('Session timed out due to inactivity'); endSession(true); }, newCo`
- [208:17] (MessageAPI) Message API call: info(): `[TrackingContext] Started new session`
  - context: `endSession(true); }, newConfig.sessionTimeout); } logger.info('[TrackingContext] Started new session', { sessionId, studentId }); }, [curren`
- [235:17] (MessageAPI) Message API call: info(): `[TrackingContext] Ended session`
  - context: `on_${currentSession.studentId}\`); setCurrentSession(null); logger.info('[TrackingContext] Ended session', { sessionId: currentSession.id }); }, [curr`
- [256:17] (MessageAPI) Message API call: info(): `[TrackingContext] Paused session`
  - context: `imerRef.current); autoSaveTimerRef.current = null; } logger.info('[TrackingContext] Paused session', { sessionId: currentSession.id }); }, [cur`
- [281:17] (MessageAPI) Message API call: info(): `[TrackingContext] Resumed session`
  - context: `n(); } }, sessionConfig.autoSaveInterval); } logger.info('[TrackingContext] Resumed session', { sessionId: currentSession.id }); }, [cu`
- [312:23] (MessageAPI) Message API call: warning(): `Session timed out due to inactivity`
  - context: `ntax sessionTimeoutRef.current = setTimeout(() => { toast.warning('Session timed out due to inactivity'); endSession(true); }, sessi`
- [312:23] (MessageAPI) sonner toast.warning(): `Session timed out due to inactivity`
  - context: `ntax sessionTimeoutRef.current = setTimeout(() => { toast.warning('Session timed out due to inactivity'); endSession(true); }, sessi`
- [364:23] (MessageAPI) Message API call: warning(): `Session timed out due to inactivity`
  - context: `ntax sessionTimeoutRef.current = setTimeout(() => { toast.warning('Session timed out due to inactivity'); endSession(true); }, sessi`
- [364:23] (MessageAPI) sonner toast.warning(): `Session timed out due to inactivity`
  - context: `ntax sessionTimeoutRef.current = setTimeout(() => { toast.warning('Session timed out due to inactivity'); endSession(true); }, sessi`
- [491:21] (MessageAPI) Message API call: success(): `Session saved successfully`
  - context: `// Analytics is triggered by unified helper; no-op here toast.success('Session saved successfully'); logger.info('[TrackingContext] Session save`
- [491:21] (MessageAPI) sonner toast.success(): `Session saved successfully`
  - context: `// Analytics is triggered by unified helper; no-op here toast.success('Session saved successfully'); logger.info('[TrackingContext] Session save`
- [492:19] (MessageAPI) Message API call: info(): `[TrackingContext] Session saved`
  - context: `o-op here toast.success('Session saved successfully'); logger.info('[TrackingContext] Session saved', { sessionId: currentSession.id,`
- [499:20] (MessageAPI) Message API call: error(): `[TrackingContext] Failed to save session`
  - context: `}); return trackingEntry; } catch (error) { logger.error('[TrackingContext] Failed to save session', { error }); toast.error('Faile`
- [500:19] (MessageAPI) Message API call: error(): `Failed to save session`
  - context: `error('[TrackingContext] Failed to save session', { error }); toast.error('Failed to save session'); return null; } }, [currentSession, valida`
- [500:19] (MessageAPI) sonner toast.error(): `Failed to save session`
  - context: `error('[TrackingContext] Failed to save session', { error }); toast.error('Failed to save session'); return null; } }, [currentSession, valida`
- [543:16] (MessageAPI) Message API call: info(): `Session discarded`
  - context: `ion_${currentSession.studentId}\`); setCurrentSession(null); toast.info('Session discarded'); logger.info('[TrackingContext] Session discarded', { s`
- [543:16] (MessageAPI) sonner toast.info(): `Session discarded`
  - context: `ion_${currentSession.studentId}\`); setCurrentSession(null); toast.info('Session discarded'); logger.info('[TrackingContext] Session discarded', { s`
- [544:17] (MessageAPI) Message API call: info(): `[TrackingContext] Session discarded`
  - context: `setCurrentSession(null); toast.info('Session discarded'); logger.info('[TrackingContext] Session discarded', { sessionId: currentSession.id }); }, [`
- [553:19] (MessageAPI) Message API call: error(): `Session not found`
  - context: `= sessions.find(s => s.id === sessionId); if (!session) { toast.error('Session not found'); return; } setCurrentSession(session); t`
- [553:19] (MessageAPI) sonner toast.error(): `Session not found`
  - context: `= sessions.find(s => s.id === sessionId); if (!session) { toast.error('Session not found'); return; } setCurrentSession(session); t`
- [558:19] (MessageAPI) Message API call: success(): `Session recovered`
  - context: `found'); return; } setCurrentSession(session); toast.success('Session recovered'); logger.info('[TrackingContext] Session recovered', { s`
- [558:19] (MessageAPI) sonner toast.success(): `Session recovered`
  - context: `found'); return; } setCurrentSession(session); toast.success('Session recovered'); logger.info('[TrackingContext] Session recovered', { s`
- [559:17] (MessageAPI) Message API call: info(): `[TrackingContext] Session recovered`
  - context: `urrentSession(session); toast.success('Session recovered'); logger.info('[TrackingContext] Session recovered', { sessionId }); }, [sessions]); /**`

### src/hooks/useAnalyticsWorker.ts

- [95:20] (MessageAPI) Message API call: error(): `[useAnalyticsWorker] Worker runtime error, switching to fallback`
  - context: `} }; worker.onerror = (error: ErrorEvent) => { logger.error('[useAnalyticsWorker] Worker runtime error, switching to fallback', error);`
- [132:17] (MessageAPI) Message API call: info(): `[useAnalyticsWorker] Analytics worker initialized successfully`
  - context: `singleton.ready = false; // will flip true on first onmessage logger.info('[useAnalyticsWorker] Analytics worker initialized successfully'); return wo`
- [135:18] (MessageAPI) Message API call: error(): `[useAnalyticsWorker] Failed to initialize worker`
  - context: `ialized successfully'); return worker; } catch (error) { logger.error('[useAnalyticsWorker] Failed to initialize worker', error as Error); singlet`
- [399:26] (MessageAPI) Message API call: error(): `[useAnalyticsWorker] Failed handling worker message`
  - context: `break; } } catch (e) { logger.error('[useAnalyticsWorker] Failed handling worker message', e as Error); }`
- [404:24] (MessageAPI) Message API call: error(): `[useAnalyticsWorker] messageerror from analytics worker`
  - context: `const onMessageError = (evt: MessageEvent) => { logger.error('[useAnalyticsWorker] messageerror from analytics worker', evt); };`
- [524:22] (MessageAPI) Message API call: error(): `[useAnalyticsWorker] AI analysis path failed`
  - context: `s as AnalyticsResultsAI, cacheTags); } catch (err) { logger.error('[useAnalyticsWorker] AI analysis path failed', err); setError('AI analy`
- [531:24] (MessageAPI) Message API call: error(): `[useAnalyticsWorker] Fallback after AI failure also failed`
  - context: `ResultsAI, cacheTags); } catch (fallbackError) { logger.error('[useAnalyticsWorker] Fallback after AI failure also failed', fallbackError);`
- [565:22] (MessageAPI) Message API call: error(): `[useAnalyticsWorker] Fallback failed`
  - context: `eTagsRef.current.delete(cacheKey); } catch (error) { logger.error('[useAnalyticsWorker] Fallback failed', error); setError('Analytics proc`
- [600:22] (MessageAPI) Message API call: error(): `[useAnalyticsWorker] watchdog timeout: worker did not respond, attempting fallback`
  - context: `watchdogRef.current = setTimeout(async () => { try { logger.error('[useAnalyticsWorker] watchdog timeout: worker did not respond, attempting fallb`
- [620:22] (MessageAPI) Message API call: error(): `[useAnalyticsWorker] Fallback failed after watchdog timeout`
  - context: `ed using fallback mode.'); } catch (fallbackError) { logger.error('[useAnalyticsWorker] Fallback failed after watchdog timeout', fallbackError);`
- [699:20] (MessageAPI) Message API call: error(): `[WORKER_MESSAGE] Failed to post message to worker, falling back to sync`
  - context: `'Worker reference missing'); } } catch (postErr) { logger.error('[WORKER_MESSAGE] Failed to post message to worker, falling back to sync', { err`
- [713:22] (MessageAPI) Message API call: error(): `[useAnalyticsWorker] Fallback processing failed after worker post error`
  - context: `); setError(null); } catch (fallbackError) { logger.error('[useAnalyticsWorker] Fallback processing failed after worker post error', fallb`

### src/hooks/useDashboardData.ts

- [35:20] (MessageAPI) Message API call: error(): `Dashboard: Error loading students`
  - context: `e.getStudents(); setStudents(s); } catch (error) { logger.error('Dashboard: Error loading students', { error }); setStudents([]); } fi`
- [114:20] (MessageAPI) Message API call: error(): `Dashboard: Error calculating statistics`
  - context: `end, entries: entriesTrend }, }; } catch (error) { logger.error('Dashboard: Error calculating statistics', { error }); return { todayEntri`

### src/hooks/useDataAnalysis.ts

- [57:22] (MessageAPI) Message API call: error(): `Pattern analysis failed in useDataAnalysis hook`
  - context: `rrelationMatrix(matrix); } } catch (error) { logger.error('Pattern analysis failed in useDataAnalysis hook', { error }); } finally {`

### src/hooks/useFilteredData.ts

- [124:20] (MessageAPI) Message API call: error(): `useFilteredData failed`
  - context: `ackingEntries: parsedTracking }; } catch (error) { logger.error("useFilteredData failed", { error }); return { emotions: [], sensoryInputs`

### src/hooks/usePerformanceMonitor.ts

- [373:17] (MessageAPI) Message API call: info(): `[Performance Report]`
  - context: `logReport = useCallback(() => { const report = getReport(); logger.info('[Performance Report]', report); }, [getReport]); return { trackCompone`

### src/hooks/usePinnedAlerts.ts

- [24:18] (MessageAPI) Message API call: error(): `usePinnedAlerts: failed to read from localStorage`
  - context: `r = error instanceof Error ? error : new Error(String(error)); logger.error('usePinnedAlerts: failed to read from localStorage', err); return []; } }`
- [34:18] (MessageAPI) Message API call: error(): `usePinnedAlerts: failed to write to localStorage`
  - context: `r = error instanceof Error ? error : new Error(String(error)); logger.error('usePinnedAlerts: failed to write to localStorage', err); } } export function`

### src/hooks/useRealtimeData.ts

- [292:21] (MessageAPI) Message API call: info(): `Real-time data connection would be established here`
  - context: `simulateDataStream, options.updateInterval); } else { logger.info('Real-time data connection would be established here'); } //`

### src/hooks/useStudentData.ts

- [79:20] (MessageAPI) Message API call: error(): `Failed to load student data:`
  - context: `catch (e) { setError('Failed to load student data.'); logger.error('Failed to load student data:', e); } finally { setIsLoading(false);`

### src/lib/ai/openrouterClient.ts

- [171:21] (MessageAPI) Message API call: info(): `[OpenRouter] Request start`
  - context: `Pre-request logging (sanitized) if (attempt === 0) { logger.info('[OpenRouter] Request start', sanitizeRequestForLog({ url: endpoint, method: 'PO`
- [318:19] (MessageAPI) Message API call: info(): `[OpenRouter] Request success`
  - context: `tEstimate(response.model || merged.config.modelName, usage); logger.info('[OpenRouter] Request success', { model: response.model, usage,`
- [454:19] (MessageAPI) Message API call: info(): `[OpenRouter] JSON-mode success`
  - context: `tEstimate(response.model || merged.config.modelName, usage); logger.info('[OpenRouter] JSON-mode success', { model: response.model, usage`

### src/lib/alertSystem.ts

- [160:20] (MessageAPI) Message API call: error(): `Error saving alerts:`
  - context: `= error instanceof Error ? error : new Error(String(error)); logger.error('Error saving alerts:', err); // Actionable hint for POC/demo users`
- [177:22] (MessageAPI) Message API call: error(): `Failed to save alerts even after cleanup:`
  - context: `anceof Error ? retryError : new Error(String(retryError)); logger.error('Failed to save alerts even after cleanup:', err2); // In demo mode, we`
- [205:20] (MessageAPI) Message API call: error(): `Error loading alerts:`
  - context: `= error instanceof Error ? error : new Error(String(error)); logger.error('Error loading alerts:', err); return []; } } /** * Retrieves`
- [254:20] (MessageAPI) Message API call: error(): `Error marking alert as viewed:`
  - context: `= error instanceof Error ? error : new Error(String(error)); logger.error('Error marking alert as viewed:', err); } } /** * Resolves a specifi`
- [282:20] (MessageAPI) Message API call: error(): `Error resolving alert:`
  - context: `= error instanceof Error ? error : new Error(String(error)); logger.error('Error resolving alert:', err); } } /** * Deletes a specific alert f`
- [298:20] (MessageAPI) Message API call: error(): `Error deleting alert:`
  - context: `= error instanceof Error ? error : new Error(String(error)); logger.error('Error deleting alert:', err); } } /** * Retrieves the current alert`
- [315:20] (MessageAPI) Message API call: error(): `Error loading alert settings:`
  - context: `= error instanceof Error ? error : new Error(String(error)); logger.error('Error loading alert settings:', err); return this.defaultSettings; }`
- [332:20] (MessageAPI) Message API call: error(): `Error updating alert settings:`
  - context: `= error instanceof Error ? error : new Error(String(error)); logger.error('Error updating alert settings:', err); } } /** * Provides a summary`
- [393:20] (MessageAPI) Message API call: error(): `Error cleaning up old alerts:`
  - context: `= error instanceof Error ? error : new Error(String(error)); logger.error('Error cleaning up old alerts:', err); } } /** * Exports alerts to a`

### src/lib/analysis/heuristicAnalysisEngine.ts

- [129:20] (MessageAPI) Message API call: error(): `[HeuristicAnalysisEngine] analyzeStudent: invalid studentId`
  - context: `early if (!studentId || typeof studentId !== 'string') { logger.error('[HeuristicAnalysisEngine] analyzeStudent: invalid studentId', { studentId });`
- [189:20] (MessageAPI) Message API call: error(): `[HeuristicAnalysisEngine] analyzeStudent failed`
  - context: `), ai: aiMeta } as AnalyticsResultsAI; } catch (error) { logger.error('[HeuristicAnalysisEngine] analyzeStudent failed', { error: error instanceof Err`

### src/lib/analysis/llmAnalysisEngine.ts

- [175:20] (MessageAPI) Message API call: error(): `[LLMAnalysisEngine] analyzeStudent: invalid studentId`
  - context: `AI> { if (!studentId || typeof studentId !== 'string') { logger.error('[LLMAnalysisEngine] analyzeStudent: invalid studentId', { studentId }); r`
- [340:20] (MessageAPI) Message API call: error(): `[LLMAnalysisEngine] analyzeStudent failed`
  - context: `MEMORY_TTL_MS }); return merged; } catch (error) { logger.error('[LLMAnalysisEngine] analyzeStudent failed', { error: error instanceof Error ? {`

### src/lib/analysis/llmUtils.ts

- [102:18] (MessageAPI) Message API call: error(): `[LLM] validateOrRepairAiReport failed`
  - context: `report: parsed2, repaired: true, caveats }; } catch (err) { logger.error('[LLM] validateOrRepairAiReport failed', { error: err instanceof Error ? { messa`

### src/lib/analysis/mapReduce.ts

- [169:18] (MessageAPI) Message API call: error(): `[mapReduce] reduceSummariesToFinalReport failed`
  - context: `sResults; return { ok: true, report }; } catch (error) { logger.error('[mapReduce] reduceSummariesToFinalReport failed', { error: error instanceof Err`
- [205:18] (MessageAPI) Message API call: error(): `[mapReduce] analyzeLargePeriod error`
  - context: `.ok) return null; return final.report; } catch (error) { logger.error('[mapReduce] analyzeLargePeriod error', { error: error instanceof Error ? { mess`

### src/lib/analyticsConfig.ts

- [517:20] (MessageAPI) Message API call: error(): `Failed to import configuration:`
  - context: `turn true; } return false; } catch (error) { logger.error('Failed to import configuration:', error); return false; } } priv`
- [537:20] (MessageAPI) Message API call: error(): `Failed to load analytics configuration:`
  - context: `ICS_CONFIG, parsed); } } } catch (error) { logger.error('Failed to load analytics configuration:', error); } return { ...DEFAULT`
- [554:24] (MessageAPI) Message API call: error(): `Failed to save analytics configuration:`
  - context: `// Silent fail if unable to remove key } logger.error('Failed to save analytics configuration:', err); } } } catch (`
- [558:20] (MessageAPI) Message API call: error(): `Failed to save analytics configuration:`
  - context: `nfiguration:', err); } } } catch (error) { logger.error('Failed to save analytics configuration:', error); } } private notifyLi`

### src/lib/analyticsConfigOverride.ts

- [9:15] (MessageAPI) Message API call: info(): `Applying development analytics configuration for better pattern detection`
  - context: `less data */ export function applyDevelopmentAnalyticsConfig() { logger.info('Applying development analytics configuration for better pattern detection');`
- [70:18] (MessageAPI) Message API call: error(): `Failed to apply development analytics config (non-fatal):`
  - context: `ANALYSIS_PERIOD_DAYS: 30, }, }); } catch (error) { logger.error('Failed to apply development analytics config (non-fatal):', error); } } // A`

### src/lib/analyticsConfigValidation.ts

- [63:18] (MessageAPI) Message API call: error(): `[analyticsConfigValidation] Invalid analytics configuration detected. Falling back to defaults.`
  - context: `} } catch (err) { // fall through to default } try { logger.error('[analyticsConfigValidation] Invalid analytics configuration detected. Falling b`

### src/lib/analyticsExport.ts

- [349:24] (MessageAPI) Message API call: error(): `Error adding chart export to PDF:`
  - context: `colIndex = 1; } } catch (e) { logger.error('Error adding chart export to PDF:', e); } } } else if (export`
- [373:24] (MessageAPI) Message API call: error(): `Error adding chart to PDF:`
  - context: `urrentY, imgWidth, imgHeight); } catch (error) { logger.error('Error adding chart to PDF:', error); } } } // Save the P`

### src/lib/analyticsManager.ts

- [86:18] (MessageAPI) Message API call: error(): `[analyticsManager] ensureUniversalAnalyticsInitialization failed`
  - context: `ated during initialization saveProfiles(); } catch (e) { logger.error('[analyticsManager] ensureUniversalAnalyticsInitialization failed', e); } };`
- [272:20] (MessageAPI) Message API call: error(): `[analyticsManager] initializeStudentAnalytics failed`
  - context: `entId, profile); saveProfiles(); } catch (error) { logger.error('[analyticsManager] initializeStudentAnalytics failed', { error, studentId });`
- [368:21] (MessageAPI) Message API call: info(): `[analyticsManager] Manager TTL cache disabled; not storing results.`
  - context: `results, timestamp: new Date() }); } else { try { logger.info('[analyticsManager] Manager TTL cache disabled; not storing results.'); }`
- [404:20] (MessageAPI) Message API call: error(): `[analyticsManager] generateAnalytics: invalid student`
  - context: `y guard for invalid input if (!student || !student.id) { logger.error('[analyticsManager] generateAnalytics: invalid student', { student }); ret`
- [580:20] (MessageAPI) Message API call: error(): `[analyticsManager] triggerAnalyticsForStudent failed`
  - context: `ait this.getStudentAnalytics(student); } catch (error) { logger.error('[analyticsManager] triggerAnalyticsForStudent failed', { error, studentId: stud`
- [751:19] (MessageAPI) Message API call: info(): `[analyticsManager] Cleared all analytics caches`
  - context: `geCaches(); summary.localStorage = localStorageResult; logger.info('[analyticsManager] Cleared all analytics caches', summary); return { ok:`
- [754:20] (MessageAPI) Message API call: error(): `[analyticsManager] clearAllAnalyticsCaches failed`
  - context: `mary); return { ok: true, summary }; } catch (e) { logger.error('[analyticsManager] clearAllAnalyticsCaches failed', e as Error); return {`
- [780:19] (MessageAPI) Message API call: info(): `[analyticsManager] Cleared student caches`
  - context: `hook broadcast this.notifyWorkerCacheClear(studentId); logger.info('[analyticsManager] Cleared student caches', { studentId }); return { ok:`
- [783:20] (MessageAPI) Message API call: error(): `[analyticsManager] clearStudentCaches failed`
  - context: `}); return { ok: true, studentId }; } catch (e) { logger.error('[analyticsManager] clearStudentCaches failed', e as Error); return { ok:`
- [794:58] (MessageAPI) Message API call: error(): `Error saving analytics profiles:`
  - context: `rofiles.saveProfiles() try { saveProfiles(); } catch (error) { logger.error('Error saving analytics profiles:', error); } } /** * Engine factory: se`
- [975:18] (MessageAPI) Message API call: error(): `[analyticsManager.orchestrator] getInsights failed`
  - context: `inputs.goals?.length ?? 0, }, }; } catch (error) { logger.error('[analyticsManager.orchestrator] getInsights failed', { error }); const cach`

### src/lib/analyticsManagerLite.ts

- [26:20] (MessageAPI) Message API call: error(): `[analyticsManagerLite] Failed to initialize student`
  - context: `Student initialized', { studentId }); } catch (error) { logger.error('[analyticsManagerLite] Failed to initialize student', { error, studentId });`

### src/lib/analyticsPrecomputation.ts

- [278:30] (MessageAPI) Message API call: error(): `[PrecomputationManager] Task failed`
  - context: `ocessedTasks.add(task.id); } catch (err) { try { logger.error('[PrecomputationManager] Task failed', err as Error); } catch { /* noop */ }`

### src/lib/analyticsProfiles.ts

- [40:18] (MessageAPI) Message API call: error(): `[analyticsProfiles] Failed to load profiles`
  - context: `lyzedAt) : null, }); } } } catch (error) { logger.error('[analyticsProfiles] Failed to load profiles', { error }); } return map; }`
- [62:18] (MessageAPI) Message API call: error(): `[analyticsProfiles] Failed to save profiles`
  - context: `ticsProfiles, JSON.stringify(data)); } } catch (error) { logger.error('[analyticsProfiles] Failed to save profiles', { error }); } } export functio`
- [104:17] (MessageAPI) Message API call: info(): `[analyticsProfiles] Cleared all profiles`
  - context: `localStorage.removeItem(STORAGE_KEYS.analyticsProfiles); } logger.info('[analyticsProfiles] Cleared all profiles', { count }); } catch (error) {`
- [106:18] (MessageAPI) Message API call: error(): `[analyticsProfiles] Failed to clear all profiles`
  - context: `ofiles] Cleared all profiles', { count }); } catch (error) { logger.error('[analyticsProfiles] Failed to clear all profiles', { error }); } return cou`
- [120:17] (MessageAPI) Message API call: info(): `[analyticsProfiles] Cleared student profile`
  - context: `ofile>).delete(studentId); if (existed) { saveProfiles(); logger.info('[analyticsProfiles] Cleared student profile', { studentId }); } return exis`
- [132:15] (MessageAPI) Message API call: info(): `[analyticsProfiles] Reset profiles to default state`
  - context: `Map<string, StudentAnalyticsProfile>).clear(); saveProfiles(); logger.info('[analyticsProfiles] Reset profiles to default state'); } /** * Return simple`

### src/lib/analyticsWorkerFallback.ts

- [55:24] (MessageAPI) Message API call: error(): `Fallback: Manager-based analytics failed; continuing with local processing`
  - context: `alyticsResults); return; } catch (e) { logger.error('Fallback: Manager-based analytics failed; continuing with local processing', e)`
- [78:24] (MessageAPI) Message API call: error(): `Fallback: Error analyzing emotion patterns`
  - context: `patterns.push(...emotionPatterns); } catch (e) { logger.error('Fallback: Error analyzing emotion patterns', e); } } await`
- [89:24] (MessageAPI) Message API call: error(): `Fallback: Error analyzing sensory patterns`
  - context: `patterns.push(...sensoryPatterns); } catch (e) { logger.error('Fallback: Error analyzing sensory patterns', e); } } await`
- [101:24] (MessageAPI) Message API call: error(): `Fallback: Error analyzing correlations`
  - context: `populate environmentalCorrelations } catch (e) { logger.error('Fallback: Error analyzing correlations', e); } } await new`
- [118:24] (MessageAPI) Message API call: error(): `Fallback: Error generating predictive insights`
  - context: `tiveInsights = predictiveInsights; } catch (e) { logger.error('Fallback: Error generating predictive insights', e); } await n`
- [131:24] (MessageAPI) Message API call: error(): `Fallback: Error detecting anomalies`
  - context: `results.anomalies = anomalies; } catch (e) { logger.error('Fallback: Error detecting anomalies', e); } } // Generate`
- [148:20] (MessageAPI) Message API call: error(): `Fallback analytics failed`
  - context: `); } resolve(results); } catch (error) { logger.error('Fallback analytics failed', error); reject(error instanceof Error ? error`

### src/lib/apiConnectivityValidator.ts

- [101:17] (MessageAPI) Message API call: info(): `[apiConnectivityValidator] Connectivity OK for model`
  - context: `urn the single word OK.', undefined, { suppressToasts: true }); logger.info('[apiConnectivityValidator] Connectivity OK for model'); cache[cacheId] = {`
- [136:20] (MessageAPI) Message API call: error(): `[apiConnectivityValidator] Connectivity failed`
  - context: `nippet = msg.length > 120 ? msg.slice(0, 120) + '...' : msg; logger.error('[apiConnectivityValidator] Connectivity failed', { errors, name, snippet });`

### src/lib/cacheManager.ts

- [53:19] (MessageAPI) Message API call: info(): `[cacheManager] Starting global cache clear`
  - context: `ync clearAllCaches(): Promise<CacheManagerResult> { try { logger.info('[cacheManager] Starting global cache clear'); this.lastClearAll = Date.no`
- [86:19] (MessageAPI) Message API call: info(): `[cacheManager] Global cache clear completed`
  - context: `await analyticsManager.clearAllAnalyticsCaches(false); logger.info('[cacheManager] Global cache clear completed', { managerResult,`
- [100:20] (MessageAPI) Message API call: error(): `[cacheManager] Failed to clear all caches`
  - context: `managerResult } }; } catch (error) { logger.error('[cacheManager] Failed to clear all caches', error as Error); return {`
- [121:19] (MessageAPI) Message API call: info(): `[cacheManager] Starting student cache clear`
  - context: `sage: 'Invalid student ID provided' }; } try { logger.info('[cacheManager] Starting student cache clear', { studentId }); this.lastCl`
- [156:19] (MessageAPI) Message API call: info(): `[cacheManager] Student cache clear completed`
  - context: `await analyticsManager.clearStudentCaches(studentId); logger.info('[cacheManager] Student cache clear completed', { studentId, man`
- [172:20] (MessageAPI) Message API call: error(): `[cacheManager] Failed to clear student caches`
  - context: `managerResult } }; } catch (error) { logger.error('[cacheManager] Failed to clear student caches', error as Error); return {`
- [188:17] (MessageAPI) Message API call: info(): `[cacheManager] Clearing caches by type`
  - context: `rCachesByType(cacheType: string): Promise<CacheManagerResult> { logger.info('[cacheManager] Clearing caches by type', { cacheType }); // For now, r`

### src/lib/chartUtils.ts

- [125:20] (MessageAPI) Message API call: error(): `Invalid chart data row:`
  - context: `turn ChartEmotionRowSchema.parse(row); } catch (error) { logger.error('Invalid chart data row:', row, error); // Return a safe default if valida`

### src/lib/dataStorage.ts

- [363:20] (MessageAPI) Message API call: error(): `Failed to parse student data from localStorage`
  - context: `}; } return null; } catch (error) { logger.error('Failed to parse student data from localStorage', error); return null;`
- [432:9] (MessageAPI) Message API call: error(): `Failed to parse tracking entries from localStorage`
  - context: `e() - a.timestamp.getTime()); } catch (error) { logger.error( 'Failed to parse tracking entries from localStorage', error );`
- [778:20] (MessageAPI) Message API call: error(): `Error deleting student:`
  - context: `ear(studentId); } catch { /* noop */ } } catch (error) { logger.error('Error deleting student:', error); throw error; } } } // Export sin`

### src/lib/diagnostics.ts

- [160:18] (MessageAPI) Message API call: error(): `[DIAGNOSTIC] Worker Timeout!`
  - context: `timeout: number) { if (!this.diagnosticMode) return; logger.error('[DIAGNOSTIC] Worker Timeout!', { workerName, timeout, timesta`

### src/lib/enhancedPatternAnalysis.ts

- [93:20] (MessageAPI) Message API call: error(): `Failed to initialize ML models:`
  - context: `this.mlModelsInitialized = true; } catch (error) { logger.error('Failed to initialize ML models:', error); this.mlModelsInitialized = fals`
- [183:22] (MessageAPI) Message API call: error(): `ML emotion prediction failed:`
  - context: `}); } } } catch (error) { logger.error('ML emotion prediction failed:', error); } } // Statistical senso`
- [248:22] (MessageAPI) Message API call: error(): `ML sensory prediction failed:`
  - context: `}); } } } catch (error) { logger.error('ML sensory prediction failed:', error); } } // Goal achievement`
- [927:20] (MessageAPI) Message API call: error(): `Baseline clustering failed:`
  - context: `ingEntries, 3); return clusters; } catch (error) { logger.error('Baseline clustering failed:', error); return []; } } } export cons`

### src/lib/errorHandler.ts

- [94:22] (MessageAPI) Message API call: error(): `Error in custom error handler`
  - context: `onError(appError); } catch (callbackError) { logger.error('Error in custom error handler', callbackError); } } // Process e`
- [166:22] (MessageAPI) Message API call: error(): `Critical error occurred`
  - context: `rorType.DATA_CORRUPTED: case ErrorType.UNAUTHORIZED: logger.error('Critical error occurred', logData); break; case ErrorType.NETWORK`
- [173:22] (MessageAPI) Message API call: error(): `Application error`
  - context: `k error occurred', logData); break; default: logger.error('Application error', logData); } } /** * Show user-friendly error to`
- [199:30] (MessageAPI) Message API call: error(): `Retry handler failed`
  - context: `or); } } catch (e) { logger.error('Retry handler failed', e as Error); } }, }`
- [245:23] (MessageAPI) Message API call: success(): `Issue resolved`
  - context: `ies) { try { await strategy.recover(error); toast.success('Issue resolved', { description: 'The application has recovered from t`
- [245:23] (MessageAPI) sonner toast.success(): `Issue resolved`
  - context: `ies) { try { await strategy.recover(error); toast.success('Issue resolved', { description: 'The application has recovered from t`
- [250:22] (MessageAPI) Message API call: error(): `Recovery strategy failed`
  - context: `}); return true; } catch (recoveryError) { logger.error('Recovery strategy failed', { strategy, originalError: error`

### src/lib/inlineWorker.ts

- [47:18] (MessageAPI) Message API call: error(): `Failed to create inline worker:`
  - context: `if (workerUrl) { URL.revokeObjectURL(workerUrl); } logger.error('Failed to create inline worker:', error as Error); return null; } }`

### src/lib/insights/unified.ts

- [46:18] (MessageAPI) Message API call: error(): `[insights/unified] computeInsights: invalid inputs`
  - context: `ay(inputs.emotions) || !Array.isArray(inputs.sensoryInputs)) { logger.error('[insights/unified] computeInsights: invalid inputs', { inputsType: typeof input`
- [108:18] (MessageAPI) Message API call: error(): `[insights/unified] computeInsights failed`
  - context: `erventions: [], } as AnalyticsResults; } catch (error) { logger.error('[insights/unified] computeInsights failed', { error: error instanceof Error ? {`

### src/lib/mockData.ts

- [268:17] (MessageAPI) Message API call: info(): `seedMinimalDemoData: seeded enhanced demo data`
  - context: `alEntries = dataStorage.getEntriesForStudent(studentId).length; logger.info("seedMinimalDemoData: seeded enhanced demo data", { studentId, studentName: stud`
- [270:18] (MessageAPI) Message API call: error(): `seedMinimalDemoData: failed to seed demo data`
  - context: `udent.name, entriesCount: totalEntries }); } catch (error) { logger.error("seedMinimalDemoData: failed to seed demo data", { studentId, error }); thro`

### src/lib/mockDataGenerator.ts

- [246:18] (MessageAPI) Message API call: error(): `Generated invalid emotion entry:`
  - context: `alidateEmotionEntry(entry); if (!validationResult.isValid) { logger.error('Generated invalid emotion entry:', entry, validationResult.errors); throw n`
- [278:18] (MessageAPI) Message API call: error(): `Generated invalid sensory entry:`
  - context: `alidateSensoryEntry(entry); if (!validationResult.isValid) { logger.error('Generated invalid sensory entry:', entry, validationResult.errors); throw n`
- [629:22] (MessageAPI) Message API call: error(): `Generated invalid tracking entry for scenario`
  - context: `kingEntry(entry); if (!trackingValidation.isValid) { logger.error('Generated invalid tracking entry for scenario', { scenario, entry, errors: trac`
- [636:18] (MessageAPI) Message API call: error(): `Failed to load scenario data`
  - context: `aStorage.saveTrackingEntry(entry); } } } catch (error) { logger.error('Failed to load scenario data', error); throw new Error('Failed to initializ`
- [662:22] (MessageAPI) Message API call: error(): `Generated invalid tracking entry during bulk mock load`
  - context: `kingEntry(entry); if (!trackingValidation.isValid) { logger.error('Generated invalid tracking entry during bulk mock load', { entry, errors: track`
- [669:18] (MessageAPI) Message API call: error(): `Failed to load mock data:`
  - context: `torage.saveTrackingEntry(entry); } }); } catch (error) { logger.error('Failed to load mock data:', error); throw new Error('Failed to initialize m`
- [690:18] (MessageAPI) Message API call: error(): `Failed to clear mock data:`
  - context: `=> dataStorage.saveTrackingEntry(entry)); } catch (error) { logger.error('Failed to clear mock data:', error); throw new Error('Failed to clear mock`

### src/lib/modelEvaluation.ts

- [164:24] (MessageAPI) Message API call: error(): `[modelEvaluation] onupgradeneeded failed`
  - context: `{ keyPath: 'id' }); } } catch (err) { logger.error('[modelEvaluation] onupgradeneeded failed', err); } }; requ`

### src/lib/sessionManager.ts

- [138:17] (MessageAPI) Message API call: info(): `[SessionManager] Created new session`
  - context: `sessionId, sessionData); this.persistSession(sessionData); logger.info('[SessionManager] Created new session', { sessionId, studentId }); return se`
- [260:17] (MessageAPI) Message API call: info(): `[SessionManager] Completed session`
  - context: `ession(sessionId); // Analytics handled by unified helper logger.info('[SessionManager] Completed session', { sessionId, entryId: tracki`
- [283:17] (MessageAPI) Message API call: info(): `[SessionManager] Abandoned session`
  - context: `.delete(sessionId); this.clearPersistedSession(sessionId); logger.info('[SessionManager] Abandoned session', { sessionId }); } /** * Pause a se`
- [296:17] (MessageAPI) Message API call: info(): `[SessionManager] Paused session`
  - context: `.metadata.status = 'paused'; this.persistSession(session); logger.info('[SessionManager] Paused session', { sessionId }); return true; } /**`
- [310:17] (MessageAPI) Message API call: info(): `[SessionManager] Resumed session`
  - context: `.metadata.status = 'active'; this.persistSession(session); logger.info('[SessionManager] Resumed session', { sessionId }); return true; } /**`
- [348:22] (MessageAPI) Message API call: error(): `[SessionManager] Failed to recover session`
  - context: `veItem(key); } } } catch (error) { logger.error('[SessionManager] Failed to recover session', { key, error }); localStor`
- [355:19] (MessageAPI) Message API call: info(): `[SessionManager] Recovered sessions`
  - context: `if (recovered.length > 0) { this.saveSessionHistory(); logger.info('[SessionManager] Recovered sessions', { count: recovered.length }); }`
- [456:20] (MessageAPI) Message API call: error(): `[SessionManager] Failed to persist session`
  - context: `setItem(key, JSON.stringify(session)); } catch (error) { logger.error('[SessionManager] Failed to persist session', { sessionId: session.sess`
- [485:20] (MessageAPI) Message API call: error(): `[SessionManager] Failed to load session history`
  - context: `ime) : undefined, })); } } catch (error) { logger.error('[SessionManager] Failed to load session history', { error }); this.sessio`
- [497:20] (MessageAPI) Message API call: error(): `[SessionManager] Failed to save session history`
  - context: `JSON.stringify(this.sessionHistory)); } catch (error) { logger.error('[SessionManager] Failed to save session history', { error }); } } /**`
- [525:17] (MessageAPI) Message API call: info(): `[SessionManager] Updated validation rules`
  - context: `this.validationRules = { ...this.validationRules, ...rules }; logger.info('[SessionManager] Updated validation rules', { rules }); } /** * Update`
- [533:17] (MessageAPI) Message API call: info(): `[SessionManager] Updated quality threshold`
  - context: `dationQualityThreshold = Math.max(0, Math.min(100, threshold)); logger.info('[SessionManager] Updated quality threshold', { threshold: this.validationQualit`
- [557:17] (MessageAPI) Message API call: info(): `[SessionManager] Cleared all sessions`
  - context: `); keys.forEach(key => localStorage.removeItem(key)); logger.info('[SessionManager] Cleared all sessions'); } } // Export singleton instance ex`

### src/lib/startupValidation.ts

- [117:22] (MessageAPI) Message API call: error(): `[startupValidation] Model connectivity test failed`
  - context: `=> { if (!conn.isValid && conn.errors.length > 0) { logger.error('[startupValidation] Model connectivity test failed', { errors: conn.errors });`
- [121:21] (MessageAPI) Message API call: info(): `[startupValidation] Model connectivity OK`
  - context: `ity warnings', { warnings: conn.warnings }); } else { logger.info('[startupValidation] Model connectivity OK'); } }).catch((e) => {`

### src/lib/storageUtils.ts

- [55:20] (MessageAPI) Message API call: error(): `Error clearing old data:`
  - context: `ON.stringify(filteredAlerts)); } } catch (error) { logger.error('Error clearing old data:', error); } }, /** * Compress data before`

### src/lib/tracking/saveTrackingEntry.ts

- [37:20] (MessageAPI) Message API call: error(): `[saveTrackingEntry] Failed to save entry`
  - context: `= error instanceof Error ? error.message : 'Unknown error'; logger.error('[saveTrackingEntry] Failed to save entry', { error: message, entryId: entry?.id`
- [66:18] (MessageAPI) Message API call: error(): `[saveTrackingEntry] Unexpected failure`
  - context: `n success return { success: true, entry }; } catch (e) { logger.error('[saveTrackingEntry] Unexpected failure', e as Error); return { success: fal`

### src/lib/universalAnalyticsInitializer.ts

- [45:20] (MessageAPI) Message API call: error(): `Error initializing universal analytics:`
  - context: `this.initialized = true; } catch (error) { logger.error('Error initializing universal analytics:', error); } } /** * Ensure`
- [101:92] (MessageAPI) Message API call: error(): `Auto-initialization failed:`
  - context: `alyticsInitializer.initializeUniversalAnalytics().catch((error) => logger.error('Auto-initialization failed:', error));`

### src/lib/utils.ts

- [29:18] (MessageAPI) Message API call: error(): `downloadBlob called in a non-browser environment`
  - context: `f window === 'undefined' || typeof document === 'undefined') { logger.error('downloadBlob called in a non-browser environment'); return; } const sa`
- [47:18] (MessageAPI) Message API call: error(): `downloadBlob failed`
  - context: `lick(); document.body.removeChild(link); } catch (err) { logger.error('downloadBlob failed', err); } finally { if (url) { // Defer revocat`

### src/lib/validation/dataLeakage.ts

- [166:21] (MessageAPI) Message API call: info(): `[DataLeakageDetector] Potential leakage risk`
  - context: `, payload); } else if (issue.severity === 'medium') { logger.info('[DataLeakageDetector] Potential leakage risk', payload); } else {`
- [176:20] (MessageAPI) Message API call: error(): `[DataLeakageDetector] Strict mode abort due to leakage`
  - context: `h-risk data leakage detected: \n- ${summary.join('\n- ')}\`); logger.error('[DataLeakageDetector] Strict mode abort due to leakage', { summary }); th`

### src/pages/AddStudent.tsx

- [60:20] (MessageAPI) Message API call: error(): `Error adding student:`
  - context: `dent.success'))); navigate('/'); } catch (error) { logger.error('Error adding student:', error); const errorMessage = error instanceof Err`

### src/pages/EnhancedTrackStudent.tsx

- [141:20] (MessageAPI) Message API call: error(): `Save session error`
  - context: `navigate(\`/student/${student.id}\`); } catch (error) { logger.error('Save session error', { error }); toast.error(String(tTracking('session.sa`
- [236:83] (JSXText) Static JSX text node: `m`
  - context: `<div className="text-2xl font-bold text-primary">{sessionDuration}m</div> <div className="text-sm text-muted-foreground">{String(t`
- [261:26] (JSXText) Static JSX text node: `Session Data Review`
  - context: `th > 0) && ( <Card> <CardHeader> <CardTitle>Session Data Review</CardTitle> </CardHeader> <CardConte`

### src/pages/KreativiumAI.tsx

- [209:20] (MessageAPI) Message API call: error(): `[KreativiumAI] load students failed`
  - context: `ngth && !studentId) setStudentId(s[0].id); } catch (e) { logger.error('[KreativiumAI] load students failed', e as Error); setStudents([]); }`
- [412:22] (MessageAPI) Message API call: error(): `[KreativiumAI] Failed to resolve sources`
  - context: `setResolvedSources(sourceMap); } catch (e) { logger.error('[KreativiumAI] Failed to resolve sources', e as Error); } }`
- [521:77] (JSXText) Static JSX text node: `År:`
  - context: `p>} {source.year && <p className="text-xs text-muted-foreground mt-1">År: {source.year}</p>} </TooltipContent> </Tooltip> ); });`
- [553:52] (JSXText) Static JSX text node: `Kreativium‑AI`
  - context: `</div> <div> <h1 className="text-2xl font-bold">Kreativium‑AI</h1> <p className="text-sm text-muted-foreground">Lo`
- [554:60] (JSXText) Static JSX text node: `Lokal LLM for mønstre, korrelasjoner og tiltak`
  - context: `">Kreativium‑AI</h1> <p className="text-sm text-muted-foreground">Lokal LLM for mønstre, korrelasjoner og tiltak</p> <p className="t`
- [555:67] (JSXText) Static JSX text node: `Modell:`
  - context: `og tiltak</p> <p className="text-xs text-muted-foreground mt-0.5">Modell: <code>{displayModelName}</code> {fromUiCache && (<span className="ml-2 i`
- [555:246] (JSXText) Static JSX text node: `•`
  - context: `nter gap-1 text-[11px] rounded px-1.5 py-0.5 border border-muted-foreground/30">• {tAnalytics('interface.fromUiCache')}</span>)}</p> </div>`
- [572:17] (JSXText) Static JSX text node: `Elev`
  - context: `htmlFor={studentSelectTriggerId} > Elev </label> <Select value={studentId} onValueChang`
- [580:44] (JSXAttribute) Static placeholder attribute: `Velg elev`
  - context: `dentSelectLabelId} > <SelectValue placeholder="Velg elev" /> </SelectTrigger> <SelectContent>`
- [595:17] (JSXText) Static JSX text node: `Tidsrom`
  - context: `htmlFor={presetSelectTriggerId} > Tidsrom </label> <Select value={preset} onValueChang`
- [606:42] (JSXText) Static JSX text node: `Siste 7 dager`
  - context: `igger> <SelectContent> <SelectItem value="7d">Siste 7 dager</SelectItem> <SelectItem value="30d">Siste 30 da`
- [607:43] (JSXText) Static JSX text node: `Siste 30 dager`
  - context: `value="7d">Siste 7 dager</SelectItem> <SelectItem value="30d">Siste 30 dager</SelectItem> <SelectItem value="90d">Siste 90 d`
- [608:43] (JSXText) Static JSX text node: `Siste 90 dager`
  - context: `lue="30d">Siste 30 dager</SelectItem> <SelectItem value="90d">Siste 90 dager</SelectItem> <SelectItem value="all">Hele histo`
- [609:43] (JSXText) Static JSX text node: `Hele historikken`
  - context: `lue="90d">Siste 90 dager</SelectItem> <SelectItem value="all">Hele historikken</SelectItem> </SelectContent> </S`
- [648:19] (JSXText) Static JSX text node: `IEP-trygg modus`
  - context: `ssName="text-sm text-muted-foreground" htmlFor={iepToggleId}> IEP-trygg modus </label> <TooltipProvider>`
- [655:36] (JSXAttribute) Static aria-label attribute: `IEP-trygg modus`
  - context: `gle id={iepToggleId} aria-label="IEP-trygg modus" pressed={iepSafeMode}`
- [668:26] (JSXText) Static JSX text node: `IEP-trygg modus sikrer pedagogiske anbefalinger`
  - context: `</TooltipTrigger> <TooltipContent> <p>IEP-trygg modus sikrer pedagogiske anbefalinger</p> <p cla`
- [669:46] (JSXText) Static JSX text node: `uten medisinske/kliniske råd`
  - context: `ikrer pedagogiske anbefalinger</p> <p className="text-xs">uten medisinske/kliniske råd</p> </TooltipContent>`
- [676:57] (JSXText) Static JSX text node: `Test AI`
  - context: `ing} className="w-1/2"> <RefreshCw className="h-4 w-4 mr-2" />Test AI </Button> <Button onClick={analyze} disa`
- [679:52] (JSXText) Static JSX text node: `Kjør analyse`
  - context: `tudentId} className="w-1/2"> <Play className="h-4 w-4 mr-2" />Kjør analyse </Button> <Button onClick={refreshA`
- [682:57] (JSXText) Static JSX text node: `Oppdater (forbi cache)`
  - context: `ame="w-full sm:w-auto"> <RefreshCw className="h-4 w-4 mr-2" />Oppdater (forbi cache) </Button> {compareEnabled`
- [686:66] (JSXText) Static JSX text node: `Sammenligning...`
  - context: `d-foreground"> <Loader2 className="h-3 w-3 animate-spin" /> Sammenligning... </span> )} </di`
- [698:94] (JSXText) Static JSX text node: `Datakvalitet`
  - context: `<CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" />Datakvalitet</CardTitle> </CardHeader> <CardContent clas`
- [704:68] (JSXText) Static JSX text node: `Datapunkter`
  - context: `<div> <div className="text-xs text-muted-foreground">Datapunkter</div> <div className="font-medium">{dataQuality.`
- [708:68] (JSXText) Static JSX text node: `Sist registrert`
  - context: `<div> <div className="text-xs text-muted-foreground">Sist registrert</div> <div className="font-medium">{dataQual`
- [712:68] (JSXText) Static JSX text node: `Dager siden`
  - context: `<div> <div className="text-xs text-muted-foreground">Dager siden</div> <div className="font-medium">{dataQuality.`
- [716:68] (JSXText) Static JSX text node: `Fullstendighet`
  - context: `<div> <div className="text-xs text-muted-foreground">Fullstendighet</div> <div className="font-medium">{dataQuali`
- [720:73] (JSXText) Static JSX text node: `Balanse (tid på dagen)`
  - context: `pan-4"> <div className="text-xs text-muted-foreground mb-1">Balanse (tid på dagen)</div> <div className="flex items-cent`
- [726:80] (JSXText) Static JSX text node: `•`
  - context: `{i < 2 && <span className="text-muted-foreground/40">•</span>} </div> ))}`
- [729:83] (JSXText) Static JSX text node: `score:`
  - context: `<span className="ml-auto text-[11px] text-muted-foreground">score: {dataQuality.balance}%</span> </div>`
- [734:117] (JSXText) Static JSX text node: `Ingen data funnet for valgt periode.`
  - context: `items-center gap-2 text-muted-foreground"><AlertTriangle className="h-4 w-4" />Ingen data funnet for valgt periode.</div> )} </CardCo`
- [818:96] (JSXText) Static JSX text node: `Nøkkelfunn`
  - context: `<CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" />Nøkkelfunn</CardTitle> </CardHeader> <CardContent cl`
- [825:66] (JSXText) Static JSX text node: `Ingen nøkkelfunn rapportert.`
  - context: `</ul> ) : <p className="text-sm text-muted-foreground">Ingen nøkkelfunn rapportert.</p>} </CardContent> </Car`
- [831:93] (JSXText) Static JSX text node: `Mønstre`
  - context: `<CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" />Mønstre</CardTitle> </CardHeader> <CardContent class`
- [845:67] (JSXText) Static JSX text node: `Ingen mønstre identifisert.`
  - context: `); }) : <p className="text-sm text-muted-foreground">Ingen mønstre identifisert.</p>} </CardContent> </Card`
- [851:96] (JSXText) Static JSX text node: `Tiltak og anbefalinger`
  - context: `<CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" />Tiltak og anbefalinger</CardTitle> </CardHeader> <To`
- [868:82] (JSXText) Static JSX text node: `Källor:`
  - context: `<span className="text-xs text-muted-foreground mr-2">Källor:</span> <div className="flex flex-wrap gap-1`
- [886:66] (JSXText) Static JSX text node: `Ingen anbefalinger rapportert.`
  - context: `</ul> ) : <p className="text-sm text-muted-foreground">Ingen anbefalinger rapportert.</p>} </CardContent> <`
- [895:49] (JSXText) Static JSX text node: `AI‑metadata •`
  - context: `Name="flex items-center gap-2"> <Info className="h-4 w-4" />AI‑metadata • <span className="font-normal text-muted-foreground">{displayModelN`
- [902:24] (JSXText) Static JSX text node: `Modell:`
  - context: `ent className="text-sm text-muted-foreground space-y-1"> <div>Modell: {results.ai.model}</div> {results.ai.latencyMs != null`
- [903:57] (JSXText) Static JSX text node: `Latens:`
  - context: `results.ai.model}</div> {results.ai.latencyMs != null && <div>Latens: {Math.round(results.ai.latencyMs)} ms</div>} {results.`
- [903:100] (JSXText) Static JSX text node: `ms`
  - context: `results.ai.latencyMs != null && <div>Latens: {Math.round(results.ai.latencyMs)} ms</div>} {results.ai.usage && ( <div>Toke`
- [905:26] (JSXText) Static JSX text node: `Tokens: prompt`
  - context: `s)} ms</div>} {results.ai.usage && ( <div>Tokens: prompt {results.ai.usage.promptTokens ?? 0} • completion {results.ai.usa`
- [905:78] (JSXText) Static JSX text node: `• completion`
  - context: `( <div>Tokens: prompt {results.ai.usage.promptTokens ?? 0} • completion {results.ai.usage.completionTokens ?? 0} • total {results.ai.usage.`
- [905:132] (JSXText) Static JSX text node: `• total`
  - context: `.usage.promptTokens ?? 0} • completion {results.ai.usage.completionTokens ?? 0} • total {results.ai.usage.totalTokens ?? 0}</div> )}`
- [908:26] (JSXText) Static JSX text node: `Cache: read`
  - context: `|| (results.ai.usage.cacheWriteTokens ?? 0) > 0) && ( <div>Cache: read {results.ai.usage.cacheReadTokens ?? 0} • write {results.ai.usage.ca`
- [908:78] (JSXText) Static JSX text node: `• write`
  - context: `( <div>Cache: read {results.ai.usage.cacheReadTokens ?? 0} • write {results.ai.usage.cacheWriteTokens ?? 0}</div> )}`
- [910:131] (JSXText) Static JSX text node: `JSON‑gyldighet (global):`
  - context: `ics.summary(); const pct = Math.round((s.jsonValidity || 0) * 100); return <div>JSON‑gyldighet (global): {pct}%</div>; } catch { return null; } })()}`
- [912:26] (JSXText) Static JSX text node: `Forbehold:`
  - context: `ults.ai.caveats) && results.ai.caveats.length > 0 && ( <div>Forbehold: {results.ai.caveats.join('; ')}</div> )}`

### src/pages/NotFound.tsx

- [14:18] (MessageAPI) Message API call: error(): `404 Error: User attempted to access non-existent route`
  - context: `; const { tCommon } = useTranslation(); useEffect(() => { logger.error("404 Error: User attempted to access non-existent route", { path: location`

### src/pages/ReportsClean.tsx

- [98:20] (MessageAPI) Message API call: error(): `Reports: failed to load data for export`
  - context: `ts, trackingEntries, goals } as const; } catch (error) { logger.error('Reports: failed to load data for export', { error }); return { students:`
- [129:20] (MessageAPI) Message API call: error(): `System CSV export failed`
  - context: `tSettings('dataExport.success_csv'))); } catch (error) { logger.error('System CSV export failed', { error }); toast.error(tSettings('dataExport.`
- [162:20] (MessageAPI) Message API call: error(): `System JSON export failed`
  - context: `Settings('dataExport.success_json'))); } catch (error) { logger.error('System JSON export failed', { error }); toast.error(tSettings('dataExport`
- [194:20] (MessageAPI) Message API call: error(): `System backup failed`
  - context: `ttings('dataExport.success_backup'))); } catch (error) { logger.error('System backup failed', { error }); toast.error(tSettings('dataExport.erro`

### src/pages/ReportsHub.tsx

- [50:34] (JSXAttribute) Static aria-labelledby attribute: `reports-templates-heading`
  - context: `</Link> </div> </header> <section aria-labelledby="reports-templates-heading" className="space-y-4"> <h2 id="reports-tem`

### src/pages/Settings.tsx

- [26:65] (JSXAttribute) Static aria-label attribute: `Settings navigation`
  - context: `-cols-4 gap-6"> <aside className="md:col-span-1 space-y-2" aria-label="Settings navigation"> <ul className="text-sm"> <li> <`

### src/pages/SignIndexPage.tsx

- [33:28] (JSXAttribute) Static aria-describedby attribute: `sign-search-status`
  - context: `ceholder={String(tCommon('tegn.searchPlaceholder'))} aria-describedby="sign-search-status" /> <div id="sign-search-status" role="statu`

### src/pages/SignLearnPage.tsx

- [41:42] (JSXText) Static JSX text node: `Vis dette tegnet:`
  - context: `t-foreground flex items-center gap-2"> <Hand className="h-5 w-5" /> Vis dette tegnet: <span className="text-primary">{current.word}</span>`
- [53:53] (JSXAttribute) Static aria-label attribute: `Neste tegn`
  - context: `sit'} </Button> <Button onClick={handleNext} aria-label="Neste tegn">👍 Jeg gjorde det!</Button> </div> <div classNa`
- [53:66] (JSXText) Static JSX text node: `👍 Jeg gjorde det!`
  - context: `</Button> <Button onClick={handleNext} aria-label="Neste tegn">👍 Jeg gjorde det!</Button> </div> <div className="space-y-2`
- [57:46] (JSXText) Static JSX text node: `Kameraveiledning kommer – øv selv foreløpig`
  - context: `reground flex items-center gap-2"> <Camera className="h-4 w-4" /> Kameraveiledning kommer – øv selv foreløpig </div> <Webc`

### src/pages/StudentProfile.original.tsx

- [178:21] (MessageAPI) Message API call: info(): `Auto-seeding minimal demo data for mock route`
  - context: `.current = true; setIsSeedingData(true); try { logger.info('Auto-seeding minimal demo data for mock route', { studentId });`
- [194:22] (MessageAPI) Message API call: error(): `Failed to auto-seed mock data`
  - context: `reloadData(); } } catch (error) { logger.error('Failed to auto-seed mock data', { error, studentId }); toast.error(Stri`
- [243:24] (MessageAPI) Message API call: error(): `Error generating insights`
  - context: `} } catch (error) { if (!signal.aborted) { logger.error('Error generating insights', { error }); setInsights(null);`
- [273:26] (MessageAPI) Message API call: error(): `[SAFE] analyticsManager.triggerAnalyticsForStudent failed`
  - context: `} }) .catch((err) => { logger.error('[SAFE] analyticsManager.triggerAnalyticsForStudent failed', { error: err, stude`
- [285:24] (MessageAPI) Message API call: error(): `[SAFE] analyticsManager.initializeStudentAnalytics failed`
  - context: `entAnalytics done'); } } catch (err) { logger.error('[SAFE] analyticsManager.initializeStudentAnalytics failed', { error: err, stude`
- [290:20] (MessageAPI) Message API call: error(): `[SAFE] analyticsManager outer try/catch caught error`
  - context: `/ Extra safety net; never rethrow from analytics side-effect logger.error('[SAFE] analyticsManager outer try/catch caught error', { error: err }); }`
- [357:20] (MessageAPI) Message API call: error(): `Export error`
  - context: `(tCommon('status.success'))); } catch (error: unknown) { logger.error('Export error', { error }); const errorMessage = error instanceof Error ?`
- [381:20] (MessageAPI) Message API call: error(): `Backup error`
  - context: `ss(String(tCommon('status.success'))); } catch (error) { logger.error('Backup error', { error }); toast.error(String(tCommon('error.title')));`

### src/pages/StudentProfile.tsx

- [180:21] (MessageAPI) Message API call: info(): `Auto-seeding minimal demo data for mock route`
  - context: `.current = true; setIsSeedingData(true); try { logger.info('Auto-seeding minimal demo data for mock route', { studentId });`
- [189:23] (MessageAPI) Message API call: success(): `Demo data created successfully`
  - context: `); // Show non-intrusive success message toast.success('Demo data created successfully', { description: 'Sample data has been`
- [189:23] (MessageAPI) sonner toast.success(): `Demo data created successfully`
  - context: `); // Show non-intrusive success message toast.success('Demo data created successfully', { description: 'Sample data has been`
- [198:22] (MessageAPI) Message API call: error(): `Failed to auto-seed mock data`
  - context: `reloadData(); } } catch (error) { logger.error('Failed to auto-seed mock data', { error, studentId }); toast.error('Fai`
- [199:21] (MessageAPI) Message API call: error(): `Failed to create demo data`
  - context: `ror('Failed to auto-seed mock data', { error, studentId }); toast.error('Failed to create demo data', { description: 'Please try loading mock`
- [199:21] (MessageAPI) sonner toast.error(): `Failed to create demo data`
  - context: `ror('Failed to auto-seed mock data', { error, studentId }); toast.error('Failed to create demo data', { description: 'Please try loading mock`
- [249:24] (MessageAPI) Message API call: error(): `Error generating insights`
  - context: `} } catch (error) { if (!signal.aborted) { logger.error('Error generating insights', { error }); setInsights(null);`
- [251:23] (MessageAPI) Message API call: error(): `Failed to generate insights`
  - context: `ating insights', { error }); setInsights(null); toast.error('Failed to generate insights'); } } finally { if (!signal.`
- [251:23] (MessageAPI) sonner toast.error(): `Failed to generate insights`
  - context: `ating insights', { error }); setInsights(null); toast.error('Failed to generate insights'); } } finally { if (!signal.`
- [279:26] (MessageAPI) Message API call: error(): `[SAFE] analyticsManager.triggerAnalyticsForStudent failed`
  - context: `} }) .catch((err) => { logger.error('[SAFE] analyticsManager.triggerAnalyticsForStudent failed', { error: err, stude`
- [291:24] (MessageAPI) Message API call: error(): `[SAFE] analyticsManager.initializeStudentAnalytics failed`
  - context: `entAnalytics done'); } } catch (err) { logger.error('[SAFE] analyticsManager.initializeStudentAnalytics failed', { error: err, stude`
- [296:20] (MessageAPI) Message API call: error(): `[SAFE] analyticsManager outer try/catch caught error`
  - context: `/ Extra safety net; never rethrow from analytics side-effect logger.error('[SAFE] analyticsManager outer try/catch caught error', { error: err }); }`
- [357:25] (MessageAPI) Message API call: success(): `Report exported as PDF`
  - context: `await analyticsExport.exportTo('pdf', exportData); toast.success('Report exported as PDF'); return; } case 'csv': {`
- [357:25] (MessageAPI) sonner toast.success(): `Report exported as PDF`
  - context: `await analyticsExport.exportTo('pdf', exportData); toast.success('Report exported as PDF'); return; } case 'csv': {`
- [383:20] (MessageAPI) Message API call: error(): `Export error`
  - context: `as ${format.toUpperCase()}\`); } catch (error: unknown) { logger.error('Export error', { error }); const errorMessage = error instanceof Error ?`
- [405:21] (MessageAPI) Message API call: success(): `Backup created successfully`
  - context: `]/g, '-')}.json\`; downloadBlob(backupBlob, filename); toast.success('Backup created successfully'); } catch (error) { logger.error('Backup`
- [405:21] (MessageAPI) sonner toast.success(): `Backup created successfully`
  - context: `]/g, '-')}.json\`; downloadBlob(backupBlob, filename); toast.success('Backup created successfully'); } catch (error) { logger.error('Backup`
- [407:20] (MessageAPI) Message API call: error(): `Backup error`
  - context: `uccess('Backup created successfully'); } catch (error) { logger.error('Backup error', { error }); toast.error('Backup failed. Please try again.'`
- [408:19] (MessageAPI) Message API call: error(): `Backup failed. Please try again.`
  - context: `atch (error) { logger.error('Backup error', { error }); toast.error('Backup failed. Please try again.'); } }, [student, trackingEntries, allEm`
- [408:19] (MessageAPI) sonner toast.error(): `Backup failed. Please try again.`
  - context: `atch (error) { logger.error('Backup error', { error }); toast.error('Backup failed. Please try again.'); } }, [student, trackingEntries, allEm`

### src/pages/StudentProfileOptimized.tsx

- [123:23] (MessageAPI) Message API call: success(): `Demo data created successfully`
  - context: `window.dispatchEvent(new CustomEvent('mockDataLoaded')); toast.success('Demo data created successfully'); if (reloadData) reloadData(); }`
- [123:23] (MessageAPI) sonner toast.success(): `Demo data created successfully`
  - context: `window.dispatchEvent(new CustomEvent('mockDataLoaded')); toast.success('Demo data created successfully'); if (reloadData) reloadData(); }`
- [126:22] (MessageAPI) Message API call: error(): `Failed to auto-seed mock data`
  - context: `if (reloadData) reloadData(); } catch (error) { logger.error('Failed to auto-seed mock data', { error, studentId }); toast.error('Fai`
- [127:21] (MessageAPI) Message API call: error(): `Failed to create demo data`
  - context: `ror('Failed to auto-seed mock data', { error, studentId }); toast.error('Failed to create demo data'); } finally { setIsSeedingData(false)`
- [127:21] (MessageAPI) sonner toast.error(): `Failed to create demo data`
  - context: `ror('Failed to auto-seed mock data', { error, studentId }); toast.error('Failed to create demo data'); } finally { setIsSeedingData(false)`
- [154:26] (MessageAPI) Message API call: error(): `Failed to get insights`
  - context: `ewInsights); } } catch (error) { logger.error('Failed to get insights', { error }); } finally { setIsLoa`
- [212:20] (MessageAPI) Message API call: error(): `Export error`
  - context: `essfully as ${format.toUpperCase()}\`); } catch (error) { logger.error('Export error', { error }); toast.error(\`Export failed: ${error instanceof`

### src/pages/TegnLayout.tsx

- [20:25] (JSXAttribute) Static aria-label attribute: `Tegn til Tale navigation`
  - context: `</h1> <LanguageSettings /> </header> <nav aria-label="Tegn til Tale navigation" className="flex gap-2"> <NavLink to="." end`

### src/pages/TrackStudent.tsx

- [42:19] (MessageAPI) Message API call: success(): `Emotion recorded!`
  - context: `| 'timestamp'>) => { setEmotions([...emotions, emotion]); toast.success("Emotion recorded!"); }; const handleSensoryAdd = (sensory: Omit<SensoryEnt`
- [42:19] (MessageAPI) sonner toast.success(): `Emotion recorded!`
  - context: `| 'timestamp'>) => { setEmotions([...emotions, emotion]); toast.success("Emotion recorded!"); }; const handleSensoryAdd = (sensory: Omit<SensoryEnt`
- [47:19] (MessageAPI) Message API call: success(): `Sensory input recorded!`
  - context: `mp'>) => { setSensoryInputs([...sensoryInputs, sensory]); toast.success("Sensory input recorded!"); }; const handleEnvironmentalAdd = (environmenta`
- [47:19] (MessageAPI) sonner toast.success(): `Sensory input recorded!`
  - context: `mp'>) => { setSensoryInputs([...sensoryInputs, sensory]); toast.success("Sensory input recorded!"); }; const handleEnvironmentalAdd = (environmenta`
- [52:19] (MessageAPI) Message API call: success(): `Environmental conditions recorded!`
  - context: `| 'timestamp'>) => { setEnvironmentalData(environmental); toast.success("Environmental conditions recorded!"); }; const handleSaveSession = async (`
- [52:19] (MessageAPI) sonner toast.success(): `Environmental conditions recorded!`
  - context: `| 'timestamp'>) => { setEnvironmentalData(environmental); toast.success("Environmental conditions recorded!"); }; const handleSaveSession = async (`
- [100:20] (MessageAPI) Message API call: error(): `Failed to save tracking session`
  - context: `navigate(\`/student/${student.id}\`); } catch (error) { logger.error('Failed to save tracking session', { error }); toast.error(String(tTrackin`

### src/workers/analytics.worker.ts

- [225:26] (MessageAPI) Message API call: error(): `[analytics.worker] Cache clear command failed`
  - context: `s AnalyticsWorkerMessage); } } catch (err) { try { logger.error('[analytics.worker] Cache clear command failed', err as Error); } catch {} }`
- [429:18] (MessageAPI) Message API call: error(): `[analytics.worker] error`
  - context: `own as AnalyticsWorkerMessage); } catch (error) { try { logger.error('[analytics.worker] error', error); } catch (e) { /* ignore logging fa`
- [433:18] (MessageAPI) Message API call: error(): `Error in analytics worker:`
  - context: `r); } catch (e) { /* ignore logging failure */ } logger.error('Error in analytics worker:', error); // Post an error message back to the m`

