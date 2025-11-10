/**
 * @file Alert UI state management hook
 *
 * Centralizes all UI state for the AlertsPanel component including:
 * - Collapsible section states
 * - Selected alerts for bulk actions
 * - Dialog open/close states
 * - Pinned rail visibility
 * - Viewed status tracking
 *
 * This hook eliminates 10+ useState declarations from the main component
 * and provides a clean API for UI state management.
 */

import { useState, useCallback, useEffect } from 'react';
import { AlertSeverity, AlertWithGovernance } from '@/lib/alerts/types';

/**
 * UI state for managing alert panel interactions
 */
export interface AlertUIState {
  // Collapsible sections
  collapsed: Record<AlertSeverity, boolean>;
  setCollapsed: React.Dispatch<React.SetStateAction<Record<AlertSeverity, boolean>>>;
  toggleCollapsed: (severity: AlertSeverity) => void;

  // Pinned rail
  pinnedOpen: boolean;
  setPinnedOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Bulk selection
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  selectAll: (ids: string[]) => void;

  // Dialogs
  clearDialogOpen: boolean;
  setClearDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;

  detailsOpen: boolean;
  setDetailsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedForDetails: AlertWithGovernance | null;
  setSelectedForDetails: React.Dispatch<React.SetStateAction<AlertWithGovernance | null>>;

  resolveDialogOpen: boolean;
  selectedForResolve: AlertWithGovernance | null;
  setSelectedForResolve: React.Dispatch<React.SetStateAction<AlertWithGovernance | null>>;
  resolveNotes: string;
  setResolveNotes: React.Dispatch<React.SetStateAction<string>>;
  isResolving: boolean;
  setIsResolving: React.Dispatch<React.SetStateAction<boolean>>;

  goalDialogOpen: boolean;
  setGoalDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  goalDialogAlert: AlertWithGovernance | null;
  setGoalDialogAlert: React.Dispatch<React.SetStateAction<AlertWithGovernance | null>>;

  // Viewed tracking
  viewedPinned: Record<string, boolean>;
  markAsViewed: (id: string) => void;
}

/**
 * Hook to manage all UI state for the AlertsPanel
 *
 * Provides a centralized state management solution for:
 * - Section collapse/expand states
 * - Alert selection for bulk actions
 * - Dialog visibility and associated data
 * - Pinned alerts rail visibility
 * - Viewed status tracking
 *
 * @param activeAlerts - Current list of active alerts (for selection cleanup)
 * @returns UI state object with all state and setters
 *
 * @example
 * const uiState = useAlertUIState(alerts);
 * uiState.toggleSelection('alert-123');
 * uiState.setPinnedOpen(true);
 */
export function useAlertUIState(activeAlerts: AlertWithGovernance[]): AlertUIState {
  // Collapsible sections (by severity)
  const [collapsed, setCollapsed] = useState<Record<AlertSeverity, boolean>>({
    [AlertSeverity.Critical]: false,
    [AlertSeverity.Important]: false,
    [AlertSeverity.Moderate]: false,
    [AlertSeverity.Low]: false,
  });

  const toggleCollapsed = useCallback((severity: AlertSeverity) => {
    setCollapsed((prev) => ({
      ...prev,
      [severity]: !prev[severity],
    }));
  }, []);

  // Pinned rail visibility
  const [pinnedOpen, setPinnedOpen] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  // Dialogs
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedForDetails, setSelectedForDetails] = useState<AlertWithGovernance | null>(null);
  const [selectedForResolve, setSelectedForResolve] = useState<AlertWithGovernance | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalDialogAlert, setGoalDialogAlert] = useState<AlertWithGovernance | null>(null);

  const resolveDialogOpen = selectedForResolve !== null;

  // Viewed tracking (for pinned alerts)
  const [viewedPinned, setViewedPinned] = useState<Record<string, boolean>>({});

  const markAsViewed = useCallback((id: string) => {
    setViewedPinned((prev) => {
      if (prev[id]) return prev;
      return { ...prev, [id]: true };
    });
  }, []);

  // Auto-expand pinned rail on large screens
  useEffect(() => {
    try {
      const mql = window.matchMedia('(min-width: 1024px)');
      const handler = (e: MediaQueryListEvent) => setPinnedOpen(e.matches);
      setPinnedOpen(mql.matches);
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    } catch {
      // SSR or unsupported environment
    }
  }, []);

  // Cleanup selected IDs when alerts change (remove selections for alerts that no longer exist)
  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (activeAlerts.some((alert) => alert.id === id)) {
          next.add(id);
        }
      }
      return next;
    });
  }, [activeAlerts]);

  return {
    collapsed,
    setCollapsed,
    toggleCollapsed,
    pinnedOpen,
    setPinnedOpen,
    selectedIds,
    setSelectedIds,
    toggleSelection,
    clearSelection,
    selectAll,
    clearDialogOpen,
    setClearDialogOpen,
    detailsOpen,
    setDetailsOpen,
    selectedForDetails,
    setSelectedForDetails,
    resolveDialogOpen,
    selectedForResolve,
    setSelectedForResolve,
    resolveNotes,
    setResolveNotes,
    isResolving,
    setIsResolving,
    goalDialogOpen,
    setGoalDialogOpen,
    goalDialogAlert,
    setGoalDialogAlert,
    viewedPinned,
    markAsViewed,
  };
}
