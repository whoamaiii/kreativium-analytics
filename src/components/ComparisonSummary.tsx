import { useEffect, useMemo, useState } from "react";
import type { AnalyticsResultsAI } from "@/lib/analysis/analysisEngine";
import { diffSummary, diffPatterns, diffCorrelations, diffInterventions, diffKeyFindings } from "@/lib/analysis/compareUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { announceToScreenReader } from "@/utils/accessibility";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Mode = 'previous' | 'lastMonth' | 'lastYear';

interface Props {
  current: AnalyticsResultsAI;
  baseline: AnalyticsResultsAI | null;
  mode: Mode;
  currentLabel: string;
  baselineLabel: string;
  className?: string;
  studentName?: string;
  currentBalance?: number | null;
  baselineBalance?: number | null;
  currentAvgIntensity?: number | null;
  baselineAvgIntensity?: number | null;
  hasSmallBaseline?: boolean;
}

function Trend({ value }: { value: number | null }) {
  if (value == null || Math.abs(value) < 1e-9) return (
    <span className="inline-flex items-center gap-1 text-muted-foreground text-xs"><Minus className="h-3 w-3" />0</span>
  );
  const Icon = value > 0 ? TrendingUp : TrendingDown;
  const color = value > 0 ? "text-emerald-600" : "text-rose-600";
  const sign = value > 0 ? "+" : "";
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", color)}>
      <Icon className="h-3 w-3" />{sign}{Math.round(value)}
    </span>
  );
}

function TrendPct({ value }: { value: number | null }) {
  if (value == null || !isFinite(value)) return null;
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  const color = value > 0 ? "text-emerald-600" : value < 0 ? "text-rose-600" : "text-muted-foreground";
  const sign = value > 0 ? "+" : "";
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px]", color)}>
      <Icon className="h-3 w-3" />{sign}{Math.round(value)}%
    </span>
  );
}

