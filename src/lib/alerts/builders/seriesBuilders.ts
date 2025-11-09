import type { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import { normalizeTimestamp, truncateSeries } from '@/lib/alerts/utils';
import type { TrendPoint } from '@/lib/alerts/detectors/ewma';
import type { BurstEvent } from '@/lib/alerts/detectors/burst';
import type { AssociationDetectorInput } from '@/lib/alerts/detectors/association';

/**
 * Extended association dataset interface with timestamps for series alignment.
 * Extends the base AssociationDetectorInput with temporal metadata.
 */
export interface AssociationDataset extends AssociationDetectorInput {
  timestamps: number[];
}

/**
 * Build per-emotion intensity series from raw entries.
 *
 * Transforms raw emotion entries into time-series data grouped by emotion type,
 * sorted chronologically and truncated to the specified limit.
 *
 * @param emotions - Raw emotion entries to process
 * @param seriesLimit - Maximum number of points to keep per series
 * @returns Map of emotion keys to sorted, truncated time-series data
 */
export function buildEmotionSeries(
  emotions: EmotionEntry[],
  seriesLimit: number
): Map<string, TrendPoint[]> {
  const map = new Map<string, TrendPoint[]>();
  for (let i = 0; i < emotions.length; i += 1) {
    const entry = emotions[i]!;
    const ts = normalizeTimestamp(entry.timestamp);
    if (ts === null) continue;
    const intensity = Number(entry.intensity);
    if (!Number.isFinite(intensity)) continue;
    const key = entry.emotion || entry.subEmotion || 'unknown';
    const arr = map.get(key) ?? [];
    arr.push({ timestamp: ts, value: intensity });
    map.set(key, arr);
  }
  map.forEach((arr, key) => {
    const sorted = arr.sort((a, b) => a.timestamp - b.timestamp);
    map.set(key, truncateSeries(sorted, seriesLimit));
  });
  return map;
}

/**
 * Build per-sensory behavior aggregates and series with beta prior deltas.
 *
 * Processes sensory entries to compute success/trial counts (high intensity events),
 * maintains time-series data, and calculates delta values for beta distribution priors.
 *
 * @param sensory - Raw sensory entries to process
 * @param seriesLimit - Maximum number of points to keep per series
 * @returns Map of sensory keys to aggregated statistics and time-series data
 */
export function buildSensoryAggregates(
  sensory: SensoryEntry[],
  seriesLimit: number
): Map<string, { successes: number; trials: number; delta: number; series: TrendPoint[] }> {
  const map = new Map<string, { successes: number; trials: number; delta: number; series: TrendPoint[] }>();
  for (let i = 0; i < sensory.length; i += 1) {
    const entry = sensory[i]!;
    const ts = normalizeTimestamp(entry.timestamp);
    if (ts === null) continue;
    const key = entry.response || entry.type || entry.sensoryType || 'sensory';
    const intensity = Number(entry.intensity ?? 1);
    const isHigh = intensity >= 4;
    const current = map.get(key) ?? { successes: 0, trials: 0, delta: 0.1, series: [] };
    current.trials += 1;
    if (isHigh) current.successes += 1;
    current.series.push({ timestamp: ts, value: intensity });
    map.set(key, current);
  }

  map.forEach((agg, key) => {
    agg.series.sort((a, b) => a.timestamp - b.timestamp);
    agg.series = truncateSeries(agg.series, seriesLimit);
    if (agg.trials > 0) {
      const highRate = agg.successes / agg.trials;
      agg.delta = Math.max(0.05, Math.min(0.2, highRate - 0.1));
    }
    map.set(key, agg);
  });
  return map;
}

/**
 * Build association dataset between noise level and max emotion intensity per tracking entry.
 *
 * Constructs a 2x2 contingency table (high/low noise × high/low emotion) and captures
 * time-series data for correlation analysis. Returns null if insufficient data (< 5 observations).
 *
 * @param tracking - Raw tracking entries with environmental and emotion data
 * @returns Association dataset with contingency table and series, or null if insufficient data
 */
export function buildAssociationDataset(tracking: TrackingEntry[]): AssociationDataset | null {
  if (!tracking.length) return null;
  let highNoiseHighEmotion = 0;
  let highNoiseLowEmotion = 0;
  let lowNoiseHighEmotion = 0;
  let lowNoiseLowEmotion = 0;
  const noiseSeries: number[] = [];
  const emotionSeries: number[] = [];
  const timestamps: number[] = [];

  for (let i = 0; i < tracking.length; i += 1) {
    const entry = tracking[i]!;
    const ts = normalizeTimestamp(entry.timestamp);
    if (ts === null) continue;
    const noise = entry.environmentalData?.roomConditions?.noiseLevel;
    if (!Number.isFinite(noise)) continue;
    const emos = entry.emotions ?? [];
    let maxEmotion = 0;
    for (let j = 0; j < emos.length; j += 1) {
      const v = Number(emos[j]!.intensity);
      if (Number.isFinite(v) && v > maxEmotion) maxEmotion = v;
    }

    const highEmotion = maxEmotion >= 4;
    const highNoise = (noise as number) >= 70;

    if (highNoise && highEmotion) highNoiseHighEmotion += 1;
    else if (highNoise) highNoiseLowEmotion += 1;
    else if (highEmotion) lowNoiseHighEmotion += 1;
    else lowNoiseLowEmotion += 1;

    noiseSeries.push(noise as number);
    emotionSeries.push(maxEmotion);
    timestamps.push(ts);
  }

  const total = highNoiseHighEmotion + highNoiseLowEmotion + lowNoiseHighEmotion + lowNoiseLowEmotion;
  if (total < 5) return null;

  return {
    label: 'Environment association',
    contingency: {
      a: highNoiseHighEmotion,
      b: highNoiseLowEmotion,
      c: lowNoiseHighEmotion,
      d: lowNoiseLowEmotion,
    },
    seriesX: noiseSeries,
    seriesY: emotionSeries,
    timestamps,
    context: {
      factor: 'noiseLevel',
    },
    minSupport: 5,
  };
}

/**
 * Build burst events by pairing high-intensity emotions with nearby sensory data.
 *
 * Identifies emotion entries with intensity >= 4 and pairs them with sensory entries
 * occurring within a 1-minute window, computing average paired intensity values.
 *
 * @param emotions - Raw emotion entries to scan for high-intensity events
 * @param sensory - Raw sensory entries to pair with emotions
 * @returns Sorted array of burst events with timestamp, value, and paired sensory value
 */
export function buildBurstEvents(emotions: EmotionEntry[], sensory: SensoryEntry[]): BurstEvent[] {
  const events: BurstEvent[] = [];
  const sensoryByTime = sensory.reduce<Record<number, SensoryEntry[]>>((acc, entry) => {
    const ts = normalizeTimestamp(entry.timestamp);
    if (ts === null) return acc;
    const bucket = Math.round(ts / 60_000); // minute bucket
    acc[bucket] = acc[bucket] ?? [];
    acc[bucket].push(entry);
    return acc;
  }, {});

  for (let i = 0; i < emotions.length; i += 1) {
    const entry = emotions[i]!;
    const ts = normalizeTimestamp(entry.timestamp);
    if (ts === null) continue;
    const intensity = Number(entry.intensity);
    if (!Number.isFinite(intensity) || intensity < 4) continue;
    const bucket = Math.round(ts / 60_000);
    const nearbySensory = [
      ...(sensoryByTime[bucket] ?? []),
      ...(sensoryByTime[bucket - 1] ?? []),
      ...(sensoryByTime[bucket + 1] ?? []),
    ];
    const paired: number[] = [];
    for (let j = 0; j < nearbySensory.length; j += 1) {
      const n = Number(nearbySensory[j]!.intensity ?? 0);
      if (Number.isFinite(n)) paired.push(n);
    }
    const pairedValue = paired.length ? paired.reduce((sum, val) => sum + val, 0) / paired.length : 0;
    events.push({ timestamp: ts, value: intensity, pairedValue });
  }

  return events.sort((a, b) => a.timestamp - b.timestamp);
}
