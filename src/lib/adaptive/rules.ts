import type { TaskDifficulty } from '@/lib/emotions/types';

export function resolveParams(rtMs: number, stability: number, intensity: number): TaskDifficulty {
  const timeWindowMs = rtMs < 1000 ? 1500 : rtMs < 2500 ? 2500 : 3500;
  const holdDurationMs = stability > 0.7 ? 1800 : stability > 0.5 ? 1200 : 800;
  const hint: TaskDifficulty['hint'] = intensity < 0.3 ? 'gentle' : 'none';
  return { timeWindowMs, holdDurationMs, hint };
}






