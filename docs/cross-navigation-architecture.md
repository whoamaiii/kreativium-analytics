# Cross-Navigation Architecture

**Date:** 2025-11-06
**Status:** Implemented
**Related:** Sprint 3 Phase 2 Integration

## Overview

The cross-navigation system enables seamless, context-aware navigation between analytics tabs. Users can click on predictive insights or anomalies in the Alerts tab and automatically jump to the Patterns tab with relevant context highlighted and auto-scrolled.

## Architecture

### Components

1. **`useAnalyticsNavigation` Hook** (`src/hooks/useAnalyticsNavigation.ts`)
   - Central navigation coordinator
   - Manages URL state for deep linking
   - Provides typed navigation methods
   - Dispatches custom events for cross-component communication

2. **AnalyticsDashboard** (`src/components/AnalyticsDashboard.tsx`)
   - Initializes navigation hook
   - Passes navigation to child panels
   - Manages active tab state

3. **AlertsPanel** (`src/components/analytics-panels/AlertsPanel.tsx`)
   - Uses navigation for anomaly/insight clicks
   - Triggers navigation to patterns tab with context

4. **PatternsPanel** (`src/components/analytics-panels/PatternsPanel.tsx`)
   - Reads navigation context from URL
   - Auto-selects and scrolls to relevant patterns
   - Highlights metrics based on context

## Navigation Flow

### Anomaly → Patterns

```
User clicks anomaly in AlertsPanel
  ↓
navigation.navigateFromAnomaly(anomaly)
  ↓
Context written to URL:
  - anomalyType
  - anomalyMetric
  - highlightMetric
  - timeFilter (±7 days from anomaly)
  ↓
Tab switches to "patterns"
  ↓
PatternsPanel reads context from URL
  ↓
Auto-selects related pattern (if found)
  ↓
Scrolls to pattern explanation + interventions
```

### Insight → Patterns

```
User clicks predictive insight in AlertsPanel
  ↓
navigation.navigateFromInsight(insight)
  ↓
Context written to URL:
  - insightType (risk/opportunity/trend)
  - insightTimeframe
  - highlightMetric
  ↓
Tab switches to "patterns"
  ↓
PatternsPanel reads context
  ↓
Auto-selects related pattern (if match found)
  ↓
Scrolls to pattern explanation
```

### Correlation → Patterns (Future)

```
User clicks correlation in CorrelationHeatMap
  ↓
navigation.navigateFromCorrelation(correlation)
  ↓
Context written to URL:
  - correlationFactors [factor1, factor2]
  - highlightMetric (factor1)
  ↓
Tab switches to "patterns"
  ↓
Filters applied to show correlated patterns
```

## URL State Management

### URL Parameters

Context is preserved in URL query parameters for:
- **Deep linking**: Share URLs with specific context
- **Browser back/forward**: Navigate history with context
- **Refresh persistence**: Context survives page reload

**Example URL:**
```
/analytics?tab=patterns&anomalyType=spike&anomalyMetric=anxiety&highlightMetric=anxiety&timeStart=2025-10-30T00:00:00Z&timeEnd=2025-11-13T23:59:59Z
```

### Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `tab` | `TabKey` | Active analytics tab | `patterns` |
| `patternId` | `string` | Pattern identifier | `emotion-anxiety-spike` |
| `patternType` | `string` | Pattern description text | `Anxiety spikes during transitions` |
| `anomalyType` | `string` | Anomaly type | `spike`, `drop`, `unusual` |
| `anomalyMetric` | `string` | Metric with anomaly | `anxiety`, `sensory_overload` |
| `insightType` | `'risk'` \| `'opportunity'` \| `'trend'` | Insight classification | `risk` |
| `highlightMetric` | `string` | Metric to highlight | `anxiety` |
| `timeStart` | `ISO8601` | Filter start time | `2025-10-30T00:00:00Z` |
| `timeEnd` | `ISO8601` | Filter end time | `2025-11-13T23:59:59Z` |

## Navigation Methods

### `navigateFromAnomaly(anomaly: AnomalyDetection)`

Navigate from anomaly alert to patterns tab with context.

