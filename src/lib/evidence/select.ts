import { loadEvidenceSources } from '@/lib/evidence/index';
import type { EvidenceSource } from '@/lib/evidence/types';
import { DomainTag, EvidenceLevel, GradeBand } from '@/lib/evidence/types';

export function normalizeTags(input: Array<string | DomainTag>): DomainTag[] {
  const valid = new Set<DomainTag>();
  for (const t of input ?? []) {
    const s = String(t).toLowerCase() as string;
    if ((Object.values(DomainTag) as string[]).includes(s)) {
      valid.add(s as DomainTag);
    }
  }
  return Array.from(valid);
}

export function mapCategoryToTags(category: string): DomainTag[] {
  const c = String(category ?? '').toLowerCase();
  switch (c) {
    case 'behavioral':
    case 'behavioural':
      return [DomainTag.Behavior, DomainTag.PBIS, DomainTag.FBA];
    case 'academic':
      return [DomainTag.UDL, DomainTag.HLP];
    case 'social':
      return [DomainTag.Behavior, DomainTag.PBIS];
    case 'sensory':
      return [DomainTag.Sensory, DomainTag.Autism, DomainTag.UDL];
    case 'communication':
      return [DomainTag.AAC, DomainTag.UDL, DomainTag.HLP];
    default:
      return [];
  }
}

export function inferTagsFromText(text: string): DomainTag[] {
  const t = String(text ?? '').toLowerCase();
  const hits = new Set<DomainTag>();

  const contains = (subs: string[]) => subs.some((s) => t.includes(s));

  // Reading
  if (
    contains([
      'phonics',
      'phonem', // matches phoneme/phonemic
      'reading',
      'fluency',
      'decode', // matches decode/decoding
      'decoding',
      'oral reading',
      'comprehension',
      'literacy',
    ])
  ) {
    hits.add(DomainTag.Reading);
  }

  // Writing
  if (contains(['writing', 'composition', 'handwriting', 'compose', 'spelling', 'spell'])) {
    hits.add(DomainTag.Writing);
  }

  // Math
  if (
    contains([
      'math',
      'mathematics',
      'numeracy',
      'algebra',
      'number',
      'count',
      'addition',
      'subtraction',
      'fractions',
      'math facts',
    ])
  ) {
    hits.add(DomainTag.Math);
  }

  // Behavior / FBA
  if (
    contains([
      'behavior',
      'behaviour',
      'fba',
      'pbis',
      'intervention',
      'antecedent',
      'escape',
      'attention',
      'function',
      'abc',
      'tantrum',
    ])
  ) {
    hits.add(DomainTag.Behavior);
    hits.add(DomainTag.FBA);
  }

  // AAC (require context for generic "device")
  const aacContext = t.includes('aac') || t.includes('communication');
  if (
    contains(['aac', 'communication device', 'communication board', 'augmentative', 'speech generating']) ||
    (aacContext && t.includes('device'))
  ) {
    hits.add(DomainTag.AAC);
  }

  return Array.from(hits);
}

export type ScoredSource = { source: EvidenceSource; score: number };

export function scoreSources(
  sources: EvidenceSource[],
  tags: DomainTag[],
  keywordHits: DomainTag[],
  fallbackWeight = 0.1,
  weights?: Map<DomainTag, number>
): ScoredSource[] {
  const tagSet = new Set(tags);
  const kwSet = new Set(keywordHits);

  const TAG_WEIGHT_TOTAL = 0.6;
  const KW_WEIGHT_TOTAL = 0.3;
  const FALLBACK_WEIGHT_TOTAL = 0.1;

  const hasWeights = weights && weights.size > 0;
  const sumInputWeights = hasWeights ? Array.from(weights!.values()).reduce((a, b) => a + (b || 0), 0) : undefined;
  const safeNormalize = (x: number, denom: number) => (denom > 0 ? Math.min(1, x / denom) : 0);

  return sources.map((s) => {
    let score = 0;

    const srcTags = s.tags ?? [];
    if (hasWeights) {
      // Weighted: sum weights of matching tags and normalize by total provided weight
      const matchedWeight = srcTags.reduce((sum, tg) => sum + (weights!.get(tg) ?? 0), 0);
      score += TAG_WEIGHT_TOTAL * safeNormalize(matchedWeight, sumInputWeights!);
    } else {
      // Legacy: uniform counts
      const matchedTagCount = srcTags.filter((tg) => tagSet.has(tg)).length;
      if (matchedTagCount > 0) {
        score += TAG_WEIGHT_TOTAL * Math.min(1, matchedTagCount / Math.max(1, tags.length));
      }
    }

    // Keywords remain uniform; they come from text inference which is low-signal
    const matchedKwCount = srcTags.filter((tg) => kwSet.has(tg)).length;
    if (matchedKwCount > 0) {
      score += KW_WEIGHT_TOTAL * Math.min(1, matchedKwCount / Math.max(1, keywordHits.length));
    }

    if (score === 0) {
      score += typeof fallbackWeight === 'number' ? fallbackWeight : FALLBACK_WEIGHT_TOTAL;
    }

    return { source: s, score };
  });
}

