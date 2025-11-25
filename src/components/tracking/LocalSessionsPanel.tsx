import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSessions } from '@/hooks/useSessionTracking';
import type { UUID } from '@/lib/storage/types';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';

interface LocalSessionsPanelProps {
  studentId: UUID;
}

export const LocalSessionsPanel = ({ studentId }: LocalSessionsPanelProps) => {
  const { tTracking } = useTranslation();
  const sessions = useSessions({ studentId });
  const completed = sessions.filter((session) => session.status === 'completed');
  const inProgress = sessions.find((session) => session.status === 'active');
  const paused = sessions.find((session) => session.status === 'paused');
  const latest = [...sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return (
    <Card className="border-dashed border-primary/30 bg-primary/5" data-testid="local-sessions-panel">
      <CardHeader className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg">{tTracking('localPanel.title')}</CardTitle>
          <Badge variant="secondary">{tTracking('localPanel.badge')}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {tTracking('localPanel.description')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-white/70 px-3 py-2">
            <p className="text-muted-foreground">{tTracking('localPanel.completed')}</p>
            <p className="text-xl font-semibold">{completed.length}</p>
          </div>
          <div className="rounded-xl bg-white/70 px-3 py-2">
            <p className="text-muted-foreground">{tTracking('localPanel.drafts')}</p>
            <p className="text-xl font-semibold">
              {(inProgress ? 1 : 0) + (paused ? 1 : 0)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
            <span>{tTracking('localPanel.latestHeading')}</span>
            <span data-testid="local-sessions-total">
              {tTracking('localPanel.total', { count: sessions.length })}
            </span>
          </div>
          {latest.slice(0, 4).map((session) => (
            <div
              key={session.id}
              data-testid="local-session-card"
              className="rounded-lg border bg-white/70 px-3 py-2 text-xs flex items-center justify-between gap-3"
            >
              <div>
                <div className="flex flex-wrap gap-2 mb-1">
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
                <p className="text-muted-foreground">
                  {tTracking('sessionHub.cardStats', {
                    emotions: session.emotions.length,
                    sensory: session.sensory.length,
                  })}
                </p>
              </div>
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
              </span>
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="text-xs text-muted-foreground">{tTracking('localPanel.empty')}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link to={`/track/${studentId}`}>{tTracking('localPanel.openTracking')}</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to={`/student/${studentId}`}>{tTracking('localPanel.updateDetails')}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
