import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';
import { openRouterClient } from '@/lib/ai/openrouterClient';
import type { ChatMessage } from '@/lib/ai/types';
import { toast } from 'sonner';
import { Copy, ChevronDown } from 'lucide-react';
import type { SourceItem } from '@/types/analytics';
import { buildCitationList, type CitationListItem } from './citation-utils';
import { sanitizePlainNorwegian, type AllowedContexts } from '@/lib/evidence/evidenceBuilder';
import { EntryDetailsDrawer } from './EntryDetailsDrawer';

export interface ExplanationChatProps {
  aiEnabled: boolean;
  systemPrompt: string;
  initialMessages?: ChatMessage[];
  onMessagesChange?: (messages: ChatMessage[]) => void;
  className?: string;
  sources?: string[];
  sourcesRich?: SourceItem[];
  allowed?: AllowedContexts;
}

// Citation list helpers moved to a small shared utility to avoid HMR export shape issues.

export function ExplanationChat({
  aiEnabled,
  systemPrompt,
  initialMessages = [],
  onMessagesChange,
  className,
  sources = [],
  sourcesRich = [],
  allowed
}: ExplanationChatProps): React.ReactElement {
  const [messages, setMessages] = React.useState<ChatMessage[]>(() => initialMessages);
  const [input, setInput] = React.useState<string>('');
  const [pending, setPending] = React.useState<boolean>(false);
  const listRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const { tAnalytics } = useTranslation();
  const [detailsOpen, setDetailsOpen] = React.useState<boolean>(false);
  const [selectedSource, setSelectedSource] = React.useState<SourceItem | null>(null);

  React.useEffect(() => {
    try { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); } catch {}
  }, [messages, pending]);

  const onChangeRef = React.useRef(onMessagesChange);
  React.useEffect(() => { onChangeRef.current = onMessagesChange; }, [onMessagesChange]);
  React.useEffect(() => {
    onChangeRef.current?.(messages);
  }, [messages]);

  const send = async () => {
    const trimmed = input.trim();
    if (!aiEnabled) { toast.error(String(tAnalytics('insights.chat.disabled'))); return; }
    if (pending || trimmed.length === 0) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    try { textareaRef.current?.focus(); } catch {}
    setPending(true);
    try {
      const chatMsgs: ChatMessage[] = [{ role: 'system', content: systemPrompt }, ...next.slice(-20)];
      const { content } = await openRouterClient.chat(chatMsgs, undefined, { suppressToasts: true });
      const base = String(content)
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/__(.*?)__/g, '$1')
        .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
        .replace(/\s+\n/g, '\n')
        .trim();
      const cleaned = allowed ? sanitizePlainNorwegian(base, allowed) : base;
      setMessages((prev) => [...prev, { role: 'assistant', content: cleaned }]);
      try { textareaRef.current?.focus(); } catch {}
    } catch (e) {
      toast.error('Kunne ikke hente AI-svar');
    } finally {
      setPending(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  // Persisted UI state for sources panel (per session)
  const STORAGE_KEYS = React.useMemo(() => ({
    collapsed: 'explanationChat.sourcesCollapsed',
    showAll: 'explanationChat.showAllSources'
  }), []);
  const [showAllSources, setShowAllSources] = React.useState<boolean>(() => {
    try { const v = sessionStorage.getItem('explanationChat.showAllSources'); return v ? v === '1' : false; } catch { return false; }
  });
  const [sourcesCollapsed, setSourcesCollapsed] = React.useState<boolean>(() => {
    try { const v = sessionStorage.getItem('explanationChat.sourcesCollapsed'); return v ? v === '1' : false; } catch { return false; }
  });
  React.useEffect(() => {
    function handleCollapseAll() {
      try { setSourcesCollapsed(true); setShowAllSources(false); } catch {}
    }
    function handleExpandAll() {
      try { setSourcesCollapsed(false); setShowAllSources(true); } catch {}
    }
    window.addEventListener('explanationV2:collapseAll', handleCollapseAll as EventListener);
    window.addEventListener('explanationV2:expandAll', handleExpandAll as EventListener);
    return () => {
      window.removeEventListener('explanationV2:collapseAll', handleCollapseAll as EventListener);
      window.removeEventListener('explanationV2:expandAll', handleExpandAll as EventListener);
    };
  }, []);
  React.useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEYS.showAll, showAllSources ? '1' : '0'); } catch {}
  }, [showAllSources, STORAGE_KEYS.showAll]);
  React.useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEYS.collapsed, sourcesCollapsed ? '1' : '0'); } catch {}
  }, [sourcesCollapsed, STORAGE_KEYS.collapsed]);
  const sList = React.useMemo<CitationListItem[]>(() => buildCitationList(sourcesRich), [sourcesRich]);

  const usedCitationKeys = React.useMemo(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant) return new Set<string>();
    const set = new Set<string>();
    try {
      const re = /\[S(\d+)\]/g;
      let m: RegExpExecArray | null;
      // eslint-disable-next-line no-cond-assign
      while ((m = re.exec(lastAssistant.content))) {
        const n = Number(m[1]);
        if (Number.isFinite(n) && n >= 1 && n <= sList.length) set.add(`S${n}`);
      }
    } catch {}
    return set;
  }, [messages, sList.length]);

  const openDetails = (si: SourceItem) => {
    setSelectedSource(si);
    setDetailsOpen(true);
  };

  return (
    <div className={className}>
      <div ref={listRef} className="flex-1 min-h-[12rem] md:min-h-[14rem] lg:min-h-[16rem] overflow-auto rounded border bg-card p-3 space-y-3" aria-live="polite">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">{String(tAnalytics('insights.chat.placeholder'))}</p>
        )}
        {messages.map((m, idx) => (
          <div key={idx} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <div className={`group inline-flex max-w-[85%] items-start gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role !== 'user' && <span className="sr-only">AI</span>}
              <div className={`rounded px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                {m.content}
              </div>
              <button
                type="button"
                className="invisible group-hover:visible inline-flex h-7 w-7 items-center justify-center rounded border text-muted-foreground hover:bg-accent/40"
                aria-label="Kopier melding"
                title="Kopier melding"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(m.content); toast.success(String(tAnalytics('insights.chat.copyOk'))); } catch { toast.error(String(tAnalytics('insights.chat.copyFail'))); }
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {pending && (
          <div className="text-left">
            <div className="inline-block rounded px-3 py-2 text-sm bg-muted text-muted-foreground">{String(tAnalytics('insights.chat.aiTyping'))}</div>
          </div>
        )}
      </div>
      {sList.length > 0 ? (
        <div className="mt-2 rounded border bg-muted/30 p-2 text-xs">
          <button
            type="button"
            onClick={() => setSourcesCollapsed((v) => !v)}
            aria-expanded={!sourcesCollapsed}
            aria-controls="sources-list"
            className="mb-1 flex w-full items-center justify-between rounded px-1 py-1 text-muted-foreground hover:bg-accent/30"
            title="Toggle kildeliste"
          >
            <span className="font-medium">Kilder fra data ({sList.length})</span>
            <span className={`inline-flex items-center gap-1 text-[11px]`}>
              {!sourcesCollapsed && (
                <span className="hidden sm:inline">Klikk for å skjule</span>
              )}
              {sourcesCollapsed && (
                <span className="hidden sm:inline">Klikk for å vise</span>
              )}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${sourcesCollapsed ? '' : 'rotate-180'}`} />
            </span>
          </button>
          {!sourcesCollapsed && (
            <div className="mb-1 flex items-center justify-end text-muted-foreground">
              <button
                type="button"
                className="rounded border px-2 py-0.5 text-[11px] hover:bg-accent/40"
                onClick={() => setShowAllSources((v) => !v)}
                aria-expanded={showAllSources}
              >
                {showAllSources ? 'Vis færre' : 'Vis mer'}
              </button>
            </div>
          )}
          {!sourcesCollapsed && (
            <ul id="sources-list" className="grid gap-1">
              {(showAllSources ? sList : sList.slice(-5)).map(({ key, source }, idx) => {
              const ts = (() => { try { return new Date(source.timestamp).toISOString().replace('T', ' ').slice(0, 16); } catch { return String(source.timestamp); } })();
              const primary = `${source.activity || source.place || 'sosial kontekst'} ${ts}`;
              const emo = (source.emotions || []).map((e) => `${e.emotion}${typeof e.intensity === 'number' ? ` (${e.intensity})` : ''}`).join(', ');
              const sen = (source.sensory || []).map((s) => `${s.type || 'sensor'}${s.response ? `: ${s.response}` : ''}${typeof s.intensity === 'number' ? ` (${s.intensity})` : ''}`).join(', ');
              const meta = [source.note ? `notat: ${source.note}` : '', emo ? `følelser: ${emo}` : '', sen ? `sensorikk: ${sen}` : ''].filter(Boolean).join(' · ');
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => openDetails(source)}
                    className="w-full text-left rounded border bg-card px-2 py-1 hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label={`Åpne detaljer for ${primary}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-foreground">
                        <span className="font-medium">{primary}</span>
                        {meta && <div className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{meta}</div>}
                      </div>
                      <span className="ml-2 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{`S${idx + 1}`}</span>
                    </div>
                  </button>
                </li>
              );
              })}
            </ul>
          )}
        </div>
      ) : (
        sources.length > 0 && (
          <details className="mt-2 rounded border bg-muted/30 p-2 text-xs">
            <summary className="cursor-pointer select-none text-muted-foreground">Kilder fra data ({sources.length})</summary>
            <ul className="mt-2 list-disc pl-4 space-y-1">
              {sources.slice(0, 10).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </details>
        )
      )}

      {sList.length > 0 && (
        <div className="mt-2 rounded border bg-muted/30 p-2 text-xs">
          <div className="mb-1 text-muted-foreground">Henvisninger</div>
          <div className="flex flex-wrap gap-1">
            {sList.map(({ key, source }, idx) => (
              <button
                key={key}
                type="button"
                onClick={() => openDetails(source)}
                className={`rounded border px-2 py-0.5 text-[11px] ${usedCitationKeys.has(key) ? 'bg-primary/10 border-primary text-primary' : 'text-muted-foreground hover:bg-accent/40'}`}
                aria-label={`Åpne detaljer for henvisning ${key}`}
                title={`${key}`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="mt-2 flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={String(tAnalytics('insights.chat.placeholder'))}
          className="min-h-[44px]"
          disabled={!aiEnabled || pending}
          aria-label={String(tAnalytics('insights.chat.placeholder'))}
        />
        <Button onClick={() => void send()} disabled={!aiEnabled || pending || input.trim().length === 0}>{String(tAnalytics('insights.chat.send'))}</Button>
      </div>
      <EntryDetailsDrawer open={detailsOpen} onOpenChange={setDetailsOpen} source={selectedSource} />
    </div>
  );
}
