import { SignItem } from '@/types/tegn';

// Bulk import all PNGs in the viktige folder via Vite's import.meta.glob
// The keys are file paths, the values are modules with a default export URL
const modules = import.meta.glob('@/assets/signs/viktige/*.png', { eager: true }) as Record<
  string,
  { default: string }
>;

function toTitleCase(input: string): string {
  return input
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractWordFromPath(path: string): string {
  const file = path.split('/').pop() || path;
  const base = file.replace(/\.png$/i, '');
  // Convert filename like "hjelp:help" or "hei" to a nice label
  const withoutColon = base.includes(':') ? base.split(':').pop()! : base;
  return toTitleCase(withoutColon);
}

export const SIGN_ITEMS: SignItem[] = Object.entries(modules)
  .map(([path, mod]) => {
    const word = extractWordFromPath(path);
    const id = `viktige-${word.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      word,
      imageUrl: mod.default,
      alt: word,
    } satisfies SignItem;
  })
  .sort((a, b) => a.word.localeCompare(b.word, 'nb'));
