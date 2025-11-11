import React from 'react';

export const LazyChartsPanel = React.lazy(() =>
  import('@/components/analytics-panels/ChartsPanel').then((m) => ({ default: m.ChartsPanel })),
);
