import * as faceapi from '@vladmandic/face-api';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-cpu';
import type {
  DetectorWorkerMessage,
  DetectorWorkerResult,
  DetectorWorkerReady,
  DetectionBox,
} from '@/detector/types';
import { ensureFaceApiModels } from '@/lib/ml/faceApiLoader';

let initialized = false;
let scoreThreshold = 0.5;
let modelBaseUrl = '/models';

async function ensureModels(): Promise<void> {
  if (initialized) return;
  // Use CPU backend in worker for maximum compatibility
  try {
    await tf.setBackend('cpu');
  } catch {
    // @silent-ok: backend setup may fail, fallback handled by TensorFlow
  }
  try {
    await tf.ready();
  } catch {
    // @silent-ok: TensorFlow ready may fail in some environments
  }
  await ensureFaceApiModels(modelBaseUrl);
  initialized = true;
}

self.addEventListener('message', async (evt: MessageEvent<DetectorWorkerMessage>) => {
  const msg = evt.data;
  if (!msg) return;
  try {
    if (msg.type === 'init') {
      modelBaseUrl = msg.modelBaseUrl || '/models';
      scoreThreshold = msg.scoreThreshold || 0.5;
      await ensureModels();
      const ready: DetectorWorkerReady = { type: 'ready' };
      (self as unknown as Worker).postMessage(ready);
      return;
    }
    if (msg.type === 'frame') {
      if (!initialized) await ensureModels();
      const bitmap = msg.frame;
      const t0 = performance.now();
      // Draw ImageBitmap to OffscreenCanvas to ensure compatibility with face-api input types
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(bitmap, 0, 0);
      // Use ImageData as input to improve compatibility in worker contexts
      const imgData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
      const results = await faceapi
        .detectAllFaces(
          imgData as unknown as HTMLCanvasElement,
          new faceapi.TinyFaceDetectorOptions({ scoreThreshold }),
        )
        .withFaceExpressions();

      let box: DetectionBox | null = null;
      let probabilities: Record<string, number> = {};
      let topLabel = 'neutral';
      let topProbability = 0;

      let largest: { area: number; box: faceapi.Box; expressions: faceapi.FaceExpressions } | null =
        null;
      for (const r of results ?? []) {
        const a = r.detection.box.width * r.detection.box.height;
        if (!largest || a > largest.area) {
          largest = { area: a, box: r.detection.box, expressions: r.expressions };
        }
      }
      if (largest) {
        const b = largest.box;
        box = { x: b.x, y: b.y, width: b.width, height: b.height };
        probabilities = largest.expressions as unknown as Record<string, number>;
        for (const [k, v] of Object.entries(probabilities)) {
          if (v > topProbability) {
            topProbability = v;
            topLabel = k;
          }
        }
      }
      const dt = performance.now() - t0;
      const fps = dt > 0 ? 1000 / dt : 0;

      const payload: DetectorWorkerResult = {
        type: 'result',
        snapshot: { topLabel, topProbability, probabilities, box, fps, ready: true },
      };
      (self as unknown as Worker).postMessage(payload);
      // Transfer ownership so GC can reclaim quickly
      try {
        bitmap.close?.();
      } catch {
        // @silent-ok: bitmap cleanup failure is non-critical
      }
    }
  } catch (e) {
    // Swallow errors to keep worker alive
  }
});
