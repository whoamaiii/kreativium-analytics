/**
 * Series builders module
 *
 * Pure functions for transforming raw student data entries into time-series and datasets
 * suitable for statistical detection algorithms. These builders handle data normalization,
 * temporal alignment, and series truncation.
 *
 * Extracted from AlertDetectionEngine to promote modularity and testability.
 */

export {
  buildEmotionSeries,
  buildSensoryAggregates,
  buildAssociationDataset,
  buildBurstEvents,
  type AssociationDataset,
} from './seriesBuilders';
