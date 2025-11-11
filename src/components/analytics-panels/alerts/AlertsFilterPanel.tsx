/**
 * @file Alerts filter panel component
 *
 * Combines search, filter controls, and bulk actions into a single panel.
 * Provides the complete filtering interface for the alerts view.
 */

import React, { RefObject } from 'react';
import { AlertSearchBar } from './AlertSearchBar';
import { AlertFilterControls } from './AlertFilterControls';
import { AlertBulkActionBar } from './AlertBulkActionBar';
import { AlertSeverity, AlertKind, AlertWithGovernance } from '@/lib/alerts/types';

export interface AlertsFilterPanelProps {
  // Search
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchInputRef?: RefObject<HTMLInputElement>;

  // Severity filters
  selectedSeverities: AlertSeverity[];
  onSelectedSeveritiesChange: (severities: AlertSeverity[]) => void;

  // Kind filters
  selectedKinds: AlertKind[];
  onSelectedKindsChange: (kinds: AlertKind[]) => void;

  // Date range
  dateStart: string;
  dateEnd: string;
  onDateStartChange: (date: string) => void;
  onDateEndChange: (date: string) => void;

  // Time window
  timeWindowHours?: number;
  onTimeWindowChange: (hours: number | undefined) => void;

  // Confidence
  minConfidence: number;
  onMinConfidenceChange: (confidence: number) => void;

  // Source filters
  availableSourceTypes: Array<{ type: string; display: string; labels: string[] }>;
  sourceFilters: string[];
  onToggleSourceFilter: (type: string) => void;
  onResetSourceFilters: () => void;

  // Algorithm filters
  availableSourceLabels: string[];
  sourceLabelFilters: string[];
  onToggleSourceLabelFilter: (label: string) => void;
  onResetSourceLabelFilters: () => void;

  // Group and sort
  groupMode: 'severity' | 'source' | 'status';
  onGroupModeChange: (mode: 'severity' | 'source' | 'status') => void;
  sortMode: 'newest' | 'confidence' | 'severity';
  onSortModeChange: (mode: 'newest' | 'confidence' | 'severity') => void;

  // Intervention filter
  hasInterventionOnly: boolean;
  onHasInterventionOnlyChange: (enabled: boolean) => void;

  // Active alerts for export
  activeAlerts: AlertWithGovernance[];

  // Bulk actions
  onAcknowledgeByConfidence: (threshold: number) => void;
  onAcknowledgeBySource: (sourceType: string) => void;
  onResolveBySourceType: (sourceType: string) => void;
  onSnoozeSimilar: () => void;
  onAcknowledgeByLabel: (label: string) => void;
}

/**
 * Complete filter panel for alerts view
 *
 * Combines search bar, filter controls, and bulk action bar into a single
 * cohesive filtering interface. Handles all filter state and interactions.
 *
 * @example
 * <AlertsFilterPanel
 *   searchQuery={searchQuery}
 *   onSearchQueryChange={setSearchQuery}
 *   searchInputRef={searchRef}
 *   selectedSeverities={selectedSeverities}
 *   onSelectedSeveritiesChange={setSelectedSeverities}
 *   // ... all other filter props
 *   onAcknowledgeByConfidence={acknowledgeByConfidence}
 *   onAcknowledgeBySource={acknowledgeBySource}
 *   // ... bulk action props
 * />
 */
export const AlertsFilterPanel: React.FC<AlertsFilterPanelProps> = ({
  searchQuery,
  onSearchQueryChange,
  searchInputRef,
  selectedSeverities,
  onSelectedSeveritiesChange,
  selectedKinds,
  onSelectedKindsChange,
  dateStart,
  dateEnd,
  onDateStartChange,
  onDateEndChange,
  timeWindowHours,
  onTimeWindowChange,
  minConfidence,
  onMinConfidenceChange,
  availableSourceTypes,
  sourceFilters,
  onToggleSourceFilter,
  onResetSourceFilters,
  availableSourceLabels,
  sourceLabelFilters,
  onToggleSourceLabelFilter,
  onResetSourceLabelFilters,
  groupMode,
  onGroupModeChange,
  sortMode,
  onSortModeChange,
  hasInterventionOnly,
  onHasInterventionOnlyChange,
  activeAlerts,
  onAcknowledgeByConfidence,
  onAcknowledgeBySource,
  onResolveBySourceType,
  onSnoozeSimilar,
  onAcknowledgeByLabel,
}) => {
  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Search and range">
        <AlertSearchBar value={searchQuery} onChange={onSearchQueryChange} ref={searchInputRef} />
      </div>

      {/* Filter controls */}
      <AlertFilterControls
        selectedSeverities={selectedSeverities}
        onSelectedSeveritiesChange={onSelectedSeveritiesChange}
        selectedKinds={selectedKinds}
        onSelectedKindsChange={onSelectedKindsChange}
        dateStart={dateStart}
        dateEnd={dateEnd}
        onDateStartChange={onDateStartChange}
        onDateEndChange={onDateEndChange}
        timeWindowHours={timeWindowHours}
        onTimeWindowChange={onTimeWindowChange}
        minConfidence={minConfidence}
        onMinConfidenceChange={onMinConfidenceChange}
        availableSourceTypes={availableSourceTypes}
        sourceFilters={sourceFilters}
        onToggleSourceFilter={onToggleSourceFilter}
        onResetSourceFilters={onResetSourceFilters}
        availableSourceLabels={availableSourceLabels}
        sourceLabelFilters={sourceLabelFilters}
        onToggleSourceLabelFilter={onToggleSourceLabelFilter}
        onResetSourceLabelFilters={onResetSourceLabelFilters}
        groupMode={groupMode}
        onGroupModeChange={onGroupModeChange}
        sortMode={sortMode}
        onSortModeChange={onSortModeChange}
        hasInterventionOnly={hasInterventionOnly}
        onHasInterventionOnlyChange={onHasInterventionOnlyChange}
        activeAlerts={activeAlerts}
      />

      {/* Bulk action bar */}
      <AlertBulkActionBar
        sourceFilters={sourceFilters}
        sourceLabelFilters={sourceLabelFilters}
        onAcknowledgeByConfidence={onAcknowledgeByConfidence}
        onAcknowledgeBySource={onAcknowledgeBySource}
        onResolveBySourceType={onResolveBySourceType}
        onSnoozeSimilar={onSnoozeSimilar}
        onAcknowledgeByLabel={onAcknowledgeByLabel}
      />
    </div>
  );
};

AlertsFilterPanel.displayName = 'AlertsFilterPanel';
