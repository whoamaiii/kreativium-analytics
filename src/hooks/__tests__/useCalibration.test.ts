import { describe, it, expect } from 'vitest';
import { loadCalibration, saveCalibration } from '@/hooks/useCalibration';

describe('calibration persistence', () => {
  it('saves and loads calibration', () => {
    const data = { threshold: 0.7, holdMs: 900, smoothingWindow: 10, completed: true };
    saveCalibration(data);
    const loaded = loadCalibration();
    expect(loaded).toBeTruthy();
    expect(loaded?.threshold).toBeCloseTo(0.7, 3);
    expect(loaded?.holdMs).toBe(900);
    expect(loaded?.smoothingWindow).toBe(10);
  });
});