export function filterAndBreakTies(
  scored: ScoredSource[],
  gradeBand?: GradeBand,
  ensureFramework = true
): ScoredSource[] {
  let filtered = scored;
  if (gradeBand) {
    filtered = filtered.filter(({ source }) => {
      const gb = source.gradeBands ?? [];
      return gb.length === 0 || gb.includes(gradeBand);
    });
  }

  // Optional: bump UDL/HLP to ensure one framework item is likely included
  if (ensureFramework) {
    const hasFramework = filtered.some(({ source }) => source.tags?.some((t) => t === DomainTag.UDL || t === DomainTag.HLP));
    if (!hasFramework) {
      filtered = filtered.map((it) => {
        const isFramework = it.source.tags?.some((t) => t === DomainTag.UDL || t === DomainTag.HLP) ?? false;
        return isFramework ? { ...it, score: it.score + 0.01 } : it;
      });
    }
  }

  const levelRank = (lvl?: EvidenceLevel) =>
    lvl === EvidenceLevel.Strong ? 3 : lvl === EvidenceLevel.Moderate ? 2 : lvl === EvidenceLevel.Emerging ? 1 : 0;

  // Sort by score desc, then evidence level, then year desc
  return filtered
    .slice()
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const la = levelRank(a.source.evidenceLevel);
      const lb = levelRank(b.source.evidenceLevel);
      if (lb !== la) return lb - la;
      const ya = a.source.year ?? 0;
      const yb = b.source.year ?? 0;
      return yb - ya;
    });
}

export async function selectEvidence(
  domainTags: Array<string | DomainTag>,
  limit = 5,
  opts?: { gradeBand?: GradeBand; category?: string; text?: string; enforceDiversity?: boolean }
): Promise<EvidenceSource[]> {
  const all = await loadEvidenceSources();

  const inputTags = normalizeTags(domainTags);
  const categoryTags = normalizeTags(mapCategoryToTags(opts?.category ?? ''));
  const inferredTags = normalizeTags(inferTagsFromText(opts?.text ?? ''));

  const mergedTagSet = new Set<DomainTag>([...inputTags, ...categoryTags]);
  const tags = Array.from(mergedTagSet);
  const keywords = inferredTags;

  const scored = scoreSources(all, tags, keywords, 0.1);
  const withTieBreaks = filterAndBreakTies(scored, opts?.gradeBand, true);

  const enforceDiversity = opts?.enforceDiversity ?? true;
  let ordered = withTieBreaks;
  if (enforceDiversity && limit <= 5) {
    // Apply framework diversity capping
    const frameworkOrder: DomainTag[] = [
      DomainTag.UDL,
      DomainTag.HLP,
      DomainTag.PBIS,
      DomainTag.FBA,
      DomainTag.AAC,
      DomainTag.Autism,
      DomainTag.Sensory,
    ];
    const capPerFramework = 2;
    const counts = new Map<DomainTag, number>();
    const selected: typeof withTieBreaks = [];
    const skipped: typeof withTieBreaks = [];

    const pickPrimary = (s: EvidenceSource): DomainTag | null => {
      const tags = s.tags ?? [];
      for (const fw of frameworkOrder) {
        if (tags.includes(fw)) return fw;
      }
      return null;
    };

    for (const item of withTieBreaks) {
      const fw = pickPrimary(item.source);
      if (!fw) {
        selected.push(item);
        continue;
      }
      const n = counts.get(fw) ?? 0;
      if (n < capPerFramework || selected.length < limit) {
        selected.push(item);
        counts.set(fw, n + 1);
      } else {
        skipped.push(item);
      }
      if (selected.length >= limit) break;
    }

    // Backfill from skipped (ignoring caps) if we didn't fill the limit
    if (selected.length < limit) {
      for (const item of skipped) {
        if (selected.length >= limit) break;
        selected.push(item);
      }
      if (selected.length < limit) {
        for (const item of withTieBreaks) {
          if (selected.length >= limit) break;
          if (!selected.includes(item)) selected.push(item);
        }
      }
    }

    ordered = selected.length > 0 ? selected : withTieBreaks;
  }

  // Deduplicate and immutably return copies
  const byId = new Map<string, EvidenceSource>();
  for (const { source } of ordered) {
    if (!byId.has(source.id)) {
      byId.set(source.id, {
        ...source,
        tags: [...(source.tags ?? [])],
        gradeBands: source.gradeBands ? [...source.gradeBands] : undefined,
      });
    }
    if (byId.size >= limit) break;
  }

  return Array.from(byId.values()).slice(0, limit);
}

