/**
 * 64-bit FNV-1a hashing and stable hash utilities.
 * - hashStringToHex64: Fast 64-bit FNV-1a over UTF-8 bytes of the input string.
 * - stableHash: Canonical serialize an unknown value and hash to a 64-bit hex string.
 */

import { utf8Encode } from '@/lib/utf8';
import { canonicalSerialize } from '@/lib/canonicalSerialize';

/**
 * Compute 64-bit FNV-1a hash of a string and return a 16-char, zero-padded lowercase hex.
 * Uses BigInt for exact 64-bit arithmetic.
 */
function hashStringToHex64(input: string): string {
  const FNV_OFFSET: bigint = 14695981039346656037n; // 0xcbf29ce484222325
  const FNV_PRIME: bigint = 1099511628211n;         // 0x100000001b3
  const MASK64: bigint = (1n << 64n) - 1n;          // 2^64 - 1

  let hash: bigint = FNV_OFFSET;
  const bytes = utf8Encode(input);

  for (let i = 0; i < bytes.length; i++) {
    hash ^= BigInt(bytes[i]);
    hash = (hash * FNV_PRIME) & MASK64;
  }

  // Convert to hex and zero-pad to 16 characters
  const hex = hash.toString(16);
  return hex.padStart(16, '0');
}

/**
 * Stable hash of any value by canonical serialization followed by 64-bit FNV-1a.
 */
export function stableHash(value: unknown): string {
  const serialized: string = canonicalSerialize(value);
  return hashStringToHex64(serialized);
}

