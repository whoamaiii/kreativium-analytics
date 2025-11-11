/**
 * Types for the Preprocessing Pipeline.
 *
 * Centralized, shared interfaces and enums used by the pipeline implementation
 * and downstream consumers. All exported types here are part of the public API
 * surface of the preprocessing module and are kept semver-compatible.
 */

/** Single, generic tabular record. */
export type DataRecord = Record<string, unknown>;
/** A dataset is an array of records (rows). */
export type Dataset = DataRecord[];

/** Kinds of preprocessing steps. Determines canonical order. */
/**
 * Kinds of preprocessing steps. Determines canonical execution order.
 * - cleaning: remove or normalize raw issues (null-only columns, trim strings)
 * - scaling: numeric standardization (z-score)
 * - encoding: one-hot of categorical variables
 * - feature_engineering: derived features (e.g., squared terms)
 */
export type StepKind = 'cleaning' | 'scaling' | 'encoding' | 'feature_engineering';

/**
 * Conditional predicate context supplied to steps to determine whether they should run.
 */
/**
 * Conditional predicate context supplied to steps to determine whether they should run.
 * Created during `fit` by profiling the provided dataset.
 */
export interface DataProfile {
  rowCount: number;
  columns: string[];
  inferredTypes: Record<string, 'number' | 'string' | 'boolean' | 'date' | 'unknown'>;
  missingRatioByColumn: Record<string, number>;
  uniqueCountByColumn: Record<string, number>;
  numericColumns: string[];
  categoricalColumns: string[];
}

/**
 * Metadata captured for reproducibility.
 */
/**
 * Metadata captured for reproducibility and auditability of a fitted pipeline.
 */
export interface PipelineMetadata {
  createdAt: string; // ISO timestamp
  pipelineVersion: string;
  configHash: string; // stable hash of the configuration object
  dataSchema: {
    columns: string[];
    inferredTypes: Record<string, DataProfile['inferredTypes'][string]>;
  };
  notes?: string;
}

/** Base interface for a preprocessing step. */
/**
 * Base interface for a preprocessing step configuration.
 * Use `when` to provide a conditional predicate that receives a DataProfile.
 */
export interface PreprocessingStepConfigBase {
  name: string;
  kind: StepKind;
  enabled?: boolean; // allows toggling via config
  when?: (profile: DataProfile) => boolean; // conditional execution
}

/** Configuration for cleaning step. */
export interface CleaningStepConfig extends PreprocessingStepConfigBase {
  kind: 'cleaning';
  dropAllNullColumns?: boolean;
  trimStrings?: boolean;
}

/** Configuration for scaling step. */
export interface ScalingStepConfig extends PreprocessingStepConfigBase {
  kind: 'scaling';
  method?: 'standard'; // future: 'minmax'
}

/** Configuration for encoding step. */
export interface EncodingStepConfig extends PreprocessingStepConfigBase {
  kind: 'encoding';
  oneHotMaxCategories?: number; // only one-hot columns with <= this unique count
  includeBooleans?: boolean; // treat booleans as categorical for one-hot
}

/** Configuration for feature engineering step. */
export interface FeatureEngineeringStepConfig extends PreprocessingStepConfigBase {
  kind: 'feature_engineering';
  polynomialDegree?: 1 | 2; // simple support for squared features
}

export type AnyStepConfig =
  | CleaningStepConfig
  | ScalingStepConfig
  | EncodingStepConfig
  | FeatureEngineeringStepConfig;

/** Persisted state for a fitted step. */
/** Persisted state for a fitted step (parameters learned during `fit`). */
export interface FittedStepState {
  name: string;
  kind: StepKind;
  params: Record<string, unknown>;
}

/** Serialized representation of a fitted pipeline. */
/** Serialized representation of a fitted pipeline + metadata. */
export interface SerializedPipeline {
  version: string;
  config: AnyStepConfig[];
  fitted: FittedStepState[];
  metadata: PipelineMetadata;
}
