import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameLoop } from '@/hooks/useGameLoop';

const world = {
  id: 'test-world',
  nameKey: 'game.worlds.calmForest',
  rounds: [{ target: 'happy', holdMs: 900, threshold: 0.6 }],
};

describe('useGameLoop integration scoring', () => {
  it('applies combo and perfect window bonuses', () => {
    const { result } = renderHook(() => useGameLoop({ world: world as any }));
    act(() => {
      result.current.start();
    });
    // First success: fast -> 3 stars, combo 3, perfect true
    act(() => {
      result.current.score(1000, false, { combo: 3, perfect: true });
    });
    expect(result.current.metrics.xp).toBeGreaterThanOrEqual(25);
    // Second success: 2 stars, combo 1, not perfect; streak bonus applies
    act(() => {
      result.current.score(2000, false, { combo: 1, perfect: false });
    });
    expect(result.current.metrics.xp).toBeGreaterThanOrEqual(40);
  });
});
