import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InterventionResult } from "@/types/analytics";
import { Lightbulb, Target, Clock, TrendingUp, CheckCircle, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

interface InterventionPanelProps {
  interventions: InterventionResult[];
  onStartIntervention?: (intervention: InterventionResult) => void;
  onSaveToIEP?: (intervention: InterventionResult) => void;
}

/**
 * Get impact level color coding
 */
function getImpactColor(impact?: 'low' | 'medium' | 'high'): string {
  switch (impact) {
    case 'high':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'low':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
}

/**
 * Get time horizon icon
 */
function getTimeHorizonIcon(timeHorizon?: 'short' | 'medium' | 'long') {
  return <Clock className="h-3 w-3" />;
}

/**
 * Get time horizon label
 */
function getTimeHorizonLabel(timeHorizon?: 'short' | 'medium' | 'long'): string {
  switch (timeHorizon) {
    case 'short':
      return 'Immediate (1-2 days)';
    case 'medium':
      return 'Short-term (1-2 weeks)';
    case 'long':
      return 'Long-term (1+ month)';
    default:
      return 'Varies';
  }
}

/**
 * InterventionPanel - AI-powered intervention recommendations
 *
 * Displays evidence-based intervention suggestions with:
 * - Actionable steps (checklist format)
 * - Expected impact and time horizon
 * - Evidence citations (research, UDL checkpoints)
 * - Measurable success metrics
 * - Actions: Start, Save to IEP, Share
 */
export const InterventionPanel: React.FC<InterventionPanelProps> = ({
  interventions,
  onStartIntervention,
  onSaveToIEP
}) => {
  // Track which action steps are checked per intervention
  const [checkedSteps, setCheckedSteps] = useState<Record<number, Set<number>>>({});

  const handleStepToggle = (interventionIndex: number, stepIndex: number) => {
    setCheckedSteps(prev => {
      const newChecked = { ...prev };
      if (!newChecked[interventionIndex]) {
        newChecked[interventionIndex] = new Set();
      }
      if (newChecked[interventionIndex].has(stepIndex)) {
        newChecked[interventionIndex].delete(stepIndex);
      } else {
        newChecked[interventionIndex].add(stepIndex);
      }
      return newChecked;
    });
  };

  if (!interventions || interventions.length === 0) {
    return (
      <Card className="bg-gradient-card border-0 shadow-soft">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <Lightbulb className="h-16 w-16 mx-auto text-muted-foreground/50" />
            <div>
              <h3 className="text-lg font-semibold mb-2">No Interventions Available</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                AI-powered intervention suggestions will appear here once patterns are detected.
                Keep tracking to build a rich dataset.
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
          <Lightbulb className="h-6 w-6 text-primary" />
          Intervention Recommendations
        </h2>
        <p className="text-sm text-muted-foreground">
          {interventions.length} evidence-based suggestion{interventions.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Intervention Cards */}
      <div className="space-y-6">
        {interventions.map((intervention, interventionIndex) => {
          const checkedCount = checkedSteps[interventionIndex]?.size || 0;
          const totalSteps = intervention.actions.length;
          const completionPercent = totalSteps > 0 ? (checkedCount / totalSteps) * 100 : 0;

          return (
            <motion.div
              key={interventionIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: interventionIndex * 0.1 }}
            >
              <Card className="bg-gradient-card border-0 shadow-soft hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{intervention.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {intervention.description}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {intervention.expectedImpact && (
                        <Badge className={getImpactColor(intervention.expectedImpact)}>
                          {intervention.expectedImpact.charAt(0).toUpperCase() +
                           intervention.expectedImpact.slice(1)} Impact
                        </Badge>
                      )}
                      {intervention.tier && (
                        <Badge variant="outline">
                          {intervention.tier}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Action Steps */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Action Steps:
                    </h4>
                    <div className="space-y-2">
                      {intervention.actions.map((action, stepIndex) => (
                        <div
                          key={stepIndex}
                          className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            id={`step-${interventionIndex}-${stepIndex}`}
                            checked={checkedSteps[interventionIndex]?.has(stepIndex) || false}
                            onCheckedChange={() => handleStepToggle(interventionIndex, stepIndex)}
                            className="mt-0.5"
                          />
                          <label
                            htmlFor={`step-${interventionIndex}-${stepIndex}`}
                            className={`text-sm flex-1 cursor-pointer ${
                              checkedSteps[interventionIndex]?.has(stepIndex)
                                ? 'line-through text-muted-foreground'
                                : ''
                            }`}
                          >
                            {action}
                          </label>
                        </div>
                      ))}
                    </div>

                    {/* Progress Bar */}
                    {totalSteps > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span>{checkedCount} of {totalSteps} completed</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${completionPercent}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expected Impact & Time Horizon */}
                  <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
                    {intervention.expectedImpact && (
                      <div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <TrendingUp className="h-3 w-3" />
                          <span>Expected Impact</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                intervention.expectedImpact === 'high'
                                  ? 'bg-green-500 w-full'
                                  : intervention.expectedImpact === 'medium'
                                  ? 'bg-yellow-500 w-2/3'
                                  : 'bg-blue-500 w-1/3'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {intervention.timeHorizon && (
                      <div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          {getTimeHorizonIcon(intervention.timeHorizon)}
                          <span>Time Horizon</span>
                        </div>
                        <p className="text-sm font-medium">
                          {getTimeHorizonLabel(intervention.timeHorizon)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Success Metrics */}
                  {intervention.metrics && intervention.metrics.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Success Metrics:
                      </h4>
                      <ul className="space-y-1">
                        {intervention.metrics.map((metric, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{metric}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Evidence & Sources */}
                  {(intervention.sources?.length > 0 || intervention.udlCheckpoints?.length > 0) && (
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Evidence Base:
                      </h4>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        {intervention.sources && intervention.sources.length > 0 && (
                          <p>
                            <strong>Sources:</strong> Based on {intervention.sources.length} research
                            stud{intervention.sources.length === 1 ? 'y' : 'ies'}
                          </p>
                        )}
                        {intervention.udlCheckpoints && intervention.udlCheckpoints.length > 0 && (
                          <p>
                            <strong>UDL Checkpoints:</strong> {intervention.udlCheckpoints.join(', ')}
                          </p>
                        )}
                        {intervention.confidence && (
                          <p>
                            <strong>Confidence:</strong> {Math.round(intervention.confidence.overall || 0 * 100)}%
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-4">
                    {onStartIntervention && (
                      <Button
                        onClick={() => onStartIntervention(intervention)}
                        className="flex-1"
                      >
                        <Lightbulb className="h-4 w-4 mr-2" />
                        Start Intervention
                      </Button>
                    )}
                    {onSaveToIEP && (
                      <Button
                        variant="outline"
                        onClick={() => onSaveToIEP(intervention)}
                        className="flex-1"
                      >
                        Save to IEP
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
