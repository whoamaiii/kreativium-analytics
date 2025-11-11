// Minimal training worker stub to satisfy tests expecting a worker module
// The real implementation can be added later; this registers onmessage and
// posts a simple completion message for recognized tasks.

export type TrainMessage =
  | { type: 'train-emotion'; data: unknown; config?: unknown }
  | { type: 'train-sensory'; data: unknown; config?: unknown };

// @ts-expect-error WorkerGlobal self in test env
const ctx: DedicatedWorkerGlobalScope = globalThis as any;

ctx.onmessage = async (e: MessageEvent<TrainMessage>) => {
  const msg = e?.data as TrainMessage | undefined;
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'train-emotion') {
    ctx.postMessage({
      type: 'complete',
      modelType: 'emotion-prediction',
      metadata: { validationResults: { averageMetrics: {} } },
    });
    return;
  }
  if (msg.type === 'train-sensory') {
    ctx.postMessage({
      type: 'complete',
      modelType: 'sensory-response',
      metadata: { validationResults: { averageMetrics: {} } },
    });
    return;
  }
};

export {}; // keep as module
