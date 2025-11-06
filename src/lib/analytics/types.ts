import type { AnalyticsResults } from '@/types/analytics';
import type { AiMetadata } from '@/lib/analysis';

export type AnalyticsResultsCompat = AnalyticsResults & { ai?: AiMetadata };
