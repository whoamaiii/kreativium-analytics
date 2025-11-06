import { PatternResult } from "@/lib/patternAnalysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PatternStrengthListProps {
  patterns: PatternResult[];
  onPatternSelect?: (pattern: PatternResult) => void;
}

type PatternCategory = 'strong' | 'moderate' | 'emerging';

interface CategorizedPatterns {
  strong: PatternResult[];
  moderate: PatternResult[];
  emerging: PatternResult[];
}

/**
 * Categorize patterns by confidence level
 */
function categorizePatterns(patterns: PatternResult[]): CategorizedPatterns {
  return patterns.reduce(
    (acc, pattern) => {
      if (pattern.confidence >= 0.8) {
        acc.strong.push(pattern);
      } else if (pattern.confidence >= 0.6) {
        acc.moderate.push(pattern);
      } else {
        acc.emerging.push(pattern);
      }
      return acc;
    },
    { strong: [], moderate: [], emerging: [] } as CategorizedPatterns
  );
}

/**
 * Get category display config
 */
function getCategoryConfig(category: PatternCategory): {
  label: string;
  emoji: string;
  color: string;
  barColor: string;
} {
  switch (category) {
    case 'strong':
      return {
        label: 'Strong Patterns',
        emoji: '🔥',
        color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        barColor: 'bg-red-500'
      };
    case 'moderate':
      return {
        label: 'Moderate Patterns',
        emoji: '🟡',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        barColor: 'bg-yellow-500'
      };
    case 'emerging':
      return {
        label: 'Emerging Patterns',
        emoji: '🔵',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        barColor: 'bg-blue-500'
      };
  }
}

/**
 * PatternStrengthList component - Categorized, sortable list of patterns
 *
 * Organizes patterns into three categories:
 * - Strong (confidence >= 80%) - High priority, actionable
 * - Moderate (60-79%) - Worth monitoring
 * - Emerging (< 60%) - Early signals, watch for development
 */
export const PatternStrengthList: React.FC<PatternStrengthListProps> = ({
  patterns,
  onPatternSelect
}) => {
  const [expandedCategory, setExpandedCategory] = useState<PatternCategory | null>('strong');

  if (!patterns || patterns.length === 0) {
    return (
      <Card className="bg-gradient-card border-0 shadow-soft">
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            No patterns detected yet. Track more entries to discover patterns.
          </p>
        </CardContent>
      </Card>
    );
  }

  const categorized = categorizePatterns(patterns);

  const renderCategorySection = (category: PatternCategory) => {
    const config = getCategoryConfig(category);
    const patternsInCategory = categorized[category];
    const isExpanded = expandedCategory === category;

    if (patternsInCategory.length === 0) {
      return null;
    }

    return (
      <div key={category} className="border border-border rounded-lg overflow-hidden">
        {/* Category Header */}
        <button
          className="w-full p-4 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
          onClick={() => setExpandedCategory(isExpanded ? null : category)}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{config.emoji}</span>
            <div className="text-left">
              <h3 className="font-semibold text-sm">{config.label}</h3>
              <p className="text-xs text-muted-foreground">
                {patternsInCategory.length} pattern{patternsInCategory.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={config.color}>
              {patternsInCategory.length}
            </Badge>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* Pattern List */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-2 space-y-2">
                {patternsInCategory.map((pattern, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <div
                      className="p-3 bg-background rounded-lg border border-border hover:border-primary/50 transition-all cursor-pointer group"
                      onClick={() => onPatternSelect?.(pattern)}
                    >
                      {/* Pattern Info */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-1 group-hover:text-primary transition-colors">
                            {pattern.pattern}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {pattern.description}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-muted-foreground ml-2">
                          {Math.round(pattern.confidence * 100)}%
                        </span>
                      </div>

                      {/* Confidence Bar */}
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                        <motion.div
                          className={config.barColor}
                          initial={{ width: 0 }}
                          animate={{ width: `${pattern.confidence * 100}%` }}
                          transition={{ duration: 0.4, delay: index * 0.05 }}
                          style={{ height: '100%' }}
                        />
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {pattern.frequency} occurrences ({pattern.timeframe})
                        </span>
                        <span className="text-muted-foreground">
                          {pattern.dataPoints} observations
                        </span>
                      </div>

                      {/* Quick Action Hint */}
                      <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <TrendingUp className="h-3 w-3" />
                          <span>Click to view details</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <Card className="bg-gradient-card border-0 shadow-soft">
      <CardHeader>
        <CardTitle className="text-lg">Pattern Strength Overview</CardTitle>
        <p className="text-sm text-muted-foreground">
          {patterns.length} total pattern{patterns.length > 1 ? 's' : ''} detected
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {renderCategorySection('strong')}
        {renderCategorySection('moderate')}
        {renderCategorySection('emerging')}

        {/* Summary Stats */}
        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            <strong>{categorized.strong.length}</strong> actionable pattern{categorized.strong.length !== 1 ? 's' : ''} ready for intervention
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
