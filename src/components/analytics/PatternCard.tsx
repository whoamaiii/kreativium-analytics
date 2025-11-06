import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PatternResult } from "@/lib/patternAnalysis";
import { TrendingUp, Calendar, Lightbulb, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface PatternCardProps {
  pattern: PatternResult;
  onViewTimeline?: () => void;
  onViewInterventions?: () => void;
}

/**
 * Converts pattern type to emoji representation
 */
function getPatternEmoji(type: PatternResult['type']): string {
  switch (type) {
    case 'emotion':
      return '😰';
    case 'sensory':
      return '👂';
    case 'environmental':
      return '🌍';
    case 'correlation':
      return '🔗';
    default:
      return '📊';
  }
}

/**
 * Converts confidence score to visual representation
 */
function getConfidenceBadge(confidence: number): { color: string; label: string; emoji: string } {
  if (confidence >= 0.8) {
    return { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Strong', emoji: '🔥' };
  } else if (confidence >= 0.6) {
    return { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', label: 'Moderate', emoji: '🟡' };
  } else {
    return { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', label: 'Emerging', emoji: '🔵' };
  }
}

/**
 * Extracts visual flow from pattern description
 * Example: "Loud noise → Covers ears → Anxious" becomes emoji flow
 */
function getVisualFlow(pattern: string, type: PatternResult['type']): string[] {
  // Try to extract trigger → behavior → emotion pattern
  const parts = pattern.split('→').map(p => p.trim());

  if (parts.length >= 2) {
    return parts;
  }

  // Fallback: show pattern as-is
  return [pattern];
}

/**
 * PatternCard component - Visual narrative for a detected pattern
 *
 * Displays patterns in an intuitive, emoji-rich format that tells a story:
 * - Visual flow diagram (trigger → behavior → outcome)
 * - Confidence and frequency indicators
 * - Quick actions (timeline, interventions)
 */
export const PatternCard: React.FC<PatternCardProps> = ({
  pattern,
  onViewTimeline,
  onViewInterventions
}) => {
  const confidenceBadge = getConfidenceBadge(pattern.confidence);
  const visualFlow = getVisualFlow(pattern.pattern, pattern.type);
  const emoji = getPatternEmoji(pattern.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-gradient-card border-0 shadow-soft hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{confidenceBadge.emoji}</span>
              <div>
                <Badge className={confidenceBadge.color}>
                  {confidenceBadge.label} Pattern
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {pattern.type.charAt(0).toUpperCase() + pattern.type.slice(1)}
                </p>
              </div>
            </div>
            <span className="text-3xl">{emoji}</span>
          </div>

          {/* Visual Flow */}
          <div className="mb-4">
            <div className="flex flex-wrap items-center gap-2">
              {visualFlow.map((step, index) => (
                <React.Fragment key={index}>
                  <div className="px-3 py-2 bg-primary/10 rounded-lg border border-primary/20">
                    <span className="text-sm font-medium">{step}</span>
                  </div>
                  {index < visualFlow.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-4">
            {pattern.description}
          </p>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Confidence Bar */}
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Confidence</span>
                <span className="font-medium">{Math.round(pattern.confidence * 100)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${pattern.confidence * 100}%` }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                />
              </div>
            </div>

            {/* Frequency */}
            <div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Calendar className="h-3 w-3" />
                <span>Occurrences</span>
              </div>
              <p className="text-sm font-semibold">
                {pattern.frequency} times ({pattern.timeframe})
              </p>
            </div>
          </div>

          {/* Data Quality Indicator */}
          <div className="mb-4 p-2 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground">
              Based on <span className="font-medium text-foreground">{pattern.dataPoints}</span> observations
            </p>
          </div>

          {/* Recommendations Preview */}
          {pattern.recommendations && pattern.recommendations.length > 0 && (
            <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-primary mb-1">Quick Tip:</p>
                  <p className="text-xs text-muted-foreground">
                    {pattern.recommendations[0]}
                  </p>
                  {pattern.recommendations.length > 1 && (
                    <p className="text-xs text-primary mt-1">
                      +{pattern.recommendations.length - 1} more suggestion{pattern.recommendations.length > 2 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {onViewTimeline && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewTimeline}
                className="flex-1"
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                Timeline
              </Button>
            )}
            {onViewInterventions && pattern.recommendations && pattern.recommendations.length > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={onViewInterventions}
                className="flex-1"
              >
                <Lightbulb className="h-3 w-3 mr-1" />
                Interventions
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
