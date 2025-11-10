import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Download,
  Upload,
  RotateCcw,
  Info,
  AlertTriangle,
  Shield,
  Zap,
  Brain,
  RefreshCw,
  Activity,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { AnalyticsConfiguration, PRESET_CONFIGS } from '@/lib/analyticsConfig';
import { ModelType } from '@/lib/mlModels';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { logger } from '@/lib/logger';
import { useTranslation } from '@/hooks/useTranslation';
// Extracted hooks for cleaner component architecture
import { useModelManagement } from '@/hooks/useModelManagement';
import { useAnalyticsConfigManager } from '@/hooks/useAnalyticsConfigManager';

interface AnalyticsSettingsProps {
  onConfigChange?: (config: AnalyticsConfiguration) => void;
  onClose?: () => void;
}

export const AnalyticsSettings: React.FC<AnalyticsSettingsProps> = ({
  onConfigChange,
  onClose
}) => {
  const { tAnalytics } = useTranslation();

  // Configuration management (extracted hook)
  const configManager = useAnalyticsConfigManager({
    onConfigChange,
    onSave: () => {
      toast({
        title: "Analytics configuration has been updated",
        description: "Analytics configuration has been updated",
      });
    },
    onError: (error) => {
      logger.error('Config management error', { error });
    },
  });

  // ML Model management (extracted hook)
  const modelManager = useModelManagement({
    autoLoad: true,
    onError: (error) => {
      logger.error('Model management error', { error });
      toast({
        title: "Failed to load ML models: Could not retrieve model status. Some features may be unavailable.",
        variant: "destructive",
      });
    },
    onTrainingComplete: (modelType) => {
      toast({
        title: `${modelType} model has been updated`,
        description: `${modelType} model has been updated`,
      });
    },
  });

  const handleSliderChange = (path: string[], value: number[]) => {
    configManager.actions.updateConfigValue(path, value[0]);
  };

  const handleSensitivityChange = (value: string) => {
    configManager.actions.updateSensitivity(value as 'low' | 'medium' | 'high');
  };

  const handlePresetSelect = (preset: keyof typeof PRESET_CONFIGS) => {
    configManager.actions.applyPreset(preset);
    toast({
      title: `Applied ${PRESET_CONFIGS[preset].name} configuration`,
      description: `Applied ${PRESET_CONFIGS[preset].name} configuration`,
    });
  };

  const handleSave = () => {
    configManager.actions.saveConfig();
  };

  const handleReset = () => {
    configManager.actions.resetConfig();
    toast({
      title: "Settings have been reset to defaults",
      description: "Settings have been reset to defaults",
    });
  };

  const handleExport = () => {
    configManager.actions.exportConfig();
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await configManager.actions.importConfig(file);
    event.target.value = '';
  };

  const handleModelRetrain = async (modelType: ModelType) => {
    toast({
      title: `Training ${modelType} model in background...`,
      description: `Training ${modelType} model in background...`,
    });
    await modelManager.actions.trainModel(modelType);
  };

  const handleDeleteModel = async (modelType: ModelType) => {
    await modelManager.actions.deleteModel(modelType);
    toast({
      title: `${modelType} model has been removed`,
      description: `${modelType} model has been removed`,
    });
  };

  const formatModelType = (type: ModelType): string => {
    return type.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getModelIcon = (type: ModelType) => {
    switch (type) {
      case 'emotion-prediction':
        return <Brain className="h-4 w-4" />;
      case 'sensory-response':
        return <Activity className="h-4 w-4" />;
      case 'baseline-clustering':
        return <Shield className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const renderTooltip = (content: string) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {String(tAnalytics('settings.title'))}
          </DialogTitle>
          <DialogDescription>
            {String(tAnalytics('settings.subtitle'))}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preset Configurations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{String(tAnalytics('settings.presets.title'))}</CardTitle>
              <CardDescription>
                {String(tAnalytics('settings.presets.description'))}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={configManager.state.selectedPreset} onValueChange={(value) => handlePresetSelect(value as keyof typeof PRESET_CONFIGS)}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Label 
                    htmlFor="conservative" 
                    className="flex flex-col space-y-2 cursor-pointer border rounded-lg p-4 hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="conservative" id="conservative" />
                      <Shield className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{String(tAnalytics('settings.presets.conservative'))}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {String(tAnalytics('settings.presets.conservativeDesc'))}
                    </p>
                  </Label>

                  <Label 
                    htmlFor="balanced" 
                    className="flex flex-col space-y-2 cursor-pointer border rounded-lg p-4 hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="balanced" id="balanced" />
                      <Settings className="h-4 w-4 text-green-500" />
                      <span className="font-medium">{String(tAnalytics('settings.presets.balanced'))}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {String(tAnalytics('settings.presets.balancedDesc'))}
                    </p>
                  </Label>

                  <Label 
                    htmlFor="sensitive" 
                    className="flex flex-col space-y-2 cursor-pointer border rounded-lg p-4 hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sensitive" id="sensitive" />
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">{String(tAnalytics('settings.presets.sensitive'))}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {String(tAnalytics('settings.presets.sensitiveDesc'))}
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Detailed Settings Tabs */}
          <Tabs defaultValue="thresholds" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="thresholds">{String(tAnalytics('settings.tabs.thresholds'))}</TabsTrigger>
              <TabsTrigger value="sensitivity">{String(tAnalytics('settings.tabs.sensitivity'))}</TabsTrigger>
              <TabsTrigger value="timewindows">{String(tAnalytics('settings.tabs.timeWindows'))}</TabsTrigger>
              <TabsTrigger value="mlmodels">{String(tAnalytics('settings.tabs.mlModels'))}</TabsTrigger>
              <TabsTrigger value="advanced">{String(tAnalytics('settings.tabs.advanced'))}</TabsTrigger>
            </TabsList>

            <TabsContent value="thresholds" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pattern Analysis Thresholds</CardTitle>
                  <CardDescription>
                    Adjust minimum requirements and thresholds for pattern detection
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label htmlFor="minDataPoints">Minimum Data Points</Label>
                      {renderTooltip("Minimum number of data points required for analysis")}
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        id="minDataPoints"
                        value={[configManager.state.config.patternAnalysis.minDataPoints]}
                        onValueChange={(value) => handleSliderChange(['patternAnalysis', 'minDataPoints'], value)}
                        min={1}
                        max={10}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-12 text-right">{configManager.state.config.patternAnalysis.minDataPoints}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label htmlFor="correlationThreshold">Correlation Threshold</Label>
                      {renderTooltip("Minimum correlation coefficient to consider significant")}
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        id="correlationThreshold"
                        value={[configManager.state.config.patternAnalysis.correlationThreshold]}
                        onValueChange={(value) => handleSliderChange(['patternAnalysis', 'correlationThreshold'], value)}
                        min={0.1}
                        max={0.9}
                        step={0.05}
                        className="flex-1"
                      />
                      <span className="w-12 text-right">{configManager.state.config.patternAnalysis.correlationThreshold.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label htmlFor="concernFrequency">Concern Frequency Threshold</Label>
                      {renderTooltip("Percentage of sessions that must show concerning patterns")}
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        id="concernFrequency"
                        value={[configManager.state.config.patternAnalysis.concernFrequencyThreshold * 100]}
                        onValueChange={(value) => handleSliderChange(['patternAnalysis', 'concernFrequencyThreshold'], [value[0] / 100])}
                        min={10}
                        max={50}
                        step={5}
                        className="flex-1"
                      />
                      <span className="w-12 text-right">{(configManager.state.config.patternAnalysis.concernFrequencyThreshold * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Enhanced Analysis Thresholds</CardTitle>
                  <CardDescription>
                    Configure advanced pattern detection and anomaly thresholds
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label htmlFor="anomalyThreshold">Anomaly Detection Sensitivity</Label>
                      {renderTooltip("Number of standard deviations to trigger anomaly alert")}
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        id="anomalyThreshold"
                        value={[configManager.state.config.enhancedAnalysis.anomalyThreshold]}
                        onValueChange={(value) => handleSliderChange(['enhancedAnalysis', 'anomalyThreshold'], value)}
                        min={1}
                        max={3}
                        step={0.25}
                        className="flex-1"
                      />
                      <span className="w-12 text-right">{configManager.state.config.enhancedAnalysis.anomalyThreshold.toFixed(2)}σ</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label htmlFor="minSampleSize">Minimum Sample Size</Label>
                      {renderTooltip("Minimum data points for statistical analysis")}
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        id="minSampleSize"
                        value={[configManager.state.config.enhancedAnalysis.minSampleSize]}
                        onValueChange={(value) => handleSliderChange(['enhancedAnalysis', 'minSampleSize'], value)}
                        min={3}
                        max={15}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-12 text-right">{configManager.state.config.enhancedAnalysis.minSampleSize}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sensitivity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Alert Sensitivity</CardTitle>
                  <CardDescription>
                    Control how sensitive the system is to potential issues
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RadioGroup 
                    value={configManager.state.config.alertSensitivity.level} 
                    onValueChange={handleSensitivityChange}
                  >
                    <div className="space-y-4">
                      <Label className="flex items-start space-x-3 cursor-pointer">
                        <RadioGroupItem value="low" className="mt-1" />
                        <div>
                          <p className="font-medium">Low Sensitivity</p>
                          <p className="text-sm text-muted-foreground">
                            Only alert for significant patterns with high confidence
                          </p>
                        </div>
                      </Label>
                      
                      <Label className="flex items-start space-x-3 cursor-pointer">
                        <RadioGroupItem value="medium" className="mt-1" />
                        <div>
                          <p className="font-medium">Medium Sensitivity</p>
                          <p className="text-sm text-muted-foreground">
                            Balanced approach to pattern detection and alerts
                          </p>
                        </div>
                      </Label>
                      
                      <Label className="flex items-start space-x-3 cursor-pointer">
                        <RadioGroupItem value="high" className="mt-1" />
                        <div>
                          <p className="font-medium">High Sensitivity</p>
                          <p className="text-sm text-muted-foreground">
                            Alert for subtle patterns and potential concerns early
                          </p>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>

                  <div className="pt-4 space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Current Multipliers:</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>Emotion: {configManager.state.config.alertSensitivity.emotionIntensityMultiplier}x</div>
                      <div>Frequency: {configManager.state.config.alertSensitivity.frequencyMultiplier}x</div>
                      <div>Anomaly: {configManager.state.config.alertSensitivity.anomalyMultiplier}x</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timewindows" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Analysis Time Windows</CardTitle>
                  <CardDescription>
                    Configure the time periods used for different analyses
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label htmlFor="defaultAnalysis">Default Analysis Period</Label>
                      {renderTooltip("Standard time window for pattern analysis")}
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        id="defaultAnalysis"
                        value={[configManager.state.config.timeWindows.defaultAnalysisDays]}
                        onValueChange={(value) => handleSliderChange(['timeWindows', 'defaultAnalysisDays'], value)}
                        min={7}
                        max={90}
                        step={7}
                        className="flex-1"
                      />
                      <span className="w-16 text-right">{configManager.state.config.timeWindows.defaultAnalysisDays} days</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label htmlFor="recentData">Recent Data Window</Label>
                      {renderTooltip("Time window for recent activity alerts")}
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        id="recentData"
                        value={[configManager.state.config.timeWindows.recentDataDays]}
                        onValueChange={(value) => handleSliderChange(['timeWindows', 'recentDataDays'], value)}
                        min={3}
                        max={14}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-16 text-right">{configManager.state.config.timeWindows.recentDataDays} days</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label htmlFor="longTerm">Long-term Analysis Window</Label>
                      {renderTooltip("Extended time window for trend analysis")}
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        id="longTerm"
                        value={[configManager.state.config.timeWindows.longTermDays]}
                        onValueChange={(value) => handleSliderChange(['timeWindows', 'longTermDays'], value)}
                        min={30}
                        max={180}
                        step={30}
                        className="flex-1"
                      />
                      <span className="w-16 text-right">{configManager.state.config.timeWindows.longTermDays} days</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mlmodels" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      Machine Learning Models
                    </span>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="ml-enabled" className="text-sm font-normal">Enable ML</Label>
                      <Switch
                        id="ml-enabled"
                        checked={modelManager.state.mlEnabled}
                        onCheckedChange={modelManager.actions.setMlEnabled}
                      />
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Manage AI-powered prediction models for enhanced analytics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Loading State */}
                  {modelManager.state.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">Loading ML models...</span>
                    </div>
                  ) : (
                    <>
                      {/* Model Status List */}
                      {(['emotion-prediction', 'sensory-response', 'baseline-clustering'] as ModelType[]).map((modelType) => {
                    const modelState = modelManager.state.models.get(modelType);
                    const model = modelState?.metadata;
                    const isCurrentlyTraining = modelState?.isTraining || false;
                    const isCurrentlyDeleting = modelState?.isDeleting || false;
                    
                    return (
                      <div key={modelType} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getModelIcon(modelType)}
                            <h4 className="font-medium">{formatModelType(modelType)}</h4>
                          </div>
                          <Badge variant={model ? "default" : "outline"}>
                            {model ? 'Trained' : 'Not Trained'}
                          </Badge>
                        </div>
                        
                        {model ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Version</p>
                                <p className="font-medium">{model.version}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Last Trained</p>
                                <p className="font-medium">
                                  {new Date(model.lastTrainedAt).toLocaleDateString()}
                                </p>
                              </div>
                              {model.accuracy && (
                                <div>
                                  <p className="text-muted-foreground">Accuracy</p>
                                  <p className="font-medium">{(model.accuracy * 100).toFixed(1)}%</p>
                                </div>
                              )}
                              <div>
                                <p className="text-muted-foreground">Data Points</p>
                                <p className="font-medium">{model.dataPoints}</p>
                              </div>
                            </div>
                            
                            {model.accuracy && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Model Performance</span>
                                  <span>{(model.accuracy * 100).toFixed(1)}%</span>
                                </div>
                                <Progress value={model.accuracy * 100} className="h-2" />
                              </div>
                            )}
                            
                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleModelRetrain(modelType)}
                                disabled={isCurrentlyTraining || !modelManager.state.mlEnabled}
                              >
                                {isCurrentlyTraining ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Training...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Retrain
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteModel(modelType)}
                                disabled={isCurrentlyTraining || isCurrentlyDeleting}
                              >
                                {isCurrentlyDeleting ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  'Delete'
                                )}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground mb-3">
                              No model trained yet. Model will be trained automatically when sufficient data is available.
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleModelRetrain(modelType)}
                              disabled={isCurrentlyTraining || !modelManager.state.mlEnabled}
                            >
                              {isCurrentlyTraining ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Training...
                                </>
                              ) : (
                                <>
                                  <Brain className="h-3 w-3 mr-1" />
                                  Train Model
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* ML Settings Info */}
                  <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                    <h5 className="font-medium flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      About Machine Learning
                    </h5>
                    <p className="text-sm text-muted-foreground">
                      ML models enhance predictions by learning from historical patterns. They require:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Emotion prediction: 7+ days of data</li>
                      <li>• Sensory response: 10+ tracking sessions</li>
                      <li>• Baseline clustering: 10+ tracking entries</li>
                    </ul>
                    <p className="text-sm text-muted-foreground">
                      Models are trained locally in your browser and improve over time as more data is collected.
                    </p>
                  </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cache Settings</CardTitle>
                  <CardDescription>
                    Configure performance optimization settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label htmlFor="cacheTTL">Cache Duration</Label>
                      {renderTooltip("How long to keep cached analytics results")}
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        id="cacheTTL"
                        value={[configManager.state.config.cache.ttl / 60000]}
                        onValueChange={(value) => handleSliderChange(['cache', 'ttl'], [value[0] * 60000])}
                        min={1}
                        max={30}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-16 text-right">{configManager.state.config.cache.ttl / 60000} min</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Label>Invalidate cache on config change</Label>
                      {renderTooltip("Clear cached results when settings change")}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {configManager.state.config.cache.invalidateOnConfigChange ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Import/Export Configuration</CardTitle>
                  <CardDescription>
                    Save and share your configuration settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-4">
                  <Button 
                    variant="outline" 
                    onClick={handleExport}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export Config
                  </Button>
                  
                  <Label htmlFor="import-config" className="cursor-pointer">
                    <Button 
                      variant="outline" 
                      asChild
                      className="flex items-center gap-2"
                    >
                      <span>
                        <Upload className="h-4 w-4" />
                        Import Config
                      </span>
                    </Button>
                    <input
                      id="import-config"
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      aria-label="Import configuration file"
                      className="hidden"
                    />
                  </Label>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to Defaults
            </Button>
            
            <div className="flex gap-2">
              {configManager.state.hasUnsavedChanges && (
                <p className="text-sm text-yellow-600 flex items-center gap-1 mr-4">
                  <AlertTriangle className="h-4 w-4" />
                  Unsaved changes
                </p>
              )}
              
              <Button 
                variant="outline" 
                onClick={onClose}
              >
                Cancel
              </Button>
              
              <Button 
                onClick={handleSave}
                disabled={!configManager.state.hasUnsavedChanges}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
