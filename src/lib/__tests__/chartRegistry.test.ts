import { describe, it, expect } from 'vitest';
import { chartRegistry, type ChartRegistration } from '@/lib/chartRegistry';

function createReg(id: string, overrides: Partial<ChartRegistration> = {}): ChartRegistration {
  return {
    id,
    type: 'custom',
    title: `Chart ${id}`,
    getMethods: () => ({ getImage: () => undefined, getSVG: () => undefined }),
    ...overrides,
  } as ChartRegistration;
}

describe('chartRegistry', () => {
  it('registers and retrieves charts', () => {
    const reg = createReg('c1', { studentId: 's1' });
    chartRegistry.register(reg);
    expect(chartRegistry.get('c1')).toBeDefined();
    const all = chartRegistry.all();
    expect(all.find(c => c.id === 'c1')).toBeTruthy();
  });

  it('filters by student', () => {
    const reg2 = createReg('c2', { studentId: 's2' });
    chartRegistry.register(reg2);
    const list = chartRegistry.byStudent('s2');
    expect(list.map(c => c.id)).toContain('c2');
  });

  it('updates metadata', () => {
    const reg3 = createReg('c3', { title: 'Old', type: 'trends' });
    chartRegistry.register(reg3);
    chartRegistry.updateMetadata('c3', { title: 'New', type: 'distribution', filters: { emotion: 'happy' } });
    const updated = chartRegistry.get('c3')!;
    expect(updated.title).toBe('New');
    expect(updated.type).toBe('distribution');
    expect(updated.filters).toEqual({ emotion: 'happy' });
  });

  it('unregisters', () => {
    const reg4 = createReg('c4');
    chartRegistry.register(reg4);
    chartRegistry.unregister('c4');
    expect(chartRegistry.get('c4')).toBeUndefined();
  });
});

