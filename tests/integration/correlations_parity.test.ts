import { describe, it, expect } from 'vitest';
import { patternAnalysis } from '@/lib/patternAnalysis';
import { analyticsWorkerFallback } from '@/lib/analyticsWorkerFallback';

// Simple synthetic dataset to compare fallback vs local analysis path
function makeEntries(n: number) {
  const entries: any[] = [];
  for (let i = 0; i < n; i++) {
    entries.push({
      id: `t${i}`,
      studentId: 's1',
      timestamp: new Date(Date.now() - (n - i) * 3600_000),
      emotions: [],
      sensoryInputs: [],
      environmentalData: {
        location: i % 2 === 0 ? 'classroom' : 'playground',
        classroom: { activity: i % 3 === 0 ? 'instruction' : 'group-work', timeOfDay: 'morning' }
      }
    });
  }
  return entries;
}

describe('Environmental correlations parity: worker fallback vs direct', () => {
  it('produces consistent top correlations on the same dataset', async () => {
    const entries = makeEntries(30);
    const emotions: any[] = [];
    const sensory: any[] = [];

    // Direct analysis via patternAnalysis
    const direct = patternAnalysis.analyzeEnvironmentalCorrelations(entries as any);

    // Fallback (routes internally, but we can simulate via processAnalytics)
    const results = await analyticsWorkerFallback.processAnalytics({ entries, emotions, sensoryInputs: sensory } as any);
    const viaFallback = results.environmentalCorrelations || results.correlations || [];

    const topDirect = JSON.stringify(direct.slice(0, 3).map(c => ({ f1: c.factor1, f2: c.factor2 })));
    const topFallback = JSON.stringify((viaFallback || []).slice(0, 3).map((c: any) => ({ f1: c.factor1, f2: c.factor2 })));

    expect(topFallback).toBe(topDirect);
  });
});



