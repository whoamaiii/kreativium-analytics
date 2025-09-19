import { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';

export type EvidenceItem = {
  id: string;
  kind: 'emotion' | 'sensory' | 'tracking';
  timestamp: string; // ISO
  description: string;
  metrics?: Record<string, number>;
  tags?: string[];
};

export type AllowedContexts = {
  places: string[];
  activities: string[];
  triggers: string[];
};

export function computeAllowedContexts(args: {
  entries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
}): AllowedContexts {
  const placeSet = new Set<string>();
  const activitySet = new Set<string>();
  const triggerSet = new Set<string>();

  for (const e of args.entries) {
    const loc = e.environmentalData?.location?.trim();
    if (loc) placeSet.add(loc.toLowerCase());
    const act = e.environmentalData?.classroom?.activity?.toString().trim();
    if (act) activitySet.add(act.toLowerCase());
  }
  for (const s of args.sensoryInputs) {
    const loc = s.location?.trim();
    if (loc) placeSet.add(loc.toLowerCase());
  }
  for (const em of args.emotions) {
    const triggers = (em as any)?.triggers as string[] | undefined;
    if (Array.isArray(triggers)) {
      for (const t of triggers) {
        const v = (t || '').trim();
        if (v) triggerSet.add(v.toLowerCase());
      }
    }
  }
  return {
    places: Array.from(placeSet).slice(0, 16),
    activities: Array.from(activitySet).slice(0, 16),
    triggers: Array.from(triggerSet).slice(0, 24),
  };
}

export function buildEvidenceForPattern(args: {
  entries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  limit?: number;
}): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  const limit = Math.max(1, Math.min(12, args.limit ?? 6));

  // Pick most recent high-intensity emotions
  const recentEmotions = [...args.emotions]
    .filter((e) => typeof e.intensity === 'number')
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
  for (const e of recentEmotions) {
    items.push({
      id: `emotion:${e.id}`,
      kind: 'emotion',
      timestamp: e.timestamp.toISOString(),
      description: `${e.emotion} intensitet ${e.intensity}`,
      metrics: { intensity: e.intensity },
      tags: Array.isArray((e as any)?.triggers) ? ((e as any).triggers as string[]) : undefined,
    });
  }

  // Recent sensory items
  const recentSensory = [...args.sensoryInputs]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, Math.max(0, limit - items.length));
  for (const s of recentSensory) {
    items.push({
      id: `sensory:${s.id}`,
      kind: 'sensory',
      timestamp: s.timestamp.toISOString(),
      description: `${s.sensoryType || s.type || 'sensorisk'} → ${s.response}`,
      metrics: typeof s.intensity === 'number' ? { intensity: s.intensity } : undefined,
      tags: s.location ? [s.location] : undefined,
    });
  }

  // Include recent tracking entries that indicate social/structured activity
  const socialRe = /(group|team|class|klasse|klasserom|student|peer|friminutt|pause|lunsj|kantine|transition|overgang|present|diskusjon|samarbeid|konflikt)/i;
  const trackingSorted = [...args.entries].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  for (const t of trackingSorted) {
    if (items.length >= limit) break;
    const act = t.environmentalData?.classroom?.activity?.toString() || '';
    const soc = t.environmentalData?.socialContext || '';
    const note = t.notes || t.generalNotes || '';
    const text = `${act} ${soc} ${note}`;
    if (socialRe.test(text)) {
      items.push({
        id: `tracking:${t.id}`,
        kind: 'tracking',
        timestamp: t.timestamp.toISOString(),
        description: `${act || soc || 'aktivitet'} · ${note || 'sosial kontekst'}`.trim(),
        tags: [act, soc].filter(Boolean) as string[],
      });
    }
  }

  // Fallback: include 1 generic tracking entry for context
  if (items.length === 0 && args.entries.length > 0) {
    const t = args.entries[args.entries.length - 1];
    items.push({
      id: `tracking:${t.id}`,
      kind: 'tracking',
      timestamp: t.timestamp.toISOString(),
      description: 'Sammendrag fra registrering',
    });
  }

  return items;
}

export function sanitizePlainNorwegian(text: string, allowed: AllowedContexts): string {
  const noMarkdown = text.replace(/[*`_#>]+/g, '');
  const forbiddenTokens = [
    'klasserom', 'skolen', 'skole', 'hjemme', 'huset', 'ute', 'barnehage', 'SFO', 'AKS',
  ].filter((tok) => !allowed.places.includes(tok));
  let sanitized = noMarkdown;
  for (const tok of forbiddenTokens) {
    const re = new RegExp(`(^|\\s)${tok}(en|et|et|)`, 'ig');
    sanitized = sanitized.replace(re, '$1ikke logget sted');
  }
  // Collapse multiple spaces/newlines and normalize bullets to hyphens
  sanitized = sanitized.replace(/[•·]/g, '-').replace(/\s{2,}/g, ' ').replace(/\n{3,}/g, '\n\n');
  return sanitized.trim();
}

