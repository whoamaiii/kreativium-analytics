import React from 'react';
import type { EmotionDefinition } from '@/lib/emotions/types';
import { useTranslation } from '@/hooks/useTranslation';

interface EmotionCardProps {
  emotion: EmotionDefinition;
  selected?: boolean;
  onClick?: () => void;
}

export function EmotionCard({ emotion, selected, onClick }: EmotionCardProps) {
  const { tCommon, tTracking } = useTranslation();
  const label = emotion.labelKey.startsWith('tracking:')
    ? tTracking(emotion.labelKey.replace('tracking:', ''))
    : tCommon(emotion.labelKey.replace('common:', ''));

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`h-24 w-full rounded-xl border text-foreground flex flex-col items-center justify-center gap-2 transition ${
        selected ? 'bg-gradient-primary shadow-glow' : 'bg-card hover:shadow-soft'
      }`}
    >
      {emotion.iconPath && <img src={emotion.iconPath} alt={label} className="h-8 w-8" />}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
