import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LLMAnalysisEngine } from '@/lib/analysis/llmAnalysisEngine';
import type { AnalyticsResultsAI, TimeRange } from '@/lib/analysis/analysisEngine';
import { computeComparisonRange, type ComparisonMode } from '@/lib/analysis/dateHelpers';
import { loadAiConfig } from '@/lib/aiConfig';
import { openRouterClient } from '@/lib/ai/openrouterClient';
import { useDataQualitySummaries } from '@/hooks/useDataQualitySummaries';
import { resolveSources } from '@/lib/evidence';
import type { EvidenceSource } from '@/lib/evidence';
import { logger } from '@/lib/logger';
import type { Student } from '@/types/student';
import { legacyAnalyticsAdapter } from '@/lib/adapters/legacyAnalyticsAdapter';

export type Preset = 'all' | '7d' | '30d' | '90d';

export interface ConcreteTimeRange extends TimeRange {
  start: Date;
  end: Date;
}

export interface ToolbarLastAction {
  type: 'copy' | 'pdf' | 'share' | null;
  at: number | null;
}

export interface KreativiumAiState {
  students: Student[];
  studentId: string;
  setStudentId: (id: string) => void;
  preset: Preset;
  setPreset: (value: Preset) => void;
  timeframe: ConcreteTimeRange | undefined;
  comparisonRange: ConcreteTimeRange | undefined;
  compareEnabled: boolean;
  setCompareEnabled: (value: boolean) => void;
  compareMode: ComparisonMode;
  onCompareModeChange: (value: string) => void;
  iepSafeMode: boolean;
  setIepSafeMode: (value: boolean) => void;
  isTesting: boolean;
  isAnalyzing: boolean;
  isAnalyzingBaseline: boolean;
  error: string;
  clearError: () => void;
  results: AnalyticsResultsAI | null;
  baselineResults: AnalyticsResultsAI | null;
  analyze: () => Promise<void>;
  refreshAnalyze: () => Promise<void>;
  testAI: () => Promise<void>;
  fromUiCache: boolean;
  dataQuality: ReturnType<typeof useDataQualitySummaries>['current'];
  baselineDataQuality: ReturnType<typeof useDataQualitySummaries>['baseline'];
  hasSmallBaseline: boolean;
  keyFindings: string[];
  resolvedSources: Map<string, EvidenceSource>;
  toolbarLast: ToolbarLastAction;
  setToolbarLast: (value: ToolbarLastAction) => void;
  aiConfig: ReturnType<typeof loadAiConfig>;
  isLocal: boolean;
  displayModelName: string;
}

const DEFAULT_TOOLBAR_LAST: ToolbarLastAction = { type: null, at: null };

const computeRange = (preset: Preset): ConcreteTimeRange | undefined => {
  if (preset === 'all') return undefined;
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  start.setDate(now.getDate() - days);
  return {
    start,
    end,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
};

const toConcreteTimeRange = (range: TimeRange): ConcreteTimeRange => {
  const start = range.start instanceof Date ? range.start : new Date(range.start);
  const end = range.end instanceof Date ? range.end : new Date(range.end);
  return {
    start,
    end,
    timezone: range.timezone,
  };
};

const formatRangeCacheKey = (range: ConcreteTimeRange | undefined): string => {
  if (!range) return 'all';
  return `${range.start.toISOString()}_${range.end.toISOString()}`;
};

const formatDateForStorage = (date: Date): string => date.toLocaleDateString();

const getToolbarStorageKey = (
  students: Student[],
  studentId: string,
  range: ConcreteTimeRange | undefined,
): string => {
  const studentName = students.find((st) => st.id === studentId)?.name || 'elev';
  const normalizedStudent = studentName.toLowerCase();
  const rangeLabel = range
    ? `${formatDateForStorage(range.start)}_${formatDateForStorage(range.end)}`.toLowerCase()
    : 'alle';
  return `ai_toolbar_last_${normalizedStudent}_${rangeLabel}`;
};

const getStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    );
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return [value];
  }
  return [];
};

const isComparisonMode = (value: string): value is ComparisonMode =>
  value === 'previous' || value === 'lastMonth' || value === 'lastYear';

