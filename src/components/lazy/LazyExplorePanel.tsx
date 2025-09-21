import React from 'react';

export const LazyExplorePanel = React.lazy(() =>
  import('@/components/analytics/panels/ExplorePanel').then(m => ({ default: m.ExplorePanel }))
);


