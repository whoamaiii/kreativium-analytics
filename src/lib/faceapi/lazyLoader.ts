/**
 * Lazy loader for @vladmandic/face-api
 *
 * This module provides on-demand loading of face-api to reduce initial bundle size.
 * face-api is only loaded when emotion detection features are actually used.
 *
 * Usage:
 * ```typescript
 * import { loadFaceApi } from '@/lib/faceapi/lazyLoader';
 *
 * const faceapi = await loadFaceApi();
 * await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
 * ```
 */

import type * as FaceApiTypes from '@vladmandic/face-api';

// Singleton instance
let faceApiInstance: typeof FaceApiTypes | null = null;

// Loading promise for concurrent calls
let loadingPromise: Promise<typeof FaceApiTypes> | null = null;

// Track if models are loaded
const modelsLoaded = {
  tinyFaceDetector: false,
  faceExpressionNet: false,
  ssdMobilenetv1: false,
  faceLandmark68Net: false,
  faceRecognitionNet: false,
};

/**
 * Loads the face-api module dynamically.
 *
 * This function:
 * - Returns cached instance if already loaded
 * - Waits for existing load if in progress
 * - Loads the module if not yet loaded
 *
 * @returns Promise resolving to face-api module
 * @throws Error if module fails to load
 */
export async function loadFaceApi(): Promise<typeof FaceApiTypes> {
  // If already loaded, return immediately
  if (faceApiInstance) {
    return faceApiInstance;
  }

  // If currently loading, wait for that promise
  if (loadingPromise) {
    return loadingPromise;
  }

  // Start loading
  loadingPromise = import('@vladmandic/face-api')
    .then((module) => {
      faceApiInstance = module;
      loadingPromise = null;
      return module;
    })
    .catch((error) => {
      loadingPromise = null;
      throw new Error(`Failed to load face-api: ${error.message}`);
    });

  return loadingPromise;
}

/**
 * Checks if face-api module is already loaded.
 *
 * @returns true if loaded, false otherwise
 */
export function isFaceApiLoaded(): boolean {
  return faceApiInstance !== null;
}

/**
 * Gets the face-api instance if loaded, or null.
 *
 * Use this for synchronous checks. If you need to use face-api,
 * use loadFaceApi() instead to ensure it's loaded.
 *
 * @returns face-api module or null
 */
export function getFaceApi(): typeof FaceApiTypes | null {
  return faceApiInstance;
}

/**
 * Loads face detection models on-demand.
 *
 * @param modelBaseUrl - Base URL for model files (default: '/models')
 * @param models - Which models to load (default: tinyFaceDetector + faceExpressionNet)
 * @returns Promise that resolves when models are loaded
 */
export async function loadModels(
  modelBaseUrl = '/models',
  models: {
    tinyFaceDetector?: boolean;
    faceExpressionNet?: boolean;
    ssdMobilenetv1?: boolean;
    faceLandmark68Net?: boolean;
    faceRecognitionNet?: boolean;
  } = {}
): Promise<void> {
  // Default to loading tiny detector + expressions
  const modelsToLoad = {
    tinyFaceDetector: models.tinyFaceDetector ?? true,
    faceExpressionNet: models.faceExpressionNet ?? true,
    ssdMobilenetv1: models.ssdMobilenetv1 ?? false,
    faceLandmark68Net: models.faceLandmark68Net ?? false,
    faceRecognitionNet: models.faceRecognitionNet ?? false,
  };

  // Ensure face-api is loaded
  const faceapi = await loadFaceApi();

  // Load each requested model if not already loaded
  const loadPromises: Promise<void>[] = [];

  if (modelsToLoad.tinyFaceDetector && !modelsLoaded.tinyFaceDetector) {
    loadPromises.push(
      faceapi.nets.tinyFaceDetector.loadFromUri(modelBaseUrl).then(() => {
        modelsLoaded.tinyFaceDetector = true;
      })
    );
  }

  if (modelsToLoad.faceExpressionNet && !modelsLoaded.faceExpressionNet) {
    loadPromises.push(
      faceapi.nets.faceExpressionNet.loadFromUri(modelBaseUrl).then(() => {
        modelsLoaded.faceExpressionNet = true;
      })
    );
  }

  if (modelsToLoad.ssdMobilenetv1 && !modelsLoaded.ssdMobilenetv1) {
    loadPromises.push(
      faceapi.nets.ssdMobilenetv1.loadFromUri(modelBaseUrl).then(() => {
        modelsLoaded.ssdMobilenetv1 = true;
      })
    );
  }

  if (modelsToLoad.faceLandmark68Net && !modelsLoaded.faceLandmark68Net) {
    loadPromises.push(
      faceapi.nets.faceLandmark68Net.loadFromUri(modelBaseUrl).then(() => {
        modelsLoaded.faceLandmark68Net = true;
      })
    );
  }

  if (modelsToLoad.faceRecognitionNet && !modelsLoaded.faceRecognitionNet) {
    loadPromises.push(
      faceapi.nets.faceRecognitionNet.loadFromUri(modelBaseUrl).then(() => {
        modelsLoaded.faceRecognitionNet = true;
      })
    );
  }

  // Wait for all models to load
  await Promise.all(loadPromises);
}

/**
 * Checks if specific models are loaded.
 *
 * @returns Object with model load status
 */
export function getModelsLoadedStatus() {
  return { ...modelsLoaded };
}

/**
 * Resets the loader state (for testing).
 *
 * @internal
 */
export function _resetLoader() {
  faceApiInstance = null;
  loadingPromise = null;
  Object.keys(modelsLoaded).forEach((key) => {
    modelsLoaded[key as keyof typeof modelsLoaded] = false;
  });
}
