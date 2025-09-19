/**
 * Analytics cache key utilities
 *
 * - Deterministic stable serialization (sorted object keys)
 * - Optional order-insensitive array handling (sorts array contents by stable representation)
 * - Stable, fast 32-bit FNV-1a hash of serialized payload
 * - Cache key includes namespace, optional semantic version, structural counts, and payload hash
 * - Self-contained and dependency-free
 *
 * Usage guidance: generate the SAME cache key on both the worker and the React hook side
 * using the same namespace and the same analytics runtime config so they share the cache.
 * Differences in namespace, version, normalizeArrayOrder, or input shape will produce
 * different keys and therefore different cache entries.
 *
 * Example: in a worker (e.g., analytics.worker.ts)
 *
 *   // Inside the worker message handler
 *   // The payload should include inputs and counts (or enough data to recompute counts),
 *   // and you should pass through analyticsConfig to keep the cache key aligned with the UI.
 *   const { payload, analyticsConfig } = event.data;
 *   const key = createCacheKey({
 *     namespace: 'analytics',                  // MUST match the hook's namespace
 *     input: {
 *       inputs: payload.inputs,               // raw inputs used for analytics
 *       counts: payload.counts,               // structural counts or precomputed stats
 *       config: analyticsConfig               // include relevant parts of runtime config
 *     },
 *     version: analyticsConfig?.schemaVersion, // bump to invalidate when algorithm changes
 *     normalizeArrayOrder: true                // only if order does not affect results
 *   });
 *   // Use `key` to read/write your cache store
 *
 * Example: in a React hook (e.g., useAnalyticsWorker)
 *
 *   // When calling the worker or reading the local cache from the UI,
 *   // generate the key from the same semantic inputs and the same config.
 *   // This ensures the UI and the worker share cache entries.
 *   const key = createCacheKey({
 *     namespace: 'analytics',                   // MUST match the worker's namespace
 *     input: {
 *       inputs: { studentId, filters, window }, // hook params or derived inputs
 *       counts: localCounts,                    // optional: same structure as worker expects
 *       config: analyticsConfig                 // same runtime config object (or stable subset)
 *     },
 *     version: analyticsConfig?.schemaVersion,
 *     normalizeArrayOrder: true
 *   });
 *   // Use `key` to check local cache or send with the worker request
 *
 * Notes
 * - Keep the namespace identical between worker and hook to share the same cache space.
 * - Pass the same analyticsConfig (or a stable subset) into the input so versioning/feature
 *   flags impact the key consistently on both sides.
 * - If you set normalizeArrayOrder to true in one place, set it to true everywhere the key
 *   is generated for the same computation.
 */

// Types
export interface CacheKeyOptions<TInput = unknown> {
  /** Logical namespace or feature area for the key. Examples: "analytics", "student-metrics". */
  namespace: string;
  /** Arbitrary input used to build the cache key (e.g., parameters, filters, data slices). */
  input: TInput;
  /**
   * Optional semantic version. Bump when the meaning of inputs or computation changes to
   * invalidate old cache entries without altering call sites.
   */
  version?: string;
  /**
   * If true, arrays in the input are treated as order-insensitive sets: their items are
   * sorted by a stable representation before hashing/serialization. Use this if array order
   * does not affect the computation result. Defaults to false.
   */
  normalizeArrayOrder?: boolean;
}

export interface InputStructureCounts {
  /** Number of array instances found (deep). */
  arrays: number;
  /** Total number of array items across all arrays (deep). */
  arrayItems: number;
  /** Number of plain object instances found (deep). */
  objects: number;
  /** Total number of enumerable keys across all plain objects (deep). */
  keys: number;
  /** Number of primitive leaf values (string, number, boolean, null, undefined, bigint, symbol). */
  primitives: number;
}

// Guards and predicates
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (Object.prototype.toString.call(value) !== "[object Object]") return false;
  const proto = Object.getPrototypeOf(value as object);
  return proto === null || proto === Object.prototype;
}

function isDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function isMap(value: unknown): value is Map<unknown, unknown> {
  return typeof Map !== "undefined" && value instanceof Map;
}

