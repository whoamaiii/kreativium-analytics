/**
 * @file faceApiLoader.ts
 * Singleton loader for @vladmandic/face-api models
 *
 * This module prevents duplicate model loading by maintaining a single
 * loading state and promise that can be shared across multiple components.
 */

import * as faceapi from '@vladmandic/face-api';

/** Loading state */
let loadingPromise: Promise<void> | null = null;
let isLoaded = false;

/**
 * Ensures face-api models are loaded exactly once.
 * Multiple concurrent calls will share the same loading promise.
 *
 * @param modelBaseUrl - Base URL for model files (default: '/models')
 * @returns Promise that resolves when models are ready
 *
 * @example
 * ```ts
 * await ensureFaceApiModels();
 * // Models are now ready to use
 * ```
 */
export async function ensureFaceApiModels(modelBaseUrl: string = '/models'): Promise<void> {
  // If already loaded, return immediately
  if (isLoaded) {
    return;
  }

  // If currently loading, return existing promise
  if (loadingPromise) {
    return loadingPromise;
  }

  // Start loading
  loadingPromise = (async () => {
    try {
      // Load required models
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelBaseUrl),
        faceapi.nets.faceExpressionNet.loadFromUri(modelBaseUrl),
      ]);

      isLoaded = true;
    } catch (error) {
      // Reset state on failure to allow retry
      loadingPromise = null;
      throw error;
    }
  })();

  return loadingPromise;
}

/**
 * Checks if models are already loaded without triggering a load.
 *
 * @returns true if models are loaded, false otherwise
 */
export function isFaceApiLoaded(): boolean {
  return isLoaded;
}

/**
 * Resets the loader state (primarily for testing).
 * USE WITH CAUTION in production code.
 */
export function resetFaceApiLoader(): void {
  loadingPromise = null;
  isLoaded = false;
}
