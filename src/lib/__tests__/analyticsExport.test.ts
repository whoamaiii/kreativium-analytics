import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyticsExport } from '@/lib/analyticsExport';

const baseData = {
  student: { id: 's1', name: 'Test', grade: '1' } as any,
  dateRange: { start: new Date('2024-01-01'), end: new Date('2024-01-10') },
  data: { entries: [], emotions: [], sensoryInputs: [] },
  analytics: { patterns: [], correlations: [], insights: [] },
};

describe('analyticsExport', () => {
  beforeEach(() => {
    // Mock pdf save path by spying on dynamic import users if needed
    // For json/csv we only verify that no error is thrown
  });

  it('exports JSON without throwing', () => {
    expect(() => analyticsExport.exportToJSON(baseData as any)).not.toThrow();
  });

  it('exports CSV without throwing', () => {
    expect(() => analyticsExport.exportToCSV(baseData as any)).not.toThrow();
  });

  it('dispatches by format via exportTo', async () => {
    const spyPdf = vi.spyOn(analyticsExport, 'exportToPDF').mockResolvedValue();
    await analyticsExport.exportTo('pdf' as any, baseData as any);
    expect(spyPdf).toHaveBeenCalled();
    spyPdf.mockRestore();
  });
});



