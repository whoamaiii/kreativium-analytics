import { STORAGE_KEYS } from '@/lib/storage/keys';

export interface HintsState {
  date: string; // YYYY-MM-DD
  remaining: number;
}

function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function loadHints(defaultPerDay: number = 5): HintsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EMOTION_HINTS_DAILY);
    const t = today();
    if (!raw) return { date: t, remaining: defaultPerDay };
    const parsed: HintsState = JSON.parse(raw);
    if (parsed.date !== t) return { date: t, remaining: defaultPerDay };
    return parsed;
  } catch {
    return { date: today(), remaining: defaultPerDay };
  }
}

export function useHint(): HintsState {
  const current = loadHints();
  const next = { date: current.date, remaining: Math.max(0, current.remaining - 1) };
  try {
    localStorage.setItem(STORAGE_KEYS.EMOTION_HINTS_DAILY, JSON.stringify(next));
  } catch {}
  return next;
}

export function resetHints(defaultPerDay: number = 5): HintsState {
  const next = { date: today(), remaining: defaultPerDay };
  try {
    localStorage.setItem(STORAGE_KEYS.EMOTION_HINTS_DAILY, JSON.stringify(next));
  } catch {}
  return next;
}
