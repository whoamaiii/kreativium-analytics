import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExplanationContent } from './ExplanationContent';
import { evaluateSocialTriggerReadiness } from '@/lib/dataSufficiency';
import { ExplanationChat } from './ExplanationChat';
import { computeAllowedContexts } from '@/lib/evidence/evidenceBuilder';
import { seedSocialDemoData } from '@/lib/mock/socialSeeder';
import { Button } from '@/components/ui/button';
import type { SourceItem } from '@/types/analytics';
import { analyticsConfig } from '@/lib/analyticsConfig';
import { ExplanationTabs } from './ExplanationTabs';

export interface ExplanationDockProps {
  patternTitle?: string;
  status: 'idle' | 'loading' | 'ok' | 'error';
  text?: string;
  error?: string;
  onCopy?: (text: string) => void;
  onAddToReport?: (text: string) => void;
  // Chat props
  aiEnabled?: boolean;
  systemPrompt?: string;
  chatMessages?: import('@/lib/ai/types').ChatMessage[];
  onChatChange?: (msgs: import('@/lib/ai/types').ChatMessage[]) => void;
  // Data context for readiness indicator
  dataset?: { entries: any[]; emotions: any[]; sensoryInputs: any[] };
  // Rich sources for clickable citations/details
  sourcesRich?: SourceItem[];
}

export function ExplanationDock({
  patternTitle,
  status,
  text,
  error,
  onCopy,
  onAddToReport,
  aiEnabled = false,
  systemPrompt = '',
  chatMessages = [],
  onChatChange,
  dataset,
  sourcesRich
}: ExplanationDockProps): React.ReactElement {
  const enableV2 = React.useMemo(() => {
    try {
      return !!analyticsConfig.getConfig().features?.explanationV2;
    } catch {
      return false;
    }
  }, []);
  const readinessDetailsRef = React.useRef<HTMLDetailsElement | null>(null);
  React.useEffect(() => {
    function handleCollapseAll() {
      try { if (readinessDetailsRef.current) readinessDetailsRef.current.open = false; } catch {}
    }
    function handleExpandAll() {
      try { if (readinessDetailsRef.current) readinessDetailsRef.current.open = true; } catch {}
    }
    window.addEventListener('explanationV2:collapseAll', handleCollapseAll as EventListener);
    window.addEventListener('explanationV2:expandAll', handleExpandAll as EventListener);
    return () => {
      window.removeEventListener('explanationV2:collapseAll', handleCollapseAll as EventListener);
      window.removeEventListener('explanationV2:expandAll', handleExpandAll as EventListener);
    };
  }, []);
  const readiness = React.useMemo(() => {
    try {
      if (!dataset) return null;
      return evaluateSocialTriggerReadiness(dataset.entries as any, dataset.emotions as any, dataset.sensoryInputs as any);
    } catch { return null; }
  }, [dataset]);
  const isDev = typeof import.meta !== 'undefined' && ((import.meta as any).env?.DEV || (import.meta as any).env?.MODE === 'development');
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Forklaring</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100vh-8rem)] 2xl:h-[calc(100vh-6rem)] overflow-hidden">
        {readiness && (
          <details ref={readinessDetailsRef} className="mb-2 rounded border px-3 py-2 text-xs" aria-label="Data readiness for sosiale triggere">
            <summary className="cursor-pointer select-none">
              <span className={readiness.label === 'ready' ? 'text-green-500' : readiness.label === 'partial' ? 'text-yellow-500' : 'text-orange-500'}>
                Data readiness for sosiale triggere: {Math.round(readiness.score * 100)}% ({readiness.label})
              </span>
            </summary>
            {(readiness.reasons.length > 0 || (isDev && dataset?.entries?.[0]?.studentId)) && (
              <div className="mt-2">
                {readiness.reasons.length > 0 && (
                  <ul className="list-disc pl-4 text-muted-foreground">
                    {readiness.reasons.map((r, i) => (<li key={i}>{r}</li>))}
                  </ul>
                )}
                {isDev && dataset?.entries?.[0]?.studentId && (
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => { await seedSocialDemoData(dataset.entries[0].studentId); }}
                    >
                      Legg til sosiale eksempler (dev)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </details>
        )}

        {enableV2 ? (
          <ExplanationTabs
            patternTitle={patternTitle}
            status={status}
            text={text}
            error={error}
            onCopy={onCopy}
            onAddToReport={onAddToReport}
            aiEnabled={aiEnabled}
            systemPrompt={systemPrompt}
            chatMessages={chatMessages}
            onChatChange={onChatChange}
            dataset={dataset}
            sourcesRich={sourcesRich}
            className="h-full"
          />
        ) : (
          <div className="grid h-full grid-rows-[1fr_auto] gap-3">
            <div className="min-h-0">
              <ExplanationContent
                title={patternTitle || 'Ingen mønster valgt'}
                status={status}
                text={text}
                error={error}
                onCopy={onCopy}
                onAddToReport={onAddToReport}
              />
            </div>
            <div className="border-t pt-2 min-h-[30vh]">
              <h5 className="mb-2 text-sm font-medium text-muted-foreground">Chat om forklaringen</h5>
              <ExplanationChat
                aiEnabled={aiEnabled}
                systemPrompt={systemPrompt}
                initialMessages={chatMessages}
                onMessagesChange={onChatChange}
                sourcesRich={sourcesRich}
                allowed={(() => {
                  try {
                    if (!dataset) return undefined;
                    return computeAllowedContexts({ entries: dataset.entries as any, emotions: dataset.emotions as any, sensoryInputs: dataset.sensoryInputs as any });
                  } catch { return undefined; }
                })()}
                sources={(() => {
                  if (!dataset) return [];
                  try {
                    const entries = dataset.entries || [];
                    const socialRe = /(sosial|sosiale|venn|venner|kompis|klasse|klasserom|gruppe|grupp(e|eoppgave)?|team|pararbeid|friminutt|pause|lunsj|frokost|middag|kveld(s)?stell|morgen(s)?rutine|morgenstell|morgenrutine|kantine|ute|inne|hjemme|avlast|interaksj|samarbeid|samspill|konflikt|lek|leke|presentasjon|diskusjon|overgang(er)?|medelever|familie|besøk)/i;
                    return entries.filter((t: any) => socialRe.test(`${t?.environmentalData?.classroom?.activity || ''} ${t?.environmentalData?.location || ''} ${t?.notes || t?.generalNotes || ''}`)).slice(-10).map((t: any) => {
                      const ts = new Date(t.timestamp).toISOString().replace('T', ' ').slice(0, 16);
                      const act = t?.environmentalData?.classroom?.activity?.toString() || '';
                      const loc = t?.environmentalData?.location || '';
                      const label = act || loc || 'sosial kontekst';
                      const emo = (t.emotions || []).map((e: any) => `${e.emotion} (intensitet ${typeof e.intensity === 'number' ? e.intensity : '?'})`).join(', ');
                      const sen = (t.sensoryInputs || []).map((s: any) => `${s.sensoryType || s.type}: ${s.response}${typeof s.intensity === 'number' ? ` (intensitet ${s.intensity})` : ''}`).join(', ');
                      const happened = (t.notes || t.generalNotes || '').trim();
                      const parts = [ `${label} (${ts})`, happened ? `hendelse: ${happened}` : '', emo ? `følelser: ${emo}` : '', sen ? `sensorikk: ${sen}` : '' ].filter(Boolean);
                      return parts.join(' · ');
                    });
                  } catch { return []; }
                })()}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


