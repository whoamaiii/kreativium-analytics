import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import type { TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';

function makeEmotionEntry(id: string, emotion: string, intensity: number, ts: Date): EmotionEntry {
  return {
    id: `e-${id}`,
    emotion,
    intensity,
    timestamp: ts,
  } as EmotionEntry;
}

function makeSensoryEntry(id: string, type: string, response: string, ts: Date): SensoryEntry {
  return {
    id: `s-${id}`,
    type,
    response,
    timestamp: ts,
  } as SensoryEntry;
}

function makeTrackingEntries(days: number): TrackingEntry[] {
  const entries: TrackingEntry[] = [];
  const start = new Date('2024-01-01T00:00:00Z');
  for (let i = 0; i < days; i++) {
    const ts = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const emotions: EmotionEntry[] = [
      makeEmotionEntry(`${i}-h`, 'happy', (i % 10) / 10, ts),
      makeEmotionEntry(`${i}-s`, 'sad', ((i + 3) % 10) / 10, ts),
    ];
    const sensoryInputs: SensoryEntry[] = [
      makeSensoryEntry(`${i}-v`, 'visual', i % 2 === 0 ? 'seeking' : 'neutral', ts),
      makeSensoryEntry(`${i}-a`, 'auditory', i % 3 === 0 ? 'avoiding' : 'neutral', ts),
    ];
    entries.push({
      id: `t-${i}`,
      studentId: 'stu-1',
      timestamp: ts,
      emotions,
      sensoryInputs,
      notes: `day-${i}`,
    } as TrackingEntry);
  }
  return entries;
}

describe.skip('Integration: preprocessing + model training worker', () => {
  const originalPostMessage = (global as any).postMessage;
  const selfObj = global as any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    // Ensure a worker-like global exists before loading the worker module
    (global as any).self = global;
    selfObj.postMessage = vi.fn();
    // Ensure CPU backend to avoid GPU availability flakiness in CI
     
    tf.setBackend('cpu');
    // Dynamically import the worker so it registers on the prepared self
    await import('@/workers/mlTraining.worker');
  });

  afterEach(() => {
    selfObj.postMessage = originalPostMessage;
  });

  // TODO(kb-analytics): Temporarily skipped for CI stability; TFJS-node backend not installed
  it.skip('trains emotion model end-to-end and produces validation metadata', async () => {
    const trackingEntries = makeTrackingEntries(12); // >= 7 required by worker

    const message = {
      type: 'train-emotion',
      data: { trackingEntries },
      config: { epochs: 1, batchSize: 8 },
    } as any;

    // Send message to the worker onmessage handler
    const handler = (selfObj as any).onmessage as (e: MessageEvent) => Promise<void> | void;
    expect(typeof handler).toBe('function');

    await handler(new MessageEvent('message', { data: message }));

    // Wait for async tfjs tasks to flush
    await new Promise((r) => setTimeout(r, 10));

    // Assert that a completion message was posted with validation results
    expect(selfObj.postMessage).toHaveBeenCalled();
    const calls = (selfObj.postMessage as any).mock.calls;
    const complete = calls.find((c: any[]) => c[0]?.type === 'complete' && c[0]?.modelType === 'emotion-prediction');
    expect(complete).toBeTruthy();
    expect(complete[0].metadata).toBeDefined();
    expect(complete[0].metadata.validationResults).toBeDefined();
    expect(complete[0].metadata.validationResults.averageMetrics).toBeDefined();
  }, 30000);

  it('trains sensory model end-to-end and produces validation metadata', async () => {
    const trackingEntries = makeTrackingEntries(15); // >= 10 required by worker

    const message = {
      type: 'train-sensory',
      data: { trackingEntries },
      config: { epochs: 1, batchSize: 8 },
    } as any;

    const handler = (selfObj as any).onmessage as (e: MessageEvent) => Promise<void> | void;
    expect(typeof handler).toBe('function');

    await handler(new MessageEvent('message', { data: message }));
    await new Promise((r) => setTimeout(r, 10));

    expect(selfObj.postMessage).toHaveBeenCalled();
    const calls = (selfObj.postMessage as any).mock.calls;
    const complete = calls.find((c: any[]) => c[0]?.type === 'complete' && c[0]?.modelType === 'sensory-response');
    expect(complete).toBeTruthy();
    expect(complete[0].metadata).toBeDefined();
    expect(complete[0].metadata.validationResults).toBeDefined();
    expect(complete[0].metadata.validationResults.averageMetrics).toBeDefined();
  }, 30000);

  it.skip('ensures fit/transform consistency in pipeline-derived tensors (sanity)', async () => {
    // This sanity test ensures that when the worker rebuilds models after validation,
    // the final training pass still runs on tensors constructed from preprocessing without shape drift.
    const trackingEntries = makeTrackingEntries(8);

    const message = {
      type: 'train-emotion',
      data: { trackingEntries },
      config: { epochs: 1, batchSize: 4 },
    } as any;

    const handler = (selfObj as any).onmessage as (e: MessageEvent) => Promise<void> | void;
    await handler(new MessageEvent('message', { data: message }));
    await new Promise((r) => setTimeout(r, 10));

    // Inspect logs payload for loss present (indicates final fit occurred on tensors)
    const calls = (selfObj.postMessage as any).mock.calls;
    const progresses = calls.filter((c: any[]) => c[0]?.type === 'progress' && c[0]?.modelType === 'emotion-prediction');
    expect(progresses.length).toBeGreaterThan(0);
    const lastProgress = progresses[progresses.length - 1][0];
    expect(typeof lastProgress.loss).toBe('number');
  }, 30000);
});

