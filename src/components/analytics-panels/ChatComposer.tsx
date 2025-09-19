import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export interface ChatComposerProps {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  placeholder: string;
  pending?: boolean;
  disabled?: boolean;
  className?: string;
  suggestions?: string[];
}

/**
 * Minimal, reusable chat composer with optional suggestion chips.
 * This is a scaffold for the v2 UI; behaviors (sticky, toolbelt) can expand later.
 */
export function ChatComposer({
  value,
  onChange,
  onSubmit,
  placeholder,
  pending = false,
  disabled = false,
  className,
  suggestions = ['Hvorfor?', 'Hva hvis...', 'Hvilke tiltak anbefales?'],
}: ChatComposerProps): React.ReactElement {
  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className={className}>
      {suggestions.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChange(s)}
              className="rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent/40"
              aria-label={`Forslag: ${s}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[44px]"
          disabled={disabled || pending}
          aria-label={placeholder}
        />
        <Button onClick={onSubmit} disabled={disabled || pending || value.trim().length === 0}>Send</Button>
      </div>
    </div>
  );
}


