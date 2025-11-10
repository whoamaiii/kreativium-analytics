// src/types/analytics-cache.ts
// Shared types for analytics cache key generation

export interface GenerateAnalyticsCacheKeyOptions {
  // Logical name for the computation (e.g., "timeseries:engagement")
  namespace: string;
  // Any input(s) that influence analytics; can be primitives, arrays, objects (nested supported)
  inputs?: unknown;
  // Explicit counts (e.g., eventsCount, usersCount). A single number or a record of named counts
  counts?: number | Record<string, number>;
  // Full analytics configuration object (or subset) to ensure config changes invalidate the cache
  config?: unknown;
  // Used for future algorithm changes. Defaults to 1
  version?: number;
}
