import { STORAGE_KEYS } from '@/lib/storage/keys';

export type GameEventKind =
  | 'round_start'
  | 'round_success'
  | 'round_fail'
  | 'hint_used'
  | 'prob_sample'
  | 'mode_start'
  | 'mode_end'
  | 'confidence_reported';

export interface GameEventBase {
  ts: number;
  roundIndex: number;
  target: string;
  kind: GameEventKind;
  detector?: string;
}

export interface RoundStartEvent extends GameEventBase {
  kind: 'round_start';
}
export interface RoundSuccessEvent extends GameEventBase {
  kind: 'round_success';
  timeMs: number;
  stars: number;
  streak: number;
  fpsBuckets?: Record<string, number>;
  stabilityMs?: number;
  intensity?: number;
}
export interface RoundFailEvent extends GameEventBase {
  kind: 'round_fail';
  reason: 'timeout' | 'skip';
  fpsBuckets?: Record<string, number>;
}
export interface HintUsedEvent extends GameEventBase {
  kind: 'hint_used';
}
export interface ProbSampleEvent extends GameEventBase {
  kind: 'prob_sample';
  prob: number;
  fps?: number;
}
export interface ModeStartEvent extends GameEventBase {
  kind: 'mode_start';
  mode: string;
}
export interface ModeEndEvent extends GameEventBase {
  kind: 'mode_end';
  mode: string;
  durationMs?: number;
}
export interface ConfidenceReportedEvent extends GameEventBase {
  kind: 'confidence_reported';
  confidence: number;
  actualProb: number;
  calibrationError: number;
}

export type GameEvent =
  | RoundStartEvent
  | RoundSuccessEvent
  | RoundFailEvent
  | HintUsedEvent
  | ProbSampleEvent
  | ModeStartEvent
  | ModeEndEvent
  | ConfidenceReportedEvent;

export function recordGameEvent(event: GameEvent): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EMOTION_TELEMETRY);
    const arr: GameEvent[] = raw ? JSON.parse(raw) : [];
    arr.push(event);
    // Cap to last 1000 events to avoid unbounded growth
    const trimmed = arr.slice(Math.max(0, arr.length - 1000));
    localStorage.setItem(STORAGE_KEYS.EMOTION_TELEMETRY, JSON.stringify(trimmed));
  } catch {
    // @silent-ok: telemetry storage failure is non-fatal
  }
  // Stream to analytics worker if available (fire-and-forget)
  try {
    // Reduce noise: do not stream high-frequency probability samples
    if (event.kind !== 'prob_sample') {
      const worker = (window as any)?.__analyticsWorker as Worker | undefined;
      if (worker) {
        (worker as any).postMessage({ type: 'game:event', payload: event });
      }
    }
  } catch {
    // @silent-ok: worker streaming is fire-and-forget
  }
}

export function readGameTelemetry(): GameEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EMOTION_TELEMETRY);
    return raw ? (JSON.parse(raw) as GameEvent[]) : [];
  } catch {
    // @silent-ok: telemetry read failure returns empty array
    return [];
  }
}

export function clearGameTelemetry(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.EMOTION_TELEMETRY);
  } catch {
    // @silent-ok: telemetry clear failure is non-fatal
  }
}

export function computeEmotionTrends(): Record<
  string,
  { reactionTimes: number[]; stabilityMs: number[] }
> {
  const events = readGameTelemetry();
  const out: Record<string, { reactionTimes: number[]; stabilityMs: number[] }> = {};
  for (const ev of events) {
    if (ev.kind === 'round_success') {
      const key = ev.target;
      if (!out[key]) out[key] = { reactionTimes: [], stabilityMs: [] };
      out[key].reactionTimes.push((ev as any).timeMs as number);
      const stab = (ev as any).stabilityMs as number | undefined;
      if (typeof stab === 'number' && Number.isFinite(stab)) out[key].stabilityMs.push(stab);
    }
  }
  return out;
}

export function computeSessionSummary(
  startTs?: number,
  endTs?: number,
): {
  startTs: number | null;
  endTs: number | null;
  perEmotion: Record<string, { attempts: number; successes: number; accuracy: number | null }>;
  timeToSuccessAvgMs: number | null;
  hintRate: number | null; // fraction of rounds with any hint use
  calibrationErrorAvg: number | null;
} {
  const events = readGameTelemetry();
  const start =
    typeof startTs === 'number'
      ? startTs
      : (() => {
          const lastStart = [...events]
            .reverse()
            .find((e) => (e as any).kind === 'mode_start') as any;
          return lastStart?.ts ?? null;
        })();
  const end = typeof endTs === 'number' ? endTs : Date.now();
  const windowed = events.filter(
    (ev) => (start == null || ev.ts >= start) && (end == null || ev.ts <= end),
  );

  const attemptsByEmotion = new Map<string, number>();
  const successByEmotion = new Map<string, number>();
  const timeToSuccess: number[] = [];
  const roundsSet = new Set<number>();
  const roundsWithHint = new Set<number>();
  const calibErrors: number[] = [];

  for (const ev of windowed) {
    if (ev.kind === 'round_success') {
      const t = ev.target;
      successByEmotion.set(t, (successByEmotion.get(t) ?? 0) + 1);
      attemptsByEmotion.set(t, (attemptsByEmotion.get(t) ?? 0) + 1);
      if (typeof (ev as any).timeMs === 'number') timeToSuccess.push((ev as any).timeMs as number);
      roundsSet.add(ev.roundIndex);
    } else if (ev.kind === 'round_fail') {
      const t = ev.target;
      attemptsByEmotion.set(t, (attemptsByEmotion.get(t) ?? 0) + 1);
      roundsSet.add(ev.roundIndex);
    } else if (ev.kind === 'hint_used') {
      roundsWithHint.add(ev.roundIndex);
    } else if (ev.kind === 'confidence_reported') {
      const ce = (ev as any).calibrationError as number | undefined;
      if (typeof ce === 'number' && Number.isFinite(ce)) calibErrors.push(ce);
    }
  }

  const perEmotion: Record<
    string,
    { attempts: number; successes: number; accuracy: number | null }
  > = {};
  const allEmotions = new Set<string>([...attemptsByEmotion.keys(), ...successByEmotion.keys()]);
  allEmotions.forEach((emotion) => {
    const attempts = attemptsByEmotion.get(emotion) ?? 0;
    const successes = successByEmotion.get(emotion) ?? 0;
    perEmotion[emotion] = {
      attempts,
      successes,
      accuracy: attempts > 0 ? successes / attempts : null,
    };
  });

  const timeToSuccessAvgMs = timeToSuccess.length
    ? Math.round(timeToSuccess.reduce((a, b) => a + b, 0) / timeToSuccess.length)
    : null;
  const hintRate = roundsSet.size ? roundsWithHint.size / roundsSet.size : null;
  const calibrationErrorAvg = calibErrors.length
    ? calibErrors.reduce((a, b) => a + b, 0) / calibErrors.length
    : null;

  return {
    startTs: start ?? null,
    endTs: end ?? null,
    perEmotion,
    timeToSuccessAvgMs,
    hintRate,
    calibrationErrorAvg,
  };
}

export function streamSessionSummary(
  startTs?: number,
  context?: { studentId?: string; mode?: string },
): void {
  try {
    const summary = computeSessionSummary(startTs);
    const worker = (window as any)?.__analyticsWorker as Worker | undefined;
    const payload = { summary, context: context ?? {} };
    if (worker) {
      (worker as any).postMessage({ type: 'game:session_summary', payload });
    }
  } catch {
    // ignore streaming errors
  }
}
