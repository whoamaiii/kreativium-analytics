/**
 * Calculate Euclidean distance between two points.
 *
 * @param point1 - First point as number array
 * @param point2 - Second point as number array
 * @returns Euclidean distance between the two points
 */
export function euclideanDistance(point1: number[], point2: number[]): number {
  return Math.sqrt(point1.reduce((sum, val, i) => sum + Math.pow(val - point2[i], 2), 0));
}

/**
 * Normalize features to 0-1 range using min-max normalization.
 *
 * @param features - 2D array of feature vectors
 * @returns Normalized feature vectors with values in [0, 1] range
 */
export function normalizeFeatures(features: number[][]): number[][] {
  const dimensions = features[0].length;
  const mins = new Array(dimensions).fill(Infinity);
  const maxs = new Array(dimensions).fill(-Infinity);

  // Find min and max for each dimension
  features.forEach((feature) => {
    feature.forEach((val, i) => {
      mins[i] = Math.min(mins[i], val);
      maxs[i] = Math.max(maxs[i], val);
    });
  });

  // Normalize
  return features.map((feature) =>
    feature.map((val, i) => {
      const range = maxs[i] - mins[i];
      return range === 0 ? 0 : (val - mins[i]) / range;
    }),
  );
}
