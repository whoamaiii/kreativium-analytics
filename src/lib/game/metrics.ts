export interface ProbabilitySnapshot {
  /** Top label probability for current target (0..1). */
  targetProb: number;
  /** Timestamp in ms (performance.now()). */
  ts: number;
}

export interface DerivedMetrics {
  /** Tid til første gang vi passerte terskel (ms). -1 hvis ikke oppnådd. */
  reactionTimeMs: number;
  /** Lengste sammenhengende tid over terskel i vinduet (ms). */
  longestStabilityMs: number;
  /** Margin over nøytral/annet – et grovt intensitetsestimat (0..1). */
  intensityScore: number;
}

export interface MetricsOptions {
  /** Krav for å regne som korrekt i øyeblikket. */
  threshold: number;
  /** Maks størrelse på intern ringbuffer (antall samples). */
  bufferSize?: number;
}

/**
 * Enkel strøm-måler som avleder reaksjonstid, stabilitet og intensitet fra sannsynlighet over tid.
 * Holder en ringbuffer av siste N samples for lav GC.
 */
export class MetricsAccumulator {
  private readonly threshold: number;
  private readonly buffer: ProbabilitySnapshot[];
  private writeIndex = 0;
  private filled = 0;
  private firstPassTs: number | null = null;

  constructor(options: MetricsOptions) {
    this.threshold = Math.max(0, Math.min(1, options.threshold));
    const size = Math.max(8, Math.min(2048, options.bufferSize ?? 256));
    this.buffer = new Array(size);
  }

  push(targetProb: number, ts: number = performance.now()): void {
    const clamped = Math.max(0, Math.min(1, targetProb));
    if (this.firstPassTs === null && clamped >= this.threshold) {
      this.firstPassTs = ts;
    }
    this.buffer[this.writeIndex] = { targetProb: clamped, ts };
    this.writeIndex = (this.writeIndex + 1) % this.buffer.length;
    this.filled = Math.min(this.buffer.length, this.filled + 1);
  }

  /** Beregn avledede målinger for siste vindu. */
  compute(now: number = performance.now()): DerivedMetrics {
    let longest = 0;
    let current = 0;
    let lastTs = now;
    let intensityAccum = 0;
    let count = 0;

    // Iterate oldest→newest
    const total = this.filled;
    for (let i = 0; i < total; i += 1) {
      const idx = (this.writeIndex - total + i + this.buffer.length) % this.buffer.length;
      const s = this.buffer[idx];
      if (!s) continue;
      const dt = Math.max(0, (i === 0 ? 0 : (s.ts - lastTs)));
      if (s.targetProb >= this.threshold) {
        current += dt;
        longest = Math.max(longest, current);
      } else {
        current = 0;
      }
      // Use probability squared to reward higher confidence visually
      intensityAccum += s.targetProb * s.targetProb;
      count += 1;
      lastTs = s.ts;
    }

    const reactionTimeMs = this.firstPassTs == null ? -1 : Math.max(0, Math.floor(this.firstPassTs - (this.buffer[(this.writeIndex - total + this.buffer.length) % this.buffer.length]?.ts ?? now)));
    const longestStabilityMs = Math.floor(longest);
    const intensityScore = count > 0 ? Math.max(0, Math.min(1, intensityAccum / count)) : 0;

    return { reactionTimeMs, longestStabilityMs, intensityScore };
  }

  reset(): void {
    this.writeIndex = 0;
    this.filled = 0;
    this.firstPassTs = null;
  }
}

export function createMetricsAccumulator(threshold: number, bufferSize?: number): MetricsAccumulator {
  return new MetricsAccumulator({ threshold, bufferSize });
}


