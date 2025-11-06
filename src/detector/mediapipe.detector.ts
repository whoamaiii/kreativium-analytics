import type { DetectorOptions, DetectorSnapshot, DetectionBox } from '@/detector/types';

type FaceLandmarkerType = any;

function computeBoundingBox(landmarks: Array<{ x: number; y: number }>, width: number, height: number): DetectionBox | null {
  if (!landmarks || landmarks.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of landmarks) {
    minX = Math.min(minX, p.x * width);
    minY = Math.min(minY, p.y * height);
    maxX = Math.max(maxX, p.x * width);
    maxY = Math.max(maxY, p.y * height);
  }
  const w = Math.max(0, maxX - minX);
  const h = Math.max(0, maxY - minY);
  if (!isFinite(w) || !isFinite(h)) return null;
  return { x: Math.max(0, minX), y: Math.max(0, minY), width: w, height: h };
}

function blendshapeToEmotion(blendshapes: Array<{ categoryName: string; score: number }>): { probs: Record<string, number>; top: string; topP: number } {
  const probs: Record<string, number> = {
    neutral: 0.5,
    happy: 0,
    sad: 0,
    angry: 0,
    fearful: 0,
    disgusted: 0,
    surprised: 0,
  };
  const m = new Map<string, number>();
  for (const b of blendshapes ?? []) m.set(b.categoryName, b.score);

  const smile = (m.get('mouthSmileLeft') ?? 0) * 0.5 + (m.get('mouthSmileRight') ?? 0) * 0.5;
  const jawOpen = m.get('jawOpen') ?? 0;
  const eyeWide = ((m.get('eyeWideLeft') ?? 0) + (m.get('eyeWideRight') ?? 0)) * 0.5;
  const browUp = (m.get('browInnerUp') ?? 0);
  const browLower = ((m.get('browLowererLeft') ?? 0) + (m.get('browLowererRight') ?? 0)) * 0.5;
  const upperLipRaise = m.get('upperLipRaise') ?? 0;

  probs.happy = Math.max(0, Math.min(1, smile * 0.9 + (jawOpen * 0.1)));
  probs.surprised = Math.max(0, Math.min(1, jawOpen * 0.6 + eyeWide * 0.4));
  probs.angry = Math.max(0, Math.min(1, browLower * 0.7 + (1 - smile) * 0.2 + (upperLipRaise * 0.1)));
  probs.sad = Math.max(0, Math.min(1, (browUp * 0.2 + (1 - smile) * 0.4) * 0.8));
  probs.fearful = Math.max(0, Math.min(1, eyeWide * 0.6 + jawOpen * 0.2 + browUp * 0.2));
  probs.disgusted = Math.max(0, Math.min(1, upperLipRaise * 0.7 + browLower * 0.2));

  // Normalize with neutral baseline
  let maxK = 'neutral';
  let maxV = probs.neutral;
  for (const [k, v] of Object.entries(probs)) {
    if (v > maxV) { maxV = v; maxK = k; }
  }
  // Clamp
  for (const k of Object.keys(probs)) probs[k] = Math.max(0, Math.min(1, probs[k]));
  return { probs, top: maxK, topP: maxV };
}

export class MediaPipeDetector {
  private snapshot: DetectorSnapshot = { topLabel: 'neutral', topProbability: 0, probabilities: {}, box: null, fps: 0, ready: false };
  private modelBaseUrl: string;
  private landmarker: FaceLandmarkerType | null = null;
  private video: HTMLVideoElement | null = null;
  private lastTs = performance.now();

  constructor(options: DetectorOptions = {}) {
    this.modelBaseUrl = options.modelBaseUrl ?? '/models/mediapipe';
  }

  async ensureReady(): Promise<void> {
    if (this.landmarker) return;
    try {
      // Dynamic import to avoid bundling when not used
      const vision = await import('@mediapipe/tasks-vision');
      const fileset = await vision.FilesetResolver.forVisionTasks(this.modelBaseUrl);
      this.landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: `${this.modelBaseUrl}/face_landmarker.task` },
        outputFaceBlendshapes: true,
        runningMode: 'VIDEO',
        numFaces: 1,
      });
      this.snapshot.ready = true;
    } catch {
      this.landmarker = null;
      this.snapshot.ready = false;
    }
  }

  attach(video: HTMLVideoElement): void { this.video = video; }

  async tick(): Promise<void> {
    if (!this.landmarker) await this.ensureReady();
    if (!this.landmarker || !this.video) return;
    if ((this.video.readyState ?? 0) < 2 || this.video.videoWidth === 0 || this.video.videoHeight === 0) return;
    const now = performance.now();
    const result = this.landmarker.detectForVideo(this.video, now);
    let box: DetectionBox | null = null;
    let probabilities: Record<string, number> = {};
    let topLabel = 'neutral';
    let topProbability = 0;
    if (result && result.facialBlendshapes && result.facialBlendshapes.length > 0) {
      const blend = result.facialBlendshapes[0].categories.map((c: any) => ({ categoryName: c.categoryName, score: c.score }));
      const mapped = blendshapeToEmotion(blend);
      probabilities = mapped.probs;
      topLabel = mapped.top;
      topProbability = mapped.topP;
    }
    if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
      box = computeBoundingBox(result.faceLandmarks[0], this.video.videoWidth, this.video.videoHeight);
    }
    const dt = now - this.lastTs;
    const fps = dt > 0 ? 1000 / dt : 0;
    this.lastTs = now;
    this.snapshot = { topLabel, topProbability, probabilities, box, fps, ready: this.snapshot.ready };
  }

  getSnapshot(): DetectorSnapshot { return this.snapshot; }
}



