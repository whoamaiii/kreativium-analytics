# UI/UX Implementation Plan - Kreativium Sensory Tracker

**Date**: September 30, 2025  
**Based on**: UI_UX_IMPROVEMENT_REPORT.md  
**Target Completion**: 6-8 weeks

---

## Overview

This document provides a detailed, actionable implementation plan for the UI/UX improvements
identified in the audit report. The plan is organized into three phases with specific tasks,
acceptance criteria, and technical implementation details.

---

## Phase 1: Quick Wins & Foundation (Weeks 1-2)

### Goal: Implement high-impact, low-effort improvements that immediately enhance usability

---

### Task 1.1: Consolidate Action Buttons - AnalyticsDashboard

**Priority**: 🔴 Critical  
**Estimated Effort**: 4-6 hours  
**Files to Modify**:

- `src/components/AnalyticsDashboard.tsx` (lines 575-679)

**Implementation Steps**:

1. **Create Action Menu Component** (`src/components/analytics/AnalyticsActions.tsx`):

```typescript
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Download, Settings, RefreshCw, Filter } from 'lucide-react';

interface AnalyticsActionsProps {
  onExport: (format: 'pdf' | 'csv' | 'json') => void;
  onSettings: () => void;
  onRefresh: () => void;
  onFilters: () => void;
  isExporting?: boolean;
  isAnalyzing?: boolean;
}

export function AnalyticsActions({ onExport, onSettings, onRefresh, onFilters, isExporting, isAnalyzing }: AnalyticsActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Primary: Filters - Most used action */}
      <Button
        variant="default"
        onClick={onFilters}
        className="gap-2"
      >
        <Filter className="h-4 w-4" />
        <span className="hidden sm:inline">Filters</span>
      </Button>

      {/* Secondary: More Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">More actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onExport('pdf')}>
            <Download className="mr-2 h-4 w-4" />
            Export as PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport('csv')}>
            <Download className="mr-2 h-4 w-4" />
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport('json')}>
            <Download className="mr-2 h-4 w-4" />
            Export as JSON
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onRefresh} disabled={isAnalyzing}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Analysis
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSettings}>
            <Settings className="mr-2 h-4 w-4" />
            Analytics Settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
```

2. **Replace Button Row in AnalyticsDashboard**:

```typescript
// Replace lines 575-679 with:
<div className="flex justify-between items-center mb-6">
  <div>
    <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
    <p className="text-sm text-muted-foreground">
      {filteredData.entries.length} entries analyzed
    </p>
  </div>
  <AnalyticsActions
    onExport={(format) => doExport(format)}
    onSettings={() => setShowSettings(true)}
    onRefresh={handleManualRefresh}
    onFilters={() => setFiltersOpen(true)}
    isExporting={isExporting}
    isAnalyzing={isAnalyzing}
  />
</div>
```

**Acceptance Criteria**:

