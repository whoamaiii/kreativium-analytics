import React, { useMemo, useRef, useState } from 'react';
import { listPlayableEmotions } from '@/lib/emotions/catalog';
import type { EmotionDefinition } from '@/lib/emotions/types';
import { EmotionCard } from '@/components/emotion/EmotionCard';
import { useTranslation } from '@/hooks/useTranslation';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { incNameIt } from '@/lib/progress/progress-store';

export default function NameIt() {
  const { tCommon, tTracking, currentLanguage } = useTranslation();
  const { supported, speak, cancel } = useSpeechSynthesis({ preferredLang: currentLanguage });
  const emotions = useMemo(() => listPlayableEmotions(), []);

  const [round, setRound] = useState(1);
  const [target, setTarget] = useState<EmotionDefinition>(
    () => emotions[Math.floor(Math.random() * emotions.length)],
  );
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'hint'>('idle');

  const targetLabel = target.labelKey.startsWith('tracking:')
    ? tTracking(target.labelKey.replace('tracking:', ''))
    : tCommon(target.labelKey.replace('common:', ''));

  function nextRound() {
    setRound((r) => r + 1);
    const nextTarget = emotions[Math.floor(Math.random() * emotions.length)];
    setTarget(nextTarget);
    setFeedback('idle');
  }

  function onPlayPrompt() {
    if (!supported) return;
    cancel();
    speak(targetLabel);
  }

  function onChoose(choice: EmotionDefinition) {
    const isCorrect = choice.id === target.id;
    if (isCorrect) {
      setFeedback('correct');
      try {
        incNameIt();
      } catch {
        // @silent-ok: progress tracking failure is non-critical
      }
      setTimeout(() => nextRound(), 700);
    } else {
      setFeedback('hint');
      setTimeout(() => setFeedback('idle'), 500);
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold">
            {String(tCommon('navigation.emotionGame', { defaultValue: 'Navngi' }))}
          </h1>
          <div className="text-sm text-muted-foreground">
            {String(tCommon('game.round', { defaultValue: 'Runde' }))}: {round}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="text-sm text-muted-foreground">
            {String(tCommon('nameIt.prompt', { defaultValue: 'Hva heter denne følelsen?' }))}
          </div>
          <div className="flex items-center gap-3">
            <button className="px-3 py-2 rounded-lg border" onClick={onPlayPrompt}>
              {String(tCommon('tegn.playWord', { defaultValue: 'Hør ordet' }))}
            </button>
            <div className="text-lg font-medium">{targetLabel}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {emotions.slice(0, 6).map((opt) => (
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
            {String(tCommon('chooseRight.hint', { defaultValue: 'Prøv igjen' }))}
          </div>
        )}
      </div>
    </div>
  );
}
