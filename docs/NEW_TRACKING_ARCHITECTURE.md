# New Tracking Architecture (Local-First Sandbox)

This drop keeps all new code under `src/new/**` so we can rebuild the mobile-first experience
without touching the legacy app until we are ready.

## Modules Delivered

1. **Domain Models (`src/new/types.ts`)**
   - Defines students, sessions, entries, alerts, goals, XP snapshots, and backup snapshots using ISO
     timestamps.

2. **Storage Layer (`src/new/storage/*`)**
   - `storageKeys.ts` centralizes the namespace; `schema.ts` validates everything with Zod.
   - `localStorageAdapter.ts` wraps the browser API with safe fallbacks + footprint helpers.
   - `storageEvents.ts` emits typed DOM events whenever a repo changes.
   - `storageService.ts` exposes repositories, import/export helpers, and now notifies listeners
     after every write so hooks stay reactive.

3. **Session Manager (`src/new/tracking/sessionManager.ts`)**
   - Lifecycle APIs to start sessions, add/remove emotion & sensory entries, capture environmental
     data, manage notes, pause/resume, complete, discard, and validate sessions.
   - Automatically recalculates session quality (counts, duration, completeness) and persists
     per-student tracking preferences.

4. **React Hooks & UI Surfaces (`src/new/tracking/hooks.ts`, `src/new/hooks/storageHooks.ts`)**
   - `useSessions`, `useSession`, `useActiveSession`, and `useSessionActions` power the new tracking
     flow.
   - `useStudents`, `useGoals`, and `useAlerts` expose reactive views over the storage repositories,
     making it easy to hydrate dashboards without bespoke state management.
   - `LocalSessionsPanel` and `NewTrackingPreview` demonstrate how to embed the local-first data into
     existing screens (StudentProfile + TrackStudent) while keeping the legacy workflow intact.
5. **Analytics Bridge (`src/new/analytics/localAnalyticsDataStorage.ts`)**
   - Wraps the new repositories in the legacy `IDataStorage` contract so `analyticsManager`,
     orchestrators, and runners consume the same local-first students/sessions/goals.
   - `ensureUniversalAnalyticsInitialization` and the analytics service now default to this adapter,
     so cache warming, AI/insights, and exports always reflect the on-device data set.

## Data Storage Migration Audit (November 2025)

```
$ rg -i "dataStorage" -n src
```

No direct `dataStorage` imports remain in `src/**`. Every consumer now routes through
`localAnalyticsDataStorage` or the storage hooks. High-impact modules audited in this pass:

| Module/Hook | Purpose | Migration Path | Status |
| --- | --- | --- | --- |
| `src/lib/analyticsManager.ts` | Legacy analytics orchestration | Injected `localAnalyticsDataStorage` | ✅ storageService-only |
| `src/lib/analytics/runner.ts` | Worker task source of truth | Uses `IDataStorage` interface provided by adapter | ✅ |
| `src/hooks/useAnalyticsWorker.ts` | Worker/AI hook | Reads students/goals via `legacyAnalyticsAdapter` | ✅ |
| `src/hooks/useKreativiumAiState.ts` | AI tab state | Student list + entries from `legacyAnalyticsAdapter` | ✅ |
| `src/hooks/useDashboardData.ts` | Dashboard KPIs | `useLegacyTrackingEntries` + storage hooks | ✅ |
| `src/new/analytics/sessionCacheBridge.ts` | Event bus bridge | Clears analytics cache on `sessions` events | ✅ |
| `tests/unit/local-analytics-bridge.test.ts` | Analytics regression test | Seeds storageService/sessionManager | ✅ |

Any new feature must use the same adapters/hooks so the event bus stays authoritative.

## Hook Adoption Snapshot

- **TrackStudent** mounts `SessionHub`, `useSessionActions`, and form components. It auto-starts a
  session, provides offline warnings (via `useOnlineStatus`), and pipes saves through
  `sessionManager`.
- **StudentProfile** now renders `SessionHub`, `LocalSessionsPanel`, and `NewTrackingPreview`
  directly in the dashboard section plus an "Enhanced Tracking" area linking to Track + SessionFlow.
- **Session Flow (`/session/flow`)** embeds the same trio for the first available student so even the
  starter orchestration flow exercises `useSessions`/`useSessionActions`.
- **Dashboard/Reports/AI tab** continue to rely on `useStudents`, `useLegacyTrackingEntries`, and
  `legacyAnalyticsAdapter` so analytics/AI surfaces reflect the same local namespace.

