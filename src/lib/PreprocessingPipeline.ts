/**
 * PreprocessingPipeline: A comprehensive data preprocessing pipeline with versioning and serialization.
 * 
 * This class provides a standardized approach to data preprocessing with the following features:
 * - **Configurable Pipeline**: Define preprocessing steps through configuration objects
 * - **Conditional Execution**: Steps can be conditionally executed based on data profiling
 * - **Deterministic Ordering**: Steps are executed in canonical order (cleaning → scaling → encoding → feature engineering)
 * - **Training/Inference Separation**: Fit pipeline on training data, transform on inference data
 * - **Serialization**: Complete pipeline state can be serialized to JSON for reproducibility
 * - **Metadata Tracking**: Comprehensive metadata for debugging and auditing
 * 
 * @example
 * ```typescript
 * // Create pipeline configuration
 * const config: AnyStepConfig[] = [
 *   { name: 'clean', kind: 'cleaning', dropAllNullColumns: true },
 *   { name: 'scale', kind: 'scaling', method: 'standard' },
 *   { name: 'encode', kind: 'encoding', oneHotMaxCategories: 10 }
 * ];
 * 
 * // Initialize and fit pipeline
 * const pipeline = new PreprocessingPipeline(config);
 * const trainedData = pipeline.fit(trainingData);
 * 
 * // Transform new data using fitted pipeline
 * const transformedData = pipeline.transform(newData);
 * 
 * // Serialize for storage/sharing
 * const serialized = pipeline.toJSON();
 * const restored = PreprocessingPipeline.fromJSON(serialized);
 * ```
 * 
 * @version 1.0.0
 * @since 1.0.0
 */

import { stableHash } from '@/lib/hash';
import {
  AnyStepConfig,
  CleaningStepState,
  DataProfile,
  Dataset,
  EncodingStepState,
  FeatureEngineeringStepState,
  FittedStepState,
  PipelineMetadata,
  ScalingStepState,
  SerializedPipeline,
  StepKind,
} from '@/types/preprocessing';

const PIPELINE_VERSION = '1.0.0';

// Canonical order of step kinds
const ORDER: StepKind[] = ['cleaning', 'scaling', 'encoding', 'feature_engineering'];

/** Utility: deep clone plain JSON values */
function deepCloneJSON<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

/** Profiling utilities to drive conditional steps */
function inferDataProfile(data: Dataset): DataProfile {
  const rowCount = data.length;
  const columns = Array.from(
    data.reduce<Set<string>>((acc, row) => {
      Object.keys(row).forEach((k) => acc.add(k));
      return acc;
    }, new Set())
  );

  const inferredTypes: Record<string, 'number' | 'string' | 'boolean' | 'date' | 'unknown'> = {};
  const missingRatioByColumn: Record<string, number> = {};
  const uniqueCountByColumn: Record<string, number> = {};

  const uniques = new Map<string, Set<unknown>>();

  for (const col of columns) {
    uniques.set(col, new Set());
  }

  for (const row of data) {
    for (const col of columns) {
      const val = row[col];
      uniques.get(col)!.add(val);
    }
  }

  for (const col of columns) {
    const uniqueSet = uniques.get(col)!;
    uniqueCountByColumn[col] = uniqueSet.size;

    let missing = 0;
    let type: 'number' | 'string' | 'boolean' | 'date' | 'unknown' = 'unknown';

    for (const v of uniqueSet) {
      if (v === null || v === undefined || v !== v) missing++;
      const t = typeof v;
      if (t === 'number') type = 'number';
      else if (t === 'string') type = type === 'number' ? 'number' : 'string';
      else if (t === 'boolean') type = type === 'number' ? 'number' : type === 'string' ? 'string' : 'boolean';
      else if (v instanceof Date) type = 'date';
    }
    missingRatioByColumn[col] = rowCount === 0 ? 0 : missing / rowCount;
    inferredTypes[col] = type;
  }

  const numericColumns = columns.filter((c) => inferredTypes[c] === 'number');
  const categoricalColumns = columns.filter((c) => inferredTypes[c] === 'string' || inferredTypes[c] === 'boolean');

  return { rowCount, columns, inferredTypes, missingRatioByColumn, uniqueCountByColumn, numericColumns, categoricalColumns };
}

/** Simple cleaning: drop all-null columns, trim strings. */
function applyCleaning(dataset: Dataset, cfg: Extract<AnyStepConfig, { kind: 'cleaning' }>): { data: Dataset; state: CleaningStepState } {
  const columns = new Set<string>();
  dataset.forEach((r) => Object.keys(r).forEach((k) => columns.add(k)));

  const dropCols: string[] = [];
  if (cfg.dropAllNullColumns) {
    for (const c of columns) {
      let allNull = true;
      for (const row of dataset) {
        const v = row[c];
        if (v !== null && v !== undefined) {
          allNull = false;
          break;
        }
      }
      if (allNull) dropCols.push(c);
    }
  }

  const out: Dataset = dataset.map((row) => {
    const nr: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (dropCols.includes(k)) continue;
      if (cfg.trimStrings && typeof v === 'string') nr[k] = v.trim();
      else nr[k] = v;
    }
    return nr;
  });

  return {
    data: out,
    state: { name: cfg.name, kind: 'cleaning', params: { dropCols, trimStrings: !!cfg.trimStrings } },
  };
}

