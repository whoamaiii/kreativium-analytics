import { AlertSeverity, AlertSource, DetectorResult } from '@/lib/alerts/types';

/**
 * Compute a 0-1 recency score that decays approximately exponentially with hours since last event.
 * Uses exponential decay with a 24-hour half-life for time-sensitive alert prioritization.
 *
 * Decay characteristics:
 * - 0 hours → ~1.0 (most recent)
 * - 24 hours → ~0.37
 * - 48 hours → ~0.14
 * - 72+ hours → approaches 0
 *
 * @param lastTimestamp - Timestamp of the last event in milliseconds
 * @param now - Current timestamp in milliseconds
 * @returns Recency score between 0 and 1, clamped to valid range
 *
 * @example
 * const now = Date.now();
 * computeRecencyScore(now, now) // => 1.0 (just happened)
 * computeRecencyScore(now - 24 * 60 * 60 * 1000, now) // => ~0.37 (24h ago)
 * computeRecencyScore(now - 48 * 60 * 60 * 1000, now) // => ~0.14 (48h ago)
 */
export function computeRecencyScore(lastTimestamp: number, now: number): number {
  const deltaMs = Math.max(0, now - lastTimestamp);
  const deltaHours = deltaMs / 3_600_000;
  // 0h -> 1, 48h -> ~0.1
  const score = Math.exp(-deltaHours / 24);
  return Math.max(0, Math.min(1, score));
}

/**
 * Map aggregate score to a severity tier using calibrated cutpoints.
 * Provides consistent severity classification across the alert detection system.
 *
 * Severity thresholds:
 * - Critical: ≥ 0.85
 * - Important: ≥ 0.70
 * - Moderate: ≥ 0.55
 * - Low: < 0.55
 *
 * @param score - Aggregate alert score between 0 and 1
 * @returns Corresponding AlertSeverity enum value
 *
 * @example
 * severityFromScore(0.90) // => AlertSeverity.Critical
 * severityFromScore(0.75) // => AlertSeverity.Important
 * severityFromScore(0.60) // => AlertSeverity.Moderate
 * severityFromScore(0.40) // => AlertSeverity.Low
 */
export function severityFromScore(score: number): AlertSeverity {
  if (score >= 0.85) return AlertSeverity.Critical;
  if (score >= 0.7) return AlertSeverity.Important;
  if (score >= 0.55) return AlertSeverity.Moderate;
  return AlertSeverity.Low;
}

/**
 * Rank and attribute sources across detectors using score·confidence weighting.
 * Identifies the top 3 most significant alert sources based on detector scores
 * and confidence levels. Sources are annotated with S1/S2/S3 ranking in details.
 *
 * Ranking methodology:
 * - Weight = detector.score × detector.confidence
 * - Sources sorted by weight (descending)
 * - Top 3 sources labeled as S1 (highest), S2, S3
 *
 * @param detectors - Array of detector results to extract and rank sources from
 * @returns Up to 3 ranked sources with S1/S2/S3 rank annotations in details
 *
 * @example
 * const detectors = [
 *   { score: 0.8, confidence: 0.9, sources: [{ type: 'emotion', ... }] },
 *   { score: 0.6, confidence: 0.7, sources: [{ type: 'sensory', ... }] },
 * ];
 * const ranked = rankSources(detectors);
 * ranked[0].details.rank // => 'S1' (highest weighted source)
 * ranked[1].details.rank // => 'S2' (second highest)
 */
export function rankSources(detectors: DetectorResult[]): AlertSource[] {
  const collected: Array<{ source: AlertSource; score: number }> = [];
  for (let i = 0; i < detectors.length; i += 1) {
    const detector = detectors[i]!;
    const weight = (detector.score ?? 0) * (detector.confidence ?? 0);
    const srcs = detector.sources ?? [];
    for (let j = 0; j < srcs.length; j += 1) {
      collected.push({ source: srcs[j]!, score: weight });
    }
  }

  const ranked = collected
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3)
    .map((entry, idx) => {
      const rank = idx === 0 ? 'S1' : idx === 1 ? 'S2' : 'S3';
      const details = { ...(entry.source.details ?? {}), rank };
      return { ...entry.source, details };
    });

  return ranked;
}