export async function selectEvidenceWeighted(
  tagsWithWeights: Array<{ tag: DomainTag; weight: number }>,
  limit = 5,
  opts?: { gradeBand?: GradeBand; category?: string; text?: string; enforceDiversity?: boolean }
): Promise<EvidenceSource[]> {
  const all = await loadEvidenceSources();

  // Normalize/aggregate weights for duplicates
  const weights = new Map<DomainTag, number>();
  for (const { tag, weight } of tagsWithWeights || []) {
    const t = String(tag).toLowerCase() as DomainTag;
    if ((Object.values(DomainTag) as string[]).includes(t)) {
      weights.set(t, (weights.get(t) ?? 0) + (typeof weight === 'number' ? Math.max(0, weight) : 0));
    }
  }

  // Merge with category/text-inferred tags using small default weights
  const categoryTags = normalizeTags(mapCategoryToTags(opts?.category ?? ''));
  for (const t of categoryTags) weights.set(t, Math.max(weights.get(t) ?? 0, 0.25));
  const inferredTags = normalizeTags(inferTagsFromText(opts?.text ?? ''));
  for (const t of inferredTags) weights.set(t, Math.max(weights.get(t) ?? 0, 0.15));

  const tags = Array.from(weights.keys());
  const keywords = inferredTags; // for KW_WEIGHT_TOTAL logic

  const scored = scoreSources(all, tags, keywords, 0.1, weights);
  const withTieBreaks = filterAndBreakTies(scored, opts?.gradeBand, true);

  const enforceDiversity = opts?.enforceDiversity ?? true;
  let ordered = withTieBreaks;
  if (enforceDiversity && limit <= 5) {
    // Apply same framework diversity as selectEvidence
    const frameworkOrder: DomainTag[] = [
      DomainTag.UDL,
      DomainTag.HLP,
      DomainTag.PBIS,
      DomainTag.FBA,
      DomainTag.AAC,
      DomainTag.Autism,
      DomainTag.Sensory,
    ];
    const capPerFramework = 2;
    const counts = new Map<DomainTag, number>();
    const selected: typeof withTieBreaks = [];
    const skipped: typeof withTieBreaks = [];

    const pickPrimary = (s: EvidenceSource): DomainTag | null => {
      const tags = s.tags ?? [];
      for (const fw of frameworkOrder) {
        if (tags.includes(fw)) return fw;
      }
      return null;
    };

    for (const item of withTieBreaks) {
      const fw = pickPrimary(item.source);
      if (!fw) {
        selected.push(item);
        continue;
      }
      const n = counts.get(fw) ?? 0;
      if (n < capPerFramework || selected.length < limit) {
        selected.push(item);
        counts.set(fw, n + 1);
      } else {
        skipped.push(item);
      }
      if (selected.length >= limit) break;
    }

    // Backfill from skipped if we didn't fill the limit
    if (selected.length < limit) {
      for (const item of skipped) {
        if (selected.length >= limit) break;
        selected.push(item);
      }
      if (selected.length < limit) {
        for (const item of withTieBreaks) {
          if (selected.length >= limit) break;
          if (!selected.includes(item)) selected.push(item);
        }
      }
    }

    ordered = selected.length > 0 ? selected : withTieBreaks;
  }

  const byId = new Map<string, EvidenceSource>();
  for (const { source } of ordered) {
    if (!byId.has(source.id)) {
      byId.set(source.id, {
        ...source,
        tags: [...(source.tags ?? [])],
        gradeBands: source.gradeBands ? [...source.gradeBands] : undefined,
      });
    }
    if (byId.size >= limit) break;
  }
  return Array.from(byId.values()).slice(0, limit);
}
