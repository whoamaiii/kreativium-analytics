import type { TabKey } from '@/types/analytics';

export const ANALYTICS_TABS: { key: TabKey; labelKey: string; testId: string; ariaLabelKey?: string }[] = [
  { key: 'overview', labelKey: 'tabs.overview', testId: 'dashboard-overview-tab', ariaLabelKey: 'aria.tabs.overview' },
  { key: 'explore', labelKey: 'tabs.explore', testId: 'dashboard-explore-tab', ariaLabelKey: 'aria.tabs.explore' },
  { key: 'alerts', labelKey: 'tabs.alerts', testId: 'dashboard-alerts-tab', ariaLabelKey: 'aria.tabs.alerts' },
];