export function ComparisonSummary({ 
  current, 
  baseline, 
  mode, 
  currentLabel, 
  baselineLabel, 
  className,
  studentName,
  currentBalance,
  baselineBalance,
  currentAvgIntensity,
  baselineAvgIntensity,
  hasSmallBaseline
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [patLimit, setPatLimit] = useState(6);
  const [corrLimit, setCorrLimit] = useState(6);
  const [intAddedLimit, setIntAddedLimit] = useState(8);
  const [intRemovedLimit, setIntRemovedLimit] = useState(8);
  const [lastExport, setLastExport] = useState<{ type: 'csv' | 'json' | null; at: number | null }>({ type: null, at: null });
  const { tAnalytics } = useTranslation();

  const content = useMemo(() => {
    if (!baseline) return { empty: true } as const;
    const summary = diffSummary(current, baseline, currentBalance, baselineBalance, currentAvgIntensity, baselineAvgIntensity);
    const patterns = diffPatterns(current.patterns || [], baseline.patterns || []);
    const correlations = diffCorrelations(current.correlations || [], baseline.correlations || []);
    const interventions = diffInterventions((current as any).suggestedInterventions || [], (baseline as any).suggestedInterventions || []);
    const keyFindings = diffKeyFindings((current as any).keyFindings || [], (baseline as any).keyFindings || []);
    return { empty: false, summary, patterns, correlations, interventions, keyFindings } as const;
  }, [current, baseline]);

  // Export helpers for the active tab
  useEffect(() => {
    if (content.empty) return;
    const csvBtn = document.getElementById('export-csv');
    const jsonBtn = document.getElementById('export-json');
    if (!csvBtn || !jsonBtn) return;

    const fileSafe = (s: string) => (s || '')
      .normalize?.('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s_-]+/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .toLowerCase();

    const prefix = (() => {
      const student = fileSafe(studentName || 'elev');
      const curr = fileSafe(currentLabel);
      const base = fileSafe(baselineLabel);
      return `kreativium_${student}_${curr}_vs_${base}`;
    })();

    const buildPatternsCSV = () => {
      const rows: string[] = ['type,name,delta_strength,impact_from,impact_to'];
      content.patterns.added.forEach(p => rows.push(`added,"${p.name}",,,`));
      content.patterns.removed.forEach(p => rows.push(`removed,"${p.name}",,,`));
      content.patterns.changed.forEach(c => rows.push(`changed,"${c.current?.name || c.baseline?.name}",${(c.deltaStrength ?? '').toString()},${c.impactChange?.from ?? ''},${c.impactChange?.to ?? ''}`));
      return rows.join('\n');
    };
    const buildCorrelationsCSV = () => {
      const rows: string[] = ['type,variables,delta_coefficient,direction_changed,significance_changed'];
      content.correlations.added.forEach(c => rows.push(`added,"${c.variables.join(' × ')}",,,`));
      content.correlations.removed.forEach(c => rows.push(`removed,"${c.variables.join(' × ')}",,,`));
      content.correlations.changed.forEach(c => rows.push(`changed,"${(c.current?.variables || c.baseline?.variables)?.join(' × ')}",${(c.deltaCoefficient ?? '').toString()},${c.directionChanged ? '1' : '0'},${c.significanceCrossed ? '1' : '0'}`));
      return rows.join('\n');
    };
    const buildInterventionsCSV = () => {
      const rows: string[] = ['type,title,delta_confidence'];
      content.interventions.added.forEach(i => rows.push(`added,"${i.title}",`));
      content.interventions.removed.forEach(i => rows.push(`removed,"${i.title}",`));
      (content.interventions.changed || []).forEach((i: any) => rows.push(`changed,"${i.title}",${(i.deltaConfidence ?? '').toString()}`));
      return rows.join('\n');
    };

    const buildJSON = () => JSON.stringify({
      patterns: content.patterns,
      correlations: content.correlations,
      interventions: content.interventions,
    }, null, 2);

    const downloadText = (filename: string, mime: string, text: string) => {
      const blob = new Blob([text], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    };

    const onCsv = () => {
      // Export all three as separate CSVs packaged via sequential prompts (simpler than zipping in-browser)
      downloadText(`${prefix}_patterns_delta.csv`, 'text/csv;charset=utf-8', buildPatternsCSV());
      downloadText(`${prefix}_correlations_delta.csv`, 'text/csv;charset=utf-8', buildCorrelationsCSV());
      downloadText(`${prefix}_interventions_delta.csv`, 'text/csv;charset=utf-8', buildInterventionsCSV());
      try { announceToScreenReader('CSV eksportert'); } catch {}
      setLastExport({ type: 'csv', at: Date.now() });
    };
    const onJson = async () => {
      try {
        await navigator.clipboard.writeText(buildJSON());
        try { announceToScreenReader('JSON kopiert til utklippstavlen'); } catch {}
        setLastExport({ type: 'json', at: Date.now() });
      } catch {}
    };

    csvBtn.addEventListener('click', onCsv);
    jsonBtn.addEventListener('click', onJson);
    return () => {
      csvBtn.removeEventListener('click', onCsv);
      jsonBtn.removeEventListener('click', onJson);
    };
  }, [content, studentName, currentLabel, baselineLabel]);

  // Persist limits in sessionStorage per comparison context
  useEffect(() => {
    try {
      const key = (() => {
        const s = (studentName || 'elev').toLowerCase();
        const c = currentLabel.toLowerCase();
        const b = baselineLabel.toLowerCase();
        return `cmp_limits_${s}_${c}_${b}`;
      })();
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw) as { pat?: number; corr?: number; ia?: number; ir?: number };
        if (typeof saved.pat === 'number') setPatLimit(saved.pat);
        if (typeof saved.corr === 'number') setCorrLimit(saved.corr);
        if (typeof saved.ia === 'number') setIntAddedLimit(saved.ia);
        if (typeof saved.ir === 'number') setIntRemovedLimit(saved.ir);
      }
    } catch { /* noop */ }
     
  }, [studentName, currentLabel, baselineLabel]);

  useEffect(() => {
    try {
      const key = (() => {
        const s = (studentName || 'elev').toLowerCase();
        const c = currentLabel.toLowerCase();
        const b = baselineLabel.toLowerCase();
        return `cmp_limits_${s}_${c}_${b}`;
      })();
      const data = { pat: patLimit, corr: corrLimit, ia: intAddedLimit, ir: intRemovedLimit };
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch { /* noop */ }
  }, [studentName, currentLabel, baselineLabel, patLimit, corrLimit, intAddedLimit, intRemovedLimit]);

  // Persist last export timestamp/type per comparison context
  useEffect(() => {
    try {
      const key = (() => {
        const s = (studentName || 'elev').toLowerCase();
        const c = currentLabel.toLowerCase();
        const b = baselineLabel.toLowerCase();
        return `cmp_lastExport_${s}_${c}_${b}`;
      })();
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw) as { type: 'csv' | 'json' | null; at: number | null };
        if (saved && typeof saved.at === 'number') setLastExport(saved);
      }
    } catch { /* noop */ }
     
  }, [studentName, currentLabel, baselineLabel]);

  useEffect(() => {
    try {
      const key = (() => {
        const s = (studentName || 'elev').toLowerCase();
        const c = currentLabel.toLowerCase();
        const b = baselineLabel.toLowerCase();
        return `cmp_lastExport_${s}_${c}_${b}`;
      })();
      sessionStorage.setItem(key, JSON.stringify(lastExport));
    } catch { /* noop */ }
  }, [studentName, currentLabel, baselineLabel, lastExport]);

  if (!baseline) {
    return (
      <Card className={cn("bg-gradient-card border-0 shadow-soft", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {tAnalytics('interface.comparisonSummary')}
            <Badge variant="outline">{tAnalytics('interface.noBaselineData')}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {tAnalytics('interface.selectDifferentComparisonPeriod')}
        </CardContent>
      </Card>
    );
  }

  const topChangedPatterns = useMemo(() => {
    if (content.empty) return [] as any[];
    return [...content.patterns.changed]
      .sort((a, b) => Math.abs((b.deltaStrength ?? 0)) - Math.abs((a.deltaStrength ?? 0)))
      .slice(0, 3);
  }, [content]);

  return (
    <Card className={cn("bg-gradient-card border-0 shadow-soft", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>{tAnalytics('interface.comparisonSummary')}</CardTitle>
            {hasSmallBaseline && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                {tAnalytics('interface.limitedDataBaseline')}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">{currentLabel}</span>
            <span className="mx-1">{tAnalytics('interface.versus')}</span>
            <span className="font-medium">{baselineLabel}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("space-y-4", hasSmallBaseline && "opacity-75")}> 
        {/* Summary metrics */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3 text-sm">
          <div className="rounded-md border p-3">
            <div className="text-[11px] text-muted-foreground">{tAnalytics('interface.patterns')}</div>
            <div className="flex items-center justify-between">
              <div className="font-medium">{current.patterns?.length ?? 0}</div>
              <Trend value={content.empty ? 0 : (content as any).summary.counts.patterns.delta} />
            </div>
            <div className="mt-0.5"><TrendPct value={content.empty ? 0 : (content as any).summary.counts.patterns.deltaPct} /></div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-[11px] text-muted-foreground">{tAnalytics('interface.correlations')}</div>
            <div className="flex items-center justify-between">
              <div className="font-medium">{current.correlations?.length ?? 0}</div>
              <Trend value={content.empty ? 0 : (content as any).summary.counts.correlations.delta} />
            </div>
            <div className="mt-0.5"><TrendPct value={content.empty ? 0 : (content as any).summary.counts.correlations.deltaPct} /></div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-[11px] text-muted-foreground">{tAnalytics('interface.insights')}</div>
            <div className="flex items-center justify-between">
              <div className="font-medium">{(current as any).insights?.length ?? 0}</div>
              <Trend value={content.empty ? 0 : (content as any).summary.counts.insights.delta} />
            </div>
            <div className="mt-0.5"><TrendPct value={content.empty ? 0 : (content as any).summary.counts.insights.deltaPct} /></div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-[11px] text-muted-foreground">{tAnalytics('interface.anomalies')}</div>
            <div className="flex items-center justify-between">
              <div className="font-medium">{(current as any).anomalies?.length ?? 0}</div>
              <Trend value={content.empty ? 0 : (content as any).summary.counts.anomalies.delta} />
            </div>
            <div className="mt-0.5"><TrendPct value={content.empty ? 0 : (content as any).summary.counts.anomalies.deltaPct} /></div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-[11px] text-muted-foreground">{tAnalytics('interface.predictive')}</div>
            <div className="flex items-center justify-between">
              <div className="font-medium">{(current as any).predictiveInsights?.length ?? 0}</div>
              <Trend value={content.empty ? 0 : (content as any).summary.counts.predictive.delta} />
            </div>
            <div className="mt-0.5"><TrendPct value={content.empty ? 0 : (content as any).summary.counts.predictive.deltaPct} /></div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-[11px] text-muted-foreground">{tAnalytics('interface.balance')}</div>
            <div className="flex items-center justify-between">
              <div className="font-medium">{currentBalance ?? '—'}%</div>
              <Trend value={content.empty ? 0 : (content as any).summary.balance?.delta} />
            </div>
            <div className="mt-0.5"><TrendPct value={content.empty ? 0 : (content as any).summary.balance?.deltaPct} /></div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-[11px] text-muted-foreground">{tAnalytics('interface.avgIntensityShort')}</div>
            <div className="flex items-center justify-between">
              <div className="font-medium">{currentAvgIntensity ? currentAvgIntensity.toFixed(1) : '—'}</div>
              <Trend value={content.empty ? 0 : (content as any).summary.avgIntensity?.delta} />
            </div>
            <div className="mt-0.5"><TrendPct value={content.empty ? 0 : (content as any).summary.avgIntensity?.deltaPct} /></div>
          </div>
        </div>

        {/* Pattern changes */}
        {!content.empty && (
          <div className="space-y-2">
            <div className="text-sm font-medium">{tAnalytics('interface.keyChanges')}</div>
            {topChangedPatterns.length === 0 && content.patterns.added.length === 0 && content.patterns.removed.length === 0 ? (
              <div className="text-sm text-muted-foreground">{tAnalytics('interface.identicalResults')}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {topChangedPatterns.map((c) => (
                  <div key={c.key} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{c.current?.name || c.baseline?.name}</div>
                      {typeof c.deltaStrength === 'number' && (
                        <Badge variant="outline" className={cn(c.deltaStrength > 0 ? 'text-emerald-700 border-emerald-200' : 'text-rose-700 border-rose-200')}>
                          Δ {(c.deltaStrength * 100).toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                    {c.impactChange && (
                      <div className="mt-1 text-[11px] text-muted-foreground inline-flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        {tAnalytics('interface.impactChange')} {String(c.impactChange.from || '—')} → {String(c.impactChange.to || '—')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tabs: Patterns / Correlations / Interventions with export */}
        {!content.empty && (
          <div className="mt-1">
            <Tabs defaultValue="patterns">
              <div className="flex items-center justify-between gap-2">
                <TabsList>
                  <TabsTrigger value="patterns">{tAnalytics('interface.patterns')}</TabsTrigger>
                  <TabsTrigger value="correlations">{tAnalytics('interface.correlations')}</TabsTrigger>
                  <TabsTrigger value="interventions">{tAnalytics('interface.newInterventions')}</TabsTrigger>
                </TabsList>
                {/* Export actions per active tab handled by simple onClick on buttons bound via IDs */}
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button id="export-csv" variant="outline" size="sm" aria-label={String(tAnalytics('interface.exportCsvAria'))}>{String(tAnalytics('interface.exportCsv'))}</Button>
                      </TooltipTrigger>
                      <TooltipContent>{String(tAnalytics('interface.exportCsvTooltip'))}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button id="export-json" variant="outline" size="sm" aria-label={String(tAnalytics('interface.copyJsonAria'))}>{String(tAnalytics('interface.copyJson'))}</Button>
                      </TooltipTrigger>
                      <TooltipContent>{String(tAnalytics('interface.copyJsonTooltip'))}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {lastExport.at && (
                    <span className="text-[11px] text-muted-foreground ml-1">
                      {String(tAnalytics('interface.lastExportShort'))}: {lastExport.type?.toUpperCase()} {new Date(lastExport.at).toLocaleTimeString()}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[11px] h-7 px-2"
                    aria-label={String(tAnalytics('interface.resetViewAria'))}
                    onClick={() => {
                      setPatLimit(6); setCorrLimit(6); setIntAddedLimit(8); setIntRemovedLimit(8); setLastExport({ type: null, at: null });
                      try {
                        const s = (studentName || 'elev').toLowerCase();
                        const c = currentLabel.toLowerCase();
                        const b = baselineLabel.toLowerCase();
                        sessionStorage.removeItem(`cmp_limits_${s}_${c}_${b}`);
                        sessionStorage.removeItem(`cmp_lastExport_${s}_${c}_${b}`);
                        announceToScreenReader(String(tAnalytics('interface.resetViewAnnounce')));
                      } catch {}
                    }}
                  >{String(tAnalytics('interface.resetView'))}</Button>
                </div>
              </div>

              <TabsContent value="patterns" className="mt-3">
                {(() => {
                  const added = content.patterns.added;
                  const removed = content.patterns.removed;
                  const changed = content.patterns.changed;
                  return (
                    <div className="space-y-3">
                      <div className="text-sm font-medium">{tAnalytics('interface.keyChanges')}</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {changed.slice(0, patLimit).map((c) => (
                          <div key={c.key} className="rounded-md border p-3 text-sm">
                            <div className="font-medium">{c.current?.name || c.baseline?.name}</div>
                            <div className="text-[13px] mt-1 flex items-center gap-2">
                              <span>Δ strength: {(c.deltaStrength ?? 0).toFixed(2)}</span>
                              {c.impactChange && <Badge variant="outline">{String(c.impactChange.from || '—')} → {String(c.impactChange.to || '—')}</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                      {changed.length > patLimit && (
                        <div className="mt-1">
                          <Button size="sm" variant="outline" aria-label="Vis flere endrede mønstre" onClick={() => setPatLimit(p => p + 8)}>Vis flere</Button>
                        </div>
                      )}
                      {(added.length > 0 || removed.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <div className="text-sm font-medium mb-1">{tAnalytics('interface.newPattern')}</div>
                            <ul className="text-sm space-y-1">
                              {added.length === 0 ? <li className="text-muted-foreground">{tAnalytics('interface.none')}</li> : added.map(a => <li key={a.name}>+ {a.name}</li>)}
                            </ul>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">{tAnalytics('interface.removedPattern')}</div>
                            <ul className="text-sm space-y-1">
                              {removed.length === 0 ? <li className="text-muted-foreground">{tAnalytics('interface.none')}</li> : removed.map(r => <li key={r.name}>– {r.name}</li>)}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </TabsContent>

              <TabsContent value="correlations" className="mt-3">
                {(() => {
                  const changed = content.correlations.changed;
                  const added = content.correlations.added;
                  const removed = content.correlations.removed;
                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {changed.slice(0, corrLimit).map((c) => (
                          <div key={c.key} className="rounded-md border p-3 text-sm">
                            <div className="font-medium">{c.baseline?.variables.join(' × ') || c.current?.variables.join(' × ')}</div>
                            <div className="mt-1 flex items-center justify-between text-[13px]">
                              <div>{tAnalytics('interface.deltaRPrefix')} {(c.deltaCoefficient ?? 0).toFixed(2)}</div>
                              {c.significanceCrossed && <Badge variant="outline">{tAnalytics('interface.significanceChanged')}</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                      {changed.length > corrLimit && (
                        <div className="mt-1">
                          <Button size="sm" variant="outline" aria-label="Vis flere korrelasjonsendringer" onClick={() => setCorrLimit(p => p + 8)}>Vis flere</Button>
                        </div>
                      )}
                      {(added.length > 0 || removed.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <div className="text-sm font-medium mb-1">Nye korrelasjoner</div>
                            <ul className="text-sm space-y-1">
                              {added.length === 0 ? <li className="text-muted-foreground">{tAnalytics('interface.none')}</li> : added.map(a => <li key={a.key}>+ {a.variables.join(' × ')}</li>)}
                            </ul>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">Fjernede korrelasjoner</div>
                            <ul className="text-sm space-y-1">
                              {removed.length === 0 ? <li className="text-muted-foreground">{tAnalytics('interface.none')}</li> : removed.map(r => <li key={r.key}>– {r.variables.join(' × ')}</li>)}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </TabsContent>

              <TabsContent value="interventions" className="mt-3">
                {(() => {
                  const added = content.interventions.added;
                  const removed = content.interventions.removed;
                  const changed = content.interventions.changed || [];
                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-md border p-3">
                          <div className="text-sm font-medium mb-2">{tAnalytics('interface.newInterventions')}</div>
                          {added.length === 0 ? (
                            <div className="text-sm text-muted-foreground">{tAnalytics('interface.none')}</div>
                          ) : (
                            <ul className="text-sm space-y-1">
                              {added.slice(0, intAddedLimit).map((i) => (
                                <li key={i.title} className="flex items-center justify-between">
                                  <span>{i.title}</span>
                                  {typeof i.confidenceOverall === 'number' && (
                                    <Badge variant="outline">{Math.round(i.confidenceOverall * 100)}%</Badge>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                          {added.length > intAddedLimit && (
                            <div className="mt-1"><Button size="sm" variant="outline" aria-label="Vis flere nye tiltak" onClick={() => setIntAddedLimit(p => p + 8)}>Vis flere</Button></div>
                          )}
                        </div>
                        <div className="rounded-md border p-3">
                          <div className="text-sm font-medium mb-2">{tAnalytics('interface.removedInterventions')}</div>
                          {removed.length === 0 ? (
                            <div className="text-sm text-muted-foreground">{tAnalytics('interface.none')}</div>
                          ) : (
                            <ul className="text-sm space-y-1">
                              {removed.slice(0, intRemovedLimit).map((i) => (
                                <li key={i.title} className="flex items-center justify-between">
                                  <span>{i.title}</span>
                                  {typeof i.confidenceOverall === 'number' && (
                                    <Badge variant="outline">{Math.round(i.confidenceOverall * 100)}%</Badge>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                          {removed.length > intRemovedLimit && (
                            <div className="mt-1"><Button size="sm" variant="outline" aria-label="Vis flere fjernede tiltak" onClick={() => setIntRemovedLimit(p => p + 8)}>Vis flere</Button></div>
                          )}
                        </div>
                      </div>
                      {changed.length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-1">Endret tillit</div>
                          <ul className="text-sm space-y-1">
                            {changed.map((c: any) => (
                              <li key={c.title}>
                                {c.title}: Δ {(c.deltaConfidence ?? 0).toFixed(2)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Expand for details */}
        {!content.empty && (
          <div>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-muted-foreground underline"
            >
              {expanded ? tAnalytics('interface.showLess') : tAnalytics('interface.showMore')}
            </button>
            {expanded && (
              <div className="mt-3 space-y-3 text-sm">
                <div>
                  <div className="font-medium mb-1">{tAnalytics('interface.keyFindings')}</div>
                  <ul className="list-disc pl-5">
                    {(content.keyFindings.added || []).map((s) => (
                      <li key={`added-${s}`} className="text-emerald-700">+ {s}</li>
                    ))}
                    {(content.keyFindings.removed || []).map((s) => (
                      <li key={`removed-${s}`} className="text-rose-700">– {s}</li>
                    ))}
                  </ul>
                </div>
                {(content as any).summary.recencyMs && (content as any).summary.recencyMs.delta !== null && (
                  <div>
                    <div className="font-medium mb-1">{tAnalytics('interface.analysisTimestamp')}</div>
                    <div className="text-sm text-muted-foreground">
                      {tAnalytics('interface.timestampDifference')}: <Trend value={(content as any).summary.recencyMs.delta} /> ms
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ComparisonSummary;



