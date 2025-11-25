import React, { useMemo, useRef, useState } from 'react';
import { listPlayableEmotions } from '@/lib/emotions/catalog';
import type { EmotionDefinition } from '@/lib/emotions/types';
import { EmotionCard } from '@/components/emotion/EmotionCard';
import { useTranslation } from '@/hooks/useTranslation';
import { playSuccessChime } from '@/lib/sound';
import { incCorrectChoice } from '@/lib/progress/progress-store';
import { useStorageState } from '@/lib/storage/useStorageState';
import { STORAGE_KEYS } from '@/lib/storage/keys';

function pickOptions(all: EmotionDefinition[], count: number): EmotionDefinition[] {
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.max(2, Math.min(3, count)));
}

export default function ChooseRight() {
  const { tCommon, tTracking, currentLanguage } = useTranslation();
  const [soundVolume] = useStorageState(STORAGE_KEYS.SOUND_VOLUME, 0.16, {
    deserialize: (value) => {
      const parsed = Number(value);
      return isNaN(parsed) ? 0.16 : parsed;
    },
  });
  const [hintsEnabled] = useStorageState(STORAGE_KEYS.HINTS_ENABLED, true, {
    deserialize: (value) => value !== '0',
  });
  const [quietRewards] = useStorageState(STORAGE_KEYS.QUIET_REWARDS, false, {
    deserialize: (value) => value === '1',
  });

  const emotions = useMemo(() => listPlayableEmotions(), []);
  const [round, setRound] = useState(1);
  const [options, setOptions] = useState<EmotionDefinition[]>(() => pickOptions(emotions, 3));
  const [target, setTarget] = useState<EmotionDefinition>(
    () => options[Math.floor(Math.random() * options.length)],
  );
  const [disabled, setDisabled] = useState(false);
  const startRef = useRef<number>(performance.now());
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'hint'>('idle');

  const instruction = tCommon('game.target', { defaultValue: 'Mål' });
  const choosePrompt = tCommon('chooseRight.prompt', { defaultValue: 'Trykk på riktig følelse' });
  const targetLabel = target.labelKey.startsWith('tracking:')
    ? tTracking(target.labelKey.replace('tracking:', ''))
    : tCommon(target.labelKey.replace('common:', ''));

  function nextRound() {
    setRound((r) => r + 1);
    const nextOptions = pickOptions(emotions, 3);
    setOptions(nextOptions);
    setTarget(nextOptions[Math.floor(Math.random() * nextOptions.length)]);
    setDisabled(false);
    setFeedback('idle');
    startRef.current = performance.now();
  }

  function onChoose(choice: EmotionDefinition) {
    if (disabled) return;
    const rt = performance.now() - startRef.current;
    const isCorrect = choice.id === target.id;
    if (isCorrect) {
      setDisabled(true);
      setFeedback('correct');
      try {
        incCorrectChoice();
      } catch {
        // @silent-ok: progress tracking failure is non-critical
      }
      // Respect quiet rewards
      playSuccessChime(quietRewards ? 0 : soundVolume);
      setTimeout(() => nextRound(), 700);
    } else if (hintsEnabled) {
      setFeedback('hint');
      setTimeout(() => setFeedback('idle'), 500);
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold">
            {String(tCommon('navigation.emotionLab', { defaultValue: 'Velg riktig' }))}
          </h1>
          <div className="text-sm text-muted-foreground">
            {String(tCommon('game.round', { defaultValue: 'Runde' }))}: {round}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="text-sm text-muted-foreground">{instruction}</div>
          <div className="text-lg font-medium">
            {String(tCommon('chooseRight.instruction', { defaultValue: 'Trykk på' }))} {targetLabel}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {options.map((opt) => (
            <EmotionCard
              key={opt.id}
              emotion={opt}
              selected={feedback === 'hint' && opt.id === target.id}
              onClick={() => onChoose(opt)}
            />
          ))}
        </div>

        {feedback === 'correct' && (
          <div className="text-green-600 font-medium">
            {String(tCommon('chooseRight.correct', { defaultValue: 'Riktig!' }))}
          </div>
        )}
        {feedback === 'hint' && (
          <div className="text-amber-600">
            {String(tCommon('chooseRight.hint', { defaultValue: 'Se etter riktig ansikt' }))}
          </div>
        )}
      </div>
    </div>
  );
}