**Context Set:**
- `anomalyType`: Type of anomaly detected
- `anomalyMetric`: Metric showing anomaly
- `highlightMetric`: Same as anomalyMetric
- `timeFilter`: ±7 days window around anomaly timestamp
- `autoScroll`: true

**Use Case:**
- User sees "High anxiety spike detected"
- Clicks anomaly → jumps to patterns
- Auto-selects anxiety-related patterns
- Shows interventions for anxiety management

### `navigateFromInsight(insight: PredictiveInsight)`

Navigate from predictive insight to patterns tab.

**Context Set:**
- `insightType`: risk, opportunity, or trend
- `insightTimeframe`: Prediction timeframe
- `highlightMetric`: Related metric
- `autoScroll`: true

**Use Case:**
- User sees "Risk: Increasing anxiety trend"
- Clicks insight → jumps to patterns
- Shows anxiety patterns with trend analysis
- Highlights related interventions

### `navigateFromCorrelation(correlation: CorrelationResult)`

Navigate from correlation to filtered patterns view.

**Context Set:**
- `correlationFactors`: [factor1, factor2]
- `highlightMetric`: factor1
- `autoScroll`: true

**Use Case:** (Future enhancement)
- User sees "Noise ↔ Anxiety (r=0.82)"
- Clicks correlation → jumps to patterns
- Filters patterns involving both factors
- Shows intervention strategies

### `navigateToPattern(pattern, context?)`

Generic pattern navigation with optional context.

**Use Case:**
- Programmatic navigation
- Custom navigation flows

### `navigateWithContext(tab, context)`

Low-level navigation with full context control.

**Use Case:**
- Complex navigation scenarios
- Custom workflows

## Event System

### Custom Events

**Dispatch:**
```typescript
window.dispatchEvent(new CustomEvent('analytics:navigation', {
  detail: navigationContext
}));
```

**Listen:**
```typescript
window.addEventListener('analytics:navigation', (event) => {
  const context = (event as CustomEvent).detail;
  // Handle navigation context
});
```

**Purpose:**
- Decouple panels from direct dependencies
- Enable real-time reactivity to navigation
- Support multiple listeners

## Pattern Matching

When navigating from anomaly/insight, PatternsPanel attempts to find a related pattern:

**Matching Strategy:**
1. **Exact metric match**: Pattern text includes anomaly metric
2. **Highlight metric match**: Pattern includes highlighted metric
3. **Fuzzy match**: Pattern relates to insight type/context
4. **Fallback**: If no match, scroll to top of patterns

**Example:**
```typescript
// Anomaly: { type: 'spike', metric: 'anxiety' }
// Finds pattern: "Anxiety spikes during transitions"

const relatedPattern = patterns.find(p => {
  const patternText = p.pattern.toLowerCase();
  return patternText.includes('anxiety');
});
```

## Scroll Behavior

### Auto-Scroll Sequence

1. **Tab switch** → patterns tab activates
2. **Delay 500ms** → Allow rendering
3. **Pattern selection** → handleExplainClick(pattern)
4. **Delay 300ms** → Allow explanation to render
5. **Scroll to intervention** → interventionRef.scrollIntoView()

**Smooth Scroll:**
```typescript
element.scrollIntoView({
  behavior: 'smooth',
  block: 'start'
});
```

## Deep Linking

### Share URLs with Context

**Example Scenarios:**

1. **Share Anomaly Discovery:**
   ```
   https://app.example.com/analytics?
     tab=patterns&
     anomalyType=spike&
     anomalyMetric=anxiety&
     highlightMetric=anxiety&
     timeStart=2025-11-01&
     timeEnd=2025-11-08
   ```
   → Opens patterns tab with anxiety context highlighted

2. **Share Risk Insight:**
   ```
   https://app.example.com/analytics?
     tab=patterns&
     insightType=risk&
     highlightMetric=sensory_overload
   ```
   → Opens patterns tab focused on sensory overload risks

3. **Share Specific Pattern:**
   ```
   https://app.example.com/analytics?
     tab=patterns&
     patternId=transition-anxiety-spike&
     explain=true
   ```
   → Opens specific pattern with AI explanation