export const useKreativiumAiState = (): KreativiumAiState => {
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      return legacyAnalyticsAdapter.listStudents();
    } catch (error) {
      logger.error('[useKreativiumAiState] Failed to load students initially', error as Error);
      return [];
    }
  });
  const [studentId, setStudentId] = useState<string>('');
  const [preset, setPreset] = useState<Preset>('30d');
  const [compareEnabled, setCompareEnabledState] = useState<boolean>(false);
  const [compareMode, setCompareMode] = useState<ComparisonMode>('previous');
  const [iepSafeMode, setIepSafeModeState] = useState<boolean>(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingBaseline, setIsAnalyzingBaseline] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<AnalyticsResultsAI | null>(null);
  const [baselineResults, setBaselineResults] = useState<AnalyticsResultsAI | null>(null);
  const [fromUiCache, setFromUiCache] = useState(false);
  const [resolvedSources, setResolvedSources] = useState<Map<string, EvidenceSource>>(new Map());
  const [toolbarLast, setToolbarLast] = useState<ToolbarLastAction>(DEFAULT_TOOLBAR_LAST);

  const resultsCacheRef = useRef<
    Map<string, { current: AnalyticsResultsAI; baseline: AnalyticsResultsAI | null }>
  >(new Map());

  const timeframe = useMemo(() => computeRange(preset), [preset]);

  const comparisonRange = useMemo(() => {
    if (!compareEnabled || !timeframe) return undefined;
    return toConcreteTimeRange(computeComparisonRange(timeframe, compareMode));
  }, [compareEnabled, timeframe, compareMode]);

  const cacheKey = useMemo(() => {
    const rangeKey = formatRangeCacheKey(timeframe);
    const comparisonSuffix = compareEnabled && timeframe ? `|cmp:${compareMode}` : '';
    return `${studentId || 'none'}|${preset}|${rangeKey}${comparisonSuffix}|iep:${iepSafeMode ? 'on' : 'off'}`;
  }, [studentId, preset, timeframe, compareEnabled, compareMode, iepSafeMode]);

  const aiConfig = useMemo(() => loadAiConfig(), []);

  const isLocal = useMemo(() => {
    const url = aiConfig.baseUrl || '';
    const quick = url.includes('localhost') || url.includes('127.0.0.1');
    if (quick) return true;
    try {
      const parsedUrl = new URL(url);
      const host = (parsedUrl.hostname || '').toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1') return true;
      if (/^10\./.test(host)) return true;
      if (/^192\.168\./.test(host)) return true;
      if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return true;
      return Boolean(aiConfig.localOnly);
    } catch {
      return Boolean(aiConfig.localOnly) || quick;
    }
  }, [aiConfig]);

  useEffect(() => {
    try {
      const loaded = legacyAnalyticsAdapter.listStudents();
      setStudents(loaded);
      if (loaded.length > 0) {
        setStudentId((prev) => prev || loaded[0].id);
      }
    } catch (e) {
      logger.error('[useKreativiumAiState] load students failed', e as Error);
      setStudents([]);
    }
  }, []);

  useEffect(() => {
    setResults(null);
    setBaselineResults(null);
    resultsCacheRef.current.clear();
  }, [iepSafeMode]);

  const {
    current: dataQuality,
    baseline: baselineDataQuality,
    isBaselineInsufficient: hasSmallBaseline,
  } = useDataQualitySummaries(
    studentId,
    timeframe ? { start: timeframe.start, end: timeframe.end } : undefined,
    {
      baselineRange: comparisonRange
        ? { start: comparisonRange.start, end: comparisonRange.end }
        : undefined,
      baselineMinimum: 5,
    },
  );

  const keyFindings = useMemo(() => getStringArray(results?.keyFindings), [results]);

  useEffect(() => {
    const resolveInterventionSources = async () => {
      if (!results?.suggestedInterventions?.length) return;
      const allSourceIds = new Set<string>();
      for (const intervention of results.suggestedInterventions) {
        if (intervention.sources?.length) {
          intervention.sources.forEach((id) => {
            if (typeof id === 'string' && id.trim()) {
              allSourceIds.add(id.trim());
            }
          });
        }
      }
      if (allSourceIds.size === 0) return;
      try {
        const resolved = await resolveSources(Array.from(allSourceIds));
        const sourceMap = new Map(resolved.map((source) => [source.id, source]));
        setResolvedSources(sourceMap);
      } catch (e) {
        logger.error('[useKreativiumAiState] Failed to resolve sources', e as Error);
      }
    };
    resolveInterventionSources();
  }, [results]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = getToolbarStorageKey(students, studentId, timeframe);
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as ToolbarLastAction;
        if (parsed && typeof parsed === 'object') {
          setToolbarLast({
            type: parsed.type ?? null,
            at: typeof parsed.at === 'number' ? parsed.at : null,
          });
        }
      }
    } catch {
      /* ignore toolbar state restoration errors */
    }
  }, [students, studentId, timeframe]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = getToolbarStorageKey(students, studentId, timeframe);
    try {
      sessionStorage.setItem(key, JSON.stringify(toolbarLast));
    } catch {
      /* ignore toolbar state persistence errors */
    }
  }, [toolbarLast, students, studentId, timeframe]);

  const clearError = useCallback(() => setError(''), []);

  const analyze = useCallback(async () => {
    if (!studentId) {
      setError('Velg en elev først.');
      return;
    }
    setError('');
    setResults(null);
    setBaselineResults(null);

    const uiHit = resultsCacheRef.current.get(cacheKey);
    if (uiHit) {
      setResults(uiHit.current);
      setBaselineResults(uiHit.baseline);
      setFromUiCache(true);
      return;
    }

    setIsAnalyzing(true);
    setIsAnalyzingBaseline(compareEnabled);
    try {
      const engine = new LLMAnalysisEngine();
      const currentPromise = engine.analyzeStudent(studentId, timeframe, {
        includeAiMetadata: true,
        aiProfile: iepSafeMode ? 'iep' : 'default',
      });

      let baselinePromise: Promise<AnalyticsResultsAI | null> | null = null;
      if (compareEnabled && timeframe && comparisonRange) {
        baselinePromise = engine
          .analyzeStudent(studentId, comparisonRange, {
            includeAiMetadata: true,
            aiProfile: iepSafeMode ? 'iep' : 'default',
          })
          .then((baseline) => {
            const totalLen =
              (baseline?.patterns?.length || 0) +
              (baseline?.correlations?.length || 0) +
              (Array.isArray(baseline?.insights) ? baseline.insights.length : 0);
            return totalLen === 0 ? null : baseline;
          })
          .catch(() => null);
      }

      const [res, base] = await Promise.all([
        currentPromise,
        baselinePromise ?? Promise.resolve(null),
      ]);
      setResults(res);
      setBaselineResults(base);
      resultsCacheRef.current.set(cacheKey, { current: res, baseline: base });
      setFromUiCache(false);
    } catch (e) {
      setError((e as Error)?.message || 'Analyse feilet.');
    } finally {
      setIsAnalyzing(false);
      setIsAnalyzingBaseline(false);
    }
  }, [studentId, timeframe, iepSafeMode, compareEnabled, comparisonRange, cacheKey]);

  const refreshAnalyze = useCallback(async () => {
    if (!studentId) {
      setError('Velg en elev først.');
      return;
    }
    setIsAnalyzing(true);
    setIsAnalyzingBaseline(compareEnabled);
    setError('');
    try {
      const engine = new LLMAnalysisEngine();
      const currentPromise = engine.analyzeStudent(studentId, timeframe, {
        includeAiMetadata: true,
        bypassCache: true,
        aiProfile: iepSafeMode ? 'iep' : 'default',
      });

      let baselinePromise: Promise<AnalyticsResultsAI | null> | null = null;
      if (compareEnabled && timeframe && comparisonRange) {
        baselinePromise = engine
          .analyzeStudent(studentId, comparisonRange, {
            includeAiMetadata: true,
            bypassCache: true,
            aiProfile: iepSafeMode ? 'iep' : 'default',
          })
          .then((baseline) => {
            const totalLen =
              (baseline?.patterns?.length || 0) +
              (baseline?.correlations?.length || 0) +
              (Array.isArray(baseline?.insights) ? baseline.insights.length : 0);
            return totalLen === 0 ? null : baseline;
          })
          .catch(() => null);
      }

      const [res, base] = await Promise.all([
        currentPromise,
        baselinePromise ?? Promise.resolve(null),
      ]);
      setResults(res);
      setBaselineResults(base);
      resultsCacheRef.current.set(cacheKey, { current: res, baseline: base });
      setFromUiCache(false);
    } catch (e) {
      setError((e as Error)?.message || 'Analyse feilet.');
    } finally {
      setIsAnalyzing(false);
      setIsAnalyzingBaseline(false);
    }
  }, [studentId, timeframe, compareEnabled, comparisonRange, iepSafeMode, cacheKey]);

  const testAI = useCallback(async () => {
    setIsTesting(true);
    setError('');
    try {
      const resp = await openRouterClient.chat(
        [
          { role: 'system', content: 'Svar kun på norsk. Vær kort.' },
          { role: 'user', content: 'Si kun ordet: pong' },
        ],
        {
          modelName: aiConfig.modelName,
          baseUrl: aiConfig.baseUrl,
          timeoutMs: 10_000,
          maxTokens: 8,
          temperature: 0,
          localOnly: aiConfig.localOnly ?? false,
        },
      );
      setResults(null);
      if (!resp?.content?.toLowerCase().includes('pong')) {
        setError('AI svarte, men ikke som forventet. Sjekk modell og base URL.');
      }
    } catch (e) {
      setError((e as Error)?.message || 'Kunne ikke kontakte AI.');
    } finally {
      setIsTesting(false);
    }
  }, [aiConfig]);

  const handleCompareEnabledChange = useCallback((value: boolean) => {
    setCompareEnabledState(value);
    if (!value) {
      setBaselineResults(null);
    }
  }, []);

  const handleCompareModeChange = useCallback((value: string) => {
    if (isComparisonMode(value)) {
      setCompareMode(value);
    }
  }, []);

  const setIepSafeMode = useCallback((value: boolean) => {
    setIepSafeModeState(value);
  }, []);

  const setPresetSafe = useCallback((value: Preset) => {
    setPreset(value);
  }, []);

  return {
    students,
    studentId,
    setStudentId,
    preset,
    setPreset: setPresetSafe,
    timeframe,
    comparisonRange,
    compareEnabled,
    setCompareEnabled: handleCompareEnabledChange,
    compareMode,
    onCompareModeChange: handleCompareModeChange,
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
    displayModelName: 'Kreativium-AI',
  };
};

export { toConcreteTimeRange };
