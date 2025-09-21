import { Button } from "@/components/ui/button";
import { Student } from "@/types/student";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageSettings } from "@/components/LanguageSettings";
import { POCBadge } from "@/components/POCBadge";
import { POC_MODE } from "@/lib/env";
import { Download, Plus, Users, CalendarDays, BarChart3, Hand, Sparkles } from "lucide-react";
import { HelpAndSupport } from "@/components/HelpAndSupport";
import { GlobalMenu } from "@/components/GlobalMenu";
import { useDashboardData } from "@/hooks/useDashboardData";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { StudentsGrid } from "@/components/dashboard/StudentsGrid";
import { EmptyState } from "@/components/dashboard/EmptyState";

/**
 * Dashboard component - Main landing page with modern glassmorphism design
 * @returns React component displaying students list and tracking statistics
 */
const Dashboard = () => {
  const navigate = useNavigate();
  const { tDashboard, tCommon, tSettings } = useTranslation();
  const { students, isLoading, todayEntries, totalEntries, weeklyTrend } = useDashboardData();

  const handleAddStudent = () => {
    navigate('/add-student');
  };

  const handleNewEntry = () => {
    if (students.length > 0) {
      navigate(`/track/${students[0].id}`);
    } else {
      navigate('/add-student');
    }
  };

  // Removed system-wide export from Dashboard. A dedicated Reports page now handles exports.

  const handleViewStudent = (student: Student) => {
    navigate(`/student/${student.id}`);
  };

  const handleTrackStudent = (student: Student) => {
    navigate(`/track/${student.id}`);
  };

  return (
    <div className="main-container min-h-screen relative">
      {/* Animated glow background */}
      <div className="glow-bg"></div>
      
      <div className="relative z-10 min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Enhanced Header with Gradient and Animations */}
          <header className="relative mb-16 overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 motion-safe:animate-blob"></div>
              <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 motion-safe:animate-blob animation-delay-2000"></div>
              <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 motion-safe:animate-blob animation-delay-4000"></div>
            </div>
            
            <div className="relative glass-card rounded-2xl p-8 shadow-2xl backdrop-blur-xl border border-primary/20">
              <div className="flex justify-between items-center">
                <div className="space-y-4">
                  {/* Animated title with gradient */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-2xl blur-xl opacity-50 motion-safe:animate-pulse"></div>
                      <div className="relative bg-gradient-to-br from-primary/20 to-purple-500/20 p-4 rounded-2xl border border-primary/30 group">
                        <div className="text-3xl font-bold text-white motion-safe:group-hover:animate-bounce-slow">{String(tDashboard('brand.initial'))}</div>
                      </div>
                    </div>
                    <div>
                      <h1 className="text-5xl lg:text-6xl font-black bg-gradient-to-r from-white via-primary-foreground to-purple-200 bg-clip-text text-transparent motion-safe:animate-gradient-x">
                        {String(tDashboard('title'))}
                      </h1>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="h-0.5 w-8 bg-gradient-to-r from-primary to-purple-500 rounded-full"></div>
                        <div className="h-0.5 w-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                        <div className="h-0.5 w-2 bg-pink-500 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Subtitle with elegant styling */}
                  <p className="text-lg lg:text-xl text-muted-foreground/90 font-light tracking-wide max-w-2xl leading-relaxed">
                    {String(tDashboard('subtitle'))}
                  </p>
                  
                  {/* Stats pills */}
                  <div className="flex flex-wrap gap-3 pt-2">
                    <div className="px-4 py-2 bg-primary/10 rounded-full border border-primary/20 backdrop-blur-sm">
                      <span className="text-xs font-medium text-primary">{students.length} {String(tCommon('navigation.students'))}</span>
                    </div>
                    <div className="px-4 py-2 bg-purple-500/10 rounded-full border border-purple-500/20 backdrop-blur-sm">
                      <span className="text-xs font-medium text-primary-foreground/80">{todayEntries} {String(tDashboard('stats.todaysEntries'))}</span>
                    </div>
                    <div className="px-4 py-2 bg-pink-500/10 rounded-full border border-pink-500/20 backdrop-blur-sm">
                      <span className="text-xs font-medium text-pink-400">{totalEntries} {String(tDashboard('stats.totalEntries'))}</span>
                    </div>
                  </div>
                </div>
                
                {/* Action buttons with glassmorphism */}
                <div className="flex items-center gap-3">
                  {POC_MODE && <POCBadge />}
                  
                  <div className="flex items-center gap-2" role="toolbar" aria-label={tCommon('a11y.headerControls')}>
                    <GlobalMenu />
                    <HelpAndSupport />
                    <LanguageSettings />
                  </div>
                </div>
              </div>
            </div>
            </header>

            <main>
              {/* Overview section with buttons */}
              <div 
                className="flex justify-between items-center mb-8 motion-safe:animate-fade-in" 
                data-animation-delay="0.2s"
              >
                <h2 className="text-3xl font-bold tracking-tight text-foreground">{String(tDashboard('overview.title'))}</h2>
                <div className="flex items-center space-x-4">
                  <Button
                    variant="glass"
                    size="lg"
                    onClick={() => navigate('/kreativium-ai')}
                    className="flex items-center justify-center group"
                    aria-label={tCommon('navigation.kreativiumAI')}
                    data-testid="dashboard-kreativium-ai-button"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {String(tCommon('navigation.kreativiumAI'))}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/reports')}
                    className="flex items-center justify-center group"
                    aria-label={tSettings('data.export')}
                    data-testid="dashboard-export-link"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {String(tSettings('data.export'))}
                  </Button>
                  <Button
                    variant="glass"
                    size="lg"
                    onClick={() => navigate('/tegn')}
                    className="flex items-center justify-center group"
                    aria-label={tCommon('navigation.tegnTilTale')}
                    data-testid="dashboard-tegn-button"
                  >
                    <Hand className="mr-2 h-4 w-4" />
                    {String(tCommon('navigation.tegnTilTale'))}
                  </Button>
                  <Button 
                    variant="default" 
                    onClick={handleNewEntry}
                    size="lg"
                    className="flex items-center justify-center group"
                  >
                    <Plus className="mr-2 h-4 w-4 group-hover:animate-bounce" />
                    {String(tDashboard('actions.newEntry'))}
                  </Button>
                </div>
              </div>

              {/* Stats cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                <StatsCard
                  title={String(tDashboard('stats.totalStudents'))}
                  value={isLoading ? 0 : students.length}
                  trendPercent={weeklyTrend.students}
                  trendLabel={String(tDashboard('stats.fromLastWeek'))}
                  icon={<Users className="text-primary h-5 w-5" />}
                  animationDelay="0.3s"
                />
                <StatsCard
                  title={String(tDashboard('stats.todaysEntries'))}
                  value={isLoading ? 0 : todayEntries}
                  trendPercent={weeklyTrend.entries}
                  trendLabel={String(tDashboard('stats.fromLastWeek'))}
                  icon={<CalendarDays className="text-primary h-5 w-5" />}
                  animationDelay="0.4s"
                />
                <StatsCard
                  title={String(tDashboard('stats.totalEntries'))}
                  value={isLoading ? 0 : totalEntries}
                  trendPercent={weeklyTrend.entries}
                  trendLabel={String(tDashboard('stats.fromLastWeek'))}
                  icon={<BarChart3 className="text-primary h-5 w-5" />}
                  animationDelay="0.5s"
                />
              </div>

              {/* Students section */}
              <div>
                <div 
                  className="flex justify-between items-center mb-8 text-foreground motion-safe:animate-fade-in" 
                  data-animation-delay="0.6s"
                >
                  <h2 className="text-3xl font-bold tracking-tight">{String(tDashboard('students.title'))}</h2>
                  <Button 
                    variant="default" 
                    onClick={handleAddStudent}
                    size="lg"
                    className="flex items-center justify-center group"
                  >
                    <Plus className="mr-2 h-4 w-4 group-hover:animate-bounce transition-transform" />
                    {String(tDashboard('actions.addStudent'))}
                  </Button>
                </div>

                {/* Students grid or empty state */}
                {students.length > 0 || isLoading ? (
                  <StudentsGrid students={students} isLoading={isLoading} onView={handleViewStudent} onTrack={handleTrackStudent} />
                ) : (
                  <EmptyState
                    title={String(tDashboard('emptyState.title'))}
                    description={String(tDashboard('emptyState.description'))}
                    ctaLabel={String(tDashboard('emptyState.addFirstStudent'))}
                    onCta={handleAddStudent}
                    sampleTitle={String(tCommon('mock_data_title'))}
                    sampleDesc={String(tCommon('load_mock_data'))}
                    sampleButton={String(tCommon('load_mock_data'))}
                    sampleDialogTitle={String(tCommon('mock_data_title'))}
                    sampleDialogDesc={String(tCommon('load_mock_data'))}
                  />
                )}
              </div>
            </main>
          </div>
        </div>
      </div>
  );
};

export { Dashboard };
