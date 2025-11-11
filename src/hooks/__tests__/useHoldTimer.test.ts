import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useHoldTimer } from '@/hooks/useHoldTimer';

describe('useHoldTimer', () => {
  it('requires continuous pass to satisfy', () => {
    const { result } = renderHook(() => useHoldTimer({ threshold: 0.6, holdMs: 200 }));
    act(() => {
      result.current.update(0.7, 0);
    });
    act(() => {
      result.current.update(0.7, 100);
    });
    expect(result.current.state.satisfied).toBe(false);
    act(() => {
      result.current.update(0.7, 220);
    });
    expect(result.current.state.satisfied).toBe(true);
    act(() => {
      result.current.update(0.3, 240);
    });
    expect(result.current.state.isHolding).toBe(false);
  });
});
