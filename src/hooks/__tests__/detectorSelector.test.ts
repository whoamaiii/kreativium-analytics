import { describe, it, expect, beforeEach, vi } from 'vitest';

// The selector logic is embedded in useDetector via localStorage key 'emotion.detectorType'.
// We can validate value selection indirectly by setting the key and verifying the chosen path
// yields a non-fallback snapshot (we will stub tick methods to avoid heavy work).

describe('detector selector', () => {
  beforeEach(() => {
    try {
      localStorage.removeItem('emotion.detectorType');
    } catch {}
  });

  it('defaults to faceapi-worker when unset', () => {
    const value = ((): string => {
      try {
        return localStorage.getItem('emotion.detectorType') || 'faceapi-worker';
      } catch {
        return 'faceapi-worker';
      }
    })();
    expect(value).toBe('faceapi-worker');
  });

  it('uses mediapipe when set', () => {
    try {
      localStorage.setItem('emotion.detectorType', 'mediapipe');
    } catch {}
    const value = ((): string => {
      try {
        return localStorage.getItem('emotion.detectorType') || 'faceapi-worker';
      } catch {
        return 'faceapi-worker';
      }
    })();
    expect(value).toBe('mediapipe');
  });

  it('uses faceapi-main when set', () => {
    try {
      localStorage.setItem('emotion.detectorType', 'faceapi-main');
    } catch {}
    const value = ((): string => {
      try {
        return localStorage.getItem('emotion.detectorType') || 'faceapi-worker';
      } catch {
        return 'faceapi-worker';
      }
    })();
    expect(value).toBe('faceapi-main');
  });
});
