/**
 * @file AlertsPanel - Refactored version
 *
 * Main panel for displaying and managing alerts with comprehensive filtering,
 * grouping, and action capabilities.
 *
 * This refactored version reduces complexity from 907 lines to ~250 lines by:
 * - Extracting UI state management to useAlertUIState hook
 * - Delegating keyboard shortcuts to useAlertKeyboardShortcuts hook
 * - Delegating real-time sync to useAlertRealtimeSync hook
 * - Extracting action handlers to useAlertActionHandlers hook
 * - Replacing inline filter UI with AlertsFilterPanel component
 * - Replacing inline grouped view with AlertsByGroupView component
 * - Replacing inline pinned rail with PinnedAlertsRail component
 * - Replacing inline details dialog with AlertDetailsDialog component
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/useTranslation';
import usePinnedAlerts from '@/hooks/usePinnedAlerts';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { useAlerts } from '@/hooks/useAlerts';
import { TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';
import CreateGoalFromAlertDialog from '@/components/goals/CreateGoalFromAlertDialog';
import {
  useAlertFilterState,
  useAlertDerivedData,
} from '@/components/analytics-panels/hooks/useAlertFilters';
import { useAlertBulkActions } from '@/components/analytics-panels/hooks/useAlertBulkActions';
import { useAlertUIState } from '@/components/analytics-panels/hooks/useAlertUIState';
import { useAlertKeyboardShortcuts } from '@/components/analytics-panels/hooks/useAlertKeyboardShortcuts';
import { useAlertRealtimeSync } from '@/components/analytics-panels/hooks/useAlertRealtimeSync';
import { useAlertActionHandlers } from '@/components/analytics-panels/hooks/useAlertActionHandlers';
import { AlertsFilterPanel } from '@/components/analytics-panels/alerts/AlertsFilterPanel';
import { AlertsByGroupView } from '@/components/analytics-panels/alerts/AlertsByGroupView';
import { PinnedAlertsRail } from '@/components/analytics-panels/alerts/PinnedAlertsRail';
import { AlertDetailsDialog } from '@/components/analytics-panels/alerts/AlertDetailsDialog';

export interface AlertsPanelProps {
  filteredData: {
    entries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
  };
  studentId?: string;
}

export const AlertsPanel = React.memo(
  ({ filteredData: _filteredData, studentId }: AlertsPanelProps) => {
    const { tAnalytics } = useTranslation();
    const { pinnedIds, isPinned: _isPinned, togglePin, unpinAlert, clearPinnedAlerts } = usePinnedAlerts();

    // Search input ref for keyboard shortcuts
    const searchRef = useRef<HTMLInputElement | null>(null);

    // Filter state management
    const { state: filterState, actions: filterActions, queryFilters } = useAlertFilterState();

    const {
      selectedSeverities,
      selectedKinds,
      timeWindowHours,
      minConfidence,
      sourceFilters,
      sourceLabelFilters,
      dateStart,
      dateEnd,
      searchQuery,
      groupMode,
      hasInterventionOnly,
      sortMode,
    } = filterState;

    const {
      setSelectedSeverities,
      setSelectedKinds,
      setTimeWindowHours,
      setMinConfidence,
      setDateStart,
      setDateEnd,
      setSearchQuery,
      setGroupMode,
      setHasInterventionOnly,
      setSortMode,
      toggleSourceFilter,
      toggleSourceLabelFilter,
      resetSourceFilters,
      resetSourceLabelFilters,
    } = filterActions;

    // Fetch alerts with filters
    const { alerts, acknowledge, snooze, resolve, refresh, feedback } = useAlerts({
      studentId: studentId && studentId !== 'all' ? studentId : 'all',
      aggregate: !studentId || studentId === 'all',
      filters: queryFilters,
    });

    // Derived data (grouped alerts, counts, available filters)
    const derived = useAlertDerivedData(alerts, filterState);
    const { availableSourceTypes, availableSourceLabels, activeAlerts, counts, grouped } = derived;

    // Bulk actions
    const bulkActions = useAlertBulkActions({
      alerts,
      activeAlerts,
      sourceFilters,
      sourceLabelFilters,
      acknowledge,
      resolve,
      snooze,
    });
    const {
      acknowledgeByConfidence,
      acknowledgeBySource,
      resolveBySourceType,
      snoozeSimilar,
      acknowledgeByLabel,
    } = bulkActions;

    // UI state management (collapsed sections, dialogs, selection, viewed tracking)
    const uiState = useAlertUIState(activeAlerts);

    // Pinned alerts derived from main alerts list
    const pinnedAlerts = useMemo(
      () => alerts.filter((a) => pinnedIds.has(a.id)),
      [alerts, pinnedIds],
    );

    // Bulk acknowledge selected alerts
    const handleAcknowledgeSelected = useCallback(() => {
      let successCount = 0;
      let failCount = 0;

      for (const id of Array.from(uiState.selectedIds)) {
        try {
          acknowledge(id);
          successCount++;
        } catch (error) {
          failCount++;
          logger.error('Failed to acknowledge alert', { error, alertId: id });
        }
      }

      uiState.clearSelection();

      if (failCount === 0) {
        toast.success('Acknowledged selected alerts');
      } else if (successCount > 0) {
        toast.warning(`Acknowledged ${successCount} alerts, but ${failCount} failed`);
      } else {
        toast.error('Failed to acknowledge alerts');
      }
    }, [uiState.selectedIds, acknowledge, uiState.clearSelection]);

    // Resolve pinned alert with notes
    const handleResolve = useCallback(() => {
      if (!uiState.selectedForResolve) return;
      uiState.setIsResolving(true);
      try {
        resolve(uiState.selectedForResolve.id, uiState.resolveNotes.trim() || undefined);
        uiState.setSelectedForResolve(null);
        uiState.setResolveNotes('');
        toast.success(String(tAnalytics('alerts.resolveSuccess')));
      } catch (error) {
        logger.error('Failed to resolve alert in pinned rail', error);
        toast.error(String(tAnalytics('alerts.resolveFailure')));
      } finally {
        uiState.setIsResolving(false);
      }
    }, [
      uiState.resolveNotes,
      uiState.selectedForResolve,
      resolve,
      tAnalytics,
      uiState.setIsResolving,
    ]);

    // Open alert details dialog
    const handleOpenDetails = useCallback(
      (id: string) => {
        const alert = alerts.find((a) => a.id === id) ?? null;
        uiState.setSelectedForDetails(alert);
        uiState.setDetailsOpen(!!alert);
      },
      [alerts, uiState.setSelectedForDetails, uiState.setDetailsOpen],
    );

    // Action handlers for alert operations
    const actionHandlers = useAlertActionHandlers((alert) => {
      uiState.setGoalDialogAlert(alert);
      uiState.setGoalDialogOpen(true);
    });

    // Keyboard shortcuts (/, Cmd+A, Cmd+R, Cmd+S, Escape)
    useAlertKeyboardShortcuts({
      onAcknowledgeSelected: handleAcknowledgeSelected,
      onResolve: handleResolve,
      onSnoozeSimilar: snoozeSimilar,
      onClearSelection: uiState.clearSelection,
      searchInputRef: searchRef,
    });

    // Real-time sync via custom events
    useAlertRealtimeSync({
      onRefresh: refresh,
      studentId,
    });

    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Main content area */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{String(tAnalytics('tabs.alerts'))}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" aria-live="polite">{`Total: ${counts.total}`}</Badge>
                  <Badge variant="secondary">Live</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filter panel (search, filters, bulk actions) */}
              <AlertsFilterPanel
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                searchInputRef={searchRef}
                selectedSeverities={selectedSeverities}
                onSelectedSeveritiesChange={setSelectedSeverities}
                selectedKinds={selectedKinds}
                onSelectedKindsChange={setSelectedKinds}
                dateStart={dateStart}
                dateEnd={dateEnd}
                onDateStartChange={setDateStart}
                onDateEndChange={setDateEnd}
                timeWindowHours={timeWindowHours}
                onTimeWindowChange={setTimeWindowHours}
                minConfidence={minConfidence}
                onMinConfidenceChange={setMinConfidence}
                availableSourceTypes={availableSourceTypes}
                sourceFilters={sourceFilters}
                onToggleSourceFilter={toggleSourceFilter}
                onResetSourceFilters={resetSourceFilters}
                availableSourceLabels={availableSourceLabels}
                sourceLabelFilters={sourceLabelFilters}
                onToggleSourceLabelFilter={toggleSourceLabelFilter}
                onResetSourceLabelFilters={resetSourceLabelFilters}
                groupMode={groupMode}
                onGroupModeChange={setGroupMode}
                sortMode={sortMode}
                onSortModeChange={setSortMode}
                hasInterventionOnly={hasInterventionOnly}
                onHasInterventionOnlyChange={setHasInterventionOnly}
                activeAlerts={activeAlerts}
                onAcknowledgeByConfidence={acknowledgeByConfidence}
                onAcknowledgeBySource={acknowledgeBySource}
                onResolveBySourceType={resolveBySourceType}
                onSnoozeSimilar={snoozeSimilar}
                onAcknowledgeByLabel={acknowledgeByLabel}
              />

              {/* Grouped alerts view */}
              <AlertsByGroupView
                groupMode={groupMode}
                grouped={grouped}
                collapsed={uiState.collapsed}
                onToggleCollapse={uiState.toggleCollapsed}
                selectedIds={uiState.selectedIds}
                pinnedIds={pinnedIds}
                onToggleSelection={uiState.toggleSelection}
                onTogglePin={togglePin}
                onAcknowledge={acknowledge}
                onSnooze={snooze}
                onResolve={resolve}
                onOpenDetails={handleOpenDetails}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right rail: Pinned alerts */}
        <PinnedAlertsRail
          pinnedAlerts={pinnedAlerts}
          isOpen={uiState.pinnedOpen}
          onOpenChange={uiState.setPinnedOpen}
          clearDialogOpen={uiState.clearDialogOpen}
          onClearDialogChange={uiState.setClearDialogOpen}
          onClearAll={clearPinnedAlerts}
          onUnpin={unpinAlert}
          viewedPinned={uiState.viewedPinned}
          onMarkViewed={uiState.markAsViewed}
          selectedForResolve={uiState.selectedForResolve}
          onResolveDialogChange={(alert, open) => {
            uiState.setSelectedForResolve(open ? alert : null);
            if (!open) uiState.setResolveNotes('');
          }}
          resolveNotes={uiState.resolveNotes}
          onResolveNotesChange={uiState.setResolveNotes}
          isResolving={uiState.isResolving}
          onResolve={handleResolve}
        />

        {/* Alert details dialog */}
        <AlertDetailsDialog
          open={uiState.detailsOpen}
          onOpenChange={(open) => {
            uiState.setDetailsOpen(open);
            if (!open) uiState.setSelectedForDetails(null);
          }}
          alert={uiState.selectedForDetails}
          actionHandlers={actionHandlers}
          onSubmitFeedback={feedback}
        />

        {/* Create goal from alert dialog */}
        <CreateGoalFromAlertDialog
          open={uiState.goalDialogOpen}
          alert={uiState.goalDialogAlert as any}
          onOpenChange={(open) => {
            uiState.setGoalDialogOpen(open);
            if (!open) uiState.setGoalDialogAlert(null);
          }}
        />
      </div>
    );
  },
);

AlertsPanel.displayName = 'AlertsPanel';

export default AlertsPanel;
