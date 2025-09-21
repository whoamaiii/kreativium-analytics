export async function canPrecompute(cfg?: unknown): Promise<boolean> {
  // TODO: restore full logic; conservative default allows processing.
  return true;
}

export const deviceConstraints = { canPrecompute } as const;



