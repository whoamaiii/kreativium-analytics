import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CorrelationResult } from "@/lib/patternAnalysis";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";

interface CorrelationHeatMapProps {
  correlations: CorrelationResult[];
  onCellClick?: (correlation: CorrelationResult) => void;
}

/**
 * Get emoji representation based on correlation strength and significance
 */
function getCorrelationEmoji(correlation: number, significance: CorrelationResult['significance']): string {
  if (significance === 'high') {
    return correlation > 0 ? '🔥' : '❄️';
  } else if (significance === 'moderate') {
    return correlation > 0 ? '🟡' : '🔵';
  } else {
    return '·';
  }
}

/**
 * Get background color based on correlation value
 */
function getCorrelationColor(correlation: number, significance: CorrelationResult['significance']): string {
  if (significance === 'low') {
    return 'bg-muted/30';
  }

  const absCorr = Math.abs(correlation);

  if (correlation > 0) {
    // Positive correlation - warm colors
    if (absCorr > 0.7) return 'bg-red-100 dark:bg-red-900/30';
    if (absCorr > 0.5) return 'bg-orange-100 dark:bg-orange-900/30';
    if (absCorr > 0.3) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-green-100/50 dark:bg-green-900/20';
  } else {
    // Negative correlation - cool colors
    if (absCorr > 0.7) return 'bg-blue-100 dark:bg-blue-900/30';
    if (absCorr > 0.5) return 'bg-cyan-100 dark:bg-cyan-900/30';
    if (absCorr > 0.3) return 'bg-teal-100 dark:bg-teal-900/30';
    return 'bg-gray-100/50 dark:bg-gray-900/20';
  }
}

/**
 * Extract unique factors from correlations to build matrix axes
 */
function extractFactors(correlations: CorrelationResult[]): { sensoryFactors: string[]; emotionFactors: string[] } {
  const sensorySet = new Set<string>();
  const emotionSet = new Set<string>();

  correlations.forEach(corr => {
    // Heuristic: if factor contains sensory terms, it's sensory; otherwise emotion
    const sensoryTerms = ['auditory', 'visual', 'tactile', 'olfactory', 'gustatory', 'vestibular', 'proprioceptive', 'interoceptive'];
    const isFactor1Sensory = sensoryTerms.some(term => corr.factor1.toLowerCase().includes(term));
    const isFactor2Sensory = sensoryTerms.some(term => corr.factor2.toLowerCase().includes(term));

    if (isFactor1Sensory) {
      sensorySet.add(corr.factor1);
      emotionSet.add(corr.factor2);
    } else if (isFactor2Sensory) {
      sensorySet.add(corr.factor2);
      emotionSet.add(corr.factor1);
    } else {
      // Both are likely emotions or neither - add both to emotions
      emotionSet.add(corr.factor1);
      emotionSet.add(corr.factor2);
    }
  });

  return {
    sensoryFactors: Array.from(sensorySet).sort(),
    emotionFactors: Array.from(emotionSet).sort()
  };
}

/**
 * Find correlation between two specific factors
 */
function findCorrelation(
  correlations: CorrelationResult[],
  factor1: string,
  factor2: string
): CorrelationResult | null {
  return correlations.find(
    c =>
      (c.factor1 === factor1 && c.factor2 === factor2) ||
      (c.factor1 === factor2 && c.factor2 === factor1)
  ) || null;
}

/**
 * CorrelationHeatMap component - Visual matrix of emotion-sensory relationships
 *
 * Displays correlations in a color-coded heat map:
 * - Rows: Sensory inputs (Auditory-Avoid, Tactile-Seek, etc.)
 * - Columns: Emotions (Anxious, Happy, Frustrated, etc.)
 * - Cells: Color intensity + emoji indicating correlation strength
 * - Interactive: Click cell to filter timeline
 */
export const CorrelationHeatMap: React.FC<CorrelationHeatMapProps> = ({
  correlations,
  onCellClick
}) => {
  if (!correlations || correlations.length === 0) {
    return (
      <Card className="bg-gradient-card border-0 shadow-soft">
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            No correlations detected yet. Track more entries to see patterns.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { sensoryFactors, emotionFactors } = extractFactors(correlations);

  // If no clear separation, show simple message
  if (sensoryFactors.length === 0 || emotionFactors.length === 0) {
    return (
      <Card className="bg-gradient-card border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">Correlation Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {correlations.length} correlation{correlations.length > 1 ? 's' : ''} detected
          </p>
          <div className="space-y-2">
            {correlations.slice(0, 5).map((corr, index) => (
              <div
                key={index}
                className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                onClick={() => onCellClick?.(corr)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {corr.factor1} ↔ {corr.factor2}
                  </span>
                  <span className="text-lg">
                    {getCorrelationEmoji(corr.correlation, corr.significance)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{corr.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-0 shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Correlation Heat Map</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-xs">
                  <strong>Legend:</strong><br />
                  🔥 Strong positive (common together)<br />
                  🟡 Moderate positive<br />
                  🔵 Moderate negative (rarely together)<br />
                  ❄️ Strong negative<br />
                  · Weak/no correlation
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-left text-xs font-medium text-muted-foreground sticky left-0 bg-background">
                  {/* Empty corner cell */}
                </th>
                {emotionFactors.map((emotion, index) => (
                  <th
                    key={emotion}
                    className="p-2 text-center text-xs font-medium text-muted-foreground min-w-[80px]"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      {emotion}
                    </motion.div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sensoryFactors.map((sensory, rowIndex) => (
                <tr key={sensory}>
                  <td className="p-2 text-left text-xs font-medium text-foreground sticky left-0 bg-background border-r">
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: rowIndex * 0.05 }}
                    >
                      {sensory}
                    </motion.div>
                  </td>
                  {emotionFactors.map((emotion, colIndex) => {
                    const correlation = findCorrelation(correlations, sensory, emotion);
                    const emoji = correlation
                      ? getCorrelationEmoji(correlation.correlation, correlation.significance)
                      : '·';
                    const bgColor = correlation
                      ? getCorrelationColor(correlation.correlation, correlation.significance)
                      : 'bg-muted/20';

                    return (
                      <TooltipProvider key={`${sensory}-${emotion}`}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <td
                              className={`p-3 text-center text-lg border ${bgColor} transition-all cursor-pointer hover:scale-110 hover:shadow-md`}
                              onClick={() => correlation && onCellClick?.(correlation)}
                            >
                              <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{
                                  duration: 0.3,
                                  delay: (rowIndex * emotionFactors.length + colIndex) * 0.02
                                }}
                              >
                                {emoji}
                              </motion.div>
                            </td>
                          </TooltipTrigger>
                          {correlation && (
                            <TooltipContent>
                              <div className="text-xs space-y-1">
                                <p className="font-medium">{sensory} → {emotion}</p>
                                <p className="text-muted-foreground">{correlation.description}</p>
                                <p>
                                  Correlation: {(correlation.correlation * 100).toFixed(0)}%
                                </p>
                                <p className="text-primary">Click to view timeline</p>
                              </div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Legend:</p>
          <div className="flex flex-wrap gap-3 text-xs">
            <span>🔥 Strong positive</span>
            <span>🟡 Moderate positive</span>
            <span>🔵 Moderate negative</span>
            <span>❄️ Strong negative</span>
            <span>· Weak/none</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
