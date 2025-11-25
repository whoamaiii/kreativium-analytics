import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdvancedSearch } from '@/components/AdvancedSearch';
import { QuickEntryTemplates } from '@/components/QuickEntryTemplates';
import { PeriodComparison } from '@/components/PeriodComparison';
import { Student, TrackingEntry, EmotionEntry, SensoryEntry, Goal } from '@/types/student';
import { useTranslation } from '@/hooks/useTranslation';
import { Search, Zap, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SearchResults {
  students: Student[];
  entries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  goals: Goal[];
}

interface ToolsSectionProps {
  student: Student;
  trackingEntries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  goals: Goal[];
  activeToolSection: string;
  onToolSectionChange: (section: string) => void;
  onSearchResults?: (results: SearchResults) => void;
}

export function ToolsSection({
  student,
  trackingEntries,
  emotions,
  sensoryInputs,
  goals,
  activeToolSection,
  onToolSectionChange,
  onSearchResults,
}: ToolsSectionProps) {
  const { tStudent } = useTranslation();
  const navigate = useNavigate();

  const handleQuickTemplateApply = (
    emotions: Partial<EmotionEntry>[],
    sensoryInputs: Partial<SensoryEntry>[],
  ) => {
    navigate(`/track/${student.id}`, {
      state: {
        prefilledData: { emotions, sensoryInputs },
      },
    });
  };

  const toolSections = [
    {
      id: 'search',
      title: tStudent('interface.advancedSearch'),
      icon: Search,
      component: (
        <AdvancedSearch
          students={[student]}
          trackingEntries={trackingEntries}
          emotions={emotions}
          sensoryInputs={sensoryInputs}
          goals={goals}
          onResultsChange={onSearchResults}
        />
      ),
    },
    {
      id: 'templates',
      title: tStudent('interface.quickTemplates'),
      icon: Zap,
      component: (
        <QuickEntryTemplates studentId={student.id} onApplyTemplate={handleQuickTemplateApply} />
      ),
    },
    {
      id: 'compare',
      title: 'Periodesammenligning',
      icon: Calendar,
      component: (
        <PeriodComparison
          emotions={emotions}
          sensoryInputs={sensoryInputs}
          currentRange={{ start: new Date(), end: new Date(), label: 'Current' }}
        />
      ),
    },
  ];

  const activeSection = toolSections.find((section) => section.id === activeToolSection);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Verktøy</h2>
        <p className="text-muted-foreground">Avanserte verktøy for søk, maler og sammenligning</p>
      </div>

      {/* Enhanced Tool Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {toolSections.map((section) => (
          <button
            key={section.id}
            onClick={() => onToolSectionChange(section.id)}
            className={`group flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] ${
              activeToolSection === section.id
                ? 'bg-primary text-primary-foreground border-primary shadow-lg ring-2 ring-primary/20'
                : 'bg-card hover:bg-accent/50 border-border hover:border-accent'
            }`}
          >
            <div className="flex items-center gap-3 w-full">
              <div
                className={`p-2 rounded-lg ${
                  activeToolSection === section.id
                    ? 'bg-primary-foreground/20'
                    : 'bg-muted group-hover:bg-accent'
                }`}
              >
                <section.icon className="h-5 w-5" />
              </div>
              <div className="text-left min-w-0 flex-1">
                <div className="font-medium text-sm">{String(section.title)}</div>
                <div
                  className={`text-xs mt-0.5 ${
                    activeToolSection === section.id
                      ? 'text-primary-foreground/70'
                      : 'text-muted-foreground'
                  }`}
                >
                  {section.id === 'search' && 'Finn spesifikke data og mønstre'}
                  {section.id === 'templates' && 'Rask registrering med forhåndsdefinerte maler'}
                  {section.id === 'compare' && 'Sammenlign data på tvers av perioder'}
                </div>
              </div>
              {activeToolSection === section.id && (
                <div className="w-2 h-2 rounded-full bg-current flex-shrink-0" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Active Tool Section */}
      {activeSection && (
        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <activeSection.icon className="h-5 w-5" />
              {String(activeSection.title)}
            </CardTitle>
          </CardHeader>
          <CardContent>{activeSection.component}</CardContent>
        </Card>
      )}
    </div>
  );
}
