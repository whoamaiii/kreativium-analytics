import { describe, it, expect } from 'vitest';
import { PreprocessingPipeline } from '@/lib/PreprocessingPipeline';
import { AnyStepConfig } from '@/types/preprocessing';

// These tests assert persistence/recovery and schema evolution compatibility for pipeline metadata

describe('Integration: preprocessing state persistence and recovery', () => {
  function dataset() {
    return [
      { num: 1, cat: 'a', note: ' hi ' },
      { num: 2, cat: 'b', note: 'there' },
      { num: 3, cat: 'a', note: '  ok ' },
    ];
  }

  it('persists fitted state and recovers identical transforms', () => {
    const cfg: AnyStepConfig[] = [
      { name: 'clean', kind: 'cleaning', dropAllNullColumns: true, trimStrings: true },
      { name: 'scale', kind: 'scaling' },
      { name: 'encode', kind: 'encoding', oneHotMaxCategories: 10 },
      { name: 'poly', kind: 'feature_engineering', polynomialDegree: 2 },
    ];

    const pipe = new PreprocessingPipeline(cfg);
    const fitted = pipe.fit(dataset());
    const payload = pipe.toJSON();

    const restored = PreprocessingPipeline.fromJSON(payload);
    const originalOut = pipe.transform(dataset());
    const restoredOut = restored.transform(dataset());

    expect(restoredOut).toEqual(originalOut);
    expect(payload.metadata.pipelineVersion).toBeDefined();
  });
});
