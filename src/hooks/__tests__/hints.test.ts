import { describe, it, expect } from 'vitest';
import { loadHints, useHint, resetHints } from '@/lib/game/hints';

describe('hint economy', () => {
  it('resets daily and decrements on use', () => {
    const base = resetHints(3);
    expect(base.remaining).toBe(3);
    const after1 = useHint();
    expect(after1.remaining).toBe(2);
    const after2 = useHint();
    expect(after2.remaining).toBe(1);
  });
});
