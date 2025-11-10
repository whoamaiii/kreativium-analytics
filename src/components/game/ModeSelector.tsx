import React from 'react';
import type { GameMode } from '@/lib/game/modes';
import { MODES, getModeLabel } from '@/lib/game/modes';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

interface ModeSelectorProps {
  value: GameMode;
  onChange: (mode: GameMode) => void;
}

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  const { tCommon } = useTranslation();
  return (
    <div
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-card p-1"
      role="tablist"
      aria-label={String(tCommon('game.modes.label', { defaultValue: 'Modes' }))}
    >
      {MODES.map((m) => (
        <Button
          key={m.id}
          variant={value === m.id ? 'default' : 'outline'}
          size="sm"
          aria-pressed={value === m.id}
          role="tab"
          aria-selected={value === m.id}
          onClick={() => onChange(m.id)}
        >
          {String(tCommon(getModeLabel(m.id)))}
        </Button>
      ))}
    </div>
  );
}

export default ModeSelector;
