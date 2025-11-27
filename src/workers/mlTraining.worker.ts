/**
 * ML Training Worker
 *
 * Handles emotion and sensory model training tasks off the main thread.
 * Currently returns stub results - implement actual training logic when needed.
 */

export interface TrainConfig {
  epochs?: number;
  batchSize?: number;
  learningRate?: number;
  validationSplit?: number;
}

export interface TrainData {
  features: number[][];
  labels: number[] | number[][];
}

export type TrainMessage =
  | { type: 'train-emotion'; data: TrainData; config?: TrainConfig }
  | { type: 'train-sensory'; data: TrainData; config?: TrainConfig };

export interface TrainResult {
  type: 'complete' | 'error' | 'progress';
  modelType: 'emotion-prediction' | 'sensory-response';
  metadata: {
    validationResults: {
      averageMetrics: {
        accuracy?: number;
        loss?: number;
        mse?: number;
      };
    };
    trainedEpochs?: number;
    finalLoss?: number;
  };
  error?: string;
  progress?: number;
}

const ctx: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;

ctx.onmessage = async (e: MessageEvent<TrainMessage>) => {
  const msg = e?.data;
  if (!msg || typeof msg !== 'object' || !('type' in msg)) return;

  const config = msg.config ?? {};
  const epochs = config.epochs ?? 10;

  // Simulate training progress
  const postProgress = (modelType: TrainResult['modelType'], progress: number) => {
    ctx.postMessage({
      type: 'progress',
      modelType,
      metadata: { validationResults: { averageMetrics: {} } },
      progress,
    } satisfies TrainResult);
  };

  if (msg.type === 'train-emotion') {
    // Emit progress updates
    for (let i = 1; i <= epochs; i++) {
      postProgress('emotion-prediction', i / epochs);
      await new Promise((r) => setTimeout(r, 10)); // Minimal delay for testing
    }

    ctx.postMessage({
      type: 'complete',
      modelType: 'emotion-prediction',
      metadata: {
        validationResults: {
          averageMetrics: {
            accuracy: 0.85,
            loss: 0.15,
          },
        },
        trainedEpochs: epochs,
        finalLoss: 0.15,
      },
    } satisfies TrainResult);
    return;
  }

  if (msg.type === 'train-sensory') {
    // Emit progress updates
    for (let i = 1; i <= epochs; i++) {
      postProgress('sensory-response', i / epochs);
      await new Promise((r) => setTimeout(r, 10));
    }

    ctx.postMessage({
      type: 'complete',
      modelType: 'sensory-response',
      metadata: {
        validationResults: {
          averageMetrics: {
            accuracy: 0.82,
            mse: 0.08,
          },
        },
        trainedEpochs: epochs,
        finalLoss: 0.18,
      },
    } satisfies TrainResult);
    return;
  }

  // Unknown message type
  ctx.postMessage({
    type: 'error',
    modelType: 'emotion-prediction',
    metadata: { validationResults: { averageMetrics: {} } },
    error: `Unknown training message type: ${(msg as { type: string }).type}`,
  } satisfies TrainResult);
};

export {};
