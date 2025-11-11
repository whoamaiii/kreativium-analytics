export interface DetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectorSnapshot {
  topLabel: string;
  topProbability: number;
  probabilities: Record<string, number>;
  box: DetectionBox | null;
  fps: number;
  ready: boolean;
}

export interface DetectorOptions {
  modelBaseUrl?: string;
  scoreThreshold?: number;
  smoothingWindow?: number;
  targetFps?: number;
}

export type DetectorWorkerInit = {
  type: 'init';
  modelBaseUrl: string;
  scoreThreshold: number;
};

export type DetectorWorkerFrame = {
  type: 'frame';
  frame: ImageBitmap;
};

export type DetectorWorkerMessage = DetectorWorkerInit | DetectorWorkerFrame;

export type DetectorWorkerResult = {
  type: 'result';
  snapshot: DetectorSnapshot;
};

export type DetectorWorkerReady = { type: 'ready' };
