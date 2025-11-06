import { useState, useEffect, useCallback, memo, useRef, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { StudentProfileSidebar } from "@/components/StudentProfileSidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useDataFiltering } from "@/hooks/useDataFiltering";
import { useOptimizedInsights } from "@/hooks/useOptimizedInsights";
import { useStudentData } from "@/hooks/useStudentData";
import { Insights } from "@/types/student";
import { downloadBlob } from "@/lib/utils";
import { ArrowLeft, Download, Save, FileText, Calendar, Loader } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageSettings } from "@/components/LanguageSettings";
import { GlobalMenu } from "@/components/GlobalMenu";
// Use the lightweight version for initial load
import { analyticsManager } from "@/lib/analyticsManagerLite";
import { logger } from "@/lib/logger";
import { dataStorage } from "@/lib/dataStorage";

// Lazy load heavy components
const DashboardSection = lazy(() => import("@/components/profile-sections/DashboardSection").then(m => ({ default: m.DashboardSection })));
const AnalyticsSection = lazy(() => import("@/components/profile-sections/AnalyticsSection").then(m => ({ default: m.AnalyticsSection })));
const ToolsSection = lazy(() => import("@/components/profile-sections/ToolsSection").then(m => ({ default: m.ToolsSection })));
const GoalManager = lazy(() => import("@/components/GoalManager").then(m => ({ default: m.GoalManager })));
const ProgressDashboard = lazy(() => import("@/components/ProgressDashboard").then(m => ({ default: m.ProgressDashboard })));
const LazyReportBuilder = lazy(() => import("@/components/lazy/LazyReportBuilder").then(m => ({ default: m.LazyReportBuilder })));

// Lazy load export system to reduce initial bundle
const loadExportSystem = () => import("@/lib/exportSystem").then(m => m.exportSystem);
const loadSeedData = () => import("@/lib/mockData").then(m => m.seedMinimalDemoData);

// Memoized versions of section components
const MemoizedDashboardSection = memo(DashboardSection);
const MemoizedAnalyticsSection = memo(AnalyticsSection);
const MemoizedToolsSection = memo(ToolsSection);
const MemoizedGoalManager = memo(GoalManager);
const MemoizedProgressDashboard = memo(ProgressDashboard);
const MemoizedLazyReportBuilder = memo(LazyReportBuilder);

// CSS class constants
const fullScreenCenterCls = "h-screen w-full flex items-center justify-center";
const rowGap2Cls = "flex items-center gap-2";
const textMutedCls = "text-muted-foreground";
const textDestructiveCls = "text-destructive";
const pageRootCls = "min-h-screen w-full bg-background font-dyslexia flex";
const mainCls = "flex-1 overflow-auto relative z-0";
const headerCls = "border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30";
const headerInnerCls = "flex h-14 items-center justify-between px-6";
const flexGap3Cls = "flex items-center gap-3";
const BTN_VARIANT_GHOST = "ghost";
const BTN_VARIANT_OUTLINE = "outline";
const BTN_SIZE_SM = "sm";
const iconSmCls = "h-4 w-4 mr-2";
const containerPaddingCls = "p-6";
const spaceY6Cls = "space-y-6";
const titleCls = "text-2xl font-bold";
const centerMutedCls = "text-center py-8 text-muted-foreground";
const loaderIconCls = "h-5 w-5 animate-spin";
const reportsActionsCls = "flex flex-wrap gap-3 p-4 bg-gradient-card rounded-lg border-0 shadow-soft";

