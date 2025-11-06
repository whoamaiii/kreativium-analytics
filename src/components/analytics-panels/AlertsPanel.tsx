import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';
import usePinnedAlerts from '@/hooks/usePinnedAlerts';
import { AlertTriangle, Pin, PinOff, CheckCircle, Info, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { AlertCard } from '@/components/alerts/AlertCard';
import { AlertDetails } from '@/components/alerts/AlertDetails';
import { useAlerts } from '@/hooks/useAlerts';
import { alertPerf } from '@/lib/alerts/performance';
import { AlertSeverity, AlertKind, AlertWithGovernance, AlertStatus } from '@/lib/alerts/types';
import { TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';
import InterventionTemplateManager from '@/lib/interventions/templateManager';
import CreateGoalFromAlertDialog from '@/components/goals/CreateGoalFromAlertDialog';
import { useAlertFilterState, useAlertDerivedData } from '@/components/analytics-panels/hooks/useAlertFilters';
import { useAlertBulkActions } from '@/components/analytics-panels/hooks/useAlertBulkActions';
import { PredictiveAlertsPanel } from '@/components/analytics/PredictiveAlertsPanel';
import { useAnalyticsWorker } from '@/hooks/useAnalyticsWorker';

export interface AlertsPanelProps {
  filteredData: { entries: TrackingEntry[]; emotions: EmotionEntry[]; sensoryInputs: SensoryEntry[] };
  studentId?: string;
}

function getSeverityIcon(severity: AlertSeverity) {
  switch (severity) {
    case AlertSeverity.Critical:
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case AlertSeverity.Important:
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    case AlertSeverity.Moderate:
      return <AlertTriangle className="h-4 w-4 text-info" />;
    case AlertSeverity.Low:
    default:
      return <Info className="h-4 w-4 text-muted-foreground" />;
  }
}

export const AlertsPanel: React.FC<AlertsPanelProps> = React.memo(({ filteredData: _filteredData, studentId }) => {
  const { tAnalytics, tCommon } = useTranslation();
  const { pinnedIds, isPinned, togglePin, unpinAlert, clearPinnedAlerts } = usePinnedAlerts();

  const {
    state: filterState,
    actions: filterActions,
    queryFilters,
  } = useAlertFilterState();

  const {
    selectedSeverities,
    selectedKinds,
    timeWindowHours,
    minConfidence,
    sourceFilters,
    sourceLabelFilters,
    dateStart,
    dateEnd,
    searchQuery,
    groupMode,
    hasInterventionOnly,
    sortMode,
  } = filterState;

  const {
    setSelectedSeverities,
    setSelectedKinds,
    setTimeWindowHours,
    setMinConfidence,
    setDateStart,
    setDateEnd,
    setSearchQuery,
    setGroupMode,
    setHasInterventionOnly,
    setSortMode,
    toggleSourceFilter,
    toggleSourceLabelFilter,
    resetSourceFilters,
    resetSourceLabelFilters,
  } = filterActions;

  const { alerts, acknowledge, snooze, resolve, refresh, feedback } = useAlerts({
    studentId: (studentId && studentId !== 'all') ? studentId : 'all',
    aggregate: !studentId || studentId === 'all',
    filters: queryFilters,
  });

  const derived = useAlertDerivedData(alerts, filterState);
  const {
    availableSourceTypes,
    availableSourceLabels,
    activeAlerts,
    counts,
    grouped,
  } = derived;

  // Extract predictive insights and anomalies from analytics
  const { results } = useAnalyticsWorker({ precomputeOnIdle: false });
  const predictiveInsights = (results as any)?.predictiveInsights || [];
  const anomalies = (results as any)?.anomalies || [];

  const bulkActions = useAlertBulkActions({
    alerts,
    activeAlerts,
    sourceFilters,
    sourceLabelFilters,
    acknowledge,
    resolve,
    snooze,
  });
  const {
    acknowledgeByConfidence,
    acknowledgeBySource,
    resolveBySourceType,
    snoozeSimilar,
    acknowledgeByLabel,
  } = bulkActions;

  // Keyboard shortcuts and search focus
  const searchRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key.toLowerCase() === 'a' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleAcknowledgeSelected();
      }
      if (e.key.toLowerCase() === 'r' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleResolve();
      }
      if (e.key.toLowerCase() === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        snoozeSimilar();
      }
      if (e.key === 'Escape') {
        setSelectedIds(new Set());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Lightweight real-time streaming via health and updated events
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onHealth = (evt: Event) => {
      try {
        const detail = (evt as CustomEvent).detail as any;
        if (detail?.snapshot) {
          // Could surface metrics elsewhere; keep silent to avoid noise
        }
      } catch { /* noop */ }
    };
    const onUpdated = (evt: Event) => {
      try {
        const sid = (evt as CustomEvent).detail?.studentId as string | undefined;
        // If viewing a specific student, only refresh on matching studentId
        if (studentId && studentId !== 'all' && sid && sid !== studentId) {
          return;
        }
        const stop = alertPerf.startTimer();
        refresh();
        alertPerf.recordUiUpdate(stop());
      } catch { refresh(); }
    };
    window.addEventListener('alerts:health', onHealth as EventListener);
    window.addEventListener('alerts:updated', onUpdated as EventListener);
    return () => {
      window.removeEventListener('alerts:health', onHealth as EventListener);
      window.removeEventListener('alerts:updated', onUpdated as EventListener);
    };
  }, [refresh]);

  const [collapsed, setCollapsed] = useState<Record<AlertSeverity, boolean>>({
    [AlertSeverity.Critical]: false,
    [AlertSeverity.Important]: false,
    [AlertSeverity.Moderate]: false,
    [AlertSeverity.Low]: false,
  });
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pinned quick resolve state
  const [selectedForResolve, setSelectedForResolve] = useState<AlertWithGovernance | null>(null);
  const [selectedForDetails, setSelectedForDetails] = useState<AlertWithGovernance | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [viewedPinned, setViewedPinned] = useState<Record<string, boolean>>({});

  // Goal creation dialog state
  const [goalDialogOpen, setGoalDialogOpen] = useState<boolean>(false);
  const [goalDialogAlert, setGoalDialogAlert] = useState<AlertWithGovernance | null>(null);

  const handleCreateGoal = useCallback((alertObj: AlertWithGovernance) => {
    // Open dialog instead of immediately saving the goal
    setGoalDialogAlert(alertObj);
    setGoalDialogOpen(true);
  }, []);

  const handleAddInterventionTemplate = useCallback((alertObj: AlertWithGovernance, interventionId: string) => {
    try {
      const mgr = new InterventionTemplateManager();
      const created = mgr.createFromAlert(alertObj, interventionId);
      if (created) {
        toast.success('Intervention template added');
      } else {
        toast.info('No matching template');
      }
    } catch (e) {
      logger.error('Failed to add intervention template', e);
      toast.error('Failed to add intervention');
    }
  }, []);

  const handleScheduleCheckIn = useCallback((alertObj: AlertWithGovernance, dateISO: string) => {
    try {
      const mgr = new InterventionTemplateManager();
      const reminder = (mgr as any).createReminder?.(alertObj, dateISO);
      if (reminder) {
        toast.success('Check-in scheduled');
      } else {
        toast.info('No reminder saved');
      }
    } catch (e) {
      logger.error('Failed to schedule check-in', e);
      toast.error('Failed to schedule');
    }
  }, []);

  const handleAddToReport = useCallback((alertObj: AlertWithGovernance) => {
    try {
      // Append to a simple report draft list in storage
      const key = `reports:drafts:${alertObj.studentId}`;
      const raw = localStorage.getItem(key);
      const list = raw ? (JSON.parse(raw) as any[]) : [];
      list.push({ type: 'alert', id: alertObj.id, createdAt: new Date().toISOString(), summary: alertObj.metadata?.summary ?? alertObj.kind });
      localStorage.setItem(key, JSON.stringify(list.slice(-200)));
      toast.success('Added to report draft');
    } catch (e) {
      logger.error('Failed to add to report', e);
      toast.error('Failed to add to report');
    }
  }, []);

  const handleNotifyTeam = useCallback((alertObj: AlertWithGovernance) => {
    try {
      const payload = {
        id: alertObj.id,
        studentId: alertObj.studentId,
        summary: alertObj.metadata?.summary ?? alertObj.kind,
        severity: alertObj.severity,
        createdAt: alertObj.createdAt,
      };
      // In absence of backend, log to console and show toast; in real app, integrate notifier
      logger.info('[NotifyTeam] alert notification', payload);
      toast.success('Team notified');
    } catch (e) {
      logger.error('Failed to notify team', e);
      toast.error('Failed to notify team');
    }
  }, []);

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

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (activeAlerts.some((alert) => alert.id === id)) {
          next.add(id);
        }
      }
      return next;
    });
  }, [activeAlerts]);

  const pinnedAlerts = useMemo(() => alerts.filter(a => pinnedIds.has(a.id)), [alerts, pinnedIds]);

  const handleAcknowledgeSelected = useCallback(() => {
    for (const id of Array.from(selectedIds)) {
      try { acknowledge(id); } catch {}
    }
    setSelectedIds(new Set());
    toast.success('Acknowledged selected alerts');
  }, [selectedIds, acknowledge]);

  const handleResolve = useCallback(() => {
    if (!selectedForResolve) return;
    setIsResolving(true);
    try {
      resolve(selectedForResolve.id, resolveNotes.trim() || undefined);
      setSelectedForResolve(null);
      setResolveNotes('');
      toast.success(String(tAnalytics('alerts.resolveSuccess')));
    } catch (error) {
      logger.error('Failed to resolve alert in pinned rail', error);
      toast.error(String(tAnalytics('alerts.resolveFailure')));
    } finally {
      setIsResolving(false);
    }
  }, [resolveNotes, selectedForResolve, resolve, tAnalytics]);

  const handleOpenDetails = useCallback((id: string) => {
    const alert = alerts.find((a) => a.id === id) ?? null;
    setSelectedForDetails(alert);
    setDetailsOpen(!!alert);
  }, [alerts]);

  const handleDetailsOpenChange = useCallback((open: boolean) => {
    setDetailsOpen(open);
    if (!open) {
      setSelectedForDetails(null);
    }
  }, []);

  const handleMarkViewed = useCallback((id: string) => {
    setViewedPinned((prev) => {
      if (prev[id]) return prev;
      return { ...prev, [id]: true };
    });
  }, []);

  const severitySections: AlertSeverity[] = [
    AlertSeverity.Critical,
    AlertSeverity.Important,
    AlertSeverity.Moderate,
    AlertSeverity.Low,
  ];

  return (
    <div className="space-y-6">
      {/* Predictive Insights Layer */}
      {(predictiveInsights.length > 0 || anomalies.length > 0) && (
        <PredictiveAlertsPanel
          predictiveInsights={predictiveInsights}
          anomalies={anomalies}
          onInsightClick={(insight) => {
            // Navigate to patterns tab with insight context
            logger.info('[AlertsPanel] Predictive insight clicked', { insight });
            toast({
              title: 'Predictive Insight',
              description: insight.description,
            });
          }}
          onAnomalyClick={(anomaly) => {
            // Show detailed anomaly analysis
            logger.info('[AlertsPanel] Anomaly clicked', { anomaly });
            toast({
              title: 'Anomaly Detected',
              description: anomaly.description,
            });
          }}
        />
      )}

      {/* Existing Alert Management UI */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {String(tAnalytics('tabs.alerts'))}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" aria-live="polite">{`Total: ${counts.total}`}</Badge>
                <Badge variant="secondary">Live</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Search and range">
                <Input
                  placeholder="Search alerts"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 h-8"
                  ref={searchRef}
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">Severity</span>
                  <div className="flex flex-wrap gap-1">
                    {[AlertSeverity.Critical, AlertSeverity.Important, AlertSeverity.Moderate, AlertSeverity.Low].map((sev) => (
                      <Button
                        key={sev}
                        variant={selectedSeverities.includes(sev) ? 'default' : 'outline'}
                        size="xs"
                        onClick={() => setSelectedSeverities((prev) => prev.includes(sev) ? prev.filter((s) => s !== sev) : [...prev, sev])}
                        aria-pressed={selectedSeverities.includes(sev)}
                      >
                        <span className="capitalize">{sev}</span>
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">Kind</span>
                  <div className="flex flex-wrap gap-1 max-w-[360px]">
                    {Object.values(AlertKind).map((kind) => (
                      <Button
                        key={kind}
                        variant={selectedKinds.includes(kind) ? 'default' : 'outline'}
                        size="xs"
                        onClick={() => setSelectedKinds((prev) => prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind])}
                        aria-pressed={selectedKinds.includes(kind)}
                      >
                        <span className="capitalize">{String(kind).replace('_', ' ')}</span>
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">Start</span>
                  <input type="date" className="h-8 text-xs" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">End</span>
                  <input type="date" className="h-8 text-xs" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">Window</span>
                  <Select value={(timeWindowHours ?? 0).toString()} onValueChange={(v) => setTimeWindowHours(Number(v) || undefined)}>
                    <SelectTrigger className="h-8 w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={(24).toString()}>Last 24h</SelectItem>
                      <SelectItem value={(48).toString()}>Last 48h</SelectItem>
                      <SelectItem value={(72).toString()}>Last 72h</SelectItem>
                      <SelectItem value={(168).toString()}>Last 7d</SelectItem>
                      <SelectItem value={(0).toString()}>All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">Group</span>
                  <Select value={groupMode} onValueChange={(v) => setGroupMode(v as any)}>
                    <SelectTrigger className="h-8 w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="severity">Severity</SelectItem>
                      <SelectItem value="source">Source</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">Sort</span>
                  <Select value={sortMode} onValueChange={(v) => setSortMode(v as any)}>
                    <SelectTrigger className="h-8 w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="confidence">Confidence</SelectItem>
                      <SelectItem value="severity">Severity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-slate-600">
                    <input type="checkbox" className="mr-1" checked={hasInterventionOnly} onChange={(e) => setHasInterventionOnly(e.target.checked)} />
                    Has intervention
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      try {
                        const blob = new Blob([JSON.stringify(activeAlerts, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'alerts.json';
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success('Exported alerts.json');
                      } catch { toast.error('Export failed'); }
                    }}
                  >
                    Export JSON
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Confidence filter">
                <label htmlFor="alerts-confidence" className="text-xs font-medium text-slate-600">Min confidence</label>
                <input
                  id="alerts-confidence"
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(minConfidence * 100)}
                  onChange={(e) => setMinConfidence(Number(e.target.value) / 100)}
                  className="h-1 w-40 cursor-pointer"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(minConfidence * 100)}
                />
                <span className="text-xs text-slate-500">{Math.round(minConfidence * 100)}%</span>
                <Button variant="ghost" size="xs" onClick={() => setMinConfidence(0.5)}>Reset</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Source type filters">
                <span className="text-xs font-medium text-slate-600">Sources</span>
                {availableSourceTypes.length === 0 ? (
                  <span className="text-xs text-slate-400">No source types yet</span>
                ) : (
                  availableSourceTypes.map((src) => (
                    <Button
                      key={src.type}
                      variant={sourceFilters.includes(src.type) ? 'default' : 'outline'}
                      size="xs"
                      onClick={() => toggleSourceFilter(src.type)}
                      aria-pressed={sourceFilters.includes(src.type)}
                      title={src.labels.length > 1 ? src.labels.join(', ') : undefined}
                    >
                      {src.display}
                    </Button>
                  ))
                )}
                {sourceFilters.length > 0 ? (
                  <Button variant="ghost" size="xs" onClick={resetSourceFilters}>Clear</Button>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Algorithm filters">
                <span className="text-xs font-medium text-slate-600">Algorithms</span>
                {availableSourceLabels.length === 0 ? (
                  <span className="text-xs text-slate-400">No detector labels yet</span>
                ) : (
                  availableSourceLabels.map((label) => (
                    <Button
                      key={label}
                      variant={sourceLabelFilters.includes(label) ? 'default' : 'outline'}
                      size="xs"
                      onClick={() => toggleSourceLabelFilter(label)}
                      aria-pressed={sourceLabelFilters.includes(label)}
                    >
                      {label}
                    </Button>
                  ))
                )}
                {sourceLabelFilters.length > 0 ? (
                  <Button variant="ghost" size="xs" onClick={resetSourceLabelFilters}>Clear</Button>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Button variant="outline" size="xs" onClick={() => acknowledgeByConfidence(0.8)}>Ack ≥ 80%</Button>
                {sourceFilters.length === 1 ? (
                  <Button variant="outline" size="xs" onClick={() => acknowledgeBySource(sourceFilters[0])}>
                    Ack {sourceFilters[0]}
                  </Button>
                ) : null}
                {sourceFilters.length === 1 ? (
                  <Button variant="outline" size="xs" onClick={() => resolveBySourceType(sourceFilters[0])}>
                    Resolve {sourceFilters[0]}
                  </Button>
                ) : null}
                {(sourceFilters.length === 1 || sourceLabelFilters.length === 1) ? (
                  <Button variant="outline" size="xs" onClick={snoozeSimilar}>Snooze similar</Button>
                ) : null}
                {sourceLabelFilters.length === 1 ? (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => acknowledgeByLabel(sourceLabelFilters[0])}
                  >
                    Ack {sourceLabelFilters[0]}
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-3" role="group" aria-label="Alerts by group">
              {groupMode === 'severity' && severitySections.map((sev) => (
                <Collapsible key={sev} open={!collapsed[sev]} onOpenChange={(open) => setCollapsed((c) => ({ ...c, [sev]: !open }))}>
                  <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" size="sm" aria-expanded={!collapsed[sev]}>
                        <span className="flex items-center gap-2">
                          {getSeverityIcon(sev)}
                          <span className="capitalize">{sev}</span>
                          <Badge variant={sev === AlertSeverity.Critical ? 'destructive' : sev === AlertSeverity.Important ? 'default' : 'secondary'}>
                            {grouped.bySeverity[sev].length}
                          </Badge>
                        </span>
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    {grouped.bySeverity[sev].length === 0 ? (
                      <div className="text-sm text-muted-foreground mt-2">{String(tAnalytics('alerts.none'))}</div>
                    ) : (
                      <ul className="mt-3 space-y-2" aria-label="Alerts list">
                        {grouped.bySeverity[sev].map((a) => (
                          <li key={a.id} className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              className="mt-3"
                              aria-label={`Select alert ${a.id}`}
                              checked={selectedIds.has(a.id)}
                              onChange={(e) => {
                                setSelectedIds((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(a.id); else next.delete(a.id);
                                  return next;
                                });
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              {a.governance && (
                                <div className="mb-1 flex flex-wrap gap-1">
                                  {a.governance.deduplicated ? <Badge variant="outline">dedup</Badge> : null}
                                  {a.governance.throttled ? <Badge variant="outline">throttled</Badge> : null}
                                  {a.governance.quietHours ? <Badge variant="outline">quiet</Badge> : null}
                                  {a.governance.snoozed ? <Badge variant="outline">snoozed</Badge> : null}
                                  {a.governance.capExceeded ? <Badge variant="outline">capped</Badge> : null}
                                </div>
                              )}
                              <AlertCard
                                alert={a}
                                onAcknowledge={acknowledge}
                                onSnooze={(id) => snooze(id)}
                                onResolve={(id) => resolve(id)}
                                onOpenDetails={handleOpenDetails}
                                sparklineOptions={{}}
                              />
                            </div>
                            <div className="shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => togglePin(a.id)}
                                aria-label={String(isPinned(a.id) ? tAnalytics('aria.alerts.unpinButton') : tAnalytics('aria.alerts.pinButton'))}
                                title={String(isPinned(a.id) ? tAnalytics('alerts.unpinAlert') : tAnalytics('alerts.pinAlert'))}
                              >
                                {isPinned(a.id) ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))}

              {groupMode === 'source' && Object.entries(grouped.bySource).map(([src, list]) => (
                <Collapsible key={src} open>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <span className="flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        <span>{src}</span>
                        <Badge variant="secondary">{list.length}</Badge>
                      </span>
                    </Button>
                  </div>
                  <CollapsibleContent>
                    <ul className="mt-3 space-y-2" aria-label={`Alerts list for ${src}`}>
                      {list.map((a) => (
                        <li key={a.id} className="flex items-start gap-2">
                          <AlertCard
                            alert={a}
                            onAcknowledge={acknowledge}
                            onSnooze={(id) => snooze(id)}
                            onResolve={(id) => resolve(id)}
                            onOpenDetails={handleOpenDetails}
                            sparklineOptions={{}}
                          />
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              ))}

              {groupMode === 'status' && Object.entries(grouped.byStatus).map(([st, list]) => (
                <Collapsible key={st} open>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <span className="flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        <span className="capitalize">{st}</span>
                        <Badge variant="secondary">{list.length}</Badge>
                      </span>
                    </Button>
                  </div>
                  <CollapsibleContent>
                    <ul className="mt-3 space-y-2" aria-label={`Alerts list for status ${st}`}>
                      {list.map((a) => (
                        <li key={a.id} className="flex items-start gap-2">
                          <AlertCard
                            alert={a}
                            onAcknowledge={acknowledge}
                            onSnooze={(id) => snooze(id)}
                            onResolve={(id) => resolve(id)}
                            onOpenDetails={handleOpenDetails}
                            sparklineOptions={{}}
                          />
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </CardContent>
        </Card>

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
                    {pinnedAlerts.map((entry) => {
                      const isViewed = viewedPinned[entry.id] ?? false;
                      return (
                        <li key={entry.id} className="rounded-lg border p-3">
                          <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {getSeverityIcon(entry.severity)}
                              <span className="text-sm font-medium truncate">{String(entry.metadata?.summary ?? entry.kind)}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(entry.createdAt).toLocaleDateString()}
                            </div>
                            {entry.sources?.length ? (
                              <p className="text-xs text-slate-500">
                                Sources: {(entry.sources[0]?.label ?? entry.sources[0]?.type) + (entry.sources.length > 1 ? ` + ${entry.sources.length - 1} more` : '')}
                              </p>
                            ) : null}
                            {entry.status === AlertStatus.Resolved && (
                              <div className="mt-2">
                                <Badge variant="outline">{String(tAnalytics('alerts.resolvedLabel'))}</Badge>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => unpinAlert(entry.id)}
                              aria-label={String(tAnalytics('aria.alerts.unpinButton'))}
                              title={String(tAnalytics('alerts.unpinAlert'))}
                            >
                              <PinOff className="h-4 w-4" />
                            </Button>
                            {!isViewed && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkViewed(entry.id)}
                                aria-label={String(tAnalytics('tabs.alerts'))}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {entry.status !== AlertStatus.Resolved && (
                              <Dialog
                                open={selectedForResolve?.id === entry.id}
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
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </aside>
      <Dialog open={detailsOpen} onOpenChange={handleDetailsOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alert details</DialogTitle>
          </DialogHeader>
          {selectedForDetails ? (
            <AlertDetails
              alert={selectedForDetails}
              onCreateGoal={handleCreateGoal}
              onAddInterventionTemplate={handleAddInterventionTemplate}
              onScheduleCheckIn={handleScheduleCheckIn}
              onAddToReport={handleAddToReport}
              onNotifyTeam={handleNotifyTeam}
              onSubmitFeedback={(alertId, data) => feedback(alertId, data)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <CreateGoalFromAlertDialog
        open={goalDialogOpen}
        alert={goalDialogAlert as any}
        onOpenChange={(open) => {
          setGoalDialogOpen(open);
          if (!open) setGoalDialogAlert(null);
        }}
      />
      </div>
    </div>
  );
});

AlertsPanel.displayName = 'AlertsPanel';

export default AlertsPanel;
