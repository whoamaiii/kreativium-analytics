import React from 'react';

export function MatchMeter({ value }: { value: number }) {
  const v = Math.max(0, Math.min(1, value));
  const color = v >= 0.85 ? 'bg-emerald-500' : v >= 0.6 ? 'bg-amber-400' : 'bg-slate-400';
  return (
    <div className="w-full max-w-xs" aria-label="Match meter">
      <div
        className="h-2 w-full rounded bg-white/15 overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(v * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full transition-all duration-200 ${color}`}
          style={{ width: `${Math.round(v * 100)}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-foreground/70">Match: {Math.round(v * 100)}%</div>
    </div>
  );
}

export default MatchMeter;
