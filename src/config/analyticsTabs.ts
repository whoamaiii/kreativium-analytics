import type { TabKey } from '@/types/analytics';

// Flattened tab structure - removed nested "Explore" parent
// Now all views are accessible from a single tab level
export const ANALYTICS_TABS: {
  key: TabKey;
  labelKey: string;
  testId: string;
  ariaLabelKey?: string;
}[] = [
  {
    key: 'overview',
    labelKey: 'tabs.overview',
    testId: 'dashboard-overview-tab',
    ariaLabelKey: 'aria.tabs.overview',
  },
  {
    key: 'charts',
    labelKey: 'explore.presets.charts',
    testId: 'dashboard-charts-tab',
    ariaLabelKey: 'aria.explore.chartsTab',
  },
  {
    key: 'patterns',
    labelKey: 'explore.presets.patterns',
    testId: 'dashboard-patterns-tab',
    ariaLabelKey: 'aria.explore.patternsTab',
  },
  {
    key: 'correlations',
    labelKey: 'explore.presets.correlations',
    testId: 'dashboard-correlations-tab',
    ariaLabelKey: 'aria.explore.correlationsTab',
  },
  {
    key: 'alerts',
    labelKey: 'tabs.alerts',
    testId: 'dashboard-alerts-tab',
    ariaLabelKey: 'aria.tabs.alerts',
  },
  {
    key: 'monitoring',
    labelKey: 'tabs.monitoring',
    testId: 'dashboard-monitoring-tab',
    ariaLabelKey: 'aria.tabs.monitoring',
  },
];
