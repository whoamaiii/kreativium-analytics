import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Clock, 
  RefreshCw, 
  Trash2, 
  Save,
  AlertTriangle,
  User,
  Calendar,
  Activity
} from 'lucide-react';
import { sessionManager } from '@/lib/sessionManager';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface SessionRecoveryProps {
  studentId?: string;
  className?: string;
  autoRecover?: boolean;
}

/**
 * SessionRecovery Component
 * Handles recovery of abandoned or interrupted sessions
 */
export const SessionRecovery: React.FC<SessionRecoveryProps> = ({
  studentId,
  className,
  autoRecover = false,
}) => {
  const [recoverableSessions, setRecoverableSessions] = useState<any[]>([]);
  const [isRecovering, setIsRecovering] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const handleRecover = useCallback(async (sessionId: string) => {
    setIsRecovering(true);
    setSelectedSession(sessionId);
    
    try {
      // Ensure the session is marked active
      sessionManager.resumeSession(sessionId);
      // Remove from recoverable list
      setRecoverableSessions(prev => 
        prev.filter(s => s.sessionId !== sessionId)
      );
    } catch (error) {
      logger.error('Failed to recover session', error as Error);
    } finally {
      setIsRecovering(false);
      setSelectedSession(null);
    }
  }, []);

  const checkSessions = useCallback(() => {
    const recovered = sessionManager.recoverSessions();
    const filtered = studentId 
      ? recovered.filter(s => s.studentId === studentId)
      : recovered;
    setRecoverableSessions(filtered);

    if (autoRecover && filtered.length === 1) {
      handleRecover(filtered[0].sessionId);
    }
  }, [studentId, autoRecover, handleRecover]);

  useEffect(() => {
    checkSessions();
  }, [checkSessions]);

  

  const handleDiscard = (sessionId: string) => {
    sessionManager.abandonSession(sessionId);
    setRecoverableSessions(prev => 
      prev.filter(s => s.sessionId !== sessionId)
    );
  };

  const handleDiscardAll = () => {
    recoverableSessions.forEach(session => {
      sessionManager.abandonSession(session.sessionId);
    });
    setRecoverableSessions([]);
  };

  if (recoverableSessions.length === 0) {
    return null;
  }

  // Compact alert for single recoverable session
  if (recoverableSessions.length === 1) {
    const session = recoverableSessions[0];
    const age = formatDistanceToNow(new Date(session.metadata.startTime), { addSuffix: true });
    
    return (
      <Alert className={cn('border-yellow-500/50 bg-yellow-500/10', className)}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Unsaved Session Found</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="text-sm mb-3">
            You have an incomplete session from {age} with {session.metadata.dataPoints} data points.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => handleRecover(session.sessionId)}
              disabled={isRecovering}
            >
              {isRecovering ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Recovering...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Resume Session
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDiscard(session.sessionId)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Discard
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Full card for multiple recoverable sessions
  return (
    <Card className={cn('bg-gradient-card border-0 shadow-soft', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span>Recoverable Sessions</span>
          </div>
          <Badge variant="outline">{recoverableSessions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Found {recoverableSessions.length} incomplete session(s) that can be recovered.
        </p>

        <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
          {recoverableSessions.map((session) => {
            const age = formatDistanceToNow(new Date(session.metadata.startTime), { addSuffix: true });
            const quality = session.metadata.quality;
            
            return (
              <div
                key={session.sessionId}
                className={cn(
                  'p-3 rounded-lg border transition-colors',
                  selectedSession === session.sessionId 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Started {age}</span>
                  </div>
                  <Badge 
                    variant={session.metadata.status === 'paused' ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    {session.metadata.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div className="flex items-center gap-1">
                    <Activity className="h-3 w-3 text-muted-foreground" />
                    <span>{session.metadata.dataPoints} data points</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span>{Math.floor(session.metadata.duration / 60000)}m</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Quality:</span>
                    <span className="font-medium">{quality.score}%</span>
                  </div>
                </div>

                {/* Data summary */}
                <div className="flex gap-2 mb-3">
                  {session.data.emotions.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {session.data.emotions.length} emotions
                    </Badge>
                  )}
                  {session.data.sensoryInputs.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {session.data.sensoryInputs.length} sensory
                    </Badge>
                  )}
                  {session.data.environmentalData && (
                    <Badge variant="outline" className="text-xs">
                      Environmental
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleRecover(session.sessionId)}
                    disabled={isRecovering && selectedSession === session.sessionId}
                    className="flex-1"
                  >
                    {isRecovering && selectedSession === session.sessionId ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Recovering...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Resume
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDiscard(session.sessionId)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-3 border-t">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDiscardAll}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Discard All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