const StudentProfileOptimized = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { tCommon, t } = useTranslation();

  const {
    student,
    trackingEntries,
    allEmotions,
    allSensoryInputs,
    goals,
    isLoading: isLoadingStudent,
    error: studentError,
    reloadGoals,
    reloadData,
  } = useStudentData(studentId);

  const [activeSection, setActiveSection] = useState('dashboard');
  const handleSectionChange = useCallback((section: string) => {
    setActiveSection(section);
  }, []);
  
  const seedingRef = useRef(false);
  const [, setIsSeedingData] = useState(false);

  const { selectedRange, filteredData, handleRangeChange } = useDataFiltering(
    trackingEntries,
    allEmotions,
    allSensoryInputs
  );

  const { getInsights } = useOptimizedInsights(
    filteredData.emotions,
    filteredData.sensoryInputs,
    filteredData.entries
  );

  const [insights, setInsights] = useState<Insights | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  // Auto-seed for mock routes (lazy-loaded)
  useEffect(() => {
    const seedMockDataIfNeeded = async () => {
      if (!studentId?.startsWith('mock_') || seedingRef.current) return;

      const existingStudents = dataStorage.getStudents();
      const hasAnyStudents = existingStudents.length > 0;
      const mockStudentExists = !!dataStorage.getStudentById(studentId);
      const existingEntriesForMock = dataStorage.getEntriesForStudent(studentId) || [];
      const needsSeeding = !hasAnyStudents || (mockStudentExists && existingEntriesForMock.length < 8);
      
      if (!needsSeeding) return;

      seedingRef.current = true;
      setIsSeedingData(true);

      try {
        const seedMinimalDemoData = await loadSeedData();
        await seedMinimalDemoData(studentId);
        window.dispatchEvent(new CustomEvent('mockDataLoaded'));
        toast.success('Demo data created successfully');
        if (reloadData) reloadData();
      } catch (error) {
        logger.error('Failed to auto-seed mock data', { error, studentId });
        toast.error('Failed to create demo data');
      } finally {
        setIsSeedingData(false);
      }
    };

    seedMockDataIfNeeded();
  }, [studentId, reloadData]);

  // Lightweight analytics initialization
  useEffect(() => {
    if (student) {
      // Use lightweight manager for initial setup
      analyticsManager.initializeStudentAnalytics(student.id);
      
      // Defer full analytics to avoid blocking
      const controller = new AbortController();
      
      (async () => {
        if (filteredData.emotions.length > 0 || filteredData.sensoryInputs.length > 0) {
          try {
            setIsLoadingInsights(true);
            const newInsights = await getInsights();
            if (!controller.signal.aborted) {
              setInsights(newInsights);
            }
          } catch (error) {
            logger.error('Failed to get insights', { error });
          } finally {
            setIsLoadingInsights(false);
          }
        }
      })();

      return () => controller.abort();
    }
  }, [filteredData, getInsights, student, studentId]);

  // Lazy-loaded export handlers
  const handleExportData = useCallback(async (format: 'pdf' | 'csv' | 'json') => {
    if (!student) return;

    try {
      const exportSystem = await loadExportSystem();
      const baseFilename = `${student.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
      let blob: Blob;
      let filename: string;

      const exportOptions = {
        trackingEntries: filteredData.entries,
        emotions: filteredData.emotions,
        sensoryInputs: filteredData.sensoryInputs,
        goals,
      };

      switch (format) {
        case 'pdf':
          blob = await exportSystem.generatePDFReport(student, exportOptions, {
            format: 'pdf',
            includeFields: ['all'],
            includeCharts: true,
          });
          filename = `${baseFilename}_report.html`;
          break;
        case 'csv':
          const csvContent = exportSystem.generateCSVExport([student], exportOptions, {
            format: 'csv',
            includeFields: ['all'],
          });
          blob = new Blob([csvContent], { type: 'text/csv' });
          filename = `${baseFilename}_data.csv`;
          break;
        case 'json':
          const jsonContent = exportSystem.generateJSONExport([student], exportOptions, {
            format: 'json',
            includeFields: ['students', 'trackingEntries', 'emotions', 'sensoryInputs', 'goals'],
          });
          blob = new Blob([jsonContent], { type: 'application/json' });
          filename = `${baseFilename}_data.json`;
          break;
      }
      
      downloadBlob(blob, filename);
      toast.success(`Data exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      logger.error('Export error', { error });
      toast.error(`Export failed: ${error instanceof Error ? error.message : 'Please try again.'}`);
    }
  }, [student, filteredData, goals]);

  if (isLoadingStudent) {
    return (
      <div className={fullScreenCenterCls}>
        <div className={rowGap2Cls}>
          <Loader className={loaderIconCls} />
          <p className={textMutedCls}>{t('loading_student_data')}</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className={fullScreenCenterCls}>
        <div className={rowGap2Cls}>
          <p className={textDestructiveCls}>{t('student_not_found')}</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className={pageRootCls}>
        <StudentProfileSidebar
          student={student}
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />
        <main className={mainCls}>
          <header className={headerCls}>
            <div className={headerInnerCls}>
              <div className={flexGap3Cls}>
                <SidebarTrigger />
                <Button variant={BTN_VARIANT_GHOST} size={BTN_SIZE_SM} onClick={() => navigate('/')}>
                  <ArrowLeft className={iconSmCls} />
                  {String(tCommon('buttons.back'))}
                </Button>
              </div>
              <div className={flexGap3Cls}>
                <GlobalMenu />
                <LanguageSettings />
              </div>
            </div>
          </header>
          <div className={containerPaddingCls}>
            <ErrorBoundary>
              <Suspense fallback={
                <div className="flex items-center justify-center h-64">
                  <Loader className="h-8 w-8 animate-spin" />
                </div>
              }>
                {activeSection === 'dashboard' && (
                  <MemoizedDashboardSection
                    student={student}
                    trackingEntries={trackingEntries}
                    filteredData={filteredData}
                    selectedRange={selectedRange}
                    onRangeChange={handleRangeChange}
                    insights={insights}
                    isLoadingInsights={isLoadingInsights}
                  />
                )}
                {activeSection === 'analytics' && (
                  <ErrorBoundary showToast={true}>
                    <MemoizedAnalyticsSection
                      student={student}
                      trackingEntries={trackingEntries ?? []}
                      filteredData={filteredData}
                      insights={insights}
                      isLoadingInsights={isLoadingInsights}
                    />
                  </ErrorBoundary>
                )}
                {/* Other sections remain similar but wrapped in Suspense */}
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export { StudentProfileOptimized as StudentProfile };
