import { Toaster } from '@/components/ui/sonner-toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';
import { POC_MODE, IS_PROD } from '@/lib/env';
if (!POC_MODE) {
  import('@/lib/analyticsConfigOverride');
}
import { ThemeProvider } from 'next-themes';
import { AccessibilityWrapper } from '@/components/AccessibilityWrapper';
import { LoadingFallback } from '@/components/LoadingFallback';

// Core application pages
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const AddStudent = lazy(() => import('./pages/AddStudent'));
const StudentProfile = lazy(() =>
  import('./pages/StudentProfile').then((m) => ({ default: m.StudentProfile })),
);
const TrackStudent = lazy(() => import('./pages/TrackStudent'));
const Settings = lazy(() => import('./pages/Settings'));
const Reports = lazy(() => import('./pages/Reports'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Advanced features (can be hidden via settings)
const KreativiumAI = lazy(() => import('./pages/KreativiumAI'));

// Test pages (development only)
const InteractiveVizTest =
  !IS_PROD || POC_MODE
    ? lazy(() => import('./pages/InteractiveVizTest').then((m) => ({ default: m.default })))
    : (null as unknown as React.LazyExoticComponent<() => JSX.Element>);
const EnvironmentalCorrelationsTest =
  !IS_PROD || POC_MODE
    ? lazy(() => import('./pages/EnvironmentalCorrelationsTest'))
    : (null as unknown as React.LazyExoticComponent<() => JSX.Element>);

// Developer Tools (development only)
const DevTools =
  !IS_PROD || POC_MODE
    ? lazy(() => import('./pages/DevTools').then((m) => ({ default: m.default })))
    : (null as unknown as React.LazyExoticComponent<() => JSX.Element>);

import { DataErrorBoundary } from '@/components/error-boundaries/DataErrorBoundary';

const queryClient = new QueryClient();

const App = () => (
  <DataErrorBoundary>
    <AccessibilityWrapper>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <BrowserRouter>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  {/* Core tracking workflow */}
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/add-student" element={<AddStudent />} />
                  <Route path="/student/:studentId" element={<StudentProfile />} />
                  <Route path="/track/:studentId" element={<TrackStudent />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/reports" element={<Reports />} />

                  {/* Advanced analytics (can be hidden via settings) */}
                  <Route path="/kreativium-ai" element={<KreativiumAI />} />

                  {/* Development/Test routes */}
                  {!IS_PROD && EnvironmentalCorrelationsTest && (
                    <Route
                      path="/environmental-correlations-test"
                      element={<EnvironmentalCorrelationsTest />}
                    />
                  )}
                  {(!IS_PROD || POC_MODE) && InteractiveVizTest && (
                    <Route path="/e2e/interactive-viz" element={<InteractiveVizTest />} />
                  )}
                  {(!IS_PROD || POC_MODE) && DevTools && (
                    <Route path="/dev-tools" element={<DevTools />} />
                  )}

                  {/* Catch-all 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </AccessibilityWrapper>
  </DataErrorBoundary>
);

export { App };
