/**
 * @file Alert bulk action bar component
 *
 * Provides quick bulk action buttons for alert management:
 * - Acknowledge by confidence threshold
 * - Acknowledge by source type
 * - Resolve by source type
 * - Snooze similar alerts
 * - Acknowledge by algorithm label
 *
 * Buttons are conditionally shown based on active filters.
 */

import React from 'react';
import { Button } from '@/components/ui/button';

export interface AlertBulkActionBarProps {
  /** Current source type filters */
  sourceFilters: string[];

  /** Current algorithm label filters */
  sourceLabelFilters: string[];

  /** Acknowledge all alerts with confidence >= threshold */
  onAcknowledgeByConfidence: (threshold: number) => void;

  /** Acknowledge all alerts from a specific source type */
  onAcknowledgeBySource: (sourceType: string) => void;

  /** Resolve all alerts from a specific source type */
  onResolveBySourceType: (sourceType: string) => void;

  /** Snooze similar alerts based on current filters */
  onSnoozeSimilar: () => void;

  /** Acknowledge all alerts with a specific algorithm label */
  onAcknowledgeByLabel: (label: string) => void;
}

/**
 * Bulk action bar for quick alert management operations
 *
 * Displays context-aware bulk actions based on current filter state.
 * Only shows relevant actions (e.g., "Acknowledge EWMA" only when EWMA filter is active).
 *
 * @example
 * <AlertBulkActionBar
 *   sourceFilters={['ewma']}
 *   sourceLabelFilters={[]}
 *   onAcknowledgeByConfidence={(threshold) => acknowledgeByConfidence(threshold)}
 *   onAcknowledgeBySource={(src) => acknowledgeBySource(src)}
 *   onResolveBySourceType={(src) => resolveBySourceType(src)}
 *   onSnoozeSimilar={snoozeSimilar}
 *   onAcknowledgeByLabel={(label) => acknowledgeByLabel(label)}
 * />
 */
export const AlertBulkActionBar: React.FC<AlertBulkActionBarProps> = ({
  sourceFilters,
  sourceLabelFilters,
  onAcknowledgeByConfidence,
  onAcknowledgeBySource,
  onResolveBySourceType,
  onSnoozeSimilar,
  onAcknowledgeByLabel,
}) => {
  const hasSingleSourceFilter = sourceFilters.length === 1;
  const hasSingleLabelFilter = sourceLabelFilters.length === 1;
  const hasFilterForSimilar = hasSingleSourceFilter || hasSingleLabelFilter;

  return (
    <div
      className="flex flex-wrap items-center gap-2 text-xs text-slate-500"
      role="group"
      aria-label="Bulk actions"
    >
      {/* Always show: Acknowledge by confidence */}
      <Button variant="outline" size="xs" onClick={() => onAcknowledgeByConfidence(0.8)}>
        Ack ≥ 80%
      </Button>

      {/* Show when single source filter is active */}
      {hasSingleSourceFilter && (
        <>
          <Button
            variant="outline"
            size="xs"
            onClick={() => onAcknowledgeBySource(sourceFilters[0])}
          >
            Ack {sourceFilters[0]}
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => onResolveBySourceType(sourceFilters[0])}
          >
            Resolve {sourceFilters[0]}
          </Button>
        </>
      )}

      {/* Show when any single filter is active */}
      {hasFilterForSimilar && (
        <Button variant="outline" size="xs" onClick={onSnoozeSimilar}>
          Snooze similar
        </Button>
      )}

      {/* Show when single label filter is active */}
      {hasSingleLabelFilter && (
        <Button
          variant="outline"
          size="xs"
          onClick={() => onAcknowledgeByLabel(sourceLabelFilters[0])}
        >
          Ack {sourceLabelFilters[0]}
        </Button>
      )}
    </div>
  );
};

AlertBulkActionBar.displayName = 'AlertBulkActionBar';
