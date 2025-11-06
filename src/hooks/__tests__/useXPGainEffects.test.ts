import { renderHook, act } from '@testing-library/react';
import { useXPGainEffects } from '@/hooks/useXPGainEffects';

describe('useXPGainEffects', () => {
  it('reports positive delta when xp increases', () => {
    const { result, rerender } = renderHook(({ xp, level }) => useXPGainEffects(xp, level), { initialProps: { xp: 0, level: 1 } });
    expect(result.current.delta).toBe(0);
    rerender({ xp: 15, level: 1 });
    expect(result.current.delta).toBeGreaterThan(0);
  });

  it('flags level-up when level increases', () => {
    const { result, rerender } = renderHook(({ xp, level }) => useXPGainEffects(xp, level), { initialProps: { xp: 50, level: 1 } });
    rerender({ xp: 5, level: 2 });
    expect(result.current.leveledUp).toBe(true);
  });
});





