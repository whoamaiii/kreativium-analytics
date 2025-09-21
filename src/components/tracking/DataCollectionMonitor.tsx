import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  Target,
  Clock,
  Calendar,
  Activity,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import { sessionManager, SessionStatistics } from '@/lib/sessionManager';
import { differenceInDays, addDays, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DataCollectionMonitorProps {
  studentId: string;
  className?: string;
  showRecommendations?: boolean;
  showStatistics?: boolean;
}

interface CollectionGoal {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  deadline?: Date;
  priority: 'high' | 'medium' | 'low';
  category: 'frequency' | 'quality' | 'diversity';
}

interface DataCollectionStrategy {
  id: string;
  name: string;
  description: string;
  benefits: string[];
  implementation: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  timeRequired: string;
  effectiveness: number; // 1-5
}

/**
 * DataCollectionMonitor Component
 * Monitors data collection patterns and provides strategies for improvement
 */
export const DataCollectionMonitor: React.FC<DataCollectionMonitorProps> = ({
  studentId,
  className,
  showRecommendations = true,
  showStatistics = true,
}) => {
  const [statistics, setStatistics] = useState<SessionStatistics | null>(null);
  const [activeStrategies, setActiveStrategies] = useState<string[]>([]);
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      const stats = sessionManager.getStatistics(studentId);
      setStatistics(stats);
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [studentId]);

  // Define collection goals based on current statistics
  const collectionGoals = useMemo<CollectionGoal[]>(() => {
    if (!statistics) return [];

    const goals: CollectionGoal[] = [
      {
        id: 'daily-sessions',
        title: 'Daily Sessions',
        description: 'Maintain consistent daily data collection',
        target: 7,
        current: Math.min(statistics.totalSessions, 7),
        unit: 'sessions/week',
        deadline: addDays(new Date(), 7),
        priority: 'high',
        category: 'frequency',
      },
      {
        id: 'session-quality',
        title: 'Session Quality',
        description: 'Achieve high-quality data collection',
        target: 80,
        current: Math.round(statistics.averageQuality),
        unit: '% quality',
        priority: 'high',
        category: 'quality',
      },
      {
        id: 'data-points',
        title: 'Data Points per Session',
        description: 'Collect comprehensive data in each session',
        target: 10,
        current: Math.round(statistics.averageDataPoints),
        unit: 'points',
        priority: 'medium',
        category: 'quality',
      },
      {
        id: 'session-duration',
        title: 'Session Duration',
        description: 'Spend adequate time on observation',
        target: 10,
        current: Math.round(statistics.averageDuration / 60000),
        unit: 'minutes',
        priority: 'medium',
        category: 'quality',
      },
      {
        id: 'completion-rate',
        title: 'Completion Rate',
        description: 'Complete sessions without abandoning',
        target: 90,
        current: statistics.totalSessions > 0 
          ? Math.round((statistics.completedSessions / statistics.totalSessions) * 100)
          : 0,
        unit: '% completed',
        priority: 'low',
        category: 'frequency',
      },
    ];

    return goals;
  }, [statistics]);

  // Define data collection strategies
  const strategies = useMemo<DataCollectionStrategy[]>(() => [
    {
      id: 'scheduled-sessions',
      name: 'Scheduled Sessions',
      description: 'Set specific times for daily data collection',
      benefits: [
        'Creates consistent routine',
        'Improves data reliability',
        'Reduces forgotten sessions',
      ],
      implementation: [
        'Choose a consistent time each day',
        'Set reminders or alarms',
        'Link to existing routines (e.g., after meals)',
        'Start with 5-minute sessions',
      ],
      difficulty: 'easy',
      timeRequired: '5-10 minutes/day',
      effectiveness: 5,
    },
    {
      id: 'quick-capture',
      name: 'Quick Capture Mode',
      description: 'Use rapid data entry for busy moments',
      benefits: [
        'Captures more frequent data',
        'Reduces session abandonment',
        'Works in time-constrained situations',
      ],
      implementation: [
        'Focus on key emotions first',
        'Add sensory data if time permits',
        'Use voice notes for context',
        'Save partial sessions frequently',
      ],
      difficulty: 'easy',
      timeRequired: '2-3 minutes',
      effectiveness: 4,
    },
    {
      id: 'environmental-triggers',
      name: 'Environmental Triggers',
      description: 'Link data collection to environmental changes',
      benefits: [
        'Captures transition moments',
        'Identifies environmental patterns',
        'Natural reminder system',
      ],
      implementation: [
        'Record when entering new spaces',
        'Note changes in noise/lighting',
        'Track before/after activities',
        'Document unexpected changes',
      ],
      difficulty: 'medium',
      timeRequired: '3-5 minutes/trigger',
      effectiveness: 4,
    },
    {
      id: 'collaborative-collection',
      name: 'Collaborative Collection',
      description: 'Involve caregivers or teachers in observation',
      benefits: [
        'Multiple perspectives',
        'More comprehensive data',
        'Shared understanding',
      ],
      implementation: [
        'Share observation guidelines',
        'Rotate collection responsibilities',
        'Compare observations',
        'Weekly review meetings',
      ],
      difficulty: 'medium',
      timeRequired: '10-15 minutes/session',
      effectiveness: 5,
    },
    {
      id: 'thematic-focus',
      name: 'Thematic Focus Days',
      description: 'Focus on specific aspects each day',
      benefits: [
        'Deeper insights per area',
        'Reduces cognitive load',
        'Improves data quality',
      ],
      implementation: [
        'Monday: Emotions focus',
        'Tuesday: Sensory responses',
        'Wednesday: Environmental factors',
        'Thursday: Social interactions',
        'Friday: Comprehensive review',
      ],
      difficulty: 'easy',
      timeRequired: '5-10 minutes/day',
      effectiveness: 4,
    },
  ], []);

  // Get recommended strategies based on current issues
  const recommendedStrategies = useMemo(() => {
    if (!statistics) return [];

    const recommendations = [];
    
    // Low frequency: recommend scheduled sessions
    if (statistics.totalSessions < 5) {
      recommendations.push('scheduled-sessions');
    }

    // Low quality: recommend thematic focus
    if (statistics.averageQuality < 50) {
      recommendations.push('thematic-focus');
    }

    // Short sessions: recommend quick capture
    if (statistics.averageDuration < 5 * 60 * 1000) {
      recommendations.push('quick-capture');
    }

    // High abandonment: recommend environmental triggers
    if (statistics.abandonedSessions > statistics.completedSessions * 0.2) {
      recommendations.push('environmental-triggers');
    }

    return strategies.filter(s => recommendations.includes(s.id));
  }, [statistics, strategies]);

  const toggleStrategy = (strategyId: string) => {
    setActiveStrategies(prev => 
      prev.includes(strategyId) 
        ? prev.filter(id => id !== strategyId)
        : [...prev, strategyId]
    );
  };

  if (!statistics) {
    return (
      <Card className={cn('bg-gradient-card border-0 shadow-soft', className)}>
        <CardContent className="py-8 text-center">
          <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No data collection history yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Start your first session to see monitoring insights
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Statistics Overview */}
      {showStatistics && (
        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Collection Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{statistics.totalSessions}</p>
                <p className="text-xs text-muted-foreground">Total Sessions</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">
                  {statistics.totalSessions > 0 
                    ? Math.round((statistics.completedSessions / statistics.totalSessions) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Completion Rate</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">
                  {Math.round(statistics.averageQuality)}%
                </p>
                <p className="text-xs text-muted-foreground">Avg Quality</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">
                  {Math.round(statistics.averageDuration / 60000)}m
                </p>
                <p className="text-xs text-muted-foreground">Avg Duration</p>
              </div>
            </div>

            {/* Common Issues */}
            {statistics.mostCommonIssues.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  Common Issues
                </h4>
                <div className="space-y-1">
                  {statistics.mostCommonIssues.slice(0, 3).map((issue) => (
                    <div key={issue.issue} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{issue.issue}</span>
                      <Badge variant="outline" className="text-xs">
                        {issue.count} times
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Collection Goals */}
      <Card className="bg-gradient-card border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Collection Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {collectionGoals.map((goal) => {
              const progress = Math.min(100, (goal.current / goal.target) * 100);
              const isAchieved = progress >= 100;

              return (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isAchieved ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">{goal.title}</span>
                      <Badge 
                        variant={
                          goal.priority === 'high' ? 'destructive' : 
                          goal.priority === 'medium' ? 'secondary' : 
                          'outline'
                        }
                        className="text-xs"
                      >
                        {goal.priority}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {goal.current}/{goal.target} {goal.unit}
                    </span>
                  </div>
                  <Progress 
                    value={progress} 
                    className={cn('h-2', isAchieved && 'bg-green-100')}
                  />
                  {!isAchieved && goal.deadline && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Target by {format(goal.deadline, 'MMM d')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recommended Strategies */}
      {showRecommendations && recommendedStrategies.length > 0 && (
        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Recommended Strategies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendedStrategies.map((strategy) => (
                <div
                  key={strategy.id}
                  className={cn(
                    'p-3 rounded-lg border transition-all',
                    activeStrategies.includes(strategy.id) 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border',
                    expandedStrategy === strategy.id && 'bg-muted/50'
                  )}
                >
                  <div 
                    role="button"
                    tabIndex={0}
                    aria-expanded={expandedStrategy === strategy.id}
                    aria-controls={`strategy-details-${strategy.id}`}
                    id={`strategy-toggle-${strategy.id}`}
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => setExpandedStrategy(
                      expandedStrategy === strategy.id ? null : strategy.id
                    )}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedStrategy(expandedStrategy === strategy.id ? null : strategy.id);
                      }
                    }}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        {strategy.name}
                        <Badge variant="outline" className="text-xs">
                          {strategy.difficulty}
                        </Badge>
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {strategy.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {strategy.timeRequired}
                        </span>
                        <span className="flex items-center gap-1">
                          Effectiveness: 
                          {'★'.repeat(strategy.effectiveness)}
                          {'☆'.repeat(5 - strategy.effectiveness)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight 
                      className={cn(
                        'h-4 w-4 transition-transform',
                        expandedStrategy === strategy.id && 'rotate-90'
                      )}
                    />
                  </div>

                  {expandedStrategy === strategy.id && (
                    <div
                      id={`strategy-details-${strategy.id}`}
                      aria-labelledby={`strategy-toggle-${strategy.id}`}
                      className="mt-3 pt-3 border-t space-y-3"
                    >
                      <div>
                        <h5 className="text-xs font-medium mb-1">Benefits:</h5>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {strategy.benefits.map((benefit, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <CheckCircle className="h-3 w-3 text-green-500 mt-0.5" />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h5 className="text-xs font-medium mb-1">How to implement:</h5>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {strategy.implementation.map((step, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-primary font-medium">{i + 1}.</span>
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <Button
                        size="sm"
                        variant={activeStrategies.includes(strategy.id) ? 'secondary' : 'default'}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStrategy(strategy.id);
                        }}
                        className="w-full"
                      >
                        {activeStrategies.includes(strategy.id) ? 'Strategy Active' : 'Activate Strategy'}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Strategies Reminder */}
      {activeStrategies.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            You have {activeStrategies.length} active {activeStrategies.length === 1 ? 'strategy' : 'strategies'}.
            Remember to apply {activeStrategies.length === 1 ? 'it' : 'them'} in your next session!
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
