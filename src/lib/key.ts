// Utility functions for generating stable React keys
// Rules followed: no default exports; explicit typing; place utilities in src/lib (DsE55EPLYAYFxnPOHSkRbL)

export interface IdentifiableLike {
  id?: string | number | null;
  [key: string]: unknown;
}

// Stable JSON stringify with sorted keys to ensure consistent hashing
function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  const stringify = (val: unknown): unknown => {
    if (val === null || typeof val !== 'object') return val;
    if (val instanceof Date) return val.toISOString();
    if (Array.isArray(val)) return val.map(stringify);
    if (seen.has(val as object)) return '[Circular]';
    seen.add(val as object);
    const obj = val as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const out: Record<string, unknown> = {};
    for (const k of keys) {
      out[k] = stringify(obj[k]);
    }
    return out;
  };
  return JSON.stringify(stringify(value));
}

// Simple non-cryptographic hash (djb2) over a string, returning hex
export function hashOfString(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
    hash |= 0; // force 32-bit
  }
  // Convert to unsigned and hex
  return (hash >>> 0).toString(16);
}

// Produce a stable key for list rendering from an object that may or may not have an id
// Preference order: explicit id -> computed hash
 

// Back-compat helper specifically named for pattern items used across analytics panels
export function stableKeyFromPattern(pattern: IdentifiableLike): string {
  if (pattern && (typeof pattern.id === 'string' || typeof pattern.id === 'number')) {
    return String(pattern.id);
  }
  return hashOfString(stableStringify(pattern));
}
