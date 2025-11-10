/**
 * @file Alert keyboard shortcuts hook
 *
 * Provides keyboard shortcuts for alert management:
 * - `/` - Focus search input
 * - `Cmd/Ctrl + A` - Acknowledge selected alerts
 * - `Cmd/Ctrl + R` - Resolve selected alert
 * - `Cmd/Ctrl + S` - Snooze similar alerts
 * - `Escape` - Clear selection
 *
 * Handles keyboard event management and cleanup automatically.
 */

import { useEffect, RefObject } from 'react';

/**
 * Options for keyboard shortcut handling
 */
export interface KeyboardShortcutHandlers {
  /** Handler for acknowledging selected alerts (Cmd/Ctrl + A) */
  onAcknowledgeSelected: () => void;

  /** Handler for resolving selected alert (Cmd/Ctrl + R) */
  onResolve: () => void;

  /** Handler for snoozing similar alerts (Cmd/Ctrl + S) */
  onSnoozeSimilar: () => void;

  /** Handler for clearing selection (Escape) */
  onClearSelection: () => void;

  /** Ref to search input (for focus on `/` key) */
  searchInputRef?: RefObject<HTMLInputElement>;
}

/**
 * Hook to handle keyboard shortcuts for alert management
 *
 * Registers global keyboard event listeners and routes key combinations
 * to appropriate handlers. Automatically cleans up on unmount.
 *
 * @param handlers - Object containing callback functions for each shortcut
 *
 * @example
 * const searchRef = useRef<HTMLInputElement>(null);
 *
 * useAlertKeyboardShortcuts({
 *   onAcknowledgeSelected: handleAcknowledge,
 *   onResolve: handleResolve,
 *   onSnoozeSimilar: handleSnooze,
 *   onClearSelection: () => setSelectedIds(new Set()),
 *   searchInputRef: searchRef,
 * });
 */
export function useAlertKeyboardShortcuts(handlers: KeyboardShortcutHandlers): void {
  const {
    onAcknowledgeSelected,
    onResolve,
    onSnoozeSimilar,
    onClearSelection,
    searchInputRef,
  } = handlers;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search on `/` key (unless in input or with modifiers)
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Don't trigger if already in an input
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }

        e.preventDefault();
        searchInputRef?.current?.focus();
        return;
      }

      // Acknowledge selected (Cmd/Ctrl + A)
      if (e.key.toLowerCase() === 'a' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onAcknowledgeSelected();
        return;
      }

      // Resolve (Cmd/Ctrl + R)
      if (e.key.toLowerCase() === 'r' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onResolve();
        return;
      }

      // Snooze similar (Cmd/Ctrl + S)
      if (e.key.toLowerCase() === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onSnoozeSimilar();
        return;
      }

      // Clear selection (Escape)
      if (e.key === 'Escape') {
        onClearSelection();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onAcknowledgeSelected,
    onResolve,
    onSnoozeSimilar,
    onClearSelection,
    searchInputRef,
  ]);
}
