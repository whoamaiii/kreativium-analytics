import type { AnalyticsResults } from '../../types/analytics';
import type { AiDataLineageItem } from './aiSchema';

export interface TimeRange {
  start: Date | string;
  end: Date | string;
  timezone?: string;
}

export interface AnalysisOptions {
  profile?: string; // unchanged for heuristic presets
  aiProfile?: 'iep' | 'default'; // new for AI prompt behavior
  features?: Record<string, boolean>;
  overrides?: Record<string, unknown>;
  includeAiMetadata?: boolean;
  /** If true, bypass in-memory caches and force fresh analysis */
  bypassCache?: boolean;
}

export interface AiTokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

export interface AiMetadata {
  provider?: string;
  model?: string;
  usage?: AiTokenUsage;
  createdAt?: string;
  latencyMs?: number;
  dataLineage?: AiDataLineageItem[];
  caveats?: string[];
  confidence?: {
    overall?: number;
    calibration?: string;
  };
}

export type AnalyticsResultsAI = AnalyticsResults & {
  ai?: AiMetadata;
};

export interface AnalysisEngine {
  analyzeStudent(
    studentId: string,
    timeframe?: TimeRange,
    options?: AnalysisOptions,
  ): Promise<AnalyticsResultsAI>;
}

export type { AnalyticsResults, AiDataLineageItem };
