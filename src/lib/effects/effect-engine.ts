export interface EffectParams {
  /** Antall partikler i konfetti/eksplosjoner. */
  particleCount: number;
  /** Fargemetning 0..1 for temaets palett. */
  colorSaturation: number;
  /** Ytre glød rundt ramme/overlay (0..1). */
  glowStrength: number;
  /** Lydstyrke for sfx (0..1). */
  sfxGain: number;
}

export interface EffectInput {
  intensity: number; // 0..1
  stabilityMs: number; // ms
  reactionTimeMs: number; // ms (lavt er bra)
}

/**
 * Map avledede signaler → visuelle/lyd‑parametere.
 */
export function mapEffects(input: EffectInput): EffectParams {
  const intensity = clamp01(input.intensity);
  const stabilityS = input.stabilityMs / 1000;
  const fast = input.reactionTimeMs <= 1200 ? 1 : input.reactionTimeMs <= 2400 ? 0.7 : 0.4;

  const particleCount = Math.round(80 + intensity * 120 + Math.min(80, stabilityS * 30));
  const colorSaturation = clamp01(0.6 + intensity * 0.4);
  const glowStrength = clamp01(0.2 + intensity * 0.6 + Math.min(0.2, stabilityS * 0.1));
  const sfxGain = clamp01(0.08 + intensity * 0.25) * fast;

  return { particleCount, colorSaturation, glowStrength, sfxGain };
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
