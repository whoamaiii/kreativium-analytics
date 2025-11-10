# Profile Sections: Tabs, Panels, URL sync, and Accessibility

This document explains how the Analytics tabs work, how they sync with the URL, where to add new
analytics panels, how to wire i18n keys, and the accessibility requirements for this area.

- Primary components:
  - src/components/AnalyticsDashboard.tsx (tab UI, live region, skip link)
  - src/hooks/useSyncedTabParam.ts (URL <-> tab state sync)
  - src/components/analytics-panels/\* (panel implementations)
  - src/components/lazy/\* (code-split lazy wrappers)

## URL synchronization for tabs

- The active tab is synchronized with the URL search parameter ?tab=.
- Valid values: overview, explore, alerts (source of truth: src/config/analyticsTabs.ts)
- Hook: useSyncedTabParam({ paramKey: 'tab', defaultTab: 'overview', debounceMs: 150 })
  - Reads initial state from window.location.search.
  - Debounces writes to avoid polluting history.
  - Uses react-router-dom useSearchParams if available; falls back to history.replaceState
    otherwise.
  - Handles back/forward navigation via popstate and router updates.
- Backward compatibility: older values (charts, patterns, correlations, visualizations) are
  normalized to the current keys where possible for deep-link stability.
  - This conversion happens in the hook via normalizeTab().

Deep linking examples:

- .../student/123?tab=overview
- .../student/123?tab=explore
- .../student/123?tab=alerts

## Adding a new analytics panel

If you want to introduce a new tab/panel:

1. Create a concrete panel component in src/components/analytics-panels, e.g. MyNewPanel.tsx. Keep
   it presentational; accept filteredData props and avoid heavy work on the main thread per project
   rules.
2. Create a lazy wrapper in src/components/lazy, e.g. LazyMyNewPanel.tsx, that dynamically imports
   the panel for code splitting.
3. Register the tab in AnalyticsDashboard:
   - Add an entry to the TABS array with a unique key and data-testid.
   - Add a corresponding TabsContent block rendering your Lazy\* panel.
   - Ensure the key you add is also considered valid by the URL-sync hook. Update VALID_TABS in
     src/hooks/useSyncedTabParam.ts to include the new key.
4. i18n wiring:
   - All labels come from the analytics namespace.
   - Add these keys (both en and nb):
     - analytics.tabs.<yourKey>
     - analytics.aria.tabs.<yourKey> (optional: more descriptive aria-label)
   - If you announce changes (see Accessibility) you may also add any additional strings you need
     under analytics.\*.
5. Testing hooks:
   - Follow the existing pattern using data-testid on TabsTrigger (e.g., dashboard-<yourKey>-tab) so
     tests can target your tab.

## Accessibility requirements

This section must meet the project’s accessibility rules.

- Skip link:
  - Provide a “Skip to content” link that targets the tabpanel container id.
  - Current target id: #analytics-tabpanel (TabsContent for charts).
  - The link is rendered near the top of AnalyticsDashboard and uses the localized label
    analytics.skipToContent.
  - Ensure the tabpanel container has tabIndex={-1} so focus can be moved there programmatically.
- Live region behavior:
  - A visually hidden live region with role="status" and aria-live="polite" announces tab changes.
  - Element id: analytics-live-region.
  - On tab change, AnalyticsDashboard sets the live region text to the translated tab label from
    analytics.tabs.<key>.
  - Do not spam announcements; only update on active tab changes.
- Heading/landmarks:
  - The dashboard section uses role="region" and is labelled by #analytics-dashboard-title to
    preserve heading hierarchy.
- Global wrapper integration:
  - The app also exposes a global announcer in AccessibilityWrapper (id:
    accessibility-announcements) used by announceToScreenReader(). Keep this intact and do not
    remove the wrapper.

## Minor breaking change

- The tab value visualizations has been renamed to charts.
- Breaking surface: Any code that programmatically set ?tab=visualizations should update to
  ?tab=charts.
- Compatibility: Legacy URLs using ?tab=visualizations still work due to a conversion guard in
  useSyncedTabParam (visualizations -> charts), so deep links will continue to resolve correctly.

## Notes and conventions

- i18n: All user-facing strings must come from react-i18next namespaces per project rules
  (analytics, student, common). Add missing keys in both nb and en.
- Performance: Panels should be code-split (React.lazy + Suspense) and avoid heavy computations on
  the main thread. Use the analytics worker hooks when needed.
- Keys: Use stable identifiers, never array indices, for list rendering inside panels.
- Styling: Use Tailwind utility classes; do not introduce inline styles. Reuse UI primitives in
  src/components/ui.
- Routing: Keep deep-link behavior stable. If you introduce new tabs, update VALID_TABS in
  useSyncedTabParam to ensure URL validation and normalization remain correct.