function isSet(value: unknown): value is Set<unknown> {
  return typeof Set !== "undefined" && value instanceof Set;
}

// Stable transform and serialization
/**
 * Convert an input into a JSON-safe structure with:
 * - Sorted object keys for determinism
 * - Optional order-insensitive arrays (items sorted by stable representation)
 * - Stable encodings for Date, Map, and Set
 */
function toStableJSONSafe(value: unknown, normalizeArrays: boolean): unknown {
  // Primitives and special cases first (guard clauses)
  if (value === null || value === undefined) return value;
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") return value;
  if (t === "bigint") return { $type: "BigInt", value: (value as bigint).toString() };
  if (t === "symbol") return { $type: "Symbol", value: String(value as symbol) };
  if (t === "function") {
    const fn = value as (...args: unknown[]) => unknown;
    return { $type: "Function", value: fn.name || "anonymous" };
  }

  if (isDate(value)) {
    return { $type: "Date", value: value.toISOString() };
  }
  if (isSet(value)) {
    const arr = Array.from(value).map((v) => toStableJSONSafe(v, normalizeArrays));
    const sorted = arr
      .map((v) => ({ v, k: JSON.stringify(v) }))
      .sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0))
      .map((x) => x.v);
    return { $type: "Set", value: sorted };
  }
  if (isMap(value)) {
    const entries = Array.from(value.entries()).map(([k, v]) => [
      toStableJSONSafe(k, normalizeArrays),
      toStableJSONSafe(v, normalizeArrays)
    ] as const);
    const sorted = entries
      .map((e) => ({ e, k: JSON.stringify(e[0]) }))
      .sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0))
      .map((x) => x.e);
    return { $type: "Map", value: sorted };
  }

  if (Array.isArray(value)) {
    const mapped = value.map((v) => toStableJSONSafe(v, normalizeArrays));
    if (!normalizeArrays) return mapped;
    // Sort array items by their JSON representation to treat arrays as sets
    return mapped
      .map((v) => ({ v, k: JSON.stringify(v) }))
      .sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0))
      .map((x) => x.v);
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const out: Record<string, unknown> = {};
    for (const k of keys) {
      out[k] = toStableJSONSafe((value as Record<string, unknown>)[k], normalizeArrays);
    }
    return out;
  }

  // Fallback for other objects (e.g., class instances)
  try {
    // Attempt valueOf, then toString for a deterministic representation
    const valOf = (value as { valueOf?: () => unknown }).valueOf?.();
    if (valOf !== value && valOf !== undefined) {
      return toStableJSONSafe(valOf, normalizeArrays);
    }
  } catch {
    // ignore and fall through
  }
  return { $type: (value as object)?.constructor?.name || "Object", value: String(value) };
}

/**
 * Serialize a value deterministically.
 * - Objects are key-sorted
 * - Dates, Maps, Sets, BigInt, Symbol, Function receive stable encodings
 * - Optionally sorts array items to make arrays order-insensitive
 */
export function stableSerialize(value: unknown, normalizeArrayOrder: boolean = false): string {
  const safe = toStableJSONSafe(value, normalizeArrayOrder);
  return JSON.stringify(safe);
}

// Hashing (FNV-1a 32-bit) over UTF-8 bytes
function toUtf8Bytes(input: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(input);
  }
  // Minimal UTF-8 encoding fallback
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6));
      bytes.push(0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(0xe0 | (code >> 12));
      bytes.push(0x80 | ((code >> 6) & 0x3f));
      bytes.push(0x80 | (code & 0x3f));
    } else {
      // Surrogate pair
      i++;
      const next = input.charCodeAt(i);
      const cp = 0x10000 + (((code & 0x3ff) << 10) | (next & 0x3ff));
      bytes.push(0xf0 | (cp >> 18));
      bytes.push(0x80 | ((cp >> 12) & 0x3f));
      bytes.push(0x80 | ((cp >> 6) & 0x3f));
      bytes.push(0x80 | (cp & 0x3f));
    }
  }
  return new Uint8Array(bytes);
}

/**
 * Compute a stable, fast 32-bit FNV-1a hash of the provided value.
 * Note: collisions are possible as with any 32-bit hash; combine with counts or a version.
 */
