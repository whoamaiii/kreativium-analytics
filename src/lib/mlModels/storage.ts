import { logger } from '@/lib/logger';
import * as tf from '@tensorflow/tfjs';
import { ModelType, ModelMetadata, StoredModel } from './types';

/**
 * Class for managing model storage using IndexedDB.
 * Handles model serialization and deserialization.
 */
export class ModelStorage {
  private dbName = 'sensory-compass-ml';
  private storeName = 'models';
  private db: IDBDatabase | null = null;

  /**
   * Initialize the IndexedDB database connection.
   * Sets up the object store if it does not already exist.
   */
  async init(): Promise<void> {
    // Check if IndexedDB is available
    if (typeof indexedDB === 'undefined') {
      try { logger.warn('[mlModels] IndexedDB not available, ML models will not persist'); } catch {}
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(this.dbName, 1);

        request.onerror = () => {
          try { logger.warn('[mlModels] Failed to open IndexedDB', request.error as any); } catch {}
          resolve(); // Don't reject, just continue without persistence
        };

        request.onsuccess = () => {
          this.db = request.result;
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'name' });
          }
        };
      } catch (error) {
        try { logger.warn('[mlModels] IndexedDB initialization failed', error as Error); } catch {}
        resolve(); // Don't reject, just continue without persistence
      }
    });
  }

  /**
   * Save a model to IndexedDB with its metadata.
   * Handles model artifacts serialization with a custom handler.
   *
   * @param name - Unique name for the model type.
   * @param model - The model to be saved.
   * @param metadata - Metadata associated with the model.
   */
  async saveModel(name: ModelType, model: tf.LayersModel, metadata: ModelMetadata): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) {
      try { logger.warn('[mlModels] Cannot save model - IndexedDB not available'); } catch {}
      return;
    }

    // Save model to IndexedDB
    const modelData = await model.save(tf.io.withSaveHandler(async (artifacts) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          name,
          artifacts,
          metadata,
          timestamp: new Date()
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } };
    }));
  }

  /**
   * Load a model from IndexedDB using its name.
   * Deserializes model artifacts and reconstructs the TensorFlow.js model.
   *
   * @param name - Unique name for the model type to be loaded.
   * @returns The stored model along with its metadata, or null if not found.
   */
  async loadModel(name: ModelType): Promise<StoredModel | null> {
    if (!this.db) await this.init();
    if (!this.db) {
      try { logger.warn('[mlModels] Cannot load model - IndexedDB not available'); } catch {}
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(name);

      request.onsuccess = async () => {
        const data = request.result;
        if (!data) {
          resolve(null);
          return;
        }

        // Load model from stored artifacts
        const model = await tf.loadLayersModel(tf.io.fromMemory(data.artifacts));
        resolve({
          model,
          metadata: data.metadata
        });
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a model from IndexedDB by its name.
   *
   * @param name - The model type identifier to delete.
   */
  async deleteModel(name: ModelType): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) {
      try { logger.warn('[mlModels] Cannot delete model - IndexedDB not available'); } catch {}
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(name);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * List all models stored in IndexedDB.
   *
   * @returns An array of metadata for all stored models.
   */
  async listModels(): Promise<ModelMetadata[]> {
    if (!this.db) await this.init();
    if (!this.db) {
      try { logger.warn('[mlModels] Cannot list models - IndexedDB not available'); } catch {}
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const models = request.result.map(item => item.metadata);
        resolve(models);
      };

      request.onerror = () => reject(request.error);
    });
  }
}
