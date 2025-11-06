import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Play, RefreshCw, Database, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { formatComparisonPeriodLabel } from '@/lib/analysis/dateHelpers';
import { ComparisonSummary } from '@/components/ComparisonSummary';
import { useTranslation } from '@/hooks/useTranslation';
import { formatAiReportText, downloadPdfFromText } from '@/lib/ai/exportAiReport';
import { aiMetrics } from '@/lib/ai/metrics';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { announceToScreenReader } from '@/utils/accessibility';
import { useKreativiumAiState } from '@/hooks/useKreativiumAiState';
import type { Preset } from '@/hooks/useKreativiumAiState';
import { AiReportToolbar } from '@/components/analytics/AiReportToolbar';
import { AiMetadataCard } from '@/components/analytics/AiMetadataCard';

function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString();
}

const getOptionalStringField = <T extends Record<string, unknown>, K extends keyof T>(
  obj: T | undefined,
  key: K
): string | undefined => {
  if (!obj) return undefined;
  const value = obj[key];
  return typeof value === 'string' ? value : undefined;
};

type NavigatorWithShare = Navigator & {
  share?: (data: ShareData) => Promise<void>;
};

export default function KreativiumAI(): JSX.Element {
  const { tAnalytics } = useTranslation();
  const {
    students,
    studentId,
    setStudentId,
    preset,
    setPreset,
    timeframe,
    comparisonRange,
    compareEnabled,
    setCompareEnabled,
    compareMode,
    onCompareModeChange,
    iepSafeMode,
    setIepSafeMode,
    isTesting,
    isAnalyzing,
    isAnalyzingBaseline,
    error,
    clearError,
    results,
    baselineResults,
    analyze,
    refreshAnalyze,
    testAI,
    fromUiCache,
    dataQuality,
    baselineDataQuality,
    hasSmallBaseline,
    keyFindings,
    resolvedSources,
    toolbarLast,
    setToolbarLast,
    aiConfig,
    isLocal,
    displayModelName,
  } = useKreativiumAiState();

  const toolbarLabels = React.useMemo(() => ({
    copy: String(tAnalytics('interface.toolbarCopy')),
    copyTooltip: String(tAnalytics('interface.toolbarCopyTooltip')),
    copyAria: String(tAnalytics('interface.toolbarCopyAria')),
    pdf: String(tAnalytics('interface.toolbarPdf')),
    pdfTooltip: String(tAnalytics('interface.toolbarPdfTooltip')),
    pdfAria: String(tAnalytics('interface.toolbarPdfAria')),
    share: String(tAnalytics('interface.toolbarShare')),
    shareTooltip: String(tAnalytics('interface.toolbarShareTooltip')),
    shareAria: String(tAnalytics('interface.toolbarShareAria')),
    lastExportShort: String(tAnalytics('interface.lastExportShort')),
  }), [tAnalytics]);

  const fromCacheLabel = React.useMemo(() => String(tAnalytics('interface.fromCache')), [tAnalytics]);

  const globalJsonValidity = React.useMemo(() => {
    try {
      const summary = aiMetrics.summary();
      const pct = Math.round((summary.jsonValidity || 0) * 100);
      return String(
        tAnalytics('interface.aiMetadataJsonValidity', {
          percentage: pct,
          defaultValue: 'JSON‑gyldighet (global): {{percentage}}%',
        })
      );
    } catch {
      return null;
    }
  }, [tAnalytics]);

  const caveatsLabel = React.useMemo(
    () => String(tAnalytics('interface.metadataCaveatsLabel', { defaultValue: 'Forbehold:' })),
    [tAnalytics]
  );

  const headerTexts = React.useMemo(() => ({
    title: String(tAnalytics('interface.aiHeader.title', { defaultValue: 'Kreativium‑AI' })),
    subtitle: String(tAnalytics('interface.aiHeader.subtitle', { defaultValue: 'Lokal LLM for mønstre, korrelasjoner og tiltak' })),
    modelLabel: String(tAnalytics('interface.aiHeader.modelLabel', { defaultValue: 'Modell:' })),
    localBadge: String(tAnalytics('interface.aiHeader.localBadge', { defaultValue: 'Local model' })),
    remoteBadge: String(tAnalytics('interface.aiHeader.remoteBadge', { defaultValue: 'Remote' })),
  }), [tAnalytics]);

  const dataQualityTexts = React.useMemo(() => ({
    cardTitle: String(tAnalytics('interface.dataQuality.cardTitle', { defaultValue: 'Datakvalitet' })),
    dataPoints: String(tAnalytics('interface.dataQuality.dataPoints', { defaultValue: 'Datapunkter' })),
    lastRecorded: String(tAnalytics('interface.dataQuality.lastRecorded', { defaultValue: 'Sist registrert' })),
    daysSince: String(tAnalytics('interface.dataQuality.daysSince', { defaultValue: 'Dager siden' })),
    completeness: String(tAnalytics('interface.dataQuality.completeness', { defaultValue: 'Fullstendighet' })),
    timeOfDayBalance: String(tAnalytics('interface.dataQuality.timeOfDayBalance', { defaultValue: 'Balanse (tid på dagen)' })),
    morning: String(tAnalytics('interface.dataQuality.morning', { defaultValue: 'morgen' })),
    afternoon: String(tAnalytics('interface.dataQuality.afternoon', { defaultValue: 'etterm.' })),
    evening: String(tAnalytics('interface.dataQuality.evening', { defaultValue: 'kveld' })),
    score: String(tAnalytics('interface.dataQuality.score', { defaultValue: 'score' })),
    noData: String(tAnalytics('interface.dataQuality.noData', { defaultValue: 'Ingen data funnet for valgt periode.' })),
  }), [tAnalytics]);

  const interventionsTexts = React.useMemo(() => ({
    title: String(tAnalytics('interface.interventions.title', { defaultValue: 'Tiltak og anbefalinger' })),
    actionsLabel: String(tAnalytics('interface.interventions.actionsLabel', { defaultValue: 'Källor:' })),
    empty: String(tAnalytics('interface.interventions.empty', { defaultValue: 'Ingen anbefalinger rapportert.' })),
  }), [tAnalytics]);

  const keyFindingsTexts = React.useMemo(() => ({
    title: String(tAnalytics('interface.keyFindings.title', { defaultValue: 'Nøkkelfunn' })),
    empty: String(tAnalytics('interface.keyFindings.empty', { defaultValue: 'Ingen nøkkelfunn rapportert.' })),
  }), [tAnalytics]);

  const patternsTexts = React.useMemo(() => ({
    title: String(tAnalytics('interface.patterns.title', { defaultValue: 'Mønstre' })),
    empty: String(tAnalytics('interface.patterns.empty', { defaultValue: 'Ingen mønstre identifisert.' })),
    fallback: String(tAnalytics('interface.patterns.fallback', { defaultValue: 'Mønster' })),
  }), [tAnalytics]);

  const formTexts = React.useMemo(() => ({
    studentLabel: String(tAnalytics('interface.form.studentLabel', { defaultValue: 'Elev' })),
    studentPlaceholder: String(tAnalytics('interface.form.studentPlaceholder', { defaultValue: 'Velg elev' })),
    presetLabel: String(tAnalytics('interface.form.presetLabel', { defaultValue: 'Tidsrom' })),
    presetPlaceholder: String(tAnalytics('interface.form.presetPlaceholder', { defaultValue: 'Velg tidsrom' })),
    presets: {
      '7d': String(tAnalytics('interface.form.presets.7d', { defaultValue: 'Siste 7 dager' })),
      '30d': String(tAnalytics('interface.form.presets.30d', { defaultValue: 'Siste 30 dager' })),
      '90d': String(tAnalytics('interface.form.presets.90d', { defaultValue: 'Siste 90 dager' })),
      all: String(tAnalytics('interface.form.presets.all', { defaultValue: 'Hele historikken' })),
    } as Record<Preset, string>,
    iepLabel: String(tAnalytics('interface.form.iepLabel', { defaultValue: 'IEP-trygg modus' })),
    iepTooltipLine1: String(tAnalytics('interface.form.iepTooltip1', { defaultValue: 'IEP-trygg modus sikrer pedagogiske anbefalinger' })),
    iepTooltipLine2: String(tAnalytics('interface.form.iepTooltip2', { defaultValue: 'uten medisinske/kliniske råd' })),
    toggleOn: String(tAnalytics('interface.toggle.on', { defaultValue: 'På' })),
    toggleOff: String(tAnalytics('interface.toggle.off', { defaultValue: 'Av' })),
    testAi: String(tAnalytics('interface.actions.testAi', { defaultValue: 'Test AI' })),
    analyze: String(tAnalytics('interface.actions.runAnalysis', { defaultValue: 'Kjør analyse' })),
    refresh: String(tAnalytics('interface.actions.refreshAnalysis', { defaultValue: 'Oppdater (forbi cache)' })),
    compareLoading: String(tAnalytics('interface.compare.loading', { defaultValue: 'Sammenligning...' })),
  }), [tAnalytics]);

  async function handleCopyReport() {
    clearError();
    try {
      if (!results) return;
      const text = await formatAiReportText(results, { includeMetadata: true });
      await navigator.clipboard.writeText(text);
      try { announceToScreenReader(String(tAnalytics('interface.copyReportAnnounce'))); } catch {
        /* screen reader announcement failed */
      }
      setToolbarLast({ type: 'copy', at: Date.now() });
    } catch {
      /* ignore clipboard errors */
    }
  }

  async function handleDownloadPDF() {
    clearError();
    try {
      if (!results) return;
      const text = await formatAiReportText(results, { includeMetadata: true });
      const student = students.find((s) => s.id === studentId)?.name || 'elev';
      const sanitize = (value: string) => value.replace(/[^\p{L}0-9\s_-]+/gu, '').trim().replace(/\s+/g, '_');
      const studentSafe = sanitize(student);
      const rangeSafe = timeframe
        ? `${formatDateForDisplay(timeframe.start)}_${formatDateForDisplay(timeframe.end)}`.replace(/\s+/g, '')
        : 'alle';
      await downloadPdfFromText(text, `kreativium_${studentSafe}_${rangeSafe}.pdf`);
      try { announceToScreenReader(String(tAnalytics('interface.downloadPdfAnnounce'))); } catch {
        /* screen reader announcement failed */
      }
      setToolbarLast({ type: 'pdf', at: Date.now() });
    } catch {
      /* ignore pdf download errors */
    }
  }

  async function handleShare() {
    clearError();
    try {
      if (!results) return;
      const text = await formatAiReportText(results);
      const nav = navigator as NavigatorWithShare;
      if (typeof nav.share === 'function') {
        await nav.share({ title: 'Kreativium‑AI rapport', text });
      } else {
        await navigator.clipboard.writeText(text);
      }
      try { announceToScreenReader(String(tAnalytics('interface.shareAnnounce'))); } catch {
        /* screen reader announcement failed */
      }
      setToolbarLast({ type: 'share', at: Date.now() });
    } catch {
      /* ignore share errors */
    }
  }

  // Safe truncation for multi-byte characters
  const truncateGrapheme = (str: string, max: number): string => {
    if (!str || str.length <= max) return str;
    
    try {
      // Use Intl.Segmenter if available for proper grapheme cluster handling
      const segmenterCtor = typeof Intl !== 'undefined' && 'Segmenter' in Intl
        ? (Intl as { Segmenter: typeof Intl.Segmenter }).Segmenter
        : undefined;
      if (segmenterCtor) {
        const segmenter = new segmenterCtor('nb', { granularity: 'grapheme' });
        const segments = Array.from(segmenter.segment(str));
        return segments.slice(0, max).map((segment) => segment.segment).join('');
      }
    } catch {
      /* fall back to basic truncation */
    }
    
    // Fallback to Array.from for better multi-byte support than slice
    return Array.from(str).slice(0, max).join('');
  };

  // Component for rendering evidence source chips
  const SourceChip = React.memo(({ sourceId }: { sourceId: string }) => {
    const source = resolvedSources.get(sourceId);
    if (!source) return null;

    const truncatedTitle = truncateGrapheme(source.title, 20);
    const needsTitleEllipsis = source.title.length > 20;
    const excerpt = source.shortExcerpt 
      ? truncateGrapheme(source.shortExcerpt, 100) + (source.shortExcerpt.length > 100 ? '...' : '')
      : '';
    const openSourceLabel = String(tAnalytics('interface.interventions.openSourceAria', {
      title: source.title,
      defaultValue: 'Åpne kilde: {{title}}',
    }));
    const yearLabel = String(tAnalytics('interface.interventions.yearLabel', { defaultValue: 'År:' }));

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-background border cursor-pointer hover:bg-accent transition-colors"
            aria-label={openSourceLabel}
          >
            {truncatedTitle}{needsTitleEllipsis && '...'}
          </a>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-medium">{source.title}</p>
          {excerpt && <p className="text-xs mt-1">{excerpt}</p>}
          {source.year && <p className="text-xs text-muted-foreground mt-1">{yearLabel} {source.year}</p>}
        </TooltipContent>
      </Tooltip>
    );
  });

  const studentSelectLabelId = React.useId();
  const studentSelectTriggerId = React.useId();
  const presetSelectLabelId = React.useId();
  const presetSelectTriggerId = React.useId();
  const compareToggleId = React.useId();
  const iepToggleId = React.useId();

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      {/* Aria-live region for screen reader announcements */}
      <div 
        className="sr-only" 
        aria-live="polite"
        aria-atomic="true"
      >
        {isAnalyzing && 'Analyserer...'}
        {isAnalyzingBaseline && 'Analyserer sammenligningsperiode...'}
        {!isAnalyzing && !isAnalyzingBaseline && results && 'Analyse fullført'}
      </div>
      <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30 flex items-center justify-center">
                <Sparkles className="text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{headerTexts.title}</h1>
              <p className="text-sm text-muted-foreground">{headerTexts.subtitle}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{headerTexts.modelLabel} <code>{displayModelName}</code> {fromUiCache && (<span className="ml-2 inline-flex items-center gap-1 text-[11px] rounded px-1.5 py-0.5 border border-muted-foreground/30">• {tAnalytics('interface.fromUiCache')}</span>)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{(isLocal || aiConfig.localOnly) ? headerTexts.localBadge : headerTexts.remoteBadge}</Badge>
              <Badge variant="outline">{displayModelName}</Badge>
            </div>
          </div>

        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardContent className="p-6 grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label
                id={studentSelectLabelId}
                className="block text-sm text-muted-foreground mb-1"
                htmlFor={studentSelectTriggerId}
              >
                {formTexts.studentLabel}
              </label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger
                  id={studentSelectTriggerId}
                  className="w-full"
                  aria-labelledby={studentSelectLabelId}
                >
                  <SelectValue placeholder={formTexts.studentPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label
                id={presetSelectLabelId}
                className="block text-sm text-muted-foreground mb-1"
                htmlFor={presetSelectTriggerId}
              >
                {formTexts.presetLabel}
              </label>
              <Select value={preset} onValueChange={(v) => setPreset(v as Preset)}>
                <SelectTrigger
                  id={presetSelectTriggerId}
                  className="w-full"
                  aria-labelledby={presetSelectLabelId}
                >
                  <SelectValue placeholder={formTexts.presetPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">{formTexts.presets['7d']}</SelectItem>
                  <SelectItem value="30d">{formTexts.presets['30d']}</SelectItem>
                  <SelectItem value="90d">{formTexts.presets['90d']}</SelectItem>
                  <SelectItem value="all">{formTexts.presets.all}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground" htmlFor={compareToggleId}>
                  {tAnalytics('interface.comparePeriods')}
                </label>
                <Toggle
                  id={compareToggleId}
                  aria-label={tAnalytics('interface.comparePeriods')}
                  pressed={compareEnabled}
                  onPressedChange={(v) => setCompareEnabled(Boolean(v))}
                  disabled={!studentId || !timeframe}
                  variant="outline"
                  size="sm"
                >
                  {compareEnabled ? formTexts.toggleOn : formTexts.toggleOff}
                </Toggle>
                <div className="ml-auto min-w-[12rem]">
                  <Select
                    value={compareMode}
                    onValueChange={onCompareModeChange}
                    disabled={!compareEnabled || !studentId || !timeframe}
                  >
                    <SelectTrigger className="w-full"><SelectValue placeholder={tAnalytics('interface.comparisonMode')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="previous">{tAnalytics('interface.previousPeriod')}</SelectItem>
                      <SelectItem value="lastMonth">{tAnalytics('interface.sameLastMonth')}</SelectItem>
                      <SelectItem value="lastYear">{tAnalytics('interface.sameLastYear')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <label className="text-sm text-muted-foreground" htmlFor={iepToggleId}>
                  {formTexts.iepLabel}
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Toggle
                        id={iepToggleId}
                        aria-label="IEP-trygg modus"
                        pressed={iepSafeMode}
                        onPressedChange={(v) => {
                          setIepSafeMode(Boolean(v));
                          announceToScreenReader(v ? formTexts.toggleOn : formTexts.toggleOff);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        {iepSafeMode ? formTexts.toggleOn : formTexts.toggleOff}
                      </Toggle>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{formTexts.iepTooltipLine1}</p>
                      <p className="text-xs">{formTexts.iepTooltipLine2}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-end gap-2">
                <Button variant="outline" onClick={testAI} disabled={isTesting} className="w-1/2">
                  <RefreshCw className="h-4 w-4 mr-2" />{formTexts.testAi}
                </Button>
                <Button onClick={analyze} disabled={isAnalyzing || !studentId} className="w-1/2">
                  <Play className="h-4 w-4 mr-2" />{formTexts.analyze}
                </Button>
                <Button onClick={refreshAnalyze} variant="secondary" disabled={isAnalyzing || !studentId} className="w-full sm:w-auto">
                  <RefreshCw className="h-4 w-4 mr-2" />{formTexts.refresh}
                </Button>
                {compareEnabled && isAnalyzingBaseline && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> {formTexts.compareLoading}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Quality Card */}
        {studentId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" />{dataQualityTexts.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-foreground/90">
              {dataQuality ? (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">{dataQualityTexts.dataPoints}</div>
                    <div className="font-medium">{dataQuality.total}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{dataQualityTexts.lastRecorded}</div>
                    <div className="font-medium">{dataQuality.last ? dataQuality.last.toLocaleString() : '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{dataQualityTexts.daysSince}</div>
                    <div className="font-medium">{dataQuality.daysSince ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{dataQualityTexts.completeness}</div>
                    <div className="font-medium">{dataQuality.completeness}%</div>
                  </div>
                  <div className="sm:col-span-4">
                    <div className="text-xs text-muted-foreground mb-1">{dataQualityTexts.timeOfDayBalance}</div>
                    <div className="flex items-center gap-2">
                      {(['morning','afternoon','evening'] as const).map((k, i) => (
                        <div key={k} className="flex items-center gap-1">
                          <span className="text-[11px] text-muted-foreground">{k === 'morning' ? dataQualityTexts.morning : k === 'afternoon' ? dataQualityTexts.afternoon : dataQualityTexts.evening}</span>
                          <span className="text-[11px]">{dataQuality.buckets[k]}</span>
                          {i < 2 && <span className="text-muted-foreground/40">•</span>}
                        </div>
                      ))}
                      <span className="ml-auto text-[11px] text-muted-foreground">{dataQualityTexts.score}: {dataQuality.balance}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground"><AlertTriangle className="h-4 w-4" />{dataQualityTexts.noData}</div>
              )}
            </CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardContent className="p-4 text-destructive text-sm">{error}</CardContent>
          </Card>
        )}

        {!results && !error && (isTesting || isAnalyzing) && (
          <div className="grid grid-cols-1 gap-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        )}

        {results && (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-0">
                <AiReportToolbar
                  onCopy={handleCopyReport}
                  onDownload={handleDownloadPDF}
                  onShare={handleShare}
                  lastAction={toolbarLast}
                  labels={toolbarLabels}
                />
              </CardContent>
            </Card>
            {compareEnabled && timeframe && (
              <ComparisonSummary
                current={results}
                baseline={baselineResults}
                mode={compareMode}
                currentLabel={`${formatDateForDisplay(timeframe.start)} – ${formatDateForDisplay(timeframe.end)}`}
                baselineLabel={baselineResults
                  ? (comparisonRange
                    ? formatComparisonPeriodLabel(comparisonRange, compareMode)
                    : tAnalytics('interface.noDataInComparisonPeriod'))
                  : tAnalytics('interface.noDataInComparisonPeriod')}
                studentName={students.find(s => s.id === studentId)?.name || ''}
                currentBalance={dataQuality?.balance}
                baselineBalance={baselineDataQuality?.balance}
                currentAvgIntensity={dataQuality?.avgIntensity}
                baselineAvgIntensity={baselineDataQuality?.avgIntensity}
                hasSmallBaseline={hasSmallBaseline}
              />
            )}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" />{keyFindingsTexts.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {keyFindings.length > 0 ? (
                  <ul className="list-disc pl-5 text-sm text-foreground/90">
                    {keyFindings.map((finding, index) => {
                      const itemKey = finding ? `${finding}-${index}` : String(index);
                      return <li key={itemKey}>{finding}</li>;
                    })}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">{keyFindingsTexts.empty}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" />{patternsTexts.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {results.patterns?.length ? results.patterns.map((patternResult, index) => {
                  const impactLabel = getOptionalStringField(patternResult, 'impact');
                  const patternKey = getOptionalStringField(patternResult as Record<string, unknown>, 'id')
                    ?? getOptionalStringField(patternResult as Record<string, unknown>, 'pattern')
                    ?? String(index);
                  return (
                    <div key={patternKey} className="rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{patternResult.pattern || patternsTexts.fallback}</div>
                        {impactLabel && <Badge variant="outline">{impactLabel}</Badge>}
                      </div>
                      {patternResult.description && <p className="text-sm text-muted-foreground mt-1">{patternResult.description}</p>}
                    </div>
                  );
                }) : <p className="text-sm text-muted-foreground">{patternsTexts.empty}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" />{interventionsTexts.title}</CardTitle>
              </CardHeader>
              <TooltipProvider>
              <CardContent className="space-y-3">
                {results.suggestedInterventions.length ? (
                  <ul className="space-y-3">
                    {results.suggestedInterventions.map((intervention, index) => {
                      const interventionKey = intervention.id ?? `${intervention.title ?? 'intervention'}-${index}`;
                      return (
                        <li key={interventionKey} className="rounded-md border p-3">
                          <div className="font-medium">{intervention.title}</div>
                          {intervention.description && <p className="text-sm text-muted-foreground mt-1">{intervention.description}</p>}
                          {intervention.actions.length > 0 && (
                            <ul className="list-disc pl-5 mt-2 text-sm">
                            {intervention.actions.map((action, actionIndex) => {
                              const actionKey = action ? `${action}-${actionIndex}` : String(actionIndex);
                              return <li key={actionKey}>{action}</li>;
                            })}
                            </ul>
                          )}
                          {intervention.sources.length > 0 && (
                            <div className="mt-3">
                            <span className="text-xs text-muted-foreground mr-2">{interventionsTexts.actionsLabel}</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {intervention.sources.map((sourceId) => (
                                <SourceChip key={sourceId} sourceId={sourceId} />
                              ))}
                            </div>
                          </div>
                        )}
                          {(intervention.expectedImpact || intervention.timeHorizon || intervention.tier) && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {intervention.expectedImpact && <Badge variant="outline">{intervention.expectedImpact}</Badge>}
                              {intervention.timeHorizon && <Badge variant="outline">{intervention.timeHorizon}</Badge>}
                              {intervention.tier && <Badge variant="outline">{intervention.tier}</Badge>}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">{interventionsTexts.empty}</p>}
              </CardContent>
              </TooltipProvider>
            </Card>

            {results.ai && (
              <AiMetadataCard
                results={results}
                displayModelName={displayModelName}
                fromCacheLabel={fromCacheLabel}
                globalJsonValidity={globalJsonValidity}
                caveatsLabel={caveatsLabel}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
