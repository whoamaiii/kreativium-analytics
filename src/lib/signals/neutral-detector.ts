export type NeutralSnapshot = { isNeutral: boolean; stability: number; intensity: number };

// Placeholder implementation: glue to existing detectors is added later.
export async function observeNeutral(): Promise<NeutralSnapshot> {
  // For now, neutral=false with low intensity.
  return { isNeutral: false, stability: 0, intensity: 0.1 };
}
