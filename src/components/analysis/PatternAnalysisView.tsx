import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Target,
  Eye,
  Brain,
  Thermometer,
  Activity,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingDown,
  Lightbulb,
  Shield,
} from 'lucide-react';
import {
  PatternResult,
  PredictiveInsight,
  AnomalyDetection,
} from '@/lib/enhancedPatternAnalysis';
import { ConfidenceIndicator } from '@/components/ConfidenceIndicator';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { HighlightState } from '@/hooks/useVisualizationState';
import { DEV_VIZ_ENABLED } from '@/lib/env';

interface PatternAnalysisViewProps {
  patterns: PatternResult[];
  predictiveInsights: PredictiveInsight[];
  anomalies: AnomalyDetection[];
  isAnalyzing: boolean;
  highlightState: HighlightState;
  handleHighlight: (type: HighlightState['type'], id: string) => void;
  filteredData: {
    emotions: { timestamp: Date; intensity: number }[];
    sensoryInputs: { timestamp: Date }[];
  };
}

export const PatternAnalysisView: React.FC<PatternAnalysisViewProps> = ({
  patterns,
  predictiveInsights,
  anomalies,
  isAnalyzing,
  highlightState,
  handleHighlight,
  filteredData,
}) => {
  if (!DEV_VIZ_ENABLED) {
    return (
      <div className="p-4 border rounded-md text-muted-foreground" role="note" aria-live="polite">
        This legacy patterns view is available in development only. Please use the Patterns preset for the modern experience.
      </div>
    );
  }
  const getPatternIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'emotion': return <Brain className="h-4 w-4" />;
      case 'sensory': return <Eye className="h-4 w-4" />;
      case 'environmental': return <Thermometer className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-success-foreground bg-success border-success/30';
    if (confidence >= 0.6) return 'text-warning-foreground bg-warning border-warning/30';
    return 'text-destructive-foreground bg-destructive border-destructive/30';
  };

  if (isAnalyzing) {
    return (
      <div aria-label="Loading chart data" className="h-[400px] w-full">
        <div className="h-full w-full animate-pulse rounded-md border border-border/50 bg-muted/20" />
      </div>
    );
  }

  if (patterns.length === 0 && predictiveInsights.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <Zap className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>No patterns detected yet</p>
          <p className="text-sm">Need more data for pattern analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {patterns.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5" />
            Detected Patterns ({patterns.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patterns.map((pattern, index) => (
              <Card
                key={index}
                className={cn(
                  "bg-gradient-card cursor-pointer transition-all",
                  highlightState.type === 'emotion' && pattern.type === 'emotion' && "ring-2 ring-primary"
                )}
                onClick={() => handleHighlight('emotion', `pattern-${index}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {getPatternIcon(pattern.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium capitalize">{pattern.type} Pattern</h4>
                        <Badge className={getConfidenceColor(pattern.confidence)}>
                          {Math.round(pattern.confidence * 100)}% confident
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Frequency: {pattern.frequency} occurrences
                      </p>
                      {(pattern.recommendations?.length ?? 0) > 0 && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Recommendations:</p>
                          {(pattern.recommendations ?? []).slice(0, 2).map((rec, i) => (
                            <p key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                              <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              {rec}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {predictiveInsights.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Predictive Insights ({predictiveInsights.length})
          </h3>
          <div className="space-y-4">
            {predictiveInsights.map((insight, index) => (
              <Card key={index} className="bg-gradient-card">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {insight.severity === 'high' ? (
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      ) : insight.severity === 'medium' ? (
                        <Clock className="h-5 w-5 text-warning" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-success" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{insight.title}</h4>
                        <Badge variant="outline">
                          {Math.round(insight.confidence * 100)}% confidence
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">
                        {insight.description}
                      </p>

                      {insight.prediction && (
                        <div className="mb-2">
                          <p className="text-sm font-medium mb-1">Prediction:</p>
                          <div className="flex items-center gap-2 text-sm">
                            {insight.prediction.trend === 'increasing' ? (
                            <TrendingUp className="h-4 w-4 text-success" />
                            ) : insight.prediction.trend === 'decreasing' ? (
                              <TrendingDown className="h-4 w-4 text-destructive" />
                            ) : (
                              <Activity className="h-4 w-4 text-info" />
                            )}
                            <span className="capitalize">{insight.prediction.trend}</span>
                            <ConfidenceIndicator
                              confidence={insight.prediction.accuracy}
                              dataPoints={filteredData.emotions.length + filteredData.sensoryInputs.length}
                              timeSpanDays={filteredData.emotions.length > 0 && filteredData.emotions[0] ?
                                Math.abs(differenceInDays(new Date(), filteredData.emotions[0].timestamp)) : 0}
                              rSquared={insight.prediction.accuracy}
                              className="ml-1"
                            />
                          </div>
                        </div>
                      )}

                      {insight.recommendations.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Recommendations:</p>
                          {insight.recommendations.slice(0, 3).map((rec, i) => (
                            <p key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                              <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              {rec}
                            </p>
                          ))}
                        </div>
                      )}

                      {insight.severity && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Severity: <span className="font-medium capitalize">{insight.severity}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {anomalies.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Detected Anomalies ({anomalies.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {anomalies.map((anomaly, index) => (
              <Card
                key={index}
                className={cn(
                  "bg-gradient-card border-orange-200 cursor-pointer",
                  highlightState.type === 'anomaly' && highlightState.id === `anomaly-${index}` && "ring-2 ring-orange-500"
                )}
                onClick={() => handleHighlight('anomaly', `anomaly-${index}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">{anomaly.type} Anomaly</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Severity: <span className="font-medium capitalize">{anomaly.severity}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(anomaly.timestamp, 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
