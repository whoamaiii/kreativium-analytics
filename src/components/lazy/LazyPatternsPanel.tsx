import React from 'react';

export const LazyPatternsPanel = React.lazy(() =>
  import('@/components/analytics-panels/PatternsPanel').then((m) => ({ default: m.PatternsPanel })),
);
