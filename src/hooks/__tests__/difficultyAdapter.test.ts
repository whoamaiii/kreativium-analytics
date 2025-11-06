import { describe, it, expect } from 'vitest';
import { adaptDifficulty, refineDifficultyForEmotion } from '@/lib/game/difficultyAdapter';

describe('adaptDifficulty', () => {
  it('eases difficulty on fail and increases on streaks', () => {
    let s = { threshold: 0.6, holdMs: 900, streak: 0 };
    s = adaptDifficulty(s, { kind: 'fail' });
    expect(s.threshold).toBeLessThan(0.6);
    expect(s.holdMs).toBeLessThan(900);
    s = adaptDifficulty(s, { kind: 'success' });
    s = adaptDifficulty(s, { kind: 'success' });
    s = adaptDifficulty(s, { kind: 'success' });
    expect(s.streak).toBe(3);
    expect(s.threshold).toBeGreaterThan(0.55);
  });

  it('refines per-emotion parameters subtly', () => {
    const base = { threshold: 0.6, holdMs: 900, streak: 0 };
    const happy = refineDifficultyForEmotion(base, 'happy');
    expect(happy.threshold).toBeLessThanOrEqual(0.6);
    const angry = refineDifficultyForEmotion(base, 'angry');
    expect(angry.threshold).toBeGreaterThanOrEqual(0.6);
  });
});


