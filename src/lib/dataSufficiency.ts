import type { TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';

export type ReadinessScore = {
  label: 'insufficient' | 'partial' | 'ready';
  score: number; // 0..1
  reasons: string[];
  needed?: { entries?: number; socialExamples?: number; timespanDays?: number };
};

export function evaluateSocialTriggerReadiness(
  entries: TrackingEntry[],
  emotions: EmotionEntry[],
  sensory: SensoryEntry[],
): ReadinessScore {
  const reasons: string[] = [];
  const totalEntries = entries.length;

  // Count social-related evidence heuristically from notes/contexts
  const isSocial = (txt?: string) =>
    !!txt &&
    /(sosial|gruppe|grupp|venn|klasse|friminutt|pause|interaksj|samarbeid|konflikt)/i.test(txt);
  let socialCount = 0;
  for (const e of entries) {
    if (isSocial(e.generalNotes || e.notes)) socialCount++;
    for (const emo of e.emotions || []) {
      if (isSocial(emo.notes) || isSocial((emo.triggers || []).join(' '))) socialCount++;
    }
  }

  // Timespan proxy: diff between first & last entry
  let daysSpan = 0;
  if (entries.length > 1) {
    const times = entries.map((e) => new Date(e.timestamp).getTime()).sort((a, b) => a - b);
    daysSpan = Math.max(
      1,
      Math.round((times[times.length - 1] - times[0]) / (1000 * 60 * 60 * 24)),
    );
  }

  // Heuristic thresholds (can be tuned)
  const NEED_ENTRIES = 25;
  const NEED_SOCIAL = 5;
  const NEED_DAYS = 7;

  if (totalEntries < NEED_ENTRIES) reasons.push(`For få økter (${totalEntries}/${NEED_ENTRIES}).`);
  if (socialCount < NEED_SOCIAL)
    reasons.push(`Få sosiale eksempler (${socialCount}/${NEED_SOCIAL}).`);
  if (daysSpan < NEED_DAYS) reasons.push(`Kort tidsrom (${daysSpan}/${NEED_DAYS} dager).`);

  const ratioEntries = Math.min(1, totalEntries / NEED_ENTRIES);
  const ratioSocial = Math.min(1, socialCount / NEED_SOCIAL);
  const ratioDays = Math.min(1, daysSpan / NEED_DAYS);
  const score =
    Math.round((ratioEntries * 0.4 + ratioSocial * 0.4 + ratioDays * 0.2 + Number.EPSILON) * 100) /
    100;

  const label: ReadinessScore['label'] =
    score >= 0.85 ? 'ready' : score >= 0.6 ? 'partial' : 'insufficient';

  return {
    label,
    score,
    reasons,
    needed: {
      entries: Math.max(0, NEED_ENTRIES - totalEntries),
      socialExamples: Math.max(0, NEED_SOCIAL - socialCount),
      timespanDays: Math.max(0, NEED_DAYS - daysSpan),
    },
  };
}
