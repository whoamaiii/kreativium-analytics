import React from 'react';
import { Button } from '@/components/ui/button';
import { Copy, FileText } from 'lucide-react';

export interface ExplanationContentProps {
  title: string;
  status: 'idle' | 'loading' | 'ok' | 'error';
  text?: string;
  error?: string;
  onCopy?: (text: string) => void;
  onAddToReport?: (text: string) => void;
  placeholder?: React.ReactNode;
}

export function ExplanationContent({
  title,
  status,
  text,
  error,
  onCopy,
  onAddToReport,
  placeholder,
}: ExplanationContentProps): React.ReactElement {
  const hasText = Boolean(text && text.trim().length > 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold">{title}</h4>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasText}
            onClick={() => hasText && onCopy?.(text as string)}
            aria-label="Kopier tekst"
            title="Kopier tekst"
          >
            <Copy className="h-4 w-4 mr-2" />
            Kopier
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!hasText}
            onClick={() => hasText && onAddToReport?.(text as string)}
            aria-label="Legg til i rapport"
            title="Legg til i rapport"
          >
            <FileText className="h-4 w-4 mr-2" />
            Rapport
          </Button>
        </div>
      </div>

      <div className="mt-3 flex-1 rounded-lg border bg-card p-3 overflow-auto whitespace-pre-wrap break-words text-sm leading-relaxed">
        {status === 'loading' && <p className="text-muted-foreground">Henter forklaring…</p>}
        {status === 'error' && (
          <p className="text-destructive">{error || 'Klarte ikke hente forklaring. Prøv igjen.'}</p>
        )}
        {status === 'idle' && !hasText && (
          <div className="text-muted-foreground">
            {placeholder || 'Velg et mønster for å se forklaring.'}
          </div>
        )}
        {status === 'ok' && hasText && (
          <div className="prose prose-sm max-w-none dark:prose-invert">{text}</div>
        )}
      </div>
    </div>
  );
}
