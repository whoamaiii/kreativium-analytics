import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSessionActions, useSessions } from '@/hooks/useSessionTracking';
import type { UUID } from '@/lib/storage/types';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';

interface NewTrackingPreviewProps {
  studentId: UUID;
}

export const NewTrackingPreview = ({ studentId }: NewTrackingPreviewProps) => {
  const { tTracking } = useTranslation();
  const sessions = useSessions({ studentId });
  const activeSession =
    sessions.find((session) => session.status === 'active' || session.status === 'paused') ?? null;
  const { startSession, addEmotion, endSession } = useSessionActions(studentId);

  const handleStartOrResume = () => {
    if (activeSession) {
      toast({
        title: tTracking('sessionHub.messages.activeTitle'),
        description: tTracking('sessionHub.messages.activeDescription'),
      });
      return activeSession;
    }
    const session = startSession();
    toast({
      title: tTracking('sessionHub.messages.startedTitle'),
      description: tTracking('sessionHub.messages.startedDescription'),
    });
    return session;
  };

  const handleAddSampleEmotion = () => {
    const session = activeSession ?? handleStartOrResume();
    if (!session) return;
    addEmotion(session.id, {
      label: 'calm',
      intensity: 3,
      context: tTracking('trackingPreview.sampleContext'),
    });
    toast({
      title: tTracking('trackingPreview.sampleToastTitle'),
      description: tTracking('trackingPreview.sampleToastDescription'),
    });
  };

  const handleEndSession = () => {
    if (!activeSession) {
      toast({
        title: tTracking('trackingPreview.noActiveTitle'),
        description: tTracking('trackingPreview.noActiveDescription'),
      });
      return;
    }
    endSession(activeSession.id);
    toast({
      title: tTracking('sessionHub.messages.saveTitle'),
      description: tTracking('sessionHub.messages.saveDescription'),
    });
  };

  const latestSessions = sessions.slice(-3).reverse();

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base sm:text-lg">
          <span>{tTracking('trackingPreview.title')}</span>
          <Badge variant="secondary">{tTracking('trackingPreview.badge')}</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {tTracking('trackingPreview.description')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl bg-white/70 shadow-sm px-3 py-2 text-sm">
            <p className="text-muted-foreground">{tTracking('trackingPreview.activeStatus')}</p>
            <p className="font-semibold">
              {activeSession ? activeSession.status.toUpperCase() : tTracking('trackingPreview.none')}
            </p>
          </div>
          <div className="rounded-xl bg-white/70 shadow-sm px-3 py-2 text-sm">
            <p className="text-muted-foreground">{tTracking('trackingPreview.entries')}</p>
            <p className="font-semibold">
              {tTracking('trackingPreview.entriesCount', {
                count: activeSession?.emotions.length ?? 0,
              })}
            </p>
          </div>
          <div className="rounded-xl bg-white/70 shadow-sm px-3 py-2 text-sm">
            <p className="text-muted-foreground">{tTracking('trackingPreview.completeness')}</p>
            <p className="font-semibold">
              {activeSession ? `${Math.round(activeSession.quality.completenessPercent)} %` : '0 %'}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {tTracking('trackingPreview.latestHeading')}
          </p>
          {latestSessions.length === 0 && (
            <p className="text-xs text-muted-foreground">{tTracking('trackingPreview.empty')}</p>
          )}
          {latestSessions.map((session) => (
            <motion.div
              layout
              key={session.id}
              className="rounded-lg border bg-white/70 px-3 py-2 text-xs space-y-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {session.status === 'completed'
                      ? tTracking('sessionHub.status.completed')
                      : session.status === 'paused'
                        ? tTracking('sessionHub.status.paused')
                        : tTracking('sessionHub.status.active')}
                  </Badge>
                  <Badge variant={session.autoSaveEnabled ? 'secondary' : 'outline'}>
                    {session.autoSaveEnabled
                      ? tTracking('sessionHub.autosaved')
                      : tTracking('sessionHub.manual')}
                  </Badge>
                </div>
                <span className="text-muted-foreground">
                  {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
                </span>
              </div>
              <div className="text-muted-foreground">
                {tTracking('sessionHub.cardStats', {
                  emotions: session.emotions.length,
                  sensory: session.sensory.length,
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={handleStartOrResume}>
          {tTracking('trackingPreview.start')}
        </Button>
        <Button type="button" variant="outline" onClick={handleAddSampleEmotion}>
          {tTracking('trackingPreview.addSample')}
        </Button>
        <Button type="button" onClick={handleEndSession} disabled={!activeSession}>
          {tTracking('trackingPreview.complete')}
        </Button>
      </CardFooter>
    </Card>
  );
};
