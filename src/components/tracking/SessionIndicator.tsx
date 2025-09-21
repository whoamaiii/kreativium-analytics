import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Pause, 
  Play, 
  Save, 
  X, 
  AlertCircle,
  CheckCircle,
  Activity,
  TrendingUp
} from 'lucide-react';
import { sessionManager } from '@/lib/sessionManager';
import { formatDuration } from 'date-fns';
import { cn } from '@/lib/utils';

interface SessionIndicatorProps {
  className?: string;
  compact?: boolean;
  showControls?: boolean;
  studentId?: string;
}

/**
 * SessionIndicator Component
 * Displays current session status, quality metrics, and controls
 */
export const SessionIndicator: React.FC<SessionIndicatorProps> = ({
  className,
  compact = false,
  showControls = true,
  studentId,
}) => {
  const [currentSession, setCurrentSession] = useState(() => {
    const sessions = studentId
      ? sessionManager.getActiveSessionsForStudent(studentId)
      : sessionManager.getAllActiveSessions();
    return sessions.length > 0 ? sessions[0] : null;
  });

  const [quality, setQuality] = useState(() => currentSession?.metadata.quality ?? {
    score: 0,
    completeness: 0,
    consistency: 0,
    richness: 0,
    issues: [],
    recommendations: [],
    emotionCount: 0,
    sensoryCount: 0,
    hasEnvironmental: false,
    sessionDuration: 0,
  });

  // Poll session state periodically for simplicity
  useEffect(() => {
    const interval = setInterval(() => {
      const sessions = studentId
        ? sessionManager.getActiveSessionsForStudent(studentId)
        : sessionManager.getAllActiveSessions();
      const active = sessions[0] ?? null;
      setCurrentSession(active);
      if (active) setQuality(active.metadata.quality);
    }, 1000);
    return () => clearInterval(interval);
  }, [studentId]);

  const pauseSession = useCallback(() => {
    if (!currentSession) return;
    sessionManager.pauseSession(currentSession.sessionId);
  }, [currentSession]);

  const resumeSession = useCallback(() => {
    if (!currentSession) return;
    sessionManager.resumeSession(currentSession.sessionId);
  }, [currentSession]);

  const saveSession = useCallback(async () => {
    if (!currentSession) return;
    await sessionManager.completeSession(currentSession.sessionId);
  }, [currentSession]);

  const discardSession = useCallback(() => {
    if (!currentSession) return;
    sessionManager.abandonSession(currentSession.sessionId);
    setCurrentSession(null);
  }, [currentSession]);
  
  const sessionDuration = useMemo(() => {
    if (!currentSession) return '00:00';
    const duration = Date.now() - currentSession.startTime.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [currentSession]);

  if (!currentSession) {
    return null;
  }

  const getStatusColor = () => {
    if (currentSession.isPaused) return 'bg-warning';
    if (quality.completeness >= 70) return 'bg-success';
    if (quality.completeness >= 40) return 'bg-info';
    return 'bg-gray-500';
  };

  const getQualityIcon = () => {
    if (quality.completeness >= 70) return <CheckCircle className="h-4 w-4" />;
    if (quality.completeness >= 40) return <Activity className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 p-2 rounded-lg bg-background/80 backdrop-blur', className)}>
        <div className={cn('w-2 h-2 rounded-full animate-pulse', getStatusColor())} />
        <span className="text-sm font-medium">{sessionDuration}</span>
        <Badge variant="outline" className="text-xs">
          {quality.emotionCount} emotions
        </Badge>
        <Badge variant="outline" className="text-xs">
          {quality.sensoryCount} sensory
        </Badge>
        {showControls && (
          <div className="flex gap-1 ml-auto">
            {currentSession.isPaused ? (
              <Button size="icon" variant="ghost" onClick={resumeSession} className="h-6 w-6">
                <Play className="h-3 w-3" />
              </Button>
            ) : (
              <Button size="icon" variant="ghost" onClick={pauseSession} className="h-6 w-6">
                <Pause className="h-3 w-3" />
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={saveSession} className="h-6 w-6">
              <Save className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={cn('bg-gradient-card border-0 shadow-soft', className)}>
      <CardContent className="p-4">
        {/* Session Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn('w-3 h-3 rounded-full animate-pulse', getStatusColor())} />
            <div>
              <h3 className="font-semibold text-sm">Active Session</h3>
              <p className="text-xs text-muted-foreground">
                {currentSession.isPaused ? 'Paused' : 'Recording'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm font-medium">{sessionDuration}</span>
          </div>
        </div>

        {/* Quality Metrics */}
        <div className="space-y-3 mb-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Data Quality</span>
              <div className="flex items-center gap-1">
                {getQualityIcon()}
                <span className="text-xs font-medium">{quality.completeness}%</span>
              </div>
            </div>
            <Progress value={quality.completeness} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded bg-muted/50">
              <p className="text-lg font-semibold">{quality.emotionCount}</p>
              <p className="text-xs text-muted-foreground">Emotions</p>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <p className="text-lg font-semibold">{quality.sensoryCount}</p>
              <p className="text-xs text-muted-foreground">Sensory</p>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <p className="text-lg font-semibold">
                {quality.hasEnvironmental ? '✓' : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Environment</p>
            </div>
          </div>
        </div>

        {/* Last Saved Indicator removed; avoid mixing save timestamps into quality model */}

        {/* Session Controls */}
        {showControls && (
          <div className="flex gap-2">
            {currentSession.isPaused ? (
              <Button
                size="sm"
                variant="outline"
                onClick={resumeSession}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={pauseSession}
                className="flex-1"
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            )}
            
            <Button
              size="sm"
              variant="default"
              onClick={saveSession}
              className="flex-1"
              disabled={quality.completeness < 20}
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={discardSession}
              className="px-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Quality Warnings */}
        {quality.completeness < 20 && !currentSession.isPaused && (
          <div className="mt-3 p-2 rounded bg-warning/10 border border-warning/20">
            <p className="text-xs text-warning">
              Add more data to improve session quality
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
