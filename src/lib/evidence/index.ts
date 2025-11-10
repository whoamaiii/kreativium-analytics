import type { EvidenceSource, EvidenceSourceId } from './types';
import { ZEvidenceSource } from './types';
export type { EvidenceSource, EvidenceSourceId } from './types';

let cachedSources: ReadonlyArray<Readonly<EvidenceSource>> | null = null;
let cachePromise: Promise<ReadonlyArray<Readonly<EvidenceSource>>> | null = null;

// Test seam: allow injecting a provider for the JSON data during tests
let evidenceJsonProvider: null | (() => Promise<unknown>) = null;

export function __setEvidenceJsonProvider(provider: null | (() => Promise<unknown>)): void {
  evidenceJsonProvider = provider;
  // Reset caches to ensure deterministic behavior when provider changes in tests
  cachedSources = null;
  cachePromise = null;
}

function freezeSources(items: EvidenceSource[]): ReadonlyArray<Readonly<EvidenceSource>> {
  const frozenItems = items.map((item) => {
    const frozenTags = Object.freeze([...(item.tags ?? [])]) as ReadonlyArray<
      EvidenceSource['tags'][number]
    >;
    const frozenGradeBands = item.gradeBands
      ? (Object.freeze([...item.gradeBands]) as ReadonlyArray<
          NonNullable<EvidenceSource['gradeBands']>[number]
        >)
      : undefined;
    const frozen: EvidenceSource = {
      ...item,
      tags: frozenTags as unknown as EvidenceSource['tags'],
      gradeBands: frozenGradeBands as unknown as EvidenceSource['gradeBands'],
    };
    return Object.freeze(frozen);
  });
  return Object.freeze(frozenItems) as ReadonlyArray<Readonly<EvidenceSource>>;
}

async function fetchAndValidateJson(): Promise<EvidenceSource[]> {
  const moduleOrData = evidenceJsonProvider
    ? await evidenceJsonProvider()
    : await import('@/lib/evidence/ebpSources.json');
  const raw =
    (moduleOrData as unknown as { default?: unknown }).default ??
    (moduleOrData as unknown as unknown);
  try {
    const data = ZEvidenceSource.array().parse(raw);
    return data as EvidenceSource[];
  } catch (e) {
    throw new Error('Invalid evidence sources JSON: validation failed');
  }
}

function cloneForCaller(items: ReadonlyArray<Readonly<EvidenceSource>>): EvidenceSource[] {
  return items.map((s) => ({
    ...s,
    tags: [...s.tags],
    gradeBands: s.gradeBands ? [...s.gradeBands] : undefined,
  }));
}

export async function loadEvidenceSources(): Promise<EvidenceSource[]> {
  if (cachedSources) return cloneForCaller(cachedSources);
  if (!cachePromise) {
    cachePromise = (async () => {
      const sources = await fetchAndValidateJson();
      const frozen = freezeSources(sources);
      cachedSources = frozen; // cache only on success
      return frozen;
    })();
  }
  try {
    const frozen = await cachePromise;
    return cloneForCaller(frozen);
  } catch (_err) {
    return [];
  } finally {
    cachePromise = null;
  }
}

export async function resolveSources(ids: string[]): Promise<EvidenceSource[]> {
  if (!ids || ids.length === 0) return [];
  const all = await loadEvidenceSources();
  // Build case-insensitive index from cached data to ensure consistent lookups
  const index = new Map<string, EvidenceSource>();
  for (const s of all) {
    index.set(s.id.toLowerCase(), s);
  }
  const seen = new Set<string>();
  const resolved: EvidenceSource[] = [];
  for (const id of ids) {
    const key = String(id).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const found = index.get(key);
    if (found) {
      // Return a defensive copy per item
      resolved.push({
        ...found,
        tags: [...found.tags],
        gradeBands: found.gradeBands ? [...found.gradeBands] : undefined,
      });
    }
  }
  return resolved;
}

export { selectEvidence } from './select';
export type { ScoredSource } from './select';
