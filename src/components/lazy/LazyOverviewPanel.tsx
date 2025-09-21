import React from 'react';

export const LazyOverviewPanel = React.lazy(() =>
  import('@/components/analytics/panels/OverviewPanel').then(m => ({ default: m.OverviewPanel }))
);



