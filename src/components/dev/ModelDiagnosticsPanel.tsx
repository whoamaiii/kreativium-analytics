import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ModelType } from '@/lib/mlModels';
import { getEvaluationHistory, clearEvaluationHistory, type EvaluationRun, recordEvaluation } from '@/lib/modelEvaluation';
import { useTranslation } from '@/hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { logger } from '@/lib/logger';
import { generateTimestampId } from '@/lib/uuid';

interface ModelDiagnosticsPanelProps {
  className?: string;
}

type ModelFilter = 'all' | ModelType;

type TimeSeriesStrategy = 'rolling' | 'expanding';

interface CVFormState {
  strategy: TimeSeriesStrategy;
  windowSize: number;
  horizon: number;
  folds: number;
}

interface AnnounceMessage {
  id: string;
  text: string;
  tone: 'polite' | 'assertive';
}

export function ModelDiagnosticsPanel(props: ModelDiagnosticsPanelProps): React.ReactElement | null {
  if (!import.meta.env.DEV) return null;

  const { tAnalytics, formatDateTime } = useTranslation();
  const [modelFilter, setModelFilter] = useState<ModelFilter>('all');
  const [historyVersion, setHistoryVersion] = useState<number>(0);
  const [announcements, setAnnouncements] = useState<AnnounceMessage[]>([]);

  // Form state with strict types
  const [cvForm, setCvForm] = useState<CVFormState>({
    strategy: 'rolling',
    windowSize: 24,
    horizon: 1,
    folds: 5,
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CVFormState, string>>>({});
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // A11y IDs
  const skipLinkId = useId();
  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const formDescId = useId();

  // Read and memoize evaluation history
  const runs: EvaluationRun[] = useMemo(() => {
    const list = getEvaluationHistory(modelFilter === 'all' ? undefined : (modelFilter as ModelType));
    return list;
  }, [modelFilter, historyVersion]);

  const filteredCount = runs.length;

  // Announce helper
  const announce = useCallback((text: string, tone: 'polite' | 'assertive' = 'polite'): void => {
    setAnnouncements((prev) => [...prev, { id: generateTimestampId('aria'), text, tone }]);
  }, []);

  useEffect(() => {
    if (filteredCount >= 0) {
      announce(tAnalytics('dev.modelDiagnostics.announced.loaded', { count: filteredCount }), 'polite');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCount]);

  // Validate form
  const validateForm = useCallback((next: CVFormState): boolean => {
    const errs: Partial<Record<keyof CVFormState, string>> = {};
    if (!Number.isFinite(next.windowSize) || next.windowSize <= 0) {
      errs.windowSize = tAnalytics('dev.modelDiagnostics.errors.windowSize');
    }
    if (!Number.isFinite(next.horizon) || next.horizon <= 0) {
      errs.horizon = tAnalytics('dev.modelDiagnostics.errors.horizon');
    }
    if (!Number.isFinite(next.folds) || next.folds <= 0) {
      errs.folds = tAnalytics('dev.modelDiagnostics.errors.folds');
    }
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) {
      announce(tAnalytics('dev.modelDiagnostics.announced.formInvalid'), 'assertive');
    }
    return Object.keys(errs).length === 0;
  }, [announce, tAnalytics]);

  const onChangeNumber = useCallback((key: keyof Pick<CVFormState, 'windowSize' | 'horizon' | 'folds'>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    const next = { ...cvForm, [key]: value } as CVFormState;
    setCvForm(next);
  }, [cvForm]);

  const onChangeStrategy = useCallback((value: string) => {
    const next = { ...cvForm, strategy: (value as TimeSeriesStrategy) } as CVFormState;
    setCvForm(next);
  }, [cvForm]);

  // Cooperative yield to avoid blocking the main thread
  const yieldToBrowser = useCallback(async () => {
    await new Promise<void>((r) => setTimeout(r, 0));
  }, []);

  // Run TS CV lazily to avoid pulling ML chunk until needed
  const handleRunCV = useCallback(async () => {
    const valid = validateForm(cvForm);
    if (!valid) return;
    setIsRunning(true);
    try {
      const [{ CrossValidator }, tf] = await Promise.all([
        import('@/lib/validation/crossValidation'),
        import('@tensorflow/tfjs'),
      ]);

      // Yield after loading heavy libs
      await yieldToBrowser();

      // Compute minimal dataset length to allow the requested number of folds
      const gap = 0;
      const n = Math.max(cvForm.windowSize + (cvForm.horizon + gap) * cvForm.folds, cvForm.windowSize + 1);

      // Allocate tensors in a separate tick
      const features = tf.tensor2d(new Array(n * 2).fill(0), [n, 2]);
      const labels = tf.tensor2d(new Array(n * 2).fill(0), [n, 2]);
      const trainingData = { features, labels } as unknown as import('@/types/ml').TrainingData;

      await yieldToBrowser();

      const validator = new CrossValidator();
      // Generating folds can be heavy; do it after a yield and keep pure
      const folds = validator.generateTimeSeriesFolds(trainingData, {
        strategy: cvForm.strategy,
        windowSize: cvForm.windowSize,
        horizon: cvForm.horizon,
        gap,
        folds: cvForm.folds,
      });

      await yieldToBrowser();

      // Record a lightweight EvaluationRun entry to history
      const run: EvaluationRun = {
        id: generateTimestampId('eval'),
        modelType: (modelFilter === 'all' ? ('emotion-prediction' as ModelType) : (modelFilter as ModelType)),
        timestamp: Date.now(),
        dataSignature: '',
        configSignature: '',
        taskType: 'regression',
        metrics: { regression: { mae: undefined, mse: undefined, rmse: undefined, r2: undefined, mape: undefined } },
        cv: {
          strategy: 'time-series',
          windowSize: cvForm.windowSize,
          horizon: cvForm.horizon,
          folds: folds.length,
        },
        notes: `dev:ts-cv:${cvForm.strategy}`,
        schemaVersion: '1',
      };
      recordEvaluation(run);
      setHistoryVersion((v) => v + 1);
      announce(tAnalytics('dev.modelDiagnostics.announced.cvComplete', { folds: folds.length }), 'polite');

      // Cleanup tensors
      tf.dispose([features, labels]);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logger.error('[ModelDiagnosticsPanel] Failed to run time-series CV', { error: err });
      announce(tAnalytics('dev.modelDiagnostics.announced.cvFailed'), 'assertive');
    } finally {
      setIsRunning(false);
    }
  }, [announce, cvForm, logger, modelFilter, tAnalytics, validateForm, yieldToBrowser]);

  const handleClear = useCallback(() => {
    clearEvaluationHistory(modelFilter === 'all' ? undefined : (modelFilter as ModelType));
    setHistoryVersion((v) => v + 1);
    announce(tAnalytics('dev.modelDiagnostics.announced.cleared'), 'polite');
  }, [announce, modelFilter, tAnalytics]);

  const modelTypes: ModelType[] = useMemo(() => (
    ['emotion-prediction', 'sensory-response', 'baseline-clustering'] as ModelType[]
  ), []);

  // Render helpers
  const renderRunItem = useCallback((run: EvaluationRun): React.ReactNode => {
    const title = `${run.modelType} — ${run.cv?.strategy ?? run.taskType}`;
    const subtitle = formatDateTime(new Date(run.timestamp));
    const cv = run.cv ? `${tAnalytics('dev.modelDiagnostics.list.strategy')}: ${run.cv.strategy} • ${tAnalytics('dev.modelDiagnostics.list.windowSize')}: ${run.cv.windowSize} • ${tAnalytics('dev.modelDiagnostics.list.horizon')}: ${run.cv.horizon} • ${tAnalytics('dev.modelDiagnostics.list.folds')}: ${run.cv.folds ?? '-'}` : '-';
    return (
      <div className="px-3 py-2" key={run.id}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">{title}</div>
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          </div>
          <div className="text-xs text-muted-foreground">{cv}</div>
        </div>
      </div>
    );
  }, [formatDateTime, tAnalytics]);

  const historyContainerHeight = 320; // px, fixed for virtualization
  const itemHeight = 56; // px per item row

  return (
    <section aria-labelledby="model-diagnostics-heading" role="region" className={props.className}>
      <a href={`#${skipLinkId}`} className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-primary text-primary-foreground px-2 py-1 rounded">
        {tAnalytics('dev.modelDiagnostics.a11y.skipToContent')}
      </a>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle id="model-diagnostics-heading" className="text-lg">
            {tAnalytics('dev.modelDiagnostics.title')}
          </CardTitle>
        </CardHeader>
        <CardContent id={skipLinkId}>
          <div className="grid gap-4">
            <div className="flex flex-col md:flex-row md:items-end gap-3" role="form" aria-describedby={formDescId}>
              <div id={formDescId} className="sr-only">
                {tAnalytics('dev.modelDiagnostics.formDescription')}
              </div>

              <div className="w-full md:w-40">
                <Label htmlFor="model-type-filter">{tAnalytics('dev.modelDiagnostics.filters.modelType')}</Label>
                <Select value={modelFilter} onValueChange={(v) => setModelFilter(v as ModelFilter)}>
                  <SelectTrigger id="model-type-filter" aria-label={tAnalytics('dev.modelDiagnostics.filters.modelType')}>
                    <SelectValue placeholder={tAnalytics('dev.modelDiagnostics.filters.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tAnalytics('dev.modelDiagnostics.filters.all')}</SelectItem>
                    {modelTypes.map((mt) => (
                      <SelectItem key={mt} value={mt}>{mt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="hidden md:block" />

              <div className="w-full md:w-44">
                <Label htmlFor="cv-strategy">{tAnalytics('dev.modelDiagnostics.cv.strategy')}</Label>
                <Select value={cvForm.strategy} onValueChange={onChangeStrategy}>
                  <SelectTrigger id="cv-strategy" aria-label={tAnalytics('dev.modelDiagnostics.cv.strategy')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rolling">{tAnalytics('dev.modelDiagnostics.cv.rolling')}</SelectItem>
                    <SelectItem value="expanding">{tAnalytics('dev.modelDiagnostics.cv.expanding')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-28">
                <Label htmlFor="cv-windowSize">{tAnalytics('dev.modelDiagnostics.cv.windowSize')}</Label>
                <Input
                  id="cv-windowSize"
                  type="number"
                  inputMode="numeric"
                  value={cvForm.windowSize}
                  onChange={onChangeNumber('windowSize')}
                  aria-invalid={Boolean(formErrors.windowSize)}
                  aria-describedby={formErrors.windowSize ? 'cv-windowSize-error' : undefined}
                />
                {formErrors.windowSize && (
                  <div id="cv-windowSize-error" className="mt-1 text-xs text-destructive">
                    {formErrors.windowSize}
                  </div>
                )}
              </div>

              <div className="w-full md:w-28">
                <Label htmlFor="cv-horizon">{tAnalytics('dev.modelDiagnostics.cv.horizon')}</Label>
                <Input
                  id="cv-horizon"
                  type="number"
                  inputMode="numeric"
                  value={cvForm.horizon}
                  onChange={onChangeNumber('horizon')}
                  aria-invalid={Boolean(formErrors.horizon)}
                  aria-describedby={formErrors.horizon ? 'cv-horizon-error' : undefined}
                />
                {formErrors.horizon && (
                  <div id="cv-horizon-error" className="mt-1 text-xs text-destructive">
                    {formErrors.horizon}
                  </div>
                )}
              </div>

              <div className="w-full md:w-28">
                <Label htmlFor="cv-folds">{tAnalytics('dev.modelDiagnostics.cv.folds')}</Label>
                <Input
                  id="cv-folds"
                  type="number"
                  inputMode="numeric"
                  value={cvForm.folds}
                  onChange={onChangeNumber('folds')}
                  aria-invalid={Boolean(formErrors.folds)}
                  aria-describedby={formErrors.folds ? 'cv-folds-error' : undefined}
                />
                {formErrors.folds && (
                  <div id="cv-folds-error" className="mt-1 text-xs text-destructive">
                    {formErrors.folds}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleRunCV} disabled={isRunning}>
                  {isRunning ? tAnalytics('dev.modelDiagnostics.running') : tAnalytics('dev.modelDiagnostics.runTsCv')}
                </Button>
                <Button variant="outline" onClick={handleClear}>
                  {tAnalytics('dev.modelDiagnostics.clearHistory')}
                </Button>
              </div>
            </div>

            <div className="mt-2" aria-live="polite" ref={liveRegionRef}>
              {/* Announce updates once; render visually hidden list to trigger SR */}
              <ul className="sr-only">
                {announcements.map((a) => (
                  <li key={a.id} aria-live={a.tone}>{a.text}</li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground">
                {tAnalytics('dev.modelDiagnostics.latestRuns')} ({filteredCount})
              </h2>
              <div className="mt-2 border rounded-md">
                <ScrollArea className="rounded-md" style={{ height: `${historyContainerHeight}px` }}>
                  <div>
                    {runs.map((run) => renderRunItem(run) as React.ReactElement)}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

