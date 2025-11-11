### Alert System Integration Architecture

This document explains the end-to-end alert system architecture from detection engine to UI.

#### Flow Overview

1. Detection Engine (worker) evaluates data and emits messages:
   - `alerts`: newly detected alert events
   - `partial`: intermediate analytics results
   - `complete`: final analytics results
   - `progress`: heartbeat
   - `error`: recoverable error details

2. `useAnalyticsWorker` consumes worker messages, applies governance, persists alerts, and
   dispatches `alerts:updated`.

3. UI surfaces (`useAlerts`, `AlertsPanel`, `AlertCard`, `AlertDetails`) listen/respond to updates
   and render alert data.

#### Files

- `src/hooks/useAnalyticsWorker.ts`: Worker lifecycle, message dispatch, alert governance,
  persistence, health events.
- `src/lib/alerts/engine.ts`: Detection logic & source ranking utilities.
- `src/components/alerts/AlertCard.tsx`: Compact card with confidence, sparkline, and S1–S3 sources.
- `src/components/alerts/AlertDetails.tsx`: Detailed view with wide sparkline, metadata and
  feedback.

#### S1–S3 Source Attribution

Sources are ranked by combined impact × confidence. Top three are surfaced in cards as S1–S3 with
details in the expanded list. Full details are available in the alert detail panel.

#### Sparkline Pipeline

Sparkline input points are down-sampled (`generateSparklineData`) and rendered in compact and wide
variants. Components support theming and interactive focus in details.

#### Real-time Updates

- Worker emits `alerts` → `useAnalyticsWorker` persists and dispatches `alerts:updated`.
- A health heartbeat `alerts:health` includes performance snapshot and freshness status.

#### Performance & Health

- `src/lib/alerts/performance.ts` captures latencies for alert processing, sparkline generation, and
  UI updates.
- Throughput and memory estimates included for lightweight monitoring.

#### Troubleshooting

- No alerts arriving: monitor `alerts:health` for `msSinceLastAlert` and confirm worker
  initialization.
- Missing `studentId` in payload: worker-side detector must include it; messages are ignored without
  it.
- UI stutter on large datasets: enable virtualization in lists, ensure sparkline down-sampling.

#### Extending

- Add new detectors: ensure they populate `sources` and metadata fields (`sparkValues`,
  `sparkTimestamps`).
- Customize visuals: pass sparkline options to `AlertCard` and adjust detail renderers.
