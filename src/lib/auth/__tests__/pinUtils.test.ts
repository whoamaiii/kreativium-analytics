/**
 * @fileoverview Tests for PIN security utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashPin, verifyPin, validatePinComplexity } from '../pinUtils';

// Mock the Web Crypto API for consistent testing
const mockDigest = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  // Setup crypto.subtle.digest mock
  mockDigest.mockImplementation(async (_algorithm: string, data: ArrayBuffer) => {
    // Create a simple mock hash based on input
    const view = new Uint8Array(data);
    const mockHash = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      mockHash[i] = (view[i % view.length] + i) % 256;
    }
    return mockHash.buffer;
  });

  // @ts-expect-error - Mocking crypto for tests
  global.crypto = {
    subtle: {
      digest: mockDigest,
    },
  };
});

describe('hashPin', () => {
  it('returns a hex string', async () => {
    const hash = await hashPin('1234');
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('returns consistent hash for same input', async () => {
    const hash1 = await hashPin('5678');
    const hash2 = await hashPin('5678');
    expect(hash1).toBe(hash2);
  });

  it('returns different hashes for different inputs', async () => {
    const hash1 = await hashPin('1111');
    const hash2 = await hashPin('2222');
    expect(hash1).not.toBe(hash2);
  });

  it('returns 64 character hex string (SHA-256)', async () => {
    const hash = await hashPin('9999');
    expect(hash.length).toBe(64);
  });
});

describe('verifyPin', () => {
  it('returns true for matching PIN and hash', async () => {
    const pin = '4567';
    const hash = await hashPin(pin);
    const isValid = await verifyPin(pin, hash);
    expect(isValid).toBe(true);
  });

  it('returns false for non-matching PIN', async () => {
    const hash = await hashPin('1234');
    const isValid = await verifyPin('5678', hash);
    expect(isValid).toBe(false);
  });

  it('returns false for empty PIN', async () => {
    const hash = await hashPin('1234');
    const isValid = await verifyPin('', hash);
    expect(isValid).toBe(false);
  });

  it('handles errors gracefully and returns false', async () => {
    mockDigest.mockRejectedValueOnce(new Error('Crypto error'));
    const isValid = await verifyPin('1234', 'somehash');
    expect(isValid).toBe(false);
  });
});

describe('validatePinComplexity', () => {
  describe('valid PINs', () => {
    it('accepts 4-digit PIN', () => {
      const result = validatePinComplexity('4829');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts 5-digit PIN', () => {
      const result = validatePinComplexity('48291');
      expect(result.valid).toBe(true);
    });

    it('accepts 6-digit PIN', () => {
      const result = validatePinComplexity('482917');
      expect(result.valid).toBe(true);
    });
  });

  describe('empty/invalid format', () => {
    it('rejects empty PIN', () => {
      const result = validatePinComplexity('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tom');
    });

    it('rejects whitespace-only PIN', () => {
      const result = validatePinComplexity('   ');
      expect(result.valid).toBe(false);
    });

    it('rejects PIN with letters', () => {
      const result = validatePinComplexity('12ab');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tall');
    });

    it('rejects PIN with special characters', () => {
      const result = validatePinComplexity('12#4');
      expect(result.valid).toBe(false);
    });
  });

  describe('length requirements', () => {
    it('rejects PIN shorter than 4 digits', () => {
      const result = validatePinComplexity('123');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('minst 4');
    });

    it('rejects PIN longer than 6 digits', () => {
      const result = validatePinComplexity('1234567');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('maksimalt');
    });
  });

  describe('weak PIN detection', () => {
    it('rejects 1234', () => {
      const result = validatePinComplexity('1234');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('enkel');
    });

    it('rejects 0000', () => {
      const result = validatePinComplexity('0000');
      expect(result.valid).toBe(false);
    });

    it('rejects repeated digits (1111, 2222, etc.)', () => {
      for (let i = 0; i <= 9; i++) {
        const pin = `${i}${i}${i}${i}`;
        const result = validatePinComplexity(pin);
        expect(result.valid).toBe(false);
      }
    });
  });

  describe('sequential pattern detection', () => {
    it('rejects ascending sequence 1234', () => {
      // Already caught by weak PINs
      const result = validatePinComplexity('1234');
      expect(result.valid).toBe(false);
    });

    it('rejects ascending sequence 2345', () => {
      const result = validatePinComplexity('2345');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('sekvens');
    });

    it('rejects ascending sequence 56789', () => {
      const result = validatePinComplexity('56789');
      expect(result.valid).toBe(false);
    });

    it('rejects descending sequence 4321', () => {
      const result = validatePinComplexity('4321');
      expect(result.valid).toBe(false);
    });

    it('rejects descending sequence 9876', () => {
      const result = validatePinComplexity('9876');
      expect(result.valid).toBe(false);
    });
  });

  describe('valid complex PINs', () => {
    it('accepts non-sequential, non-repeated PINs', () => {
      const validPins = ['1357', '2468', '9753', '8024', '1928', '7531'];
      for (const pin of validPins) {
        const result = validatePinComplexity(pin);
        expect(result.valid).toBe(true);
      }
    });
  });
});