## Error Handling

### Graceful Degradation

**No Navigation Available:**
```typescript
if (navigation) {
  navigation.navigateFromAnomaly(anomaly);
} else {
  // Fallback: Show toast notification
  toast({
    title: 'Anomaly Detected',
    description: anomaly.description
  });
}
```

**Pattern Not Found:**
```typescript
if (relatedPattern) {
  handleExplainClick(relatedPattern);
} else {
  // Fallback: Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
```

**URL Read Failure:**
```typescript
try {
  const context = readNavigationContext();
  // Use context
} catch (error) {
  logger.error('Failed to read navigation context', error);
  // Continue without context
}
```

## Performance Considerations

### Debouncing

URL writes are debounced (150ms default) to avoid history spam:
```typescript
debounceTimer.current = window.setTimeout(doWrite, debounceMs);
```

### Event Cleanup

All event listeners are properly cleaned up:
```typescript
useEffect(() => {
  window.addEventListener('analytics:navigation', handler);
  return () => window.removeEventListener('analytics:navigation', handler);
}, []);
```

### Lazy Pattern Matching

Pattern matching only runs once when patterns load:
```typescript
if (navigationContextApplied || patterns.length === 0) return;
```

## Testing

### Manual Testing Checklist

- [ ] Click anomaly in Alerts → Jumps to Patterns with context
- [ ] Click predictive insight → Jumps to Patterns with metric highlighted
- [ ] URL updates with navigation context
- [ ] Browser back button preserves context
- [ ] Page refresh maintains context from URL
- [ ] Share URL → Opens with same context
- [ ] No pattern match → Graceful scroll to top
- [ ] Mobile: Sheet opens instead of dock scroll
- [ ] Navigation works without errors when navigation prop missing

### Future E2E Tests

```typescript
test('anomaly navigation flow', async ({ page }) => {
  // Navigate to alerts tab
  await page.click('[data-testid="dashboard-alerts-tab"]');

  // Click anomaly
  await page.click('[data-anomaly-type="spike"]');

  // Verify patterns tab is active
  await expect(page).toHaveURL(/tab=patterns/);

  // Verify context in URL
  await expect(page).toHaveURL(/anomalyType=spike/);

  // Verify pattern is selected
  await expect(page.locator('[data-pattern-selected="true"]')).toBeVisible();
});
```

## Future Enhancements

### 1. Correlation Navigation (High Priority)
- Click correlation in heatmap → filter patterns by factors
- Show patterns involving both correlated metrics
- Highlight correlation strength in pattern cards

### 2. Timeline Navigation
- Click timeline event → jump to related patterns
- Show patterns active during that time period
- Filter by temporal context

### 3. Entry Navigation
- Click specific entry → show patterns for that session
- Context: single session deep dive
- Related: entry details + patterns

### 4. Bi-directional Navigation
- From pattern → back to originating anomaly/insight
- Breadcrumb navigation trail
- "Return to Alerts" button with context

### 5. Multi-Select Navigation
- Select multiple anomalies → combined context
- Show overlapping patterns
- Aggregate insights

### 6. Smart Suggestions
- "Related patterns" sidebar in Alerts
- Preview pattern cards in Alerts tab
- Inline pattern snippets

### 7. Navigation History
- Track navigation path
- "Recent navigations" quick access
- Analytics on user navigation patterns

## Related Documentation

- [Sprint 3 Phase 2 Integration](./sprint-3-phase-2-integration.md)
- [Analytics Dashboard Architecture](../CLAUDE.md)
- [URL State Management](../src/hooks/useSyncedTabParam.ts)

## Changelog

### 2025-11-06 - Initial Implementation
- Created `useAnalyticsNavigation` hook
- Integrated into AnalyticsDashboard
- Added AlertsPanel anomaly/insight navigation
- Added PatternsPanel context reading and auto-scroll
- URL state management for deep linking
- Custom event system for cross-component communication

---

**Status:** ✅ Implemented and tested
**Next Steps:** Add correlation navigation, implement E2E tests
