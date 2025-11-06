import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PredictiveInsight, AnomalyDetection } from "@/lib/enhancedPatternAnalysis";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
  Clock,
  Calendar
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

interface PredictiveAlertsPanelProps {
  predictiveInsights: PredictiveInsight[];
  anomalies: AnomalyDetection[];
  onInsightClick?: (insight: PredictiveInsight) => void;
  onAnomalyClick?: (anomaly: AnomalyDetection) => void;
}

/**
 * Get risk level color coding
 */
function getRiskColor(type: PredictiveInsight['type'], confidence: number): string {
  if (type === 'risk') {
    if (confidence >= 0.7) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    if (confidence >= 0.5) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  }
  return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
}

/**
 * Get trend icon based on prediction
 */
function getTrendIcon(trend?: 'increasing' | 'decreasing' | 'stable') {
  switch (trend) {
    case 'increasing':
      return <TrendingUp className="h-4 w-4" />;
    case 'decreasing':
      return <TrendingDown className="h-4 w-4" />;
    case 'stable':
      return <Minus className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

/**
 * Get severity badge config
 */
function getSeverityConfig(severity: AnomalyDetection['severity']): {
  color: string;
  label: string;
  emoji: string;
} {
  switch (severity) {
    case 'high':
      return {
        color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        label: 'High',
        emoji: '🔴'
      };
    case 'medium':
      return {
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        label: 'Medium',
        emoji: '🟡'
      };
    case 'low':
      return {
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        label: 'Low',
        emoji: '🔵'
      };
  }
}

/**
 * PredictiveAlertsPanel - Proactive insights and early warnings
 *
 * Shows:
 * - Predictive insights (what's likely to happen)
 * - Anomaly alerts (unusual patterns detected)
 * - Trend forecasts (increasing/decreasing patterns)
 * - Risk assessments (potential concerns)
 */
export const PredictiveAlertsPanel: React.FC<PredictiveAlertsPanelProps> = ({
  predictiveInsights,
  anomalies,
  onInsightClick,
  onAnomalyClick
}) => {
  // Sort insights by confidence and type (risk first)
  const sortedInsights = [...predictiveInsights].sort((a, b) => {
    if (a.type === 'risk' && b.type !== 'risk') return -1;
    if (a.type !== 'risk' && b.type === 'risk') return 1;
    return b.confidence - a.confidence;
  });

  // Sort anomalies by severity and recency
  const sortedAnomalies = [...anomalies].sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const hasAlerts = sortedInsights.length > 0 || sortedAnomalies.length > 0;

  if (!hasAlerts) {
    return (
      <Card className="bg-gradient-card border-0 shadow-soft">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
              <Lightbulb className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">All Clear</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                No predictive alerts or anomalies detected. Patterns are stable and within expected ranges.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-primary" />
          Predictive Alerts
        </h2>
        <p className="text-sm text-muted-foreground">
          {sortedInsights.length} insight{sortedInsights.length !== 1 ? 's' : ''},
          {' '}{sortedAnomalies.length} anomal{sortedAnomalies.length !== 1 ? 'ies' : 'y'} detected
        </p>
      </div>

      {/* Predictive Insights */}
      {sortedInsights.length > 0 && (
        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Predictive Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedInsights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <div
                  className="p-4 bg-background rounded-lg border border-border hover:border-primary/50 transition-all cursor-pointer group"
                  onClick={() => onInsightClick?.(insight)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getRiskColor(insight.type, insight.confidence)}>
                          {insight.type.charAt(0).toUpperCase() + insight.type.slice(1)}
                        </Badge>
                        {insight.prediction && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {getTrendIcon(insight.prediction.trend)}
                            <span className="capitalize">{insight.prediction.trend}</span>
                          </div>
                        )}
                      </div>
                      <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
                        {insight.title}
                      </h4>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground ml-2">
                      {Math.round(insight.confidence * 100)}%
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-3">
                    {insight.description}
                  </p>

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{insight.timeframe}</span>
                    </div>
                    {insight.prediction && (
                      <span className="text-muted-foreground">
                        Accuracy: {Math.round(insight.prediction.accuracy * 100)}%
                      </span>
                    )}
                  </div>

                  {/* Confidence Bar */}
                  <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${insight.confidence * 100}%` }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Anomaly Alerts */}
      {sortedAnomalies.length > 0 && (
        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Anomaly Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedAnomalies.map((anomaly, index) => {
              const severityConfig = getSeverityConfig(anomaly.severity);

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <div
                    className="p-4 bg-background rounded-lg border border-border hover:border-primary/50 transition-all cursor-pointer group"
                    onClick={() => onAnomalyClick?.(anomaly)}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{severityConfig.emoji}</span>
                        <div>
                          <Badge className={severityConfig.color}>
                            {severityConfig.label} Severity
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1 capitalize">
                            {anomaly.type}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(anomaly.timestamp), 'MMM d, h:mm a')}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-3">
                      {anomaly.description}
                    </p>

                    {/* Deviation Score */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Deviation Score</span>
                        <span className="font-medium">
                          {anomaly.deviationScore.toFixed(2)}σ
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full ${
                            anomaly.severity === 'high'
                              ? 'bg-red-500'
                              : anomaly.severity === 'medium'
                              ? 'bg-yellow-500'
                              : 'bg-blue-500'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(anomaly.deviationScore / 3 * 100, 100)}%` }}
                          transition={{ duration: 0.4, delay: index * 0.1 }}
                        />
                      </div>
                    </div>

                    {/* Recommendations */}
                    {anomaly.recommendations && anomaly.recommendations.length > 0 && (
                      <div className="pt-3 border-t border-border">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-primary mb-1">
                              Recommended Action:
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {anomaly.recommendations[0]}
                            </p>
                            {anomaly.recommendations.length > 1 && (
                              <p className="text-xs text-primary mt-1">
                                +{anomaly.recommendations.length - 1} more
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
