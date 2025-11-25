import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Pause, Play, Trash2, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmotionTracker } from '@/components/EmotionTracker';
import { SensoryTracker } from '@/components/SensoryTracker';
import { EnvironmentalTracker } from '@/components/EnvironmentalTracker';
import { SessionHub } from '@/components/tracking/SessionHub';
import { LanguageSettings } from '@/components/LanguageSettings';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { logger } from '@/lib/logger';
import { useSessionActions, useActiveSession, useSessions } from '@/hooks/useSessionTracking';
import { useStudent as useLocalStudent } from '@/hooks/useStorageData';
import { convertLocalStudentToLegacy } from '@/lib/adapters/legacyConverters';
import type {
  EmotionEntry as SessionEmotionEntry,
  SensoryEntry as SessionSensoryEntry,
  EnvironmentalEntry as SessionEnvironmentalEntry,
  TrackingSession,
} from '@/lib/storage/types';
import type { Student } from '@/types/student';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

const MAX_RECENT_SESSIONS = 4;

const RecentSessions = ({
  sessions,
  onResume,
  tTracking,
}: {
  sessions: TrackingSession[];
  onResume: (sessionId: string) => void;
  tTracking: TranslateFn;
}) => {
  if (!sessions.length) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground">
        {tTracking('recentSessions.empty')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.slice(0, MAX_RECENT_SESSIONS).map((session) => {
        const notesLabel = tTracking(
          session.notes?.length ? 'recentSessions.notesPresent' : 'recentSessions.notesMissing',
        );
        const stats = tTracking('recentSessions.stats', {
          emotions: session.emotions.length,
          sensory: session.sensory.length,
          notesLabel,
        });

        return (
          <div
            key={session.id}
            className="rounded-xl border bg-card/70 px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-semibold">{session.status.toUpperCase()}</p>
              <p className="text-xs text-muted-foreground">{stats}</p>
            </div>
            {session.status === 'paused' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onResume(session.id)}
                data-testid={`recent-session-resume-${session.id}`}
              >
                <Play className="mr-1 h-3 w-3" />
                {tTracking('recentSessions.resume')}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
};

const TrackStudent = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { tTracking, tCommon } = useTranslation();
  const isOnline = useOnlineStatus();
  const localStudent = useLocalStudent(studentId);
  const student = useMemo<Student | null>(
    () => (localStudent ? (convertLocalStudentToLegacy(localStudent) as Student) : null),
    [localStudent],
  );

  const sessions = useSessions(studentId ? { studentId } : undefined);
  const activeSession = useActiveSession(studentId);
  const [notesDraft, setNotesDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const sessionActions = useSessionActions(studentId);

  useEffect(() => {
    if (!studentId) return;
    if (!student) {
      toast({
        title: String(tTracking('session.validationError')),
        description: String(tTracking('session.validationError')),
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [student, studentId, navigate, tTracking]);

  useEffect(() => {
    if (!studentId || activeSession) return;
    try {
      sessionActions.startSession();
      } catch (error) {
        if (import.meta.env.DEV) {
          logger.warn('[TrackStudent] Failed to auto-start session', error);
        }
      }
  }, [studentId, activeSession, sessionActions]);

  useEffect(() => {
    setNotesDraft(activeSession?.notes ?? '');
  }, [activeSession?.notes]);

  const ensureSession = useCallback(() => {
    if (activeSession) return activeSession;
    if (!studentId) return null;
    try {
      return sessionActions.startSession();
    } catch (error) {
      logger.error('Failed to start session', { error });
      toast({
        title: String(tTracking('session.saveError')),
        description: String(tTracking('session.startError')),
        variant: 'destructive',
      });
      return null;
    }
  }, [activeSession, sessionActions, studentId, tTracking]);

  const handleEmotionAdd = (emotion: Omit<SessionEmotionEntry, 'id' | 'timestamp'>) => {
    const session = ensureSession();
    if (!session) return;
    sessionActions.addEmotion(session.id, emotion);
    toast({
      title: String(tTracking('session.toasts.emotionSaved')),
      description: String(tTracking('session.toasts.localSave')),
    });
  };

  const handleSensoryAdd = (entry: Omit<SessionSensoryEntry, 'id' | 'timestamp'>) => {
    const session = ensureSession();
    if (!session) return;
    sessionActions.addSensory(session.id, entry);
    toast({
      title: String(tTracking('session.toasts.sensorySaved')),
      description: String(tTracking('session.toasts.localSave')),
    });
  };

  const handleEnvironmentAdd = (
    entry: Omit<SessionEnvironmentalEntry, 'id' | 'timestamp'>,
  ) => {
    const session = ensureSession();
    if (!session) return;
    sessionActions.setEnvironment(session.id, entry);
    toast({
      title: String(tTracking('session.toasts.environmentSaved')),
      description: String(tTracking('session.toasts.localSave')),
    });
  };

  const handleSave = async () => {
    const session = ensureSession();
    if (!student || !session) return;
    if (session.emotions.length === 0 && session.sensory.length === 0) {
      toast({
        title: String(tTracking('session.validationError')),
        description: String(tTracking('session.addDataHint')),
        variant: 'destructive',
      });
      return;
    }
    try {
      setIsSaving(true);
      await sessionActions.endSession(session.id, { save: true });
      toast({
        title: String(tTracking('session.sessionSaved')),
        description: String(tTracking('session.saveSuccessDescription')),
      });
      navigate(`/student/${student.id}`);
    } catch (error) {
      logger.error('Failed to save tracking session', { error });
      toast({
        title: String(tTracking('session.saveError')),
        description: String(tTracking('session.saveErrorDescription')),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!activeSession) return;
    sessionActions.discardSession(activeSession.id);
    toast({
      title: String(tTracking('session.draftDeletedTitle')),
      description: String(tTracking('session.draftDeletedDescription')),
    });
  };

  if (!student) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{String(tCommon('status.loading'))}</p>
        </div>
      </div>
    );
  }

  const pausedSession = sessions.find((session) => session.status === 'paused');

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Button variant="ghost" onClick={() => navigate(`/student/${student.id}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {String(tCommon('buttons.back'))}
            </Button>
            <div className="flex items-center gap-3">
              <Badge variant={isOnline ? 'outline' : 'destructive'} className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                {isOnline ? String(tCommon('status.online')) : String(tCommon('status.offline'))}
              </Badge>
            <LanguageSettings />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-semibold">
              {String(tTracking('session.title')).replace('{{studentName}}', student.name)}
            </h1>
          <p className="text-muted-foreground">{String(tTracking('session.description'))}</p>
        </div>
        </header>

        <section className="space-y-4">
        <SessionHub studentId={student.id} isOnline={isOnline} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{String(tTracking('session.activeTools'))}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Button
                variant="outline"
                data-testid="track-pause"
                disabled={!activeSession || activeSession.status !== 'active'}
                onClick={() => activeSession && sessionActions.pauseSession(activeSession.id)}
              >
                <Pause className="h-3 w-3 mr-1" />
                {String(tTracking('session.pause'))}
              </Button>
              <Button
                variant="outline"
                data-testid="track-resume"
                disabled={!pausedSession}
                onClick={() => pausedSession && sessionActions.resumeSession(pausedSession.id)}
              >
                <Play className="h-3 w-3 mr-1" />
                {String(tTracking('session.resumeDraft'))}
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{String(tTracking('emotions.title'))}</CardTitle>
            </CardHeader>
            <CardContent>
            <EmotionTracker onEmotionAdd={handleEmotionAdd} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{String(tTracking('sensory.title'))}</CardTitle>
            </CardHeader>
            <CardContent>
            <SensoryTracker onSensoryAdd={handleSensoryAdd} />
            </CardContent>
          </Card>
        </section>

        <section>
          <EnvironmentalTracker onEnvironmentalAdd={handleEnvironmentAdd} />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{String(tTracking('session.generalNotes'))}</CardTitle>
            </CardHeader>
            <CardContent>
          <textarea
            data-testid="track-general-notes"
            value={notesDraft}
                onChange={(event) => {
                  setNotesDraft(event.target.value);
              const session = ensureSession();
                  if (session) {
                    sessionActions.setNotes(session.id, event.target.value);
                  }
            }}
            placeholder={String(tTracking('session.generalNotesPlaceholder'))}
                className="w-full p-4 border border-border rounded-lg bg-input focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
            rows={4}
          />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{String(tTracking('session.latestSessions'))}</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentSessions
                sessions={[...sessions].sort(
                  (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
                )}
                onResume={(sessionId) => sessionActions.resumeSession(sessionId)}
                tTracking={tTracking}
              />
            </CardContent>
          </Card>
        </section>

        <footer className="flex flex-col sm:flex-row gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(`/student/${student.id}`)}
            className="flex-1"
          >
            {String(tTracking('session.cancelSession'))}
          </Button>
          <Button
            variant="outline"
            onClick={handleDiscard}
            disabled={!pausedSession}
            className="flex-1"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {String(tTracking('session.deleteDraft'))}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            data-testid="track-save-button"
            className="flex-1 bg-gradient-primary hover:opacity-90 transition-all duration-200"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? String(tTracking('session.savingState')) : String(tTracking('session.saveSession'))}
          </Button>
        </footer>
      </div>
    </div>
  );
};

export default TrackStudent;
