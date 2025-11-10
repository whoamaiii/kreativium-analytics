import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { loadAiConfig } from '@/lib/aiConfig';
import { AI_ANALYSIS_ENABLED, AI_MODEL_NAME, OPENROUTER_API_KEY, AI_BASE_URL, AI_LOCAL_ONLY } from '@/lib/env';
import { getRuntimeEnv } from '@/lib/runtimeEnv';
import { aiMetrics } from '@/lib/ai/metrics';
import { useStorageState } from '@/lib/storage/useStorageState';
import { STORAGE_KEYS } from '@/lib/storage/keys';

export function EnvDebug(): JSX.Element | null {
  if (!import.meta.env.DEV) return null;
  const ai = loadAiConfig();
  const env = getRuntimeEnv();
  const [lsKeyOld] = useStorageState(STORAGE_KEYS.OPENROUTER_API_KEY, '');
  const [lsKeyNew] = useStorageState(STORAGE_KEYS.VITE_OPENROUTER_API_KEY, '');
  const lsKey = lsKeyOld || lsKeyNew;
  const masked = (s?: string) => (typeof s === 'string' && s.length > 8 ? s.slice(0, 4) + '…' + s.slice(-4) : s || '');
  const toBool = (v: unknown) => (v ?? '').toString().toLowerCase() === '1' || (v ?? '').toString().toLowerCase() === 'true' || (v ?? '').toString().toLowerCase() === 'yes';
  // Derive runtime values directly from live env for sanity-checking
  const aiLive = {
    enabled: toBool(env.VITE_AI_ANALYSIS_ENABLED),
    modelName: typeof env.VITE_AI_MODEL_NAME === 'string' && env.VITE_AI_MODEL_NAME.trim().length > 0 ? (env.VITE_AI_MODEL_NAME as string) : '(unset)',
    apiKey: typeof env.VITE_OPENROUTER_API_KEY === 'string' ? (env.VITE_OPENROUTER_API_KEY as string) : '',
    baseUrl: typeof env.VITE_AI_BASE_URL === 'string' && (env.VITE_AI_BASE_URL as string).trim().length > 0 ? (env.VITE_AI_BASE_URL as string) : 'https://openrouter.ai/api/v1',
    localOnly: toBool(env.VITE_AI_LOCAL_ONLY),
  };

  return (
    <Card className="bg-gradient-card border-0 shadow-soft">
      <CardHeader>
        <CardTitle>Env / AI Debug</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-1">
        <div>AI enabled (loadAiConfig): <strong>{String(ai.enabled)}</strong></div>
        <div>Model (loadAiConfig): <code>{ai.modelName || '(none)'}</code></div>
        <div>API key present (loadAiConfig): <strong>{String(!!ai.apiKey)}</strong> <span className="text-muted-foreground">({masked(ai.apiKey)})</span></div>
        <div>Base URL (loadAiConfig): <code>{String((ai as any).baseUrl || 'https://openrouter.ai/api/v1')}</code></div>
        <div>Local only (loadAiConfig): <strong>{String((ai as any).localOnly || false)}</strong></div>
        <div className="mt-2">AI enabled (live env): <strong>{String(aiLive.enabled)}</strong></div>
        <div>Model (live env): <code>{aiLive.modelName}</code></div>
        <div>API key present (live env): <strong>{String(!!aiLive.apiKey)}</strong> <span className="text-muted-foreground">({masked(aiLive.apiKey)})</span></div>
        <div>Base URL (live env): <code>{aiLive.baseUrl}</code></div>
        <div className="mt-2 text-muted-foreground">Live Vite env:</div>
        <div>VITE_OPENROUTER_API_KEY present: <strong>{String(!!env.VITE_OPENROUTER_API_KEY)}</strong> <span className="text-muted-foreground">({masked(env.VITE_OPENROUTER_API_KEY)})</span></div>
        <div>VITE_AI_ANALYSIS_ENABLED: <code>{String(env.VITE_AI_ANALYSIS_ENABLED)}</code></div>
        <div>VITE_AI_MODEL_NAME: <code>{String(env.VITE_AI_MODEL_NAME)}</code></div>
        <div>VITE_AI_LOCAL_ONLY: <code>{String(env.VITE_AI_LOCAL_ONLY || false)}</code></div>
        <div>VITE_AI_BASE_URL: <code>{String(env.VITE_AI_BASE_URL || '(default)')}</code></div>
        <div className="mt-1">localStorage OPENROUTER_API_KEY present: <strong>{String(!!lsKey)}</strong> <span className="text-muted-foreground">({masked(lsKey)})</span></div>
        <div className="text-xs text-muted-foreground">Tip: set with <code>localStorage.setItem('OPENROUTER_API_KEY', 'sk-or-…')</code></div>
        <div className="text-muted-foreground">Note: Module-level constants can be stale after env changes; the app uses live env shown above.</div>
        <div>Mode: <code>{String(env.MODE)}</code></div>

        {/* AI Telemetry */}
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="font-medium mb-1">AI Telemetry</div>
          {(() => {
            const s = aiMetrics.summary();
            const pct = Math.round((s.jsonValidity || 0) * 100);
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div>Requests: <strong>{s.requests}</strong></div>
                <div>Success: <strong>{s.successes}</strong></div>
                <div>Failures: <strong>{s.failures}</strong></div>
                <div>Retries: <strong>{s.retries}</strong></div>
                <div>JSON valid: <strong>{s.jsonValid}</strong></div>
                <div>Parse errors: <strong>{s.jsonParseErrors}</strong></div>
                <div>Validate errors: <strong>{s.jsonValidateErrors}</strong></div>
                <div>Avg latency: <strong>{s.avgLatency} ms</strong></div>
                <div className="col-span-2">JSON gyldighet (global): <strong>{pct}%</strong></div>
                <div className="col-span-2 text-muted-foreground">Sist oppdatert: {new Date(s.lastUpdated).toLocaleString()}</div>
              </div>
            );
          })()}
          <div className="mt-2">
            <Button size="sm" variant="outline" onClick={() => aiMetrics.reset()}>Reset telemetry</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