- [ ] All export options accessible from dropdown
- [ ] Primary "Filters" button prominently displayed
- [ ] Toolbar responsive on mobile (doesn't wrap awkwardly)
- [ ] Clear visual hierarchy (primary vs secondary actions)
- [ ] All existing functionality preserved

---

### Task 1.2: Flatten Analytics Tab Structure

**Priority**: 🔴 Critical  
**Estimated Effort**: 8-12 hours  
**Files to Modify**:

- `src/components/AnalyticsDashboard.tsx` (lines 763-825)
- `src/components/analytics-panels/ExplorePanel.tsx`

**Current Structure**:

```
Main Tabs: Overview | Explore | Alerts | Monitoring
    └─ Explore Tab Contains: Charts | Patterns | Correlations (nested tabs)
```

**New Structure**:

```
Single Level: Overview | Charts | Patterns | Correlations | Alerts | Monitoring
```

**Implementation Steps**:

1. **Create New Tab Configuration** (`src/config/analyticsTabs.ts`):

```typescript
export const ANALYTICS_TABS = [
  { key: 'overview', labelKey: 'tabs.overview', icon: 'Eye', testId: 'tab-overview' },
  { key: 'charts', labelKey: 'tabs.charts', icon: 'BarChart3', testId: 'tab-charts' },
  { key: 'patterns', labelKey: 'tabs.patterns', icon: 'Brain', testId: 'tab-patterns' },
  {
    key: 'correlations',
    labelKey: 'tabs.correlations',
    icon: 'TrendingUp',
    testId: 'tab-correlations',
  },
  { key: 'alerts', labelKey: 'tabs.alerts', icon: 'AlertTriangle', testId: 'tab-alerts' },
  { key: 'monitoring', labelKey: 'tabs.monitoring', icon: 'Gauge', testId: 'tab-monitoring' },
] as const;

export type AnalyticsTab = (typeof ANALYTICS_TABS)[number]['key'];
```

2. **Update AnalyticsDashboard Tab Rendering**:

```typescript
// Replace lines 763-825
<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
  <div className="flex items-center justify-between mb-4">
    <TabsList className="inline-flex h-10 items-center gap-1 p-1 bg-muted rounded-lg">
      {ANALYTICS_TABS.map(({ key, labelKey, icon: IconName, testId }) => {
        const Icon = iconMap[IconName]; // Map string to component
        return (
          <TabsTrigger
            key={key}
            value={key}
            data-testid={testId}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm"
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{String(tAnalytics(labelKey))}</span>
          </TabsTrigger>
        );
      })}
    </TabsList>
  </div>

  {/* Individual tab content panels */}
  <TabsContent value="overview">
    <LazyOverviewPanel {...props} />
  </TabsContent>

  <TabsContent value="charts">
    <LazyChartsPanel {...props} />
  </TabsContent>

  <TabsContent value="patterns">
    <LazyPatternsPanel {...props} />
  </TabsContent>

  {/* ... other tabs */}
</Tabs>
```

3. **Remove ExplorePanel Tab Logic** - Convert to direct panel components

**Acceptance Criteria**:

- [ ] Only one tab level visible
- [ ] All content accessible from main tab bar
- [ ] Tab state persisted in URL (`?tab=patterns`)
- [ ] Mobile: Tabs scrollable horizontally
- [ ] No nested tab confusion
- [ ] Performance: Lazy load inactive tabs

---

### Task 1.3: Dashboard Action Button Hierarchy

**Priority**: 🟡 Important  
**Estimated Effort**: 3-4 hours  
**Files to Modify**:

- `src/pages/Dashboard.tsx` (lines 126-169)

**Implementation**:

```typescript
// Primary action area
<div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
  {/* Hero CTA */}
  <Button
    size="lg"
    onClick={handleNewEntry}
    className="text-lg py-6 shadow-lg hover:shadow-xl transition-shadow"
  >
    <Plus className="mr-2 h-5 w-5" />
    New Entry
  </Button>

  {/* Secondary actions in compact group */}
  <div className="flex gap-2">
    <Button variant="outline" onClick={() => navigate('/kreativium-ai')}>
      <Sparkles className="mr-2 h-4 w-4" />
      <span className="hidden sm:inline">AI Insights</span>
    </Button>

    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">More options</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => navigate('/reports')}>
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/tegn')}>
          <Hand className="mr-2 h-4 w-4" />
          Tegn til Tale
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</div>
```

**Acceptance Criteria**:

- [ ] "New Entry" is clearly the primary action (larger, more prominent)
- [ ] Secondary actions grouped logically
- [ ] Mobile: Stack vertically without wrapping issues
- [ ] Clear visual hierarchy (primary = solid, secondary = outline)

---

### Task 1.4: Add Breadcrumb Navigation System

**Priority**: 🟡 Important  
**Estimated Effort**: 6-8 hours  
**Files to Create**:

- `src/components/ui/breadcrumbs.tsx` (already exists, enhance it)
- `src/hooks/useBreadcrumbs.ts`

**Implementation**:

1. **Enhanced Breadcrumbs Component**:

```typescript
// src/components/ui/breadcrumbs.tsx (enhance existing)
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
}

export function Breadcrumbs({ items, showHome = true }: BreadcrumbsProps) {
  const allItems = showHome
    ? [{ label: 'Home', href: '/' }, ...items]
    : items;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-2 text-sm text-muted-foreground">
        {allItems.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="h-4 w-4" />}
            {item.current || !item.href ? (
              <span className="font-medium text-foreground">{item.label}</span>
            ) : (
              <Link to={item.href} className="hover:text-foreground transition-colors">
                {index === 0 && showHome ? (
                  <Home className="h-4 w-4" />
                ) : (
                  item.label
                )}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

2. **Add to All Major Pages**:

```typescript
// StudentProfile.tsx
<Breadcrumbs
  items={[
    { label: 'Students', href: '/' },
    { label: student.name, href: `/student/${student.id}` },
    { label: getSectionLabel(activeSection), current: true }
  ]}
/>

// AnalyticsDashboard (when embedded in StudentProfile)
<Breadcrumbs
  items={[
    { label: 'Students', href: '/' },
    { label: student.name, href: `/student/${student.id}` },
    { label: 'Analytics', href: `/student/${student.id}?section=analytics` },
    { label: activeTab, current: true }
  ]}
/>
```

**Acceptance Criteria**:

- [ ] Breadcrumbs visible on all major pages
- [ ] Clickable links navigate correctly
- [ ] Current page highlighted (non-clickable)
- [ ] Responsive (collapses on mobile if needed)
- [ ] ARIA labels for accessibility

---

## Phase 2: Major Improvements (Weeks 3-4)

### Goal: Implement structural changes that significantly improve navigation and performance

---

### Task 2.1: Smart Filter Presets

**Priority**: 🔴 Critical  
**Estimated Effort**: 12-16 hours  
**Files to Modify**:

- `src/components/analytics/FiltersDrawer.tsx`
- `src/lib/filterUtils.ts` (enhance FILTER_PRESETS)

**Implementation**:

1. **Create Intelligent Preset System**:

```typescript
// src/lib/smartFilterPresets.ts
export interface SmartPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: FilterCriteria;
  aiGenerated?: boolean;
  tags: string[];
}

