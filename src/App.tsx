import { Toaster } from "@/components/ui/sonner-toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import React, { Suspense, lazy } from "react";
import { POC_MODE, IS_PROD } from "@/lib/env";
if (!POC_MODE) {
  await import("@/lib/analyticsConfigOverride");
}
import { ThemeProvider } from "next-themes";
import { TegnXPProvider } from "@/contexts/TegnXPContext";
import { DevErrorBanner } from "@/components/DevErrorBanner";
import { AccessibilityWrapper } from "@/components/AccessibilityWrapper";
import { LoadingFallback } from "@/components/LoadingFallback";

const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
// These pages export default components; import defaults directly to avoid undefined lazy resolutions
const AddStudent = lazy(() => import("./pages/AddStudent"));
const StudentProfile = lazy(() => import("./pages/StudentProfile").then(m => ({ default: m.StudentProfile })));
const TrackStudent = lazy(() => import("./pages/TrackStudent"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TegnLayout = lazy(() => import("./pages/TegnLayout"));
const TegnTilTaleMenu = lazy(() => import("./pages/TegnTilTaleMenu"));
const SignLearnPage = lazy(() => import("./pages/SignLearnPage"));
const SignIndexPage = lazy(() => import("./pages/SignIndexPage"));
const SignMemoryPage = lazy(() => import("./pages/SignMemoryPage"));
const SignProgressPage = lazy(() => import("./pages/SignProgressPage"));
const Settings = lazy(() => import("./pages/Settings"));
const Reports = lazy(() => import("./pages/Reports"));
const EmotionLab = lazy(() => import('./pages/EmotionLab'));
const ChooseRight = lazy(() => import('./modules/recognize/choose-right/ChooseRight'));
const NameIt = lazy(() => import('./modules/name/name-it/NameIt'));
const CalmPause = lazy(() => import('./modules/regulation/calm-pause/CalmPause'));
const DailyMissions = lazy(() => import('./modules/missions/DailyMissions'));
const EmotionGame = lazy(() => import('./pages/EmotionGame'));
const KreativiumAI = lazy(() => import("./pages/KreativiumAI"));
const InteractiveVizTest = (!IS_PROD || POC_MODE)
  ? lazy(() => import('./pages/InteractiveVizTest').then(m => ({ default: m.default })))
  : null as unknown as React.LazyExoticComponent<() => JSX.Element>;
const EnvironmentalCorrelationsTest = (!IS_PROD || POC_MODE)
  ? lazy(() => import("./pages/EnvironmentalCorrelationsTest"))
  : null as unknown as React.LazyExoticComponent<() => JSX.Element>;
import { ErrorWrapper } from "./components/ErrorWrapper";
import { OnboardingTutorial } from "@/components/onboarding/OnboardingTutorial";

// Additional lazies for custom routes
const ReportBuilderPage = lazy(() => import('./pages/ReportBuilderPage').then(m => ({ default: m.default })));

// Lazy-loaded Developer Tools page (non-prod/POC only)
const DevTools = !IS_PROD || POC_MODE
  ? lazy(() => import("./pages/DevTools").then(m => ({ default: m.default })))
  : null as unknown as React.LazyExoticComponent<() => JSX.Element>;
const CalibrationDashboard = lazy(() => import('@/components/monitoring/CalibrationDashboard').then(m => ({ default: m.CalibrationDashboard })));
const AdultOverview = lazy(() => import('./pages/adult/Overview'));
const AdultReports = lazy(() => import('./pages/adult/Reports'));
const ConfidenceCalibration = lazy(() => import('./pages/ConfidenceCalibration'));
const SessionFlow = lazy(() => import('./pages/session/Flow'));
const Achievements = lazy(() => import('./pages/Achievements'));

const queryClient = new QueryClient();

const App = () => (
  <ErrorWrapper>
    <AccessibilityWrapper>
      {!IS_PROD && <DevErrorBanner />}
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <BrowserRouter>
              <TegnXPProvider>
                {/* Onboarding tutorial - shows automatically for new users */}
                <OnboardingTutorial autoShow={true} />
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/add-student" element={<AddStudent />} />
                <Route path="/student/:studentId" element={<StudentProfile />} />
                <Route path="/track/:studentId" element={<TrackStudent />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/kreativium-ai" element={<KreativiumAI />} />
                <Route path="/emotion-lab" element={<EmotionLab />} />
                <Route path="/modules/choose-right" element={<ChooseRight />} />
                <Route path="/emotion-game" element={<EmotionGame />} />
                <Route path="/modules/name-it" element={<NameIt />} />
                <Route path="/modules/calm-pause" element={<CalmPause />} />
                <Route path="/modules/missions" element={<DailyMissions />} />
                <Route path="/monitoring" element={<CalibrationDashboard />} />
                {/* Export tools (previous /reports) */}
                <Route path="/reports/export" element={<Reports />} />
                {/* Report Builder route */}
                <Route path="/reports/builder" element={<ReportBuilderPage />} />
                <Route path="/adult" element={<AdultOverview />} />
                <Route path="/adult/reports" element={<AdultReports />} />
                <Route path="/session/flow" element={<SessionFlow />} />
                <Route path="/achievements" element={<Achievements />} />
                <Route path="/calibration/confidence" element={<ConfidenceCalibration />} />
                <Route path="/tegn" element={<TegnLayout />}>
                  <Route index element={<TegnTilTaleMenu />} />
                  <Route path="learn" element={<SignLearnPage />} />
                  <Route path="tegnbase" element={<SignIndexPage />} />
                  <Route path="memory" element={<SignMemoryPage />} />
                  <Route path="progress" element={<SignProgressPage />} />
                </Route>
                {!IS_PROD && EnvironmentalCorrelationsTest && (
                  <Route path="/environmental-correlations-test" element={<EnvironmentalCorrelationsTest />} />
                )}
                {(!IS_PROD || POC_MODE) && InteractiveVizTest && (
                  <Route path="/e2e/interactive-viz" element={<InteractiveVizTest />} />
                )}
                {(!IS_PROD || POC_MODE) && DevTools && (
                  <Route path="/dev-tools" element={<DevTools />} />
                )}
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </TegnXPProvider>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </AccessibilityWrapper>
  </ErrorWrapper>
);

export { App };
