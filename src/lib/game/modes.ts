export type GameMode = 'classic' | 'time_attack' | 'confidence' | 'mirror';

export interface ModeDefinition {
  id: GameMode;
  labelKey: string; // i18n key, fallback to raw label
  descriptionKey?: string; // optional i18n description
}

export const MODES: ModeDefinition[] = [
  { id: 'classic', labelKey: 'game.modes.classic' },
  { id: 'time_attack', labelKey: 'game.modes.timeAttack' },
  { id: 'confidence', labelKey: 'game.modes.confidence' },
  { id: 'mirror', labelKey: 'game.modes.mirror' },
];

export function getModeLabel(mode: GameMode): string {
  switch (mode) {
    case 'classic':
      return 'game.modes.classic';
    case 'time_attack':
      return 'game.modes.timeAttack';
    case 'confidence':
      return 'game.modes.confidence';
    case 'mirror':
      return 'game.modes.mirror';
    default:
      return String(mode);
  }
}
