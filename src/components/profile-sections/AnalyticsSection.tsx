import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LazyAnalyticsDashboard } from '@/components/lazy/LazyAnalyticsDashboard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Student, TrackingEntry, EmotionEntry, SensoryEntry, Insights } from '@/types/student';
import { useTranslation } from '@/hooks/useTranslation';
import { AlertCircle } from 'lucide-react';
import { logger } from '@/lib/logger';
import { Switch } from '@/components/ui/switch';
import { analyticsConfig } from '@/lib/analyticsConfig';
import { loadAiConfig } from '@/lib/aiConfig';
import { getRuntimeEnv } from '@/lib/runtimeEnv';
import { useStorageState } from '@/lib/storage/useStorageState';
import { STORAGE_KEYS } from '@/lib/storage/keys';

/**
 * @interface AnalyticsSectionProps
 * Props for the AnalyticsSection component.
 *
 * @property {Student} student - The student object.
 * @property {TrackingEntry[]} trackingEntries - All tracking entries for the student.
 * @property {object} filteredData - Data filtered by the selected date range.
 * @property {Insights | null} insights - The AI-generated insights for the student.
 *   @deprecated Retained for backward compatibility. Analytics are now computed internally via useAnalyticsWorker.
 * @property {boolean} isLoadingInsights - Flag indicating if insights are currently being loaded.
 *   @deprecated Retained for backward compatibility. Loading state is now managed internally via useAnalyticsWorker.
 */
interface AnalyticsSectionProps {
  student: Student;
  trackingEntries: TrackingEntry[];
  filteredData: {
    entries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
  };
  /** @deprecated Retained for backward compatibility. Analytics are now computed internally. */
  insights: Insights | null;
  /** @deprecated Retained for backward compatibility. Loading state is now managed internally. */
  isLoadingInsights: boolean;
}

export function AnalyticsSection({
  student,
  trackingEntries,
  filteredData,
  insights,
  isLoadingInsights,
}: AnalyticsSectionProps) {
  const { tAnalytics } = useTranslation();
  // Storage-based defaults for API keys
  const [lsModelName] = useStorageState(STORAGE_KEYS.AI_MODEL_NAME, '');
  const [lsApiKeyOld] = useStorageState(STORAGE_KEYS.OPENROUTER_API_KEY, '');
  const [lsApiKeyNew] = useStorageState(STORAGE_KEYS.VITE_OPENROUTER_API_KEY, '');

  // Resolve defaults and availability for AI analysis
  const defaults = useMemo(() => {
    const cfg = (() => {
      try {
        return analyticsConfig.getConfig();
      } catch {
        return null;
      }
    })();
    // Prefer live env to avoid stale module-level defaults
    const env = getRuntimeEnv();
    const toBool = (v: unknown) => {
      const s = (v ?? '').toString().toLowerCase();
      return s === '1' || s === 'true' || s === 'yes';
    };
    const enabledByConfig =
      cfg?.features?.aiAnalysisEnabled === true || toBool(env.VITE_AI_ANALYSIS_ENABLED);
    const model =
      typeof env.VITE_AI_MODEL_NAME === 'string' &&
      (env.VITE_AI_MODEL_NAME as string).trim().length > 0
        ? (env.VITE_AI_MODEL_NAME as string)
        : lsModelName || loadAiConfig().modelName;
    const apiKey =
      typeof env.VITE_OPENROUTER_API_KEY === 'string' &&
      (env.VITE_OPENROUTER_API_KEY as string).trim().length > 0
        ? (env.VITE_OPENROUTER_API_KEY as string)
        : lsApiKeyOld || lsApiKeyNew || loadAiConfig().apiKey || '';
    const available = !!apiKey && !!model; // availability only depends on key + model
    try {
      logger.debug('[AnalyticsSection.defaults]', {
        envAi: env.VITE_AI_ANALYSIS_ENABLED,
        envModel: env.VITE_AI_MODEL_NAME,
        hasKey: !!apiKey,
        enabledByConfig,
        available,
      });
    } catch {}
    return { enabledByConfig, available };
  }, [lsModelName, lsApiKeyOld, lsApiKeyNew]);

  const [useAI, setUseAI] = useState<boolean>(() => false);

  useEffect(() => {
    logger.debug('[AnalyticsSection] Props received', {
      studentId: student?.id,
      trackingEntriesCount: trackingEntries?.length,
      filteredDataEntriesCount: filteredData?.entries?.length,
      hasInsights: !!insights,
      isLoadingInsights,
      ai: { enabledByConfig: defaults.enabledByConfig, available: defaults.available, useAI },
    });
  }, [
    student,
    trackingEntries,
    filteredData,
    insights,
    isLoadingInsights,
    defaults.enabledByConfig,
    defaults.available,
    useAI,
  ]);

  if (!student || !filteredData || !trackingEntries) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>{tAnalytics('missingDataTitle')}</p>
              <p className="text-sm mt-2">{tAnalytics('missingDataMessage')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const safeFilteredData = {
    entries: filteredData.entries || [],
    emotions: filteredData.emotions || [],
    sensoryInputs: filteredData.sensoryInputs || [],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{tAnalytics('section.title')}</h2>
        <p className="text-muted-foreground">
          {tAnalytics('section.subtitle', { name: student.name })}
        </p>
        {/* AI Analysis Toggle */}
        <div className="mt-4 flex items-center gap-3">
          <Switch
            id="ai-analysis-toggle"
            checked={useAI}
            onCheckedChange={(val) => setUseAI(Boolean(val))}
            disabled={!defaults.available}
            aria-checked={useAI}
            aria-labelledby="ai-analysis-toggle-label"
            aria-describedby="ai-analysis-toggle-desc"
            data-testid="ai-toggle"
          />
          <div>
            <label
              id="ai-analysis-toggle-label"
              htmlFor="ai-analysis-toggle"
              className="text-sm font-medium"
            >
              {String(tAnalytics('ai.toggle.label', { defaultValue: 'AI Analysis' }))}
            </label>
            <p
              id="ai-analysis-toggle-desc"
              className="text-xs text-muted-foreground"
              data-testid="ai-toggle-status"
            >
              {defaults.available
                ? useAI
                  ? String(tAnalytics('ai.toggle.enabled', { defaultValue: 'Enabled' }))
                  : String(tAnalytics('ai.toggle.disabled', { defaultValue: 'Disabled' }))
                : String(
                    tAnalytics('ai.toggle.unavailable', {
                      defaultValue: 'Unavailable (missing key or model)',
                    }),
                  )}
              {!defaults.enabledByConfig && useAI && (
                <span className="block text-yellow-600 dark:text-yellow-400 text-xs mt-1">
                  {String(
                    tAnalytics('ai.toggle.configWarning', {
                      defaultValue: 'Warning: AI disabled in config, using runtime override',
                    }),
                  )}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Main Analytics Dashboard */}
      <ErrorBoundary showToast={false}>
        <LazyAnalyticsDashboard student={student} filteredData={safeFilteredData} useAI={useAI} />
      </ErrorBoundary>
    </div>
  );
}
