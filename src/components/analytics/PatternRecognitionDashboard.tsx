import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatternResult, CorrelationResult } from "@/lib/patternAnalysis";
import { PatternCard } from "./PatternCard";
import { CorrelationHeatMap } from "./CorrelationHeatMap";
import { PatternStrengthList } from "./PatternStrengthList";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Grid3x3, List } from "lucide-react";

interface PatternRecognitionDashboardProps {
  patterns: PatternResult[];
  correlations: CorrelationResult[];
  onPatternSelect?: (pattern: PatternResult) => void;
  onCorrelationSelect?: (correlation: CorrelationResult) => void;
}

/**
 * PatternRecognitionDashboard - Main container for pattern visualization
 *
 * Provides three views:
 * 1. Cards - Visual pattern cards with emoji flows (default)
 * 2. Heat Map - Correlation matrix visualization
 * 3. List - Categorized pattern strength list
 *
 * This dashboard transforms technical analytics into intuitive,
 * actionable insights for teachers.
 */
export const PatternRecognitionDashboard: React.FC<PatternRecognitionDashboardProps> = ({
  patterns,
  correlations,
  onPatternSelect,
  onCorrelationSelect
}) => {
  const [selectedTab, setSelectedTab] = useState<string>("cards");

  // Sort patterns by confidence (highest first)
  const sortedPatterns = [...patterns].sort((a, b) => b.confidence - a.confidence);

  // Show top patterns in card view (limit to 6 for performance)
  const topPatterns = sortedPatterns.slice(0, 6);

  if (!patterns || patterns.length === 0) {
    return (
      <Card className="bg-gradient-card border-0 shadow-soft">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <Brain className="h-16 w-16 mx-auto text-muted-foreground/50" />
            <div>
              <h3 className="text-lg font-semibold mb-2">No Patterns Detected Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Keep tracking emotions and sensory inputs. The AI will start detecting patterns
                after you have at least 10-15 entries.
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
          <Brain className="h-6 w-6 text-primary" />
          Pattern Recognition
        </h2>
        <p className="text-sm text-muted-foreground">
          {patterns.length} pattern{patterns.length > 1 ? 's' : ''} detected,{' '}
          {correlations.length} correlation{correlations.length > 1 ? 's' : ''} identified
        </p>
      </div>

      {/* View Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="cards" className="flex items-center gap-2">
            <Grid3x3 className="h-4 w-4" />
            <span className="hidden sm:inline">Cards</span>
          </TabsTrigger>
          <TabsTrigger value="heatmap" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Heat Map</span>
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">List</span>
          </TabsTrigger>
        </TabsList>

        {/* Cards View */}
        <TabsContent value="cards" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topPatterns.map((pattern, index) => (
              <PatternCard
                key={index}
                pattern={pattern}
                onViewTimeline={() => onPatternSelect?.(pattern)}
                onViewInterventions={() => onPatternSelect?.(pattern)}
              />
            ))}
          </div>

          {sortedPatterns.length > topPatterns.length && (
            <Card className="bg-muted/30 border-0">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Showing top {topPatterns.length} of {sortedPatterns.length} patterns.
                  Switch to <strong>List view</strong> to see all patterns.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Heat Map View */}
        <TabsContent value="heatmap">
          <CorrelationHeatMap
            correlations={correlations}
            onCellClick={onCorrelationSelect}
          />
        </TabsContent>

        {/* List View */}
        <TabsContent value="list">
          <PatternStrengthList
            patterns={sortedPatterns}
            onPatternSelect={onPatternSelect}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
