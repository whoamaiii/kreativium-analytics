## Alert Governance Policies

This document explains the alert governance system and its educational rationale, covering quiet hours, daily caps, throttling, deduplication, snooze controls, and audit trails.

### Rationale

Thoughtful governance reduces alert fatigue while ensuring safety-critical information is delivered. Policies are tuned for classroom workflows and are transparent via an audit trail for debugging and compliance.

### Quiet Hours

- Reduce alert fatigue outside instructional times. Supports `start`, `end`, optional `daysOfWeek`, and timezone passthrough.
- Midnight crossover is supported (e.g., 22:00–07:00).
- Recommended presets differ by grade level; see `policyConfig.ts`.

### Daily Caps by Severity

- Per-student limits ensure critical issues surface without overload:
  - critical: 1/day
  - important: 2/day
  - moderate: 4/day
  - low: unlimited by default (or a large number)

### Exponential Backoff Throttling

- Limits repetitive alerts with increasing delays per dedupe key: `delay = min(6h, 2^attempts * 1s)`.
- Attempts reset when eligibility is reached.

### Deduplication

- Hash key built from `studentId | kind | contextKey | hourUTC` groups similar alerts.
- Within a 1-hour window, prefer higher severity; if equal, the most recent wins.

### Snooze and "Don't Show Again"

- Teachers can snooze a dedupe key (default 24h) or hide for N days (default 7).
- Preferences are configurable via `AlertSettings.snoozePreferences`.

### Policy Validation and Audit Trail

- Settings are validated and normalized using `validateAlertSettings()`.
- Decisions are logged in a local audit trail (bounded), accessible via `AlertPolicies.getAuditTrail(studentId)`.

### Settings Validation

Use `validateAlertSettings()` to normalize and check policy settings. For fail-fast behavior, use `assertValidAlertSettings()`.

Examples of normalized defaults:
- `dailyCaps.low` defaults to a very high value (effectively unlimited)
- `snoozePreferences`: `{ defaultHours: 24, dontShowAgainDays: 7 }`

### Integration

- Use `AlertPolicies.canCreateAlert()` to gate alert creation.
- Batch helpers: `applyQuietHours()`, `enforceCapLimits()`, `deduplicateAlerts()`.
- See `policyExamples.ts` for usage patterns with the detection engine and telemetry.

### Troubleshooting
### Examples

See `policyExamples.ts` for:
- District quiet hours configuration
- Grade-level severity caps
- High-activity classroom deduplication
- Planned intervention snoozing


- Alerts blocked unexpectedly: Check audit trail for `reasons` and verify quiet hours/ caps.
- High duplicates: Ensure `metadata.contextKey` is set consistently by detectors.
- Excess throttling: Inspect throttle attempts for the dedupe key and timing windows.



### Storage Keys and Namespacing

The policy layer persists lightweight state in storage to support throttling, snooze, and audits. Keys are per-student and optionally namespaced.

- Key patterns (without namespace):
  - `alerts:policy:<studentId>:throttle` — throttle attempt counts per dedupe key
  - `alerts:policy:<studentId>:throttleSchedule` — scheduled next eligible ISO timestamps per dedupe key
  - `alerts:policy:<studentId>:throttleMeta` — metadata for throttling, e.g., last eligible timestamp per dedupe key
  - `alerts:policy:<studentId>:snooze` — snooze-until ISO timestamps per dedupe key
  - `alerts:policy:<studentId>:audit` — bounded audit trail of recent policy decisions
  - `alerts:list:<studentId>` — persisted list of allowed alerts for daily caps calculation

- Namespacing behavior:
  - When `new AlertPolicies(namespace)` is constructed with a non-empty `namespace`, all keys are prefixed with `<namespace>:`.
  - Examples: `nsA:alerts:policy:s1:throttle`, `nsA:alerts:list:s1`.
  - Namespaces are fully isolated: state written under one namespace is not visible to another.

