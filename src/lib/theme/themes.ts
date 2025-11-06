export type ThemeId = 'regnbueland' | 'rom';

export interface ThemeSpec {
  id: ThemeId;
  nameKey: string; // i18n key
  colors: string[]; // base particle colors
  glowColor: string;
  sfx: 'marimba' | 'synth';
}

export const THEMES: Record<ThemeId, ThemeSpec> = {
  regnbueland: {
    id: 'regnbueland',
    nameKey: 'game.themes.rainbowLand',
    colors: ['#ff9bd3', '#ffd166', '#a0e7e5', '#b4f8c8', '#f4978e', '#a78bfa'],
    glowColor: '#ffd166',
    sfx: 'marimba',
  },
  rom: {
    id: 'rom',
    nameKey: 'game.themes.space',
    colors: ['#7dd3fc', '#c4b5fd', '#93c5fd', '#60a5fa', '#1e40af'],
    glowColor: '#93c5fd',
    sfx: 'synth',
  },
};

export function getTheme(id: ThemeId): ThemeSpec {
  return THEMES[id] ?? THEMES.regnbueland;
}






