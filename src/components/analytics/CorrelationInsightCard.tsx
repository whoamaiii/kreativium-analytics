import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

export interface CorrelationInsightCardProps {
  factor1: string;
  factor2: string;
  strength: number;
  observationCount?: number;
  timespan?: string;
  onExit?: () => void;
}

/**
 * Get correlation strength label and color
 */
function getStrengthInfo(r: number): {
  label: string;
  color: string;
  dots: string;
  emoji: string;
} {
  const absR = Math.abs(r);

  if (absR >= 0.8) {
    return {
      label: "Very Strong",
      color: "text-red-600 dark:text-red-400",
      dots: "●●●●●",
      emoji: r > 0 ? "🔥" : "❄️"
    };
  } else if (absR >= 0.6) {
    return {
      label: "Strong",
      color: "text-orange-600 dark:text-orange-400",
      dots: "●●●●○",
      emoji: r > 0 ? "🟠" : "🔵"
    };
  } else if (absR >= 0.4) {
    return {
      label: "Moderate",
      color: "text-yellow-600 dark:text-yellow-400",
      dots: "●●●○○",
      emoji: r > 0 ? "🟡" : "🔷"
    };
  } else {
    return {
      label: "Weak",
      color: "text-gray-600 dark:text-gray-400",
      dots: "●●○○○",
      emoji: "·"
    };
  }
}

/**
 * Get relationship direction icon
 */
function getDirectionIcon(r: number) {
  if (r > 0.1) return <TrendingUp className="h-4 w-4" />;
  if (r < -0.1) return <TrendingDown className="h-4 w-4" />;
  return <Minus className="h-4 w-4" />;
}

/**
 * Get relationship description
 */
function getRelationshipDescription(factor1: string, factor2: string, r: number): string {
  if (r > 0.1) {
    return `When ${factor1} increases, ${factor2} typically increases.`;
  } else if (r < -0.1) {
    return `When ${factor1} increases, ${factor2} typically decreases.`;
  } else {
    return `${factor1} and ${factor2} show little to no relationship.`;
  }
}

/**
 * CorrelationInsightCard
 *
 * Beautiful visualization of correlation relationship when exploring
 * patterns filtered by correlation. Shows the "story" of how two
 * factors dance together.
 *
 * Design philosophy: Make the invisible visible. A correlation coefficient
 * is just a number—this card tells the human story behind it.
 */
export const CorrelationInsightCard: React.FC<CorrelationInsightCardProps> = ({
  factor1,
  factor2,
  strength,
  observationCount,
  timespan,
  onExit
}) => {
  const strengthInfo = getStrengthInfo(strength);
  const description = getRelationshipDescription(factor1, factor2, strength);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card className="bg-gradient-to-br from-primary/5 via-background to-background border-2 border-primary/20 shadow-lg">
        <CardContent className="pt-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Link2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Exploring Relationship
                </h3>
              </div>
            </div>
            {onExit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onExit}
                className="h-8 w-8 p-0"
                aria-label="Exit exploration mode"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Relationship Visualization */}
          <div className="mb-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              {/* Factor 1 */}
              <div className="flex-1 text-right">
                <Badge
                  variant="outline"
                  className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700 font-medium"
                >
                  {factor1}
                </Badge>
              </div>

              {/* Connection Line with Direction */}
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-0.5 text-muted-foreground">
                  <div className="w-8 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                  {getDirectionIcon(strength)}
                  <div className="w-8 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                </div>
              </div>

              {/* Factor 2 */}
              <div className="flex-1 text-left">
                <Badge
                  variant="outline"
                  className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-700 font-medium"
                >
                  {factor2}
                </Badge>
              </div>
            </div>

            {/* Strength Indicator */}
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">{strengthInfo.emoji}</span>
                <span className="text-lg font-mono font-bold">
                  r = {strength.toFixed(2)}
                </span>
                <span className="text-2xl">{strengthInfo.emoji}</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <span className={`text-sm font-semibold ${strengthInfo.color}`}>
                  {strengthInfo.label} {strength > 0 ? "Positive" : strength < 0 ? "Negative" : "None"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {strengthInfo.dots}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-4 p-3 bg-muted/30 rounded-lg">
            <p className="text-sm text-foreground/90 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Metadata */}
          {(observationCount || timespan) && (
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              {observationCount && (
                <span>
                  Based on <strong className="text-foreground">{observationCount}</strong> observation{observationCount !== 1 ? 's' : ''}
                </span>
              )}
              {timespan && (
                <>
                  <span>•</span>
                  <span>over {timespan}</span>
                </>
              )}
            </div>
          )}

          {/* Help Text */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-xs text-center text-muted-foreground">
              💡 Patterns below are filtered to show only those involving <strong>both factors</strong>
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
