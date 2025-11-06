import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import type { AnalyticsResultsAI } from '@/lib/analysis';
import { useTranslation } from '@/hooks/useTranslation';

interface AiMetadataCardProps {
  results: AnalyticsResultsAI;
  displayModelName: string;
  fromCacheLabel: string;
  caveatsLabel: string;
  globalJsonValidity?: string | null;
}

export function AiMetadataCard({
  results,
  displayModelName,
  fromCacheLabel,
  caveatsLabel,
  globalJsonValidity,
}: AiMetadataCardProps): JSX.Element | null {
  const { tAnalytics } = useTranslation();
  if (!results.ai) return null;
  const usage = results.ai.usage;
  const hasCacheUsage = usage ? ((usage.cacheReadTokens ?? 0) > 0 || (usage.cacheWriteTokens ?? 0) > 0) : false;

  const titleText = String(
    tAnalytics('interface.aiMetadataTitle', {
      model: displayModelName,
      defaultValue: 'AI‑metadata • {{model}}',
    })
  );

  const modelText = String(
    tAnalytics('interface.aiMetadataModelLabel', {
      model: results.ai.model,
      defaultValue: 'Modell: {{model}}',
    })
  );

  const latencyText =
    results.ai.latencyMs != null
      ? String(
          tAnalytics('interface.aiMetadataLatencyLabel', {
            ms: Math.round(results.ai.latencyMs),
            defaultValue: 'Latens: {{ms}} ms',
          })
        )
      : null;

  const tokensText =
    usage != null
      ? String(
          tAnalytics('interface.aiMetadataTokensLabel', {
            prompt: usage.promptTokens ?? 0,
            completion: usage.completionTokens ?? 0,
            total: usage.totalTokens ?? 0,
            defaultValue: 'Tokens: prompt {{prompt}} • completion {{completion}} • total {{total}}',
          })
        )
      : null;

  const cacheText =
    hasCacheUsage && usage
      ? String(
          tAnalytics('interface.aiMetadataCacheLabel', {
            read: usage.cacheReadTokens ?? 0,
            write: usage.cacheWriteTokens ?? 0,
            defaultValue: 'Cache: read {{read}} • write {{write}}',
          })
        )
      : null;

  const caveatsText =
    results.ai.caveats && results.ai.caveats.length > 0
      ? `${caveatsLabel} ${results.ai.caveats.join('; ')}`
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-4 w-4" />
          <span>{titleText}</span>
          {hasCacheUsage && (
            <Badge variant="outline">{fromCacheLabel}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-1">
        <div>{modelText}</div>
        {latencyText && <div>{latencyText}</div>}
        {tokensText && <div>{tokensText}</div>}
        {cacheText && <div>{cacheText}</div>}
        {caveatsText && <div>{caveatsText}</div>}
        {globalJsonValidity && (
          <div>{globalJsonValidity}</div>
        )}
      </CardContent>
    </Card>
  );
}
