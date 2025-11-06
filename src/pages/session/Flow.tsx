import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LevelCompleteModal } from '@/components/game/LevelCompleteModal';

export default function SessionFlow() {
  const { tCommon } = useTranslation();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [showChoices, setShowChoices] = useState(false);
  const [, setIsResting] = useState(false);
  const restTimerRef = useRef<number | null>(null);
  const [showComplete, setShowComplete] = useState(false);

  const sequence = useMemo(() => [
    { label: tCommon('sessionFlow.steps.chooseRight'), path: '/modules/choose-right' },
    { label: tCommon('sessionFlow.steps.nameIt'), path: '/modules/name-it' },
    { label: tCommon('sessionFlow.steps.calmPause'), path: '/modules/calm-pause' },
    { label: tCommon('sessionFlow.steps.missions'), path: '/modules/missions' },
  ], [tCommon]);

  const total = sequence.length;

  useEffect(() => {
    return () => {
      if (restTimerRef.current) {
        window.clearTimeout(restTimerRef.current);
        restTimerRef.current = null;
      }
    };
  }, []);

  const startRound = useCallback(() => {
    const step = sequence[index];
    if (!step) return;
    setShowChoices(false);
    setIsResting(false);
    navigate(step.path);
    // After navigation, a small rest timer will bring back here
    const restTimer = window.setTimeout(() => {
      setIsResting(true);
      setShowChoices(true);
    }, 90_000); // ~1.5 min built-in rest
    restTimerRef.current = restTimer;
  }, [index, sequence, navigate]);

  const handleNext = useCallback(() => {
    if (index + 1 >= total) {
      setShowComplete(true);
      return;
    }
    setIndex(i => i + 1);
    setShowChoices(false);
    setIsResting(false);
    const timer = window.setTimeout(() => startRound(), 300);
    restTimerRef.current = timer;
  }, [index, total, startRound]);

  const handleReplay = useCallback(() => {
    setShowChoices(false);
    setIsResting(false);
    const timer = window.setTimeout(() => startRound(), 300);
    restTimerRef.current = timer;
  }, [startRound]);

  const handleFreePlay = useCallback(() => {
    navigate('/emotion-game');
  }, [navigate]);

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-sm text-muted-foreground">{String(tCommon('sessionFlow.warning', { defaultValue: 'Orchestrated session: 4–6 runder med innebygd pause' }))}</div>
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">{String(tCommon('sessionFlow.roundLabel'))}</div>
              <div className="text-xl font-semibold">{index + 1} / {total}</div>
            </div>
            <div className="flex gap-2">
              <Button onClick={startRound}>{String(tCommon('sessionFlow.start'))}</Button>
              <Button variant="outline" onClick={() => setShowChoices(true)}>{String(tCommon('sessionFlow.choices'))}</Button>
            </div>
          </div>
        </Card>

        {showChoices && (
          <div className="grid gap-3">
            <div className="rounded-xl border bg-card p-4">
              <div className="text-sm font-medium mb-2">{String(tCommon('sessionFlow.nextStep'))}</div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleNext}>{String(tCommon('sessionFlow.next'))}</Button>
                <Button variant="outline" onClick={handleReplay}>{String(tCommon('sessionFlow.replay'))}</Button>
                <Button variant="outline" onClick={handleFreePlay}>{String(tCommon('sessionFlow.freePlay'))}</Button>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="text-sm font-medium mb-2">{String(tCommon('sessionFlow.pickActivity'))}</div>
              <div className="grid gap-2">
                {sequence.map((s, i) => (
                  <Button key={s.path} variant={i === index ? 'default' : 'outline'} onClick={() => { setIndex(i); const timer = window.setTimeout(() => startRound(), 200);
                    restTimerRef.current = timer; }}>
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        <LevelCompleteModal
          visible={showComplete}
          onClose={() => setShowComplete(false)}
          onNext={() => { setShowComplete(false); setIndex(0); startRound(); }}
          onReplay={() => { setShowComplete(false); setIndex(total - 1); startRound(); }}
          onFreePlay={() => { setShowComplete(false); handleFreePlay(); }}
          onPayout={() => { /* no-op here */ }}
        />
      </div>
    </div>
  );
}


