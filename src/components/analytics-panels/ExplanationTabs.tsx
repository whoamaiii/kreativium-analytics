import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExplanationContent } from './ExplanationContent';
import { ExplanationChat } from './ExplanationChat';
import { buildCitationList, type CitationListItem } from './citation-utils';
import { computeAllowedContexts } from '@/lib/evidence/evidenceBuilder';
import type { SourceItem } from '@/types/analytics';
import { logger } from '@/lib/logger';

export interface ExplanationTabsProps {
  // Core explanation props
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
  // Data context
  dataset?: { entries: any[]; emotions: any[]; sensoryInputs: any[] };
  sourcesRich?: SourceItem[];
  className?: string;
}

/**
 * New, tabbed explanation panel that separates Chat, Kilder, and Henvisninger.
 * This is intentionally simple for first scaffolding; richer behaviors like
 * virtualization and sticky composer will be layered on next.
 */
export function ExplanationTabs({
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
  sourcesRich = [],
  className
}: ExplanationTabsProps): React.ReactElement {
  const toSlug = (s?: string) => (s || 'pattern').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const storageBase = React.useMemo(() => `explanationV2.${toSlug(patternTitle)}`, [patternTitle]);
  const readStorage = (k: string, fallback: string) => {
    try { const v = localStorage.getItem(`${storageBase}.${k}`); return v || fallback; } catch { return fallback; }
  };
  const writeStorage = (k: string, v: string) => {
    try { localStorage.setItem(`${storageBase}.${k}`, v); } catch { /* no-op */ }
  };

  const [tab, setTab] = React.useState<string>(() => readStorage('tab', 'chat'));
  const [visited, setVisited] = React.useState<{ kilder: boolean; henvisninger: boolean }>(() => ({
    kilder: readStorage('visited.kilder', '0') === '1',
    henvisninger: readStorage('visited.henvisninger', '0') === '1',
  }));
  const [showAllKilder, setShowAllKilder] = React.useState<boolean>(() => readStorage('kilder.showAll', '0') === '1');
  const handleTabChange = (val: string) => {
    setTab(val);
    writeStorage('tab', val);
    try { logger.info('[UI] explanationV2.tabChange', { tab: val, pattern: patternTitle }); } catch {}
    if (val === 'kilder' && !visited.kilder) {
      setVisited((v) => { const n = { ...v, kilder: true }; writeStorage('visited.kilder', '1'); return n; });
    }
    if (val === 'henvisninger' && !visited.henvisninger) {
      setVisited((v) => { const n = { ...v, henvisninger: true }; writeStorage('visited.henvisninger', '1'); return n; });
    }
  };
  const allowed = React.useMemo(() => {
    try {
      if (!dataset) return undefined;
      return computeAllowedContexts({
        entries: dataset.entries as any,
        emotions: dataset.emotions as any,
        sensoryInputs: dataset.sensoryInputs as any,
      });
    } catch {
      return undefined;
    }
  }, [dataset]);

  const sourcesList = React.useMemo<CitationListItem[]>(() => buildCitationList(sourcesRich), [sourcesRich]);

  const usedCitationKeys = React.useMemo(() => {
    const lastAssistant = [...(chatMessages || [])].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant) return new Set<string>();
    const set = new Set<string>();
    try {
      const re = /\[S(\d+)\]/g;
      let m: RegExpExecArray | null;
      // eslint-disable-next-line no-cond-assign
      while ((m = re.exec((lastAssistant as any).content))) {
        const n = Number(m[1]);
        if (Number.isFinite(n) && n >= 1 && n <= sourcesList.length) set.add(`S${n}`);
      }
    } catch {}
    return set;
  }, [chatMessages, sourcesList.length]);

  return (
    <div className={className}>
      <Tabs value={tab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="kilder">Kilder</TabsTrigger>
            <TabsTrigger value="henvisninger">Henvisninger</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent/40"
              title="Skjul alt"
              onClick={() => {
                try { window.dispatchEvent(new CustomEvent('explanationV2:collapseAll')); logger.info('[UI] explanationV2.collapseAll'); } catch {}
                setShowAllKilder(false);
              }}
            >
              Skjul alt
            </button>
            <button
              type="button"
              className="rounded border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent/40"
              title="Vis alt"
              onClick={() => {
                try { window.dispatchEvent(new CustomEvent('explanationV2:expandAll')); logger.info('[UI] explanationV2.expandAll'); } catch {}
                setShowAllKilder(true);
              }}
            >
              Vis alt
            </button>
          </div>
        </div>

        <TabsContent value="chat" className="mt-3">
          <div className="grid h-full grid-rows-[auto_1fr] gap-3">
            <ExplanationContent
              title={patternTitle || 'Ingen mønster valgt'}
              status={status}
              text={text}
              error={error}
              onCopy={onCopy}
              onAddToReport={onAddToReport}
            />
            <ExplanationChat
              aiEnabled={aiEnabled}
              systemPrompt={systemPrompt}
              initialMessages={chatMessages}
              onMessagesChange={onChatChange}
              sourcesRich={sourcesRich}
              allowed={allowed}
            />
          </div>
        </TabsContent>

        <TabsContent value="kilder" className="mt-3">
          {tab !== 'kilder' && !visited.kilder ? (
            <div className="text-sm text-muted-foreground">Åpne fanen for å laste kilder…</div>
          ) : sourcesList.length === 0 ? (
            <div className="text-sm text-muted-foreground">Ingen kilder tilgjengelig.</div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Kilder fra data ({sourcesList.length})</div>
                <button
                  type="button"
                  className="rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent/40"
                  onClick={() => { setShowAllKilder((v) => { const n = !v; writeStorage('kilder.showAll', n ? '1' : '0'); return n; }); }}
                  aria-expanded={showAllKilder}
                >
                  {showAllKilder ? 'Vis færre' : 'Vis mer'}
                </button>
              </div>
              <ul className="grid gap-2">
                {(showAllKilder ? sourcesList : sourcesList.slice(-8)).map(({ key, source }, idx) => {
                  const ts = (() => {
                    try { return new Date(source.timestamp).toISOString().replace('T', ' ').slice(0, 16); } catch { return String(source.timestamp); }
                  })();
                  const primary = `${source.activity || source.place || 'sosial kontekst'} ${ts}`;
                  const emo = (source.emotions || []).map((e) => `${e.emotion}${typeof e.intensity === 'number' ? ` (${e.intensity})` : ''}`).join(', ');
                  const sen = (source.sensory || []).map((s) => `${s.type || 'sensor'}${s.response ? `: ${s.response}` : ''}${typeof s.intensity === 'number' ? ` (${s.intensity})` : ''}`).join(', ');
                  const meta = [source.note ? `notat: ${source.note}` : '', emo ? `følelser: ${emo}` : '', sen ? `sensorikk: ${sen}` : ''].filter(Boolean).join(' · ');
                  return (
                    <li key={key} className="rounded border bg-card px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{primary}</div>
                          {meta && <div className="mt-0.5 text-[12px] text-muted-foreground line-clamp-2">{meta}</div>}
                        </div>
                        <span className="ml-2 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{key}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </TabsContent>

        <TabsContent value="henvisninger" className="mt-3">
          {tab !== 'henvisninger' && !visited.henvisninger ? (
            <div className="text-sm text-muted-foreground">Åpne fanen for å vise henvisninger…</div>
          ) : sourcesList.length === 0 ? (
            <div className="text-sm text-muted-foreground">Ingen henvisninger.</div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Henvisninger</div>
              <div className="flex flex-wrap gap-1">
                {sourcesList.map(({ key }) => (
                  <span
                    key={key}
                    className={`rounded border px-2 py-0.5 text-[11px] ${usedCitationKeys.has(key) ? 'bg-primary/10 border-primary text-primary' : 'text-muted-foreground'}`}
                  >
                    {key}
                  </span>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

