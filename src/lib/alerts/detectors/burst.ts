import { DetectorResult, SourceType } from '@/lib/alerts/types';
import { pearsonCorrelation } from '@/lib/statistics';

export interface BurstEvent {
  timestamp: number;
  value: number;
  pairedValue?: number;
}

export interface BurstDetectorOptions {
  windowMinutes?: number;
  minEvents?: number;
  label?: string;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export function detectBurst(
  events: BurstEvent[],
  options: BurstDetectorOptions = {},
): DetectorResult | null {
  const minEvents = options.minEvents ?? 3;
  const windowMinutes = options.windowMinutes ?? 15;
  if (!Array.isArray(events) || events.length < minEvents) {
    return null;
  }

  const windowMs = windowMinutes * 60_000;
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  let bestStart = 0;
  let bestEnd = 0;
  let bestCount = 0;
  let bestSum = 0;
  let bestMax = -Infinity;

  let start = 0;
  let sum = 0;
  let maxVal = -Infinity;
  for (let end = 0; end < sorted.length; end++) {
    const evt = sorted[end];
    sum += evt.value;
    if (evt.value > maxVal) maxVal = evt.value;

    while (evt.timestamp - sorted[start].timestamp > windowMs) {
      sum -= sorted[start].value;
      start += 1;
    }
    const count = end - start + 1;
    if (count > bestCount && count >= minEvents) {
      bestCount = count;
      bestStart = start;
      bestEnd = end;
      bestSum = sum;
      bestMax = maxVal;
    }
  }

  if (bestCount < minEvents) {
    return null;
  }

  const startTs = sorted[bestStart].timestamp;
  const endTs = sorted[bestEnd].timestamp;
  const durationMinutes = (endTs - startTs) / 60_000;
  const intensity = bestSum / bestCount;
  const durationRatio = clamp(
    Math.min(windowMinutes, Math.max(durationMinutes, 0)) / windowMinutes,
    0,
    1,
  );
  const frequencyRatio = clamp(bestCount / (minEvents * 2), 0, 1);

  let crossCorrelation = 0;
  const pairedValues: number[] = [];
  const primaryValues: number[] = [];
  for (let i = bestStart; i <= bestEnd; i++) {
    const evt = sorted[i];
    if (Number.isFinite(evt.pairedValue)) {
      primaryValues.push(evt.value);
      pairedValues.push(evt.pairedValue as number);
    }
  }
  if (primaryValues.length >= 3) {
    crossCorrelation = pearsonCorrelation(primaryValues, pairedValues);
  }

  const score = clamp(0.5 * frequencyRatio + 0.5 * durationRatio, 0, 1);
  const expectedDensity = minEvents / Math.max(windowMinutes, 1);
  const observedDensity = bestCount / Math.max(durationMinutes, 1e-3);
  const densityRatio = clamp(observedDensity / Math.max(expectedDensity, 1e-3), 0, 1);
  const confidence = clamp(
    0.6 + (bestCount - minEvents) * 0.08 + Math.abs(crossCorrelation) * 0.2 + densityRatio * 0.12,
    0.6,
    0.95,
  );

  return {
    score,
    confidence,
    impactHint: 'Clustered high-intensity episode detected',
    sources: [
      {
        type: SourceType.PatternEngine,
        label: options.label ?? 'Burst episode',
        details: {
          windowMinutes,
          eventCount: bestCount,
          durationMinutes,
          meanIntensity: intensity,
          peakIntensity: bestMax,
          startTimestamp: startTs,
          endTimestamp: endTs,
          crossCorrelation,
        },
      },
    ],
  };
}
