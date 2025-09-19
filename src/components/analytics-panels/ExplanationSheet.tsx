import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ExplanationContent } from './ExplanationContent';
import { ExplanationChat } from './ExplanationChat';
import { computeAllowedContexts } from '@/lib/evidence/evidenceBuilder';
import type { SourceItem } from '@/types/analytics';
import { analyticsConfig } from '@/lib/analyticsConfig';
import { ExplanationTabs } from './ExplanationTabs';

export interface ExplanationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  sourcesRich?: SourceItem[];
  dataset?: { entries: any[]; emotions: any[]; sensoryInputs: any[] };
}

export function ExplanationSheet({
  open,
  onOpenChange,
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
  sourcesRich,
  dataset
}: ExplanationSheetProps): React.ReactElement {
  const enableV2 = React.useMemo(() => {
    try { return !!analyticsConfig.getConfig().features?.explanationV2; } catch { return false; }
  }, []);
  const detailsRef = React.useRef<HTMLDetailsElement | null>(null);
  React.useEffect(() => {
    function handleCollapseAll() {
      try { if (detailsRef.current) detailsRef.current.open = false; } catch {}
    }
    function handleExpandAll() {
      try { if (detailsRef.current) detailsRef.current.open = true; } catch {}
    }
    window.addEventListener('explanationV2:collapseAll', handleCollapseAll as EventListener);
    window.addEventListener('explanationV2:expandAll', handleExpandAll as EventListener);
    return () => {
      window.removeEventListener('explanationV2:collapseAll', handleCollapseAll as EventListener);
      window.removeEventListener('explanationV2:expandAll', handleExpandAll as EventListener);
    };
  }, []);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[75vh] md:h-[80vh]">
        <SheetHeader>
          <SheetTitle>Forklaring</SheetTitle>
        </SheetHeader>
        <div className="mt-2 h-[calc(75vh-5rem)] md:h-[calc(80vh-5rem)] overflow-hidden">
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
              sourcesRich={sourcesRich}
              dataset={dataset}
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
              <div className="border-t pt-2">
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
                />
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}


