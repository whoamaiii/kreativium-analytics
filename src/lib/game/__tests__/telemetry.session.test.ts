import { describe, it, expect, beforeEach } from 'vitest';
import { clearGameTelemetry, recordGameEvent, computeSessionSummary } from '@/lib/game/telemetry';

describe('computeSessionSummary', () => {
  beforeEach(() => {
    clearGameTelemetry();
  });

  it('computes accuracy, time, hint rate, and calibration error', () => {
    const start = Date.now();
    recordGameEvent({
      ts: start + 1,
      kind: 'mode_start',
      roundIndex: 0,
      target: 'neutral',
      mode: 'classic',
    });
    // Round 0
    recordGameEvent({ ts: start + 10, kind: 'round_start', roundIndex: 0, target: 'happy' });
    recordGameEvent({ ts: start + 50, kind: 'hint_used', roundIndex: 0, target: 'happy' });
    recordGameEvent({
      ts: start + 200,
      kind: 'round_success',
      roundIndex: 0,
      target: 'happy',
      timeMs: 200,
      stars: 1,
      streak: 1,
    });
    recordGameEvent({
      ts: start + 300,
      kind: 'confidence_reported',
      roundIndex: 0,
      target: 'happy',
      confidence: 0.8,
      actualProb: 0.6,
      calibrationError: 0.2,
    });
    // Round 1
    recordGameEvent({ ts: start + 400, kind: 'round_start', roundIndex: 1, target: 'sad' });
    recordGameEvent({
      ts: start + 800,
      kind: 'round_fail',
      roundIndex: 1,
      target: 'sad',
      reason: 'timeout',
    });

    const sum = computeSessionSummary(start);
    expect(sum.startTs).toBeTypeOf('number');
    expect(sum.endTs).toBeTypeOf('number');
    expect(Object.keys(sum.perEmotion)).toContain('happy');
    expect(Object.keys(sum.perEmotion)).toContain('sad');
    expect(sum.perEmotion['happy'].attempts).toBe(1);
    expect(sum.perEmotion['happy'].successes).toBe(1);
    expect(sum.perEmotion['happy'].accuracy).toBe(1);
    expect(sum.perEmotion['sad'].attempts).toBe(1);
    expect(sum.perEmotion['sad'].successes).toBe(0);
    expect(sum.perEmotion['sad'].accuracy).toBe(0);
    expect(sum.timeToSuccessAvgMs).toBe(200);
    expect(sum.hintRate).toBeCloseTo(0.5, 5);
    expect(sum.calibrationErrorAvg).toBeCloseTo(0.2, 5);
  });
});
