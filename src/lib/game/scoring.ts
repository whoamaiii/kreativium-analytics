export interface ScoringInput {
  /** Millisekunder brukt til å klare runden. */
  timeToSuccessMs: number;
  /** Brukte vi hint? Reduserer stjerner/poeng litt. */
  usedHint: boolean;
  /** Sammenhengende tid over terskel ved avslutning. */
  stabilityMs?: number;
  /** Intensitet ved avslutning (0..1). */
  intensity?: number;
  /** Gjeldende kombinasjon/streak i UI. */
  combo?: number;
  /** Perfekt‑vindu truffet. */
  perfect?: boolean;
}

export interface ScoringResult {
  stars: 1 | 2 | 3;
  xp: number;
  bonuses: { combo: number; perfect: number; stability: number; intensity: number };
}

/**
 * Fargerik, generøs scoring som belønner intensitet og stabilitet uten å straffe hardt.
 */
export function scoreRound(input: ScoringInput): ScoringResult {
  const { timeToSuccessMs, usedHint } = input;
  let stars: 1 | 2 | 3 = 1;
  if (timeToSuccessMs < 1400) stars = 3;
  else if (timeToSuccessMs < 2800) stars = 2;
  if (usedHint) stars = Math.max(1, (stars - 1) as 1 | 2 | 3) as 1 | 2 | 3;

  const combo = Math.max(1, Math.floor(input.combo ?? 1));
  const perfectBonus = input.perfect ? 6 : 0;
  const stabilityBonus = Math.min(8, Math.floor((input.stabilityMs ?? 0) / 300));
  const intensityBonus = Math.min(8, Math.floor((input.intensity ?? 0) * 8));
  const comboBonus = Math.min(12, Math.max(0, (combo - 1) * 2));

  const base = 12 + (stars - 1) * 4;
  const xp = base + comboBonus + perfectBonus + stabilityBonus + intensityBonus;

  return {
    stars,
    xp,
    bonuses: {
      combo: comboBonus,
      perfect: perfectBonus,
      stability: stabilityBonus,
      intensity: intensityBonus,
    },
  };
}
