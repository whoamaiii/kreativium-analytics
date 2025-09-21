import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertManager } from '@/components/AlertManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { alertSystem, AlertHistoryEntry } from '@/lib/alertSystem';
import { useTranslation } from '@/hooks/useTranslation';
import usePinnedAlerts from '@/hooks/usePinnedAlerts';
import { AlertTriangle, Pin, PinOff, Eye, CheckCircle } from 'lucide-react';
import { TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

type Severity = 'high' | 'medium' | 'low';

export interface AlertsPanelProps {
  filteredData: { entries: TrackingEntry[]; emotions: EmotionEntry[]; sensoryInputs: SensoryEntry[] };
  studentId?: string;
}

const severityOrder: Record<Severity, number> = { high: 3, medium: 2, low: 1 };

function severityLabelKey(severity: Severity): string {
  switch (severity) {
    case 'high':
      return 'high';
    case 'medium':
      return 'medium';
    case 'low':
      return 'low';
  }
}

function getSeverityIcon(severity: Severity) {
  switch (severity) {
    case 'high':
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case 'medium':
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    case 'low':
      return <AlertTriangle className="h-4 w-4 text-info" />;
    default:
      return <AlertTriangle className="h-4 w-4" />;
  }
}

export const AlertsPanel: React.FC<AlertsPanelProps> = React.memo(({ filteredData, studentId }) => {
  const { tAnalytics, tCommon } = useTranslation();
  const { pinnedIds, isPinned, togglePin, unpinAlert, clearPinnedAlerts } = usePinnedAlerts();

  const [alerts, setAlerts] = useState<AlertHistoryEntry[]>([]);
  const [collapsed, setCollapsed] = useState<Record<Severity, boolean>>({ high: false, medium: false, low: false });
  const [refreshKey, setRefreshKey] = useState(0);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  // Pinned quick resolve state
  const [selectedForResolve, setSelectedForResolve] = useState<AlertHistoryEntry | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const loadAlerts = useCallback(() => {
    try {
      const list = studentId ? alertSystem.getStudentAlerts(studentId) : alertSystem.getAllAlerts();
      const sorted = [...list].sort((a, b) => {
        const diff = severityOrder[b.alert.severity as Severity] - severityOrder[a.alert.severity as Severity];
        if (diff !== 0) return diff;
        return b.alert.timestamp.getTime() - a.alert.timestamp.getTime();
      });
      setAlerts(sorted);
    } catch {
      setAlerts([]);
    }
  }, [studentId]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts, refreshKey]);

  // Ensure pinned rail is expanded on large screens
  useEffect(() => {
    try {
      const mql = window.matchMedia('(min-width: 1024px)');
      const handler = (e: MediaQueryListEvent) => setPinnedOpen(e.matches);
      setPinnedOpen(mql.matches);
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    } catch {
      // no-op in non-browser environments
    }
  }, []);

  const grouped = useMemo(() => {
    const groups: Record<Severity, AlertHistoryEntry[]> = { high: [], medium: [], low: [] };
    for (const entry of alerts) {
      const sev = (entry.alert.severity as Severity) || 'low';
      groups[sev].push(entry);
    }
    return groups;
  }, [alerts]);

  const counts = useMemo(() => {
    return {
      totalUnresolved: alerts.filter(a => !a.resolved).length,
      bySeverity: {
        high: alerts.filter(a => a.alert.severity === 'high').length,
        medium: alerts.filter(a => a.alert.severity === 'medium').length,
        low: alerts.filter(a => a.alert.severity === 'low').length,
      },
    } as { totalUnresolved: number; bySeverity: Record<Severity, number> };
  }, [alerts]);

  const pinnedAlerts = useMemo(() => alerts.filter(a => pinnedIds.has(a.alert.id)), [alerts, pinnedIds]);

  const handleMarkViewed = useCallback((id: string) => {
    try {
      alertSystem.markAlertAsViewed(id);
      setRefreshKey((k) => k + 1);
    } catch {}
  }, []);

  const handleResolve = useCallback(() => {
    if (!selectedForResolve) return;
    setIsResolving(true);
    try {
      alertSystem.resolveAlert(selectedForResolve.alert.id, 'Teacher', resolveNotes.trim() || undefined);
      setSelectedForResolve(null);
      setResolveNotes('');
      setRefreshKey((k) => k + 1);
      toast.success(String(tAnalytics('alerts.resolveSuccess')));
    } catch (error) {
      logger.error('Failed to resolve alert in pinned rail', error);
      toast.error(String(tAnalytics('alerts.resolveFailure')));
    } finally {
      setIsResolving(false);
    }
  }, [resolveNotes, selectedForResolve, tAnalytics]);

  const severitySections: Severity[] = ['high', 'medium', 'low'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {String(tAnalytics('tabs.alerts'))}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" aria-live="polite" aria-label={String(tAnalytics('aria.alerts.alertCount', { count: counts.totalUnresolved, severity: String(tAnalytics('alerts.severityGroups.high')) }))}>
                  {String(tAnalytics('alerts.totalUnresolved', { count: counts.totalUnresolved }))}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3" role="group" aria-label={String(tAnalytics('alerts.severityGroups.high'))}>
              {severitySections.map((sev) => (
                <Collapsible key={sev} open={!collapsed[sev]} onOpenChange={(open) => setCollapsed((c) => ({ ...c, [sev]: !open }))}>
                  <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" size="sm" aria-expanded={!collapsed[sev]} aria-label={String(!collapsed[sev] ? tAnalytics('alerts.actions.collapseGroup', { severity: String(tAnalytics(`alerts.severityGroups.${severityLabelKey(sev)}`)) }) : tAnalytics('alerts.actions.expandGroup', { severity: String(tAnalytics(`alerts.severityGroups.${severityLabelKey(sev)}`)) }))}>
                        <span className="flex items-center gap-2">
                          {getSeverityIcon(sev)}
                          <span>{String(tAnalytics(`alerts.severityGroups.${severityLabelKey(sev)}`))}</span>
                          <Badge variant={sev === 'high' ? 'destructive' : sev === 'medium' ? 'default' : 'secondary'}>
                            {String(tAnalytics('alerts.alertCounts', { count: grouped[sev].length }))}
                          </Badge>
                        </span>
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    {grouped[sev].length === 0 ? (
                      <div className="text-sm text-muted-foreground mt-2">{String(tAnalytics('alerts.none'))}</div>
                    ) : (
                      <ul className="mt-3 space-y-2" aria-label={String(tAnalytics('aria.alerts.severityGroup', { severity: String(tAnalytics(`alerts.severityGroups.${severityLabelKey(sev)}`)) }))}>
                        {grouped[sev].map((entry) => (
                          <li key={entry.alert.id} className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{entry.alert.title}</div>
                              <div className="text-xs text-muted-foreground truncate">{entry.alert.description}</div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => togglePin(entry.alert.id)}
                                aria-label={String(isPinned(entry.alert.id) ? tAnalytics('aria.alerts.unpinButton') : tAnalytics('aria.alerts.pinButton'))}
                                title={String(isPinned(entry.alert.id) ? tAnalytics('alerts.unpinAlert') : tAnalytics('alerts.pinAlert'))}
                              >
                                {isPinned(entry.alert.id) ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main alerts list reusing existing AlertManager */}
        <div key={refreshKey}>
          <AlertManager studentId={studentId} />
        </div>
      </div>

      {/* Right rail: pinned alerts */}
      <aside className="space-y-4" aria-label={String(tAnalytics('aria.alerts.pinnedAlertsRail'))}>
        <Card>
          <Collapsible open={pinnedOpen} onOpenChange={setPinnedOpen}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{String(tAnalytics('alerts.pinnedAlerts'))}</CardTitle>
                <div className="flex items-center gap-2">
                  <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={pinnedAlerts.length === 0}>
                        {String(tAnalytics('alerts.actions.clearAllPinned'))}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{String(tAnalytics('dialogs.alerts.confirmClearPinnedTitle'))}</DialogTitle>
                        <DialogDescription>{String(tAnalytics('dialogs.alerts.confirmClearPinnedDescription'))}</DialogDescription>
                      </DialogHeader>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setClearDialogOpen(false)}>{String(tCommon('cancel'))}</Button>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            clearPinnedAlerts();
                            setClearDialogOpen(false);
                          }}
                        >
                          {String(tAnalytics('alerts.actions.clearAllPinned'))}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden" aria-expanded={pinnedOpen}>
                      {String(tAnalytics('alerts.pinnedAlerts'))}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
            </CardHeader>
            <CollapsibleContent forceMount className="data-[state=closed]:hidden lg:data-[state=closed]:block">
              <CardContent>
                {pinnedAlerts.length === 0 ? (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>{String(tAnalytics('alerts.noPinnedAlerts'))}</span>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {pinnedAlerts.map((entry) => (
                      <li key={entry.alert.id} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {getSeverityIcon(entry.alert.severity as Severity)}
                              <span className="text-sm font-medium truncate">{entry.alert.title}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {entry.alert.timestamp.toLocaleDateString()}
                            </div>
                            {entry.resolved && (
                              <div className="mt-2">
                                <Badge variant="outline">{String(tAnalytics('alerts.resolvedLabel'))}</Badge>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => unpinAlert(entry.alert.id)}
                              aria-label={String(tAnalytics('aria.alerts.unpinButton'))}
                              title={String(tAnalytics('alerts.unpinAlert'))}
                            >
                              <PinOff className="h-4 w-4" />
                            </Button>
                            {!entry.viewed && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkViewed(entry.alert.id)}
                                aria-label={String(tAnalytics('tabs.alerts'))}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {!entry.resolved && (
                              <Dialog
                                open={selectedForResolve?.alert.id === entry.alert.id}
                                onOpenChange={(open) => {
                                  if (open) {
                                    setSelectedForResolve(entry);
                                  } else {
                                    setSelectedForResolve(null);
                                    setResolveNotes('');
                                  }
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">{String(tAnalytics('alerts.resolveTitle'))}</Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>{String(tAnalytics('alerts.resolveTitle'))}</DialogTitle>
                                    <DialogDescription>{String(tAnalytics('alerts.resolveDescription'))}</DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <label htmlFor="pinned-resolution-notes" className="text-sm font-medium mb-2 block">
                                        {String(tAnalytics('alerts.resolutionNotes'))}
                                      </label>
                                      <Textarea
                                        id="pinned-resolution-notes"
                                        rows={3}
                                        value={resolveNotes}
                                        onChange={(e) => setResolveNotes(e.target.value)}
                                        placeholder={String(tAnalytics('alerts.resolutionNotesPlaceholder'))}
                                      />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <Button variant="outline" onClick={() => setSelectedForResolve(null)}>
                                        {String(tCommon('cancel'))}
                                      </Button>
                                      <Button onClick={handleResolve} disabled={isResolving}>
                                        {String(tAnalytics('alerts.resolveTitle'))}
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </aside>
    </div>
  );
});

AlertsPanel.displayName = 'AlertsPanel';

export default AlertsPanel;


