import { useTegnXP } from '@/contexts/TegnXPContext';

export const TegnXPBar = () => {
  const { xp, level } = useTegnXP();
  const progressThisLevel = xp % 100;
  return (
    <div
      className="w-full bg-muted/50 border border-border rounded-full h-3"
      aria-label="XP progress"
    >
      <div
        className="bg-primary h-3 rounded-full transition-all"
        style={{ width: `${progressThisLevel}%` }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressThisLevel}
        aria-label={`Level ${level} progress`}
      />
      <div className="mt-1 text-xs text-muted-foreground">
        Level {level} · {progressThisLevel}/100 XP
      </div>
    </div>
  );
};
