/**
 * @file Range utility functions for filter operations.
 *
 * Extracted from FiltersDrawer.tsx to eliminate code duplication.
 * See CODE_QUALITY_AUDIT.md Section 5 for rationale.
 */

/**
 * Clamp a numeric range to be within bounds [0, max].
 *
 * @param range - The range tuple to clamp, or undefined
 * @param max - The maximum value (default: 5, for intensity scales)
 * @returns The clamped range, or undefined if input was undefined
 *
 * @example
 * clampRange([0, 10], 5) // returns [0, 5]
 * clampRange([-1, 3], 5) // returns [0, 3]
 * clampRange(undefined, 5) // returns undefined
 */
export function clampRange(
  range?: [number, number],
  max = 5,
): [number, number] | undefined {
  if (!range) return undefined;

  return [
    Math.max(0, Math.min(range[0], max)),
    Math.max(0, Math.min(range[1], max)),
  ] as [number, number];
}

/**
 * Check if a value falls within a range (inclusive).
 *
 * @param value - The value to check
 * @param range - The range to check against
 * @returns True if value is within range (inclusive)
 */
export function isInRange(value: number, range: [number, number]): boolean {
  return value >= range[0] && value <= range[1];
}

/**
 * Normalize a value from one range to another.
 *
 * @param value - The value to normalize
 * @param fromRange - The source range
 * @param toRange - The target range
 * @returns The normalized value
 */
export function normalizeToRange(
  value: number,
  fromRange: [number, number],
  toRange: [number, number],
): number {
  const [fromMin, fromMax] = fromRange;
  const [toMin, toMax] = toRange;

  // Handle edge case where source range has no span
  if (fromMax === fromMin) return toMin;

  const normalized = (value - fromMin) / (fromMax - fromMin);
  return toMin + normalized * (toMax - toMin);
}