export const SMART_PRESETS: SmartPreset[] = [
  {
    id: 'unusual-week',
    name: 'Unusual This Week',
    description: 'Detect anomalies and unexpected patterns in recent data',
    icon: 'Zap',
    criteria: {
      dateRange: { start: getStartOfWeek(), end: new Date() },
      patterns: { anomaliesOnly: true, minConfidence: 0.7, patternTypes: ['anomaly'] },
      realtime: false,
    },
    tags: ['anomaly', 'recent', 'quick'],
  },
  {
    id: 'high-anxiety',
    name: 'High Anxiety Moments',
    description: 'Focus on high-intensity anxiety episodes',
    icon: 'AlertCircle',
    criteria: {
      emotions: {
        types: ['anxious', 'overwhelmed', 'frustrated'],
        intensityRange: [4, 5],
        includeTriggers: [],
        excludeTriggers: [],
      },
      patterns: { minConfidence: 0.5 },
    },
    tags: ['emotion', 'anxiety', 'support'],
  },
  {
    id: 'classroom-challenges',
    name: 'Classroom Challenges',
    description: 'Identify difficulties in classroom settings',
    icon: 'School',
    criteria: {
      environmental: {
        locations: ['classroom'],
        activities: ['instruction', 'testing', 'group-work'],
        conditions: { noiseLevel: [6, 10] },
      },
      emotions: { types: ['anxious', 'overwhelmed', 'frustrated'] },
    },
    tags: ['environment', 'classroom', 'academic'],
  },
  {
    id: 'positive-progress',
    name: 'Positive Progress',
    description: 'Highlight successful moments and improvements',
    icon: 'TrendingUp',
    criteria: {
      emotions: {
        types: ['happy', 'calm', 'content', 'focused'],
        intensityRange: [3, 5],
      },
      patterns: { patternTypes: ['trend'] },
    },
    tags: ['positive', 'progress', 'celebration'],
  },
];
```

2. **Redesign Filter Drawer UI**:

```typescript
// src/components/analytics/FiltersDrawer.tsx - Top section
<SheetContent>
  <SheetHeader>
    <SheetTitle>Filters</SheetTitle>
    <SheetDescription>
      Apply smart presets or customize your own filters
    </SheetDescription>
  </SheetHeader>

  {/* Smart Presets Section */}
  <div className="py-4 space-y-3">
    <h3 className="text-sm font-semibold">🎯 Smart Filters</h3>
    <div className="grid gap-2">
      {SMART_PRESETS.map(preset => {
        const Icon = iconMap[preset.icon];
        return (
          <button
            key={preset.id}
            onClick={() => applyPreset(preset)}
            className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
          >
            <div className="mt-0.5 p-2 rounded-md bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{preset.name}</div>
              <div className="text-xs text-muted-foreground line-clamp-2">
                {preset.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  </div>

  <Separator />

  {/* Advanced Filters (Collapsed by Default) */}
  <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
    <CollapsibleTrigger asChild>
      <Button variant="ghost" className="w-full justify-between">
        <span>Advanced Filters</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")} />
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent>
      {/* Existing detailed filters (emotions, sensory, etc.) */}
      {/* But show only top 5 options initially with "Show more" */}
    </CollapsibleContent>
  </Collapsible>
</SheetContent>
```

**Acceptance Criteria**:

- [ ] 4-6 smart presets prominently displayed
- [ ] One-click application of presets
- [ ] Advanced filters hidden until requested
- [ ] Preset descriptions explain what will be filtered
- [ ] Visual icons differentiate preset types
- [ ] Performance: Presets apply instantly (<100ms)

---

### Task 2.2: StudentProfile Lazy Loading

**Priority**: 🟡 Important  
**Estimated Effort**: 6-8 hours  
**Files to Modify**:

- `src/pages/StudentProfile.tsx`
- `src/hooks/useStudentData.ts`

**Current Problem**:

```typescript
// Loads EVERYTHING upfront
const { student, trackingEntries, allEmotions, allSensoryInputs, goals } =
  useStudentData(studentId);
```

**New Approach**:

```typescript
// Load only what's needed
const { student } = useStudentData(studentId); // Minimal data
const sectionData = useSectionData(studentId, activeSection); // Load per section
```

**Implementation**:

1. **Create Section-Specific Data Hooks**:

```typescript
// src/hooks/useSectionData.ts
export function useSectionData(studentId: string, section: string) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!studentId || !section) return;

    setIsLoading(true);

    // Load only data needed for active section
    const loadSectionData = async () => {
      switch (section) {
        case 'analytics':
          return {
            entries: dataStorage.getEntriesForStudent(studentId),
            emotions: dataStorage.getEmotionsForStudent(studentId),
            sensoryInputs: dataStorage.getSensoryInputsForStudent(studentId),
          };
        case 'goals':
          return {
            goals: dataStorage.getGoalsForStudent(studentId),
          };
        case 'progress':
          return {
            entries: dataStorage.getEntriesForStudent(studentId),
            goals: dataStorage.getGoalsForStudent(studentId),
          };
        // ... other sections
        default:
          return {};
      }
    };

    loadSectionData()
      .then(setData)
      .finally(() => setIsLoading(false));
  }, [studentId, section]);

  return { data, isLoading };
}
```

2. **Update StudentProfile to Use Lazy Loading**:

```typescript
// src/pages/StudentProfile.tsx
const StudentProfile = () => {
  const { studentId } = useParams();
  const [activeSection, setActiveSection] = useState('dashboard');

  // Load minimal student info immediately
  const { student, isLoading: isLoadingStudent } = useStudentData(studentId);

  // Load section-specific data only when needed
  const { data: sectionData, isLoading: isLoadingSection } = useSectionData(
    studentId,
    activeSection
  );

  if (isLoadingStudent) {
    return <LoadingFallback />;
  }

  return (
    <div>
      <StudentProfileSidebar
        student={student}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <main>
        {isLoadingSection ? (
          <SectionLoadingSkeleton section={activeSection} />
        ) : (
          <>
            {activeSection === 'analytics' && (
              <AnalyticsSection student={student} data={sectionData} />
            )}
            {activeSection === 'goals' && (
              <GoalManager student={student} goals={sectionData.goals} />
            )}
            {/* ... other sections */}
          </>
        )}
      </main>
    </div>
  );
};
```

**Acceptance Criteria**:

- [ ] Initial page load <1s (only student info)
- [ ] Section switching <500ms
- [ ] Loading skeletons for better perceived performance
- [ ] No data re-fetching when switching back to previously visited section
- [ ] Preserve section state when navigating away and back

---

### Task 2.3: KreativiumAI Smart Defaults

**Priority**: 🟡 Important  
**Estimated Effort**: 8-10 hours  
**Files to Modify**:

- `src/pages/KreativiumAI.tsx`

**Implementation**:

1. **Single "Smart Analysis" Button**:

```typescript
// Simplified initial UI
<Card>
  <CardHeader>
    <CardTitle>Kreativium AI Analysis</CardTitle>
    <CardDescription>
      Get intelligent insights from your sensory tracking data
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Data Quality Check */}
    {dataQuality && (
      <Alert variant={dataQuality.completeness < 50 ? 'warning' : 'info'}>
        <AlertDescription>
          {dataQuality.completeness < 50 ? (
            <>
              ⚠️ Limited data available ({dataQuality.total} entries).
              Consider collecting more data for better insights.
            </>
          ) : (
            <>
              ✅ Good data quality ({dataQuality.total} entries, {dataQuality.completeness}% complete)
            </>
          )}
        </AlertDescription>
      </Alert>
    )}

    {/* Simple Student + Timeframe Selection */}
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Student</Label>
        <Select value={studentId} onValueChange={setStudentId}>
          {students.map(s => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </Select>
      </div>
      <div>
        <Label>Time Period</Label>
        <Select value={preset} onValueChange={setPreset}>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days (Recommended)</SelectItem>
          <SelectItem value="90d">Last 90 days</SelectItem>
        </Select>
      </div>
    </div>

    {/* Primary Action */}
    <Button
      size="lg"
      className="w-full"
      onClick={handleSmartAnalysis}
      disabled={isAnalyzing || !studentId}
    >
      {isAnalyzing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Analyzing...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Insights
        </>
      )}
    </Button>

    {/* Advanced Options (Collapsed) */}
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full">
          Advanced Options
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="compare-mode">Compare with previous period</Label>
          <Switch id="compare-mode" checked={compareEnabled} onCheckedChange={setCompareEnabled} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="iep-mode">IEP-safe mode (anonymized)</Label>
          <Switch id="iep-mode" checked={iepSafeMode} onCheckedChange={setIepSafeMode} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  </CardContent>
</Card>
```

2. **Progressive Results Display**:

```typescript
// Show quick insights first, then detailed analysis
{results && (
  <div className="space-y-6">
    {/* Quick Insights Card - Appears immediately */}
    <Card>
      <CardHeader>
        <CardTitle>Quick Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {results.insights.slice(0, 3).map((insight, i) => (
            <li key={i} className="flex items-start gap-2">
              <Badge>{insight.confidence}%</Badge>
              <span>{insight.text}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>

    {/* Detailed Analysis - Loads progressively */}
    {!isLoadingDetails && (
      <>
        {/* Charts, patterns, correlations */}
      </>
    )}
  </div>
)}
```

**Acceptance Criteria**:

- [ ] Single "Generate Insights" button with smart defaults
- [ ] Pre-analysis data quality check with recommendations
- [ ] Advanced options hidden by default
- [ ] Quick insights appear within 2 seconds
- [ ] Detailed analysis loads progressively
- [ ] Clear loading indicators throughout

---

### Task 2.4: Section Preview in Navigation

**Priority**: 🟡 Important  
**Estimated Effort**: 6-8 hours  
**Files to Modify**:

- `src/components/StudentProfileSidebar.tsx`

**Implementation**:

```typescript
// Enhanced navigation items with status/preview
const menuItems = [
  {
    section: 'dashboard',
    title: 'Dashboard',
    icon: 'dashboard',
    description: 'Overview and summary',
    preview: () => {
      const recentCount = getRecentEntriesCount(student.id, 7);
      return recentCount > 0 ? `${recentCount} recent entries` : 'No recent activity';
    },
    badge: () => {
      const alerts = getActiveAlerts(student.id);
      return alerts.length > 0 ? alerts.length : null;
    },
  },
  {
    section: 'analytics',
    title: 'Analytics',
    icon: 'analytics',
    description: 'Data analysis and insights',
    preview: () => {
      const patterns = getCachedPatternsCount(student.id);
      return patterns > 0 ? `${patterns} patterns detected` : 'Ready to analyze';
    },
    badge: () => {
      const newPatterns = getNewPatternsCount(student.id);
      return newPatterns > 0 ? newPatterns : null;
    },
  },
  // ... other sections
];

// In the sidebar render:
{menuItems.map((item) => {
  const previewText = item.preview?.();
  const badgeCount = item.badge?.();

  return (
    <SidebarMenuItem key={item.section}>
      <SidebarMenuButton
        onClick={() => onSectionChange(item.section)}
        className={/* ... */}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <span className="material-icons">{item.icon}</span>
            {state !== "collapsed" && (
              <div>
                <div className="text-sm font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground">{previewText}</div>
              </div>
            )}
          </div>
          {badgeCount && (
            <Badge variant="secondary">{badgeCount}</Badge>
          )}
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
})}
```

**Acceptance Criteria**:

- [ ] Navigation shows contextual previews (e.g., "3 new patterns")
- [ ] Badges indicate items needing attention
- [ ] Previews update when data changes
- [ ] Performance: Preview computation <50ms
- [ ] Collapsed sidebar shows badges on icons

---

## Phase 3: Polish & Enhancement (Weeks 5-6)

### Goal: Add finishing touches and optimize the overall experience

---

### Task 3.1: Export Templates System

**Priority**: 🟢 Enhancement  
**Estimated Effort**: 10-12 hours  
**Files to Create**:

- `src/lib/exportTemplates.ts`
- `src/components/ExportTemplateSelector.tsx`

**Implementation**:

```typescript
// src/lib/exportTemplates.ts
export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  recommendedFormat: 'pdf' | 'csv' | 'json';
  datePreset: DatePreset;
  includeFields: string[];
  customOptions: {
    anonymize?: boolean;
    includeCharts?: boolean;
    includeInsights?: boolean;
  };
}

export const EXPORT_TEMPLATES: ExportTemplate[] = [
  {
    id: 'weekly-parent-report',
    name: 'Weekly Parent Report',
    description: 'Summary report for parents covering the last 7 days',
    icon: 'FileText',
    recommendedFormat: 'pdf',
    datePreset: '7d',
    includeFields: ['emotions', 'sensoryInputs', 'goals', 'insights'],
    customOptions: {
      anonymize: false,
      includeCharts: true,
      includeInsights: true,
    },
  },
  {
    id: 'iep-documentation',
    name: 'IEP Documentation',
    description: 'Detailed data for IEP meetings (last 30 days)',
    icon: 'Briefcase',
    recommendedFormat: 'pdf',
    datePreset: '30d',
    includeFields: ['emotions', 'sensoryInputs', 'goals', 'patterns', 'correlations'],
    customOptions: {
      anonymize: true,
      includeCharts: true,
      includeInsights: false,
    },
  },
  {
    id: 'quarterly-analysis',
    name: 'Quarterly Analysis',
    description: 'Comprehensive 90-day analysis for clinical review',
    icon: 'Calendar',
    recommendedFormat: 'pdf',
    datePreset: '90d',
    includeFields: ['emotions', 'sensoryInputs', 'goals', 'patterns', 'correlations', 'anomalies'],
    customOptions: {
      anonymize: false,
      includeCharts: true,
      includeInsights: true,
    },
  },
  {
    id: 'data-backup',
    name: 'Full Data Backup',
    description: 'Complete backup of all data (all time)',
    icon: 'Database',
    recommendedFormat: 'json',
    datePreset: 'all',
    includeFields: ['students', 'trackingEntries', 'emotions', 'sensoryInputs', 'goals'],
    customOptions: {
      anonymize: false,
      includeCharts: false,
      includeInsights: false,
    },
  },
];
```

**UI Component**:

```typescript
// src/components/ExportTemplateSelector.tsx
export function ExportTemplateSelector({ onSelect }: { onSelect: (template: ExportTemplate) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {EXPORT_TEMPLATES.map(template => {
        const Icon = iconMap[template.icon];
        return (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className="flex flex-col items-start gap-3 p-4 rounded-lg border-2 hover:border-primary hover:bg-accent transition-all text-left"
          >
            <div className="flex items-center gap-3 w-full">
              <div className="p-3 rounded-lg bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">{template.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {template.description}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline">{template.recommendedFormat.toUpperCase()}</Badge>
              <Badge variant="outline">{getDateRangeLabel(template.datePreset)}</Badge>
            </div>
          </button>
        );
      })}
    </div>
  );
}
```

**Acceptance Criteria**:

- [ ] 4-6 common export templates available
- [ ] Templates auto-configure format, date range, and options
- [ ] Users can still customize after selecting template
- [ ] Templates show preview of what will be included
- [ ] One-click export from template selection

---

### Task 3.2: Complete Settings Page

**Priority**: 🟢 Enhancement  
**Estimated Effort**: 12-16 hours  
**Files to Modify**:

- `src/pages/Settings.tsx`

**Implementation Structure**:

```typescript
// Settings categories
const settingsSections = [
  {
    id: 'appearance',
    title: 'Appearance',
    icon: 'Palette',
    settings: [
      { id: 'theme', type: 'select', options: ['light', 'dark', 'system'] },
      { id: 'colorScheme', type: 'select', options: ['default', 'highContrast'] },
      { id: 'compactMode', type: 'toggle' },
    ],
  },
  {
    id: 'accessibility',
    title: 'Accessibility',
    icon: 'Accessibility',
    settings: [
      { id: 'fontSize', type: 'slider', range: [12, 20] },
      { id: 'reduceMotion', type: 'toggle' },
      { id: 'screenReaderOptimized', type: 'toggle' },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: 'Bell',
    settings: [
      { id: 'enableNotifications', type: 'toggle' },
      { id: 'dailyReminders', type: 'toggle' },
      { id: 'goalMilestones', type: 'toggle' },
    ],
  },
  {
    id: 'data',
    title: 'Data Management',
    icon: 'Database',
    settings: [
      { id: 'autoBackup', type: 'toggle' },
      { id: 'storageLimit', type: 'select', options: ['500MB', '1GB', '5GB'] },
      { id: 'dataRetention', type: 'select', options: ['1year', '2years', 'forever'] },
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced',
    icon: 'Settings',
    settings: [
      { id: 'developerMode', type: 'toggle' },
      { id: 'experimentalFeatures', type: 'toggle' },
      { id: 'cacheDuration', type: 'select', options: ['1hour', '24hours', '7days'] },
    ],
  },
];
```

**Acceptance Criteria**:

- [ ] All setting categories implemented
- [ ] Settings persist across sessions
- [ ] Changes take effect immediately
- [ ] Reset to defaults option
- [ ] Import/export settings

---

### Task 3.3: Mobile Responsive Optimization

**Priority**: 🟢 Enhancement  
**Estimated Effort**: 16-20 hours  
**Files to Modify**: Multiple (all major components)

**Key Focus Areas**:

1. **Responsive Filter Drawer**:
   - Full-screen on mobile (<768px)
   - Touch-friendly controls (larger tap targets)
   - Swipe to dismiss

2. **Mobile Navigation**:
   - Bottom navigation bar for primary actions
   - Hamburger menu for secondary navigation
   - Gesture support (swipe between tabs)

3. **Touch Interactions**:
   - Minimum 44x44px tap targets
   - Swipe gestures for common actions
   - Pull-to-refresh on lists

4. **Layout Adjustments**:
   - Stack horizontally on mobile
   - Hide non-essential information
   - Progressive disclosure

**Acceptance Criteria**:

- [ ] All pages usable on 375px width (iPhone SE)
- [ ] No horizontal scrolling
- [ ] Touch targets ≥44x44px
- [ ] Performance: 60fps scrolling
- [ ] Tested on iOS Safari and Android Chrome

---

## Testing Strategy

### Unit Tests

- [ ] New components have >80% coverage
- [ ] All utility functions tested
- [ ] Hook behavior verified

### Integration Tests

- [ ] Tab navigation flows
- [ ] Filter application
- [ ] Export generation
- [ ] Section switching

### E2E Tests (Playwright)

```typescript
// tests/e2e/analytics-navigation.spec.ts
test('can navigate through analytics tabs without confusion', async ({ page }) => {
  await page.goto('/student/mock_student_1');
  await page.click('[data-testid="nav-analytics"]');

  // Verify only one level of tabs visible
  const tabsCount = await page.locator('[role="tablist"]').count();
  expect(tabsCount).toBe(1);

  // Can access all content areas
  await page.click('[data-testid="tab-charts"]');
  await expect(page.locator('[data-testid="charts-panel"]')).toBeVisible();

  await page.click('[data-testid="tab-patterns"]');
  await expect(page.locator('[data-testid="patterns-panel"]')).toBeVisible();
});
```

### User Acceptance Testing

- [ ] Task completion time measured
- [ ] User satisfaction survey (1-5)
- [ ] Confusion points identified
- [ ] Success rate for common tasks

---

## Rollout Plan

### Week 1-2: Phase 1 (Foundation)

- Deploy to development environment
- Internal team testing
- Gather feedback

### Week 3-4: Phase 2 (Major Changes)

- Deploy to staging
- Beta user testing (5-10 users)
- Iterate based on feedback

### Week 5-6: Phase 3 (Polish)

- Final refinements
- Performance optimization
- Accessibility audit

### Week 7: Production Rollout

- Gradual rollout (10% → 50% → 100%)
- Monitor analytics and error rates
- Support team briefing

---

## Success Metrics (Target vs Baseline)

| Metric                                 | Baseline | Target | Measurement            |
| -------------------------------------- | -------- | ------ | ---------------------- |
| Task completion time                   | 3-5 min  | <2 min | Analytics tracking     |
| Clicks to reach analytics view         | 5-7      | 2-3    | User flow analysis     |
| Filter usage rate                      | Unknown  | >60%   | Feature analytics      |
| Page load time (StudentProfile)        | 2-3s     | <1s    | Performance monitoring |
| User satisfaction                      | N/A      | >4.0/5 | Post-rollout survey    |
| Mobile usability score                 | N/A      | >85    | Lighthouse audit       |
| Support tickets (navigation confusion) | N/A      | -50%   | Ticket analysis        |

---

## Risk Mitigation

### Potential Risks:

1. **User resistance to change**
   - Mitigation: In-app tooltips explaining new features
   - Provide "What's New" guide
   - Offer opt-in beta period

2. **Performance regression**
   - Mitigation: Comprehensive performance testing
   - Lazy loading implementation
   - Bundle size monitoring

3. **Breaking existing workflows**
   - Mitigation: Preserve URL patterns
   - Maintain keyboard shortcuts
   - Extensive regression testing

4. **Accessibility issues**
   - Mitigation: ARIA audit before deployment
   - Screen reader testing
   - Keyboard navigation verification

---

## Maintenance & Iteration

### Post-Launch (Weeks 7-8):

- Monitor user behavior analytics
- Collect user feedback
- Track error rates and performance
- Identify new pain points

### Quarterly Reviews:

- Analyze success metrics
- Prioritize new improvements
- Update this implementation plan
- Plan next iteration

---

## Appendix: Component Refactoring Checklist

### Before Refactoring:

- [ ] Read and understand existing code
- [ ] Review related tests
- [ ] Check for dependencies (other components using this)
- [ ] Document current behavior
- [ ] Create backup branch

### During Refactoring:

- [ ] Write/update tests first (TDD approach)
- [ ] Make incremental changes
- [ ] Test after each change
- [ ] Update documentation
- [ ] Check TypeScript types

### After Refactoring:

- [ ] Run full test suite
- [ ] Check bundle size impact
- [ ] Test in multiple browsers
- [ ] Verify accessibility
- [ ] Code review
- [ ] Update changelog

---

**Implementation Plan Prepared By**: AI Assistant (Warp Agent Mode)  
**Date**: September 30, 2025  
**Status**: Ready for Review  
**Next Action**: Team review and approval to begin Phase 1
