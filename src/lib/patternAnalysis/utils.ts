/**
 * Module: patternAnalysis/utils
 *
 * Purpose:
 * - Utility functions for pattern analysis
 * - Data transformation and conversion helpers
 */

import { SensoryEntry } from "@/types/student";
import { format } from "date-fns";

/**
 * Groups sensory inputs by day (yyyy-MM-dd format)
 *
 * @param sensoryInputs - Array of sensory entries to group
 * @returns Record mapping date strings to count of sensory inputs
 */
export function groupSensoryByDay(sensoryInputs: SensoryEntry[]): Record<string, number> {
  return sensoryInputs.reduce((acc, input) => {
    const date = format(input.timestamp, 'yyyy-MM-dd');
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Converts lighting condition string to numeric value for statistical analysis
 *
 * @param lighting - Lighting condition string (dim, normal, bright, fluorescent, natural)
 * @returns Numeric value representing lighting quality (1-3.5)
 */
export function convertLightingToNumeric(lighting?: string): number {
  const lightingMap: Record<string, number> = {
    'dim': 1,
    'normal': 2,
    'bright': 3,
    'fluorescent': 2.5,
    'natural': 3.5
  };
  return lightingMap[lighting?.toLowerCase() || ''] || 2;
}
