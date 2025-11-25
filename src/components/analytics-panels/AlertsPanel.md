## Alerts Panel Integration and Legacy Bridge

This document outlines how the Alerts Panel consumes alerts from both the legacy `TriggerAlert`
system and the new `AlertEvent` domain model via the alert bridge.

### Bridge Overview

- Bridge file: `src/lib/alerts/bridge.ts`
- Responsibilities:
  - Detect legacy storage under `sensoryTracker_alerts`
  - Convert `TriggerAlert`/`AlertHistoryEntry` to `AlertEvent`
  - Migrate and persist to `alerts:list:{studentId}` with safe backup
  - Bidirectional sync to maintain compatibility
  - Lightweight polling to capture legacy emissions

### Hook Integration

- Hook: `src/hooks/useAlerts.ts`
- Behavior:
  - Loads `AlertEvent[]` from `alerts:list:{studentId}`
  - If empty, invokes bridge conversion for the student and persists
  - Runs a background migration and starts legacy polling
  - Emits `alerts:migration` and `alerts:updated` events on changes

### One-Click Actions

- Implemented in `src/components/analytics-panels/AlertsPanel.tsx`:
- Create Goal from alert context (stored via `storageService.upsertGoal`)
  - Add Intervention Template using `InterventionTemplateManager`
  - Schedule Check-in (stores review date via intervention customization)
  - Add to Report (saved to `reports:drafts:{studentId}`)
  - Notify Team (local logging/toast; integrate with notifier when available)

### PBIS/HLP Integration

- Intervention suggestions sourced from `src/lib/interventions/library.ts`
- `AlertDetails` exposes Add Template and Create Goal actions and a review scheduler

### Migration Notes

- Legacy data is backed up to `sensoryTracker_alerts_backup` automatically
- Migration status tracked under `alerts:migration:status`
- The bridge is idempotent; repeated runs deduplicate by alert id

### Accessibility & UX

- All actions have toasts and proper ARIA labels in the Panel
- Keyboard navigation follows the underlying UI primitives