These integrations replace the old beta-only preview cards; production builds now render the local
session cards, autosave/recovery badges, and offline indicators everywhere tracking happens.

**Localization update (Nov 2025):** StudentProfile’s enhanced-tracking CTA, TrackStudent, Session
Flow, and SessionHub now pull button labels, descriptions, and bullets from `tTracking.enhanced.*`
so the Norwegian copy stays consistent with the tracking namespace.

## Example Usage

```ts
import { storageService } from '@/new/storage/storageService';
import { sessionManager } from '@/new/tracking/sessionManager';
import { useSessions, useSessionActions } from '@/new/tracking/hooks';

const student = storageService.upsertStudent({ name: 'Nova Test' });
const { startSession, addEmotion } = useSessionActions(student.id);
const session = startSession();
addEmotion(session.id, { label: 'happy', intensity: 4 });

const sessions = useSessions({ studentId: student.id });
```

## StorageService Semantics & Controls

- `storageService.exportSnapshot()` returns a fully validated object (students, sessions, goals,
  alerts, xp, settings, version). It is what the Settings screen surfaces as "Eksporter lokalt".
- `storageService.importSnapshot(snapshot, { merge })` writes every repository and emits storage
  events for `students`, `sessions`, `goals`, `alerts`, `xp`, and `settings`. Use `merge: false`
  (default) to wipe, or `merge: true` to append.
- `storageService.clearAll()` wipes the namespace, while `storageService.clearSessions(studentId?)`
  removes only session data (used by the "Slett lokale økter" control). Both paths notify the event
  bus so analytics caches invalidate automatically.
- `storageService.getSessionStats(studentId?)` powers the Settings privacy card. The new Vitest suite
  (`src/new/storage/__tests__/storageService.test.ts`) covers stats, event emission, and import/export
  invariants.

## Analytics, AI & Privacy Expectations

- `legacyAnalyticsAdapter` is the single bridge. All analytics and AI hooks (workers, Kreativium AI,
  dashboards) read students, goals, and sessions through it, so they observe the same local-first
  dataset as the tracking UI.
- `ensureSessionAnalyticsBridge` subscribes to `sessions` storage events and calls
  `analyticsManager.clearCache()`. `tests/unit/local-analytics-bridge.test.ts` now asserts we emit
  cache invalidations every time a session is created, saved, or deleted—matching the user's privacy
  expectations.
- Local-only behavior: nothing syncs unless export/import is invoked manually. Offline indicators in
  `SessionHub` explain when we are buffering locally, and the Settings doc references these controls
  so admins understand how to wipe/reset the namespace.

## Next Steps

1. Expand the UI to rely on the new hooks everywhere (dashboard, reports, Tegn/Skills modules).
2. Add Vitest + Playwright coverage for the storage service, session manager, event bus, and hooks.
3. Provide Storybook/visual docs for the new local-first panels (e.g., the Track Student preview).
4. Continue refining the privacy center & backup tooling using the same storage abstractions.

## Remaining Workstream Checklist

- **Data migration:** Replace the legacy `dataStorage` imports (e.g., analyticsManager, AI hooks, reports) with `storageService` + the new hooks/event bus, then retire the legacy storage contracts so the local pipeline becomes the single source of truth.
- **Analytics & AI bridging:** Update `useAnalyticsWorker`, `useKreativiumAiState`, and other analytics dashboards to read from `localAnalyticsDataStorage` via `storageService`, use `ensureSessionAnalyticsBridge` for cache invalidation, and add Vitest specs that prove analytics observe the new store exclusively.
- **Tracking UX expansion:** Replace the old Track Student layout with the planned mobile-first session list/stack, recovery/autosave views, and session action hook wiring so EmotionGame, EnhancedTrackStudent, and other flows reuse `useSessionActions` everywhere; move the beta-only preview/panel code into general builds.
- **CRUD & hooks adoption:** Wire `useStudentActions`, `useGoalActions`, `useAlertActions`, `useStudents`, `useGoals`, `useAlerts`, etc., across dashboards, student profiles, reports, and tools so every mutation flows through `storageService` and the event bus.
- **Testing & docs:** Ship Vitest suites for the storage service/session manager/hooks, Playwright flows showing “start session → add entries → view insights,” and documentation that covers the hook APIs, storageService export/import/backup usage, and analytics/AI expectations.
- **Privacy & backup tooling:** Surface the new footprint/analytics cache/session counts in Settings, add a “wipe local sessions only” control tied to the new namespace, and document what stays on-device plus how to reset the local data stack.

