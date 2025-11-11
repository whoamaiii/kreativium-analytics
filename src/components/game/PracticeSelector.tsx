import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';

type ExpressionKey = 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised';

interface PracticeSelectorProps {
  value: ExpressionKey | 'mixed';
  onChange: (value: ExpressionKey | 'mixed') => void;
}

const OPTIONS: Array<{ value: ExpressionKey | 'mixed'; labelKey: string }> = [
  { value: 'mixed', labelKey: 'game.practice.mixed' },
  { value: 'neutral', labelKey: 'emotionLab.expressions.neutral' },
  { value: 'happy', labelKey: 'emotionLab.expressions.happy' },
  { value: 'surprised', labelKey: 'emotionLab.expressions.surprised' },
  { value: 'sad', labelKey: 'emotionLab.expressions.sad' },
  { value: 'angry', labelKey: 'emotionLab.expressions.angry' },
  { value: 'fearful', labelKey: 'emotionLab.expressions.fearful' },
  { value: 'disgusted', labelKey: 'emotionLab.expressions.disgusted' },
];

export function PracticeSelector({ value, onChange }: PracticeSelectorProps) {
  const { tCommon } = useTranslation();
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-xs text-foreground/70">{String(tCommon('game.practice.label'))}</span>
      <Select value={value} onValueChange={(v) => onChange(v as PracticeSelectorProps['value'])}>
        <SelectTrigger
          className="h-8 w-[180px]"
          aria-label={String(tCommon('game.practice.label'))}
        >
          <SelectValue
            placeholder={String(tCommon('game.practice.placeholder'))}
            aria-label={String(tCommon('game.practice.placeholder'))}
          />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {String(tCommon(opt.labelKey))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default PracticeSelector;