export function stableHash(value: unknown, normalizeArrayOrder: boolean = false): string {
  const s = typeof value === "string" ? value : stableSerialize(value, normalizeArrayOrder);
  const data = toUtf8Bytes(s);
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < data.length; i++) {
    hash ^= data[i];
    // 32-bit multiplication with FNV prime 16777619
    hash = (hash >>> 0) * 0x01000193;
  }
  // Unsigned 32-bit hex
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  return hex;
}

/**
 * Traverse the input and compute structural counts useful for cache key prefixes.
 * These counts help differentiate inputs with the same hash length-wise and aid debugging.
 */
export function summarizeCounts(value: unknown): InputStructureCounts {
  const counts: InputStructureCounts = {
    arrays: 0,
    arrayItems: 0,
    objects: 0,
    keys: 0,
    primitives: 0
  };

  const visit = (v: unknown): void => {
    if (v === null || v === undefined) {
      counts.primitives += 1;
      return;
    }
    const t = typeof v;
    if (t === "string" || t === "number" || t === "boolean" || t === "bigint" || t === "symbol" || t === "function") {
      counts.primitives += 1;
      return;
    }
    if (isDate(v) || isSet(v) || isMap(v)) {
      // Treat special objects as objects for counting; expand into their iterable contents
      if (isDate(v)) {
        counts.objects += 1;
        counts.keys += 1; // { $type, value }
        counts.primitives += 1; // value string
        return;
      }
      if (isSet(v)) {
        counts.objects += 1;
        counts.arrays += 1;
        const items = (v as Set<unknown>).size;
        counts.arrayItems += items;
        for (const item of v as Set<unknown>) visit(item);
        return;
      }
      if (isMap(v)) {
        counts.objects += 1;
        counts.arrays += 1; // map encoded as array of entries
        const items = (v as Map<unknown, unknown>).size;
        counts.arrayItems += items;
        for (const [k, val] of v as Map<unknown, unknown>) {
          visit(k);
          visit(val);
        }
        return;
      }
    }

    if (Array.isArray(v)) {
      counts.arrays += 1;
      counts.arrayItems += v.length;
      for (const item of v) visit(item);
      return;
    }
    if (isPlainObject(v)) {
      counts.objects += 1;
      const ks = Object.keys(v as Record<string, unknown>);
      counts.keys += ks.length;
      for (const k of ks) visit((v as Record<string, unknown>)[k]);
      return;
    }
    // Fallback unrecognized object
    counts.objects += 1;
    counts.keys += 1;
  };

  visit(value);
  return counts;
}

/**
 * Build a deterministic cache key string for analytics computations.
 *
 * Behavior:
 * - Deterministic: the same input produces the same key across sessions and platforms
 *   (object keys are sorted; Dates/Maps/Sets have stable encodings).
 * - Includes structural counts (arrays, items, objects, keys, primitives) to improve uniqueness
 *   and aid observability while maintaining a compact key.
 * - Includes a stable hash of the input payload.
 * - Optional semantic version allows bulk invalidation when algorithms change.
 *
 * Order-insensitive arrays:
 * - If normalizeArrayOrder is true, arrays are treated as sets: their items are sorted by a
 *   stable representation. Only enable this when array order does not affect computation.
 *   Enabling this when order matters can cause different inputs to map to the same key.
 */
export function createCacheKey<TInput = unknown>(options: CacheKeyOptions<TInput>): string {
  const { namespace, input, version, normalizeArrayOrder = false } = options;

  // Guard clauses
  if (!namespace || typeof namespace !== "string") {
    throw new Error("createCacheKey: 'namespace' must be a non-empty string");
  }

  const counts = summarizeCounts(input);
  const hash = stableHash(input, normalizeArrayOrder);

  const parts: string[] = [];
  parts.push(namespace);
  if (version) parts.push(`v${version}`);
  parts.push(
    `c${counts.arrays}`,
    `i${counts.arrayItems}`,
    `o${counts.objects}`,
    `k${counts.keys}`,
    `p${counts.primitives}`
  );
  parts.push(hash);

  return parts.join(":");
}
