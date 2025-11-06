import React from 'react';

export const LazyAlertsPanel = React.lazy(() =>
  import('@/components/analytics-panels/AlertsPanel').then(m => ({ default: m.AlertsPanel }))
);
