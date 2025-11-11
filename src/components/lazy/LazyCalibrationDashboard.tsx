import React from 'react';

export const LazyCalibrationDashboard = React.lazy(() =>
  import('@/components/monitoring/CalibrationDashboard').then((mod) => ({
    default: mod.CalibrationDashboard,
  })),
);

export default LazyCalibrationDashboard;
