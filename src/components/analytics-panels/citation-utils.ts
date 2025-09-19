import type { SourceItem } from '@/types/analytics';

export interface CitationListItem {
  key: string;
  source: SourceItem;
}

export const CHAT_CITATION_LIMIT = 10;

export function buildCitationList(
  sources: SourceItem[] | undefined,
  limit: number = CHAT_CITATION_LIMIT
): CitationListItem[] {
  const safeLimit = Math.max(0, limit);
  if (safeLimit === 0) return [];
  const safeSources = sources ?? [];
  if (safeSources.length === 0) return [];
  const windowed = safeSources.slice(-safeLimit);
  return windowed.map((source, idx) => ({ key: `S${idx + 1}`, source }));
}


