import type { MLModels } from './mlModels.impl';

export type {
  ModelMetadata,
  ModelType,
  StoredModel,
  MLSession,
  EmotionPrediction,
  SensoryPrediction,
  BaselineCluster,
} from './mlModels.impl';

let mlModelsInstance: MLModels | null = null;
let inflightLoad: Promise<MLModels> | null = null;

const loadMlModels = async (): Promise<MLModels> => {
  const module = await import('./mlModels.impl');
  return new module.MLModels();
};

export const getMlModels = async (): Promise<MLModels> => {
  if (mlModelsInstance) {
    return mlModelsInstance;
  }

  if (!inflightLoad) {
    inflightLoad = loadMlModels().then((instance) => {
      mlModelsInstance = instance;
      return instance;
    }).finally(() => {
      inflightLoad = null;
    });
  }

  return inflightLoad;
};

export const resetMlModelsInstanceForTests = (): void => {
  if (import.meta.env?.MODE !== 'test') {
    return;
  }
  mlModelsInstance = null;
  inflightLoad = null;
};
