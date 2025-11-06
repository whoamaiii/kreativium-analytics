import { loadFaceApi, loadModels } from '@/lib/faceapi';
import type { DetectorOptions, DetectorSnapshot, DetectionBox } from '@/detector/types';

export class FaceApiDetector {
  private video: HTMLVideoElement | null = null;
  private snapshot: DetectorSnapshot = { topLabel: 'neutral', topProbability: 0, probabilities: {}, box: null, fps: 0, ready: false };
  private scoreThreshold: number;
  private modelBaseUrl: string;
  private lastTs = performance.now();
  private initialized = false;

  constructor(options: DetectorOptions = {}) {
    this.modelBaseUrl = options.modelBaseUrl ?? '/models';
    this.scoreThreshold = options.scoreThreshold ?? 0.5;
  }

  async ensureModels(): Promise<void> {
    if (this.initialized) return;
    // Lazy load face-api and models
    await loadModels(this.modelBaseUrl, {
      tinyFaceDetector: true,
      faceExpressionNet: true,
    });
    this.initialized = true;
    this.snapshot.ready = true;
  }

  attach(video: HTMLVideoElement): void {
    this.video = video;
  }

  async tick(): Promise<void> {
    const video = this.video;
    if (!video) return;
    if (!this.initialized) await this.ensureModels();
    if ((video.readyState ?? 0) < 2 || video.videoWidth === 0 || video.videoHeight === 0) return;

    // Get face-api instance
    const faceapi = await loadFaceApi();

    const t0 = performance.now();
    const results = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: this.scoreThreshold }))
      .withFaceExpressions();

    let box: DetectionBox | null = null;
    let probabilities: Record<string, number> = {};
    let topLabel = 'neutral';
    let topProbability = 0;

    let largest: { area: number; box: faceapi.Box; expressions: faceapi.FaceExpressions } | null = null;
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
      for (const [k, v] of Object.entries(probabilities)) { if (v > topProbability) { topProbability = v; topLabel = k; } }
    }

    const dt = performance.now() - t0;
    const fps = dt > 0 ? 1000 / dt : 0;
    this.snapshot = { topLabel, topProbability, probabilities, box, fps, ready: true };
    this.lastTs = t0;
  }

  getSnapshot(): DetectorSnapshot { return this.snapshot; }
}