/** Standard scaling: z = (x - mean) / std for numeric columns. */
function fitScaling(dataset: Dataset, cfg: Extract<AnyStepConfig, { kind: 'scaling' }>, profile: DataProfile) {
  const means: Record<string, number> = {};
  const stds: Record<string, number> = {};

  for (const col of profile.numericColumns) {
    const vals: number[] = dataset
      .map((r) => {
        const val = r[col];
        return typeof val === 'number' ? val : NaN;
      })
      .filter((v) => Number.isFinite(v));
    const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const variance = vals.length ? vals.reduce((a, b) => a + (b - mean) * (b - mean), 0) / vals.length : 0;
    const std = Math.sqrt(variance) || 1;
    means[col] = mean;
    stds[col] = std;
  }

  const transform = (data: Dataset): Dataset =>
    data.map((row) => {
      const out: Record<string, unknown> = { ...row };
      for (const col of Object.keys(means)) {
        const v = row[col];
        out[col] = typeof v === 'number' ? (v - means[col]) / stds[col] : v;
      }
      return out;
    });

  const state: ScalingStepState = { name: cfg.name, kind: 'scaling', params: { means, stds, method: cfg.method ?? 'standard' } };
  return { transform, state };
}

/** One-hot encoding for categorical columns with unique count threshold. */
function fitEncoding(dataset: Dataset, cfg: Extract<AnyStepConfig, { kind: 'encoding' }>, profile: DataProfile) {
  const max = cfg.oneHotMaxCategories ?? 20;
  const includeBooleans = cfg.includeBooleans ?? true;

  const cats = profile.columns.filter((c) =>
    (profile.inferredTypes[c] === 'string' || (includeBooleans && profile.inferredTypes[c] === 'boolean')) &&
    profile.uniqueCountByColumn[c] > 1 &&
    profile.uniqueCountByColumn[c] <= max
  );

  const categories: Record<string, string[]> = {};
  for (const c of cats) {
    const set = new Set<string>();
    for (const row of dataset) {
      const v = row[c];
      const key = typeof v === 'string' ? v : typeof v === 'boolean' ? String(v) : String(v ?? '');
      set.add(key);
    }
    categories[c] = Array.from(set.values()).sort();
  }

  const transform = (data: Dataset): Dataset =>
    data.map((row) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        if (!categories[k]) {
          out[k] = v;
          continue;
        }
        const key = typeof v === 'string' ? v : typeof v === 'boolean' ? String(v) : String(v ?? '');
        for (const cat of categories[k]) {
          out[`${k}__${cat}`] = key === cat ? 1 : 0;
        }
      }
      return out;
    });

  const state: EncodingStepState = { name: cfg.name, kind: 'encoding', params: { categories, includeBooleans, oneHotMaxCategories: max } };
  return { transform, state };
}

/** Simple feature engineering: squared terms for numeric columns up to degree. */
function fitFeatureEngineering(dataset: Dataset, cfg: Extract<AnyStepConfig, { kind: 'feature_engineering' }>, profile: DataProfile) {
  const degree = cfg.polynomialDegree ?? 1;
  const cols = degree >= 2 ? [...profile.numericColumns] : [];

  const transform = (data: Dataset): Dataset =>
    data.map((row) => {
      const out: Record<string, unknown> = { ...row };
      for (const col of cols) {
        const v = row[col];
        if (typeof v === 'number') out[`${col}__squared`] = v * v;
      }
      return out;
    });

  const state: FeatureEngineeringStepState = { name: cfg.name, kind: 'feature_engineering', params: { degree, columns: cols } };
  return { transform, state };
}

/** Determine if a config should run given profile. */
function shouldRun(cfg: AnyStepConfig, profile: DataProfile): boolean {
  if (cfg.enabled === false) return false;
  if (cfg.when) return !!cfg.when(profile);
  return true;
}

/** Sort steps by canonical ordering, preserving relative order within the same kind. */
function sortSteps(configs: AnyStepConfig[]): AnyStepConfig[] {
  return [...configs].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
}

export class PreprocessingPipeline {
  private readonly version = PIPELINE_VERSION;
  private readonly config: AnyStepConfig[];
  private fittedStates: FittedStepState[] = [];
  private metadata?: PipelineMetadata;

  constructor(config: AnyStepConfig[]) {
    this.config = sortSteps(config);
  }

  getMetadata(): PipelineMetadata | undefined {
    return this.metadata ? deepCloneJSON(this.metadata) : undefined;
  }

