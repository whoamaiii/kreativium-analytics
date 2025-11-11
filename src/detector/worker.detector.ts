import type { DetectorOptions, DetectorWorkerResult, DetectorSnapshot } from '@/detector/types';
import DetectorWorker from '@/workers/detector.worker?worker';

export class WorkerDetector {
  private worker: Worker | null = null;
  private video: HTMLVideoElement | null = null;
  private snapshot: DetectorSnapshot = {
    topLabel: 'neutral',
    topProbability: 0,
    probabilities: {},
    box: null,
    fps: 0,
    ready: false,
  };
  private targetFps: number;
  private lastSentTs = 0;
  private scratchCanvas: HTMLCanvasElement | null = null;
  private imageCapture: any | null = null;

  constructor(private options: DetectorOptions = {}) {
    this.targetFps = Math.max(8, Math.min(30, options.targetFps ?? 20));
  }

  attach(video: HTMLVideoElement): void {
    this.video = video;
    if (!this.worker) {
      this.worker = new DetectorWorker();
      this.worker.onmessage = (evt: MessageEvent<DetectorWorkerResult | { type: 'ready' }>) => {
        const msg = evt.data;
        if (!msg) return;
        if ((msg as any).type === 'ready') {
          this.snapshot.ready = true;
          return;
        }
        if ((msg as DetectorWorkerResult).type === 'result') {
          this.snapshot = (msg as DetectorWorkerResult).snapshot;
        }
      };
      this.worker.postMessage({
        type: 'init',
        modelBaseUrl: this.options.modelBaseUrl ?? '/models',
        scoreThreshold: this.options.scoreThreshold ?? 0.5,
      });
      // Optimistically mark as ready to start frame flow; worker will still guard on its own
      this.snapshot.ready = true;
    }
    if (!this.scratchCanvas) {
      this.scratchCanvas = document.createElement('canvas');
    }
    // Prefer ImageCapture when available for zero-copy ImageBitmap frames from camera
    try {
      const stream = video.srcObject as MediaStream | null;
      const track = stream?.getVideoTracks?.()[0];
      const ImageCaptureCtor = (window as any).ImageCapture;
      if (track && ImageCaptureCtor) {
        this.imageCapture = new ImageCaptureCtor(track);
      }
    } catch {
      this.imageCapture = null;
    }
  }

  getSnapshot(): DetectorSnapshot {
    return this.snapshot;
  }

  tick(now: number = performance.now()): void {
    const video = this.video;
    if (!video || !this.worker) return;
    if (!this.snapshot.ready) return;
    const minDt = 1000 / this.targetFps;
    if (now - this.lastSentTs < minDt) return;
    if ((video.readyState ?? 0) < 2 || video.videoWidth === 0 || video.videoHeight === 0) return;

    this.lastSentTs = now;
    // Path A: Use ImageCapture if available
    if (this.imageCapture) {
      (this.imageCapture.grabFrame?.() as Promise<ImageBitmap>)
        .then((ib: ImageBitmap) => {
          try {
            this.worker!.postMessage({ type: 'frame', frame: ib }, [ib as unknown as Transferable]);
          } catch {}
        })
        .catch(() => {
          // fall back to canvas path on failure
          this.imageCapture = null;
        });
      return;
    }

    // Path B: Draw the current video frame to a scratch canvas then convert to ImageBitmap
    try {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!this.scratchCanvas) this.scratchCanvas = document.createElement('canvas');
      if (this.scratchCanvas.width !== w) this.scratchCanvas.width = w;
      if (this.scratchCanvas.height !== h) this.scratchCanvas.height = h;
      const ctx = this.scratchCanvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      (window as unknown as any)
        .createImageBitmap(this.scratchCanvas)
        .then((ib: ImageBitmap) => {
          try {
            this.worker!.postMessage({ type: 'frame', frame: ib }, [ib as unknown as Transferable]);
          } catch {}
        })
        .catch(() => {});
    } catch {
      // silently ignore frame errors
    }
  }

  dispose(): void {
    try {
      this.worker?.terminate();
    } catch {}
    this.worker = null;
    this.video = null;
    this.scratchCanvas = null;
    this.imageCapture = null;
  }
}
