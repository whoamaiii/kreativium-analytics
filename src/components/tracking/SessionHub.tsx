import { useMemo } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pause, Play, Save, Trash2, Wifi, WifiOff, Clock } from 'lucide-react';
import { useSessionActions, useSessions } from '@/hooks/useSessionTracking';
import type { UUID } from '@/lib/storage/types';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

interface SessionHubProps {
  studentId: UUID;
  isOnline: boolean;
  className?: string;
}

export const SessionHub = ({ studentId, isOnline, className }: SessionHubProps) => {
  const { tTracking, tCommon } = useTranslation();
  const sessions = useSessions({ studentId });
  const { startSession, resumeSession, pauseSession, endSession, discardSession } =
    useSessionActions(studentId);

  const activeSession = useMemo(
    () => sessions.find((session) => session.status === 'active' || session.status === 'paused'),
    [sessions],
  );
  const pausedSession = useMemo(
    () => sessions.find((session) => session.status === 'paused'),
    [sessions],
  );

  const completedSessions = useMemo(
    () => sessions.filter((session) => session.status === 'completed'),
    [sessions],
  );

  const summary = useMemo(
    () => ({
      total: sessions.length,
      completed: completedSessions.length,
      paused: sessions.filter((session) => session.status === 'paused').length,
      active: activeSession?.status === 'active' ? 1 : 0,
    }),
    [sessions, completedSessions.length, activeSession],
  );

  const latestSessions = useMemo(
    () =>
      [...sessions]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 3),
    [sessions],
  );

  const lastSavedLabel = activeSession?.quality.lastSavedAt
    ? formatDistanceToNow(new Date(activeSession.quality.lastSavedAt), { addSuffix: true })
    : tTracking('sessionHub.noSaveYet');

  const handleStartOrResume = () => {
    try {
      if (activeSession && activeSession.status !== 'completed') {
        toast({
          title: tTracking('sessionHub.messages.activeTitle'),
          description: tTracking('sessionHub.messages.activeDescription'),
        });
        return;
      }
      startSession();
      toast({
        title: tTracking('sessionHub.messages.startedTitle'),
        description: tTracking('sessionHub.messages.startedDescription'),
      });
    } catch (_error) {
      toast({
        title: tTracking('sessionHub.messages.startErrorTitle'),
        description: tTracking('sessionHub.messages.startErrorDescription'),
        variant: 'destructive',
      });
    }
  };

  const handleResumeDraft = () => {
    if (!pausedSession) return;
    try {
      resumeSession(pausedSession.id);
      toast({
        title: tTracking('sessionHub.messages.resumeTitle'),
        description: tTracking('sessionHub.messages.resumeDescription'),
      });
    } catch (_error) {
      toast({
        title: tTracking('sessionHub.messages.resumeErrorTitle'),
        description: tTracking('sessionHub.messages.resumeErrorDescription'),
        variant: 'destructive',
      });
    }
  };

  const handlePause = () => {
    if (!activeSession || activeSession.status !== 'active') return;
    try {
      pauseSession(activeSession.id);
      toast({
        title: tTracking('sessionHub.messages.pauseTitle'),
        description: tTracking('sessionHub.messages.pauseDescription'),
      });
    } catch (_error) {
      toast({
        title: tTracking('sessionHub.messages.pauseErrorTitle'),
        description: tTracking('sessionHub.messages.pauseErrorDescription'),
        variant: 'destructive',
      });
    }
  };

  const handleSave = () => {
    if (!activeSession) return;
    try {
      endSession(activeSession.id, { save: true });
      toast({
        title: tTracking('sessionHub.messages.saveTitle'),
        description: tTracking('sessionHub.messages.saveDescription'),
      });
    } catch (_error) {
      toast({
        title: tTracking('sessionHub.messages.saveErrorTitle'),
        description: tTracking('sessionHub.messages.saveErrorDescription'),
        variant: 'destructive',
      });
    }
  };

  const handleDiscard = () => {
    if (!pausedSession) return;
    try {
      discardSession(pausedSession.id);
      toast({
        title: tTracking('session.draftDeletedTitle'),
        description: tTracking('session.draftDeletedDescription'),
      });
    } catch (_error) {
      toast({
        title: tTracking('sessionHub.messages.discardErrorTitle'),
        description: tTracking('sessionHub.messages.discardErrorDescription'),
        variant: 'destructive',
      });
    }
  };

  return (
    <Card
      className={cn('w-full border border-border bg-surface', className)}
      data-testid="session-hub"
    >
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">{tTracking('sessionHub.title')}</CardTitle>
          <div className="flex items-center gap-2 text-xs">
              <Badge
                variant={isOnline ? 'outline' : 'destructive'}
                className="flex items-center gap-1"
                data-testid="session-hub-network"
              >
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isOnline ? tCommon('status.online') : tCommon('status.offline')}
            </Badge>
            <span className="text-muted-foreground">{tTracking('sessionHub.badge')}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {tTracking('sessionHub.description')}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs sm:text-sm"
          data-testid="session-hub-summary"
        >
          <div className="rounded-lg border bg-muted/10 p-3">
            <p className="text-muted-foreground">{tTracking('sessionHub.summary.active')}</p>
            <p className="text-lg font-semibold">{summary.active}</p>
          </div>
          <div className="rounded-lg border bg-muted/10 p-3">
            <p className="text-muted-foreground">{tTracking('sessionHub.summary.paused')}</p>
            <p className="text-lg font-semibold">{summary.paused}</p>
          </div>
          <div className="rounded-lg border bg-muted/10 p-3">
            <p className="text-muted-foreground">{tTracking('sessionHub.summary.completed')}</p>
            <p className="text-lg font-semibold">{summary.completed}</p>
          </div>
          <div className="rounded-lg border bg-muted/10 p-3">
            <p className="text-muted-foreground">{tTracking('sessionHub.summary.total')}</p>
            <p className="text-lg font-semibold">{summary.total}</p>
          </div>
        </div>

        <div className="rounded-lg border border-dashed bg-background px-4 py-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{tTracking('sessionHub.lastSaved', { label: lastSavedLabel })}</span>
          </div>
        </div>

        <div className="space-y-3" data-testid="session-hub-cards">
          {latestSessions.length === 0 && (
            <p className="text-xs text-muted-foreground">{tTracking('sessionHub.empty')}</p>
          )}
          {latestSessions.map((session) => {
            const statusMeta =
              session.status === 'completed'
                ? { label: tTracking('sessionHub.status.completed'), variant: 'secondary' as const }
                : session.status === 'paused'
                  ? { label: tTracking('sessionHub.status.paused'), variant: 'outline' as const }
                  : { label: tTracking('sessionHub.status.active'), variant: 'default' as const };
            const autosaveVariant = session.autoSaveEnabled ? 'secondary' : 'outline';
            const autosaveLabel = session.autoSaveEnabled
              ? tTracking('sessionHub.autosaved')
              : tTracking('sessionHub.manual');
            const unsaved = !session.quality.lastSavedAt;
            const stats = tTracking('sessionHub.cardStats', {
              emotions: session.emotions.length,
              sensory: session.sensory.length,
            });

            const cardTestId =
              session.status === 'active'
                ? 'session-hub-card'
                : `session-hub-card-${session.status}-${session.id}`;

            return (
            <div
              key={session.id}
                data-testid={cardTestId}
                data-status={session.status}
                className="rounded-lg border bg-muted/20 p-3 text-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                    <Badge variant={autosaveVariant}>{autosaveLabel}</Badge>
                    <Badge variant={unsaved ? 'destructive' : 'outline'}>
                      {unsaved ? tTracking('sessionHub.unsaved') : tTracking('sessionHub.synced')}
                    </Badge>
                    {session.status === 'paused' && (
                      <Badge variant="outline">{tTracking('sessionHub.recoveryReady')}</Badge>
                    )}
                  </div>
                <p className="font-semibold uppercase">{session.status}</p>
                  <p className="text-muted-foreground">{stats}</p>
                <p className="text-muted-foreground text-xs">
                  {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
                </p>
              </div>
                <div className="flex flex-col gap-2 text-right text-xs sm:items-end">
        {session.status === 'paused' && (
          <Button
            variant="ghost"
            size="sm"
            data-testid={`session-hub-card-resume-${session.id}`}
            onClick={() => resumeSession(session.id)}
          >
            <Play className="h-3 w-3 mr-1" />
                      {tTracking('sessionHub.resume')}
                    </Button>
                  )}
                  {session.status === 'active' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => pauseSession(session.id)}
                    >
                      <Pause className="h-3 w-3 mr-1" />
                      {tTracking('sessionHub.pause')}
          </Button>
        )}
              </div>
            </div>
            );
          })}
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2">
        <Button
          data-testid="session-hub-start"
          onClick={handleStartOrResume}
          className="flex-1"
        >
          {activeSession
            ? tTracking('sessionHub.continueActive')
            : tTracking('sessionHub.start')}
        </Button>
        <Button
          data-testid="session-hub-pause"
          variant="outline"
          onClick={handlePause}
          disabled={!activeSession}
        >
          <Pause className="h-3 w-3 mr-1" />
          {tTracking('sessionHub.pause')}
        </Button>
        <Button
          data-testid="session-hub-resume"
          variant="outline"
          onClick={handleResumeDraft}
          disabled={!pausedSession}
        >
          <Play className="h-3 w-3 mr-1" />
          {tTracking('sessionHub.resumeDraft')}
        </Button>
        <Button
          data-testid="session-hub-save"
          variant="ghost"
          onClick={handleSave}
          disabled={!activeSession}
        >
          <Save className="h-3 w-3 mr-1" />
          {tTracking('sessionHub.save')}
        </Button>
        <Button
          data-testid="session-hub-discard"
          variant="ghost"
          onClick={handleDiscard}
          disabled={!pausedSession}
          aria-label={tTracking('session.deleteDraft')}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </CardFooter>
    </Card>
  );
};