## Recent coverage

- **Vitest validation:** `tests/unit/local-analytics-bridge.test.ts` now seeds `storageService`/`sessionManager`, exercises `localAnalyticsDataStorage`, and asserts `ensureSessionAnalyticsBridge` clears `analyticsManager` caches whenever sessions change.
- **Playwright journey:** `tests/e2e/local-tracking-analytics.spec.ts` demonstrates “start session → add emotion → save → StudentProfile dashboard → Kreativium AI” so the UI and analytics pipeline read from the same local storage service while the new data-testids (`SessionHub`, `TrackStudent`, `LocalSessionsPanel`, `KreativiumAI`) make the flow resilient for automation.

## Settings & privacy tooling

- **Local session metrics:** The Settings page now queries `storageService.getSessionStats()` to show total/active/paused/completed session counts, and explains that every write emits storage events (see `storageEvents.ts`) so analytics caches stay consistent via `ensureSessionAnalyticsBridge`.
- **Wipe/backup actions:** “Eksporter lokalt”, “Importer fil”, “Tøm lokal data”, and the new “Slett lokale økter” buttons cover backup, restore, namespace wipe, and targeted session clearing; the documentation now points here for guidance on `storageService.exportSnapshot`, `localAnalyticsDataStorage`, and storageService’s `clearSessions()` helper.

### Detailed To-Do Items

- **Data migration**
  - Run a full audit of the ~120 remaining `dataStorage` imports (`rg dataStorage`) and decide which ones are legacy sync vs. local-first requirements.
  - Migrate `src/lib/analyticsManager.ts`, `src/lib/analytics/runner.ts`, `useAnalyticsWorker`, AI summaries, reports, and dashboards to consume `storageService` via `localAnalyticsDataStorage`/`legacyAnalyticsAdapter`.
  - Once migrated, remove or quarantine `@/lib/dataStorage` so no new code bypasses the event bus/session manager.

- **Analytics & AI bridging**
  - Re-implement `useKreativiumAiState` and `useDataQualitySummaries` to pull students/entries from `legacyAnalyticsAdapter` backed by `storageService` only, and ensure `analyticsManager` and `useAnalyticsWorker` stop calling `dataStorage`.
  - Ensure `ensureSessionAnalyticsBridge` is wired in production builds so the analytics cache invalidates whenever session storage events fire.
  - Add Vitest coverage for `localAnalyticsDataStorage`, the analytics bridge, and cache invalidation to prove analytics/AI buckets only read from the synced local store.

- **Tracking UX expansion**
  - Replace the legacy `EmotionTracker`/`SensoryTracker` forms in `TrackStudent` (`src/pages/TrackStudent.tsx:5-593`) with the planned mobile form, session cards, recovery/auto-save UI, and offline badge described in the architecture docs.
  - Bake `useSessionActions` into every tracking surface beyond `TrackStudent` (EmotionGame, EnhancedTrackStudent, additional modules) so create/update flows run through the session manager.
  - Surface session lists/cards in production rather than hiding them behind `NewTrackingPreview`/`LocalSessionsPanel` Beta components.

- **CRUD & hooks adoption**
  - Ensure `useStudents`, `useGoals`, `useAlerts`, `useStudentActions`, `useGoalActions`, and `useAlertActions` are used across dashboards, the AI tab, profile sections, skills modules, and report builders instead of direct `dataStorage` writes.
  - Verify mutation hooks replace `dataStorage` CRUD surfaces (AddStudent/Elev card, goal/alert editors) so every write emits storage events and updates the event bus cache.

- **Testing & docs**
  - Add Vitest suites for `storageService`, `sessionManager`, hook invariants, and analytics bridging (describe expected invalidations and fallback behaviors).
  - Create Playwright end-to-end flows covering “start session → add entries → view insights/analytics” against the new storage stack.
  - Expand documentation to describe: how to use the new hooks (e.g., StudentProfile replaced analytics sections with `useSessions`), how `storageService.exportSnapshot/importSnapshot` works, and how analytics/AI should read from `localAnalyticsDataStorage`.

- **Privacy & backup tooling**
  - Enrich the Settings/privacy center with visibility into the event bus/session counts and analytics cache footprint, plus a “wipe local sessions only” button tied to the new namespace.
  - Document the privacy guarantees: what data stays on-device, when it syncs to the legacy stack (if at all), and how admins can back up/reset local data via the storageService APIs.