  /**
   * Fits the pipeline on a training dataset.
   * - Profiles the data to determine which conditional steps to run.
   * - Fits each applicable step (e.g., calculates means/stds for scaling).
   * - Stores the fitted state for each step.
   * - Generates and stores metadata about the fitting process.
   * 
   * @param data The training dataset, an array of records.
   * @param options Optional parameters for the fitting process.
   * @param options.notes Optional user-defined notes to store in the metadata.
   * @returns The transformed dataset after applying all fitted steps.
   */
  fit(data: Dataset, options?: { notes?: string }): Dataset {
    const source = deepCloneJSON(data);
    const profile = inferDataProfile(source);

    // build metadata
    const configHash = stableHash(this.config.map((c) => ({ ...c, when: undefined })));
    this.metadata = {
      createdAt: new Date().toISOString(),
      pipelineVersion: this.version,
      configHash,
      dataSchema: { columns: profile.columns, inferredTypes: profile.inferredTypes },
      notes: options?.notes,
    };

    this.fittedStates = [];

    let current = source;

    for (const cfg of this.config) {
      if (!shouldRun(cfg, profile)) continue;
      if (cfg.kind === 'cleaning') {
        const { data: d, state } = applyCleaning(current, cfg);
        current = d;
        this.fittedStates.push(state);
      } else if (cfg.kind === 'scaling') {
        const { transform, state } = fitScaling(current, cfg, profile);
        current = transform(current);
        this.fittedStates.push(state);
      } else if (cfg.kind === 'encoding') {
        const { transform, state } = fitEncoding(current, cfg, profile);
        current = transform(current);
        this.fittedStates.push(state);
      } else if (cfg.kind === 'feature_engineering') {
        const { transform, state } = fitFeatureEngineering(current, cfg, profile);
        current = transform(current);
        this.fittedStates.push(state);
      }
    }

    return current;
  }

  /**
   * Transforms a dataset using the previously fitted pipeline states.
   * 
   * This method is intended for inference, applying the exact transformations
   * learned during the `fit` phase without re-learning any parameters.
   * 
   * @param data The dataset to transform.
   * @returns The transformed dataset.
   * @throws Will not throw, but returns data as-is if the pipeline has not been fitted.
   */
  transform(data: Dataset): Dataset {
    if (!this.fittedStates.length) return data;

    let current = deepCloneJSON(data);

    for (const state of this.fittedStates) {
      if (state.kind === 'cleaning') {
        const drop = state.params.dropCols;
        const trimStrings = state.params.trimStrings;
        current = current.map((row) => {
          const out: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(row)) {
            if (drop.includes(k)) continue;
            out[k] = trimStrings && typeof v === 'string' ? v.trim() : v;
          }
          return out;
        });
      } else if (state.kind === 'scaling') {
        const { means, stds } = state.params;
        current = current.map((row) => {
          const out: Record<string, unknown> = { ...row };
          for (const col of Object.keys(means)) {
            const v = row[col];
            out[col] = typeof v === 'number' ? (v - means[col]) / stds[col] : v;
          }
          return out;
        });
      } else if (state.kind === 'encoding') {
        const { categories } = state.params;
        current = current.map((row) => {
          const out: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(row)) {
            if (!categories[k]) {
              out[k] = v;
              continue;
            }
            const key = typeof v === 'string' ? v : typeof v === 'boolean' ? String(v) : String(v ?? '');
            for (const cat of categories[k]) {
              out[`${k}__${cat}`] = key === cat ? 1 : 0;
            }
          }
          return out;
        });
      } else if (state.kind === 'feature_engineering') {
        const { columns } = state.params;
        current = current.map((row) => {
          const out: Record<string, unknown> = { ...row };
          for (const col of columns) {
            const v = row[col];
            if (typeof v === 'number') out[`${col}__squared`] = v * v;
          }
          return out;
        });
      }
    }

    return current;
  }

  /**
   * Serializes the entire pipeline state to a JSON object.
   * This includes the configuration, all fitted step parameters, and metadata.
   * 
   * @returns A `SerializedPipeline` object ready for JSON stringification.
   */
  toJSON(): SerializedPipeline {
    if (!this.metadata) {
      // Ensure metadata exists even if only transform was used
      this.metadata = {
        createdAt: new Date().toISOString(),
        pipelineVersion: this.version,
        configHash: stableHash(this.config.map((c) => ({ ...c, when: undefined }))),
        dataSchema: { columns: [], inferredTypes: {} },
      };
    }
    return {
      version: this.version,
      config: deepCloneJSON(this.config),
      fitted: deepCloneJSON(this.fittedStates),
      metadata: deepCloneJSON(this.metadata),
    };
  }

  /**
   * Recreates a `PreprocessingPipeline` instance from a serialized state.
   * This allows for perfect reconstruction of a fitted pipeline for later use.
   *
   * @param payload The `SerializedPipeline` object.
   * @returns A new `PreprocessingPipeline` instance with its state restored.
   */
  static fromJSON(payload: SerializedPipeline): PreprocessingPipeline {
    const pipe = new PreprocessingPipeline(payload.config);
    pipe.fittedStates = deepCloneJSON(payload.fitted);
    pipe.metadata = deepCloneJSON(payload.metadata);
    return pipe;
  }
}

