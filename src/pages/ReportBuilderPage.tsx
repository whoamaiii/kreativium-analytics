import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { dataStorage } from '@/lib/dataStorage';
import { LazyReportBuilder } from '@/components/lazy/LazyReportBuilder';
import type { Student, Goal, TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';

const ReportBuilderPage = (): JSX.Element => {
  const { tCommon } = useTranslation();
  const [params] = useSearchParams();
  const template = params.get('template') ?? 'progress-summary';

  const students: Student[] = useMemo(() => {
    try { return dataStorage.getStudents(); } catch { return []; }
  }, []);

  const [studentId, setStudentId] = useState<string>('');

  const selectedStudent: Student | undefined = useMemo(
    () => students.find(s => s.id === studentId),
    [students, studentId]
  );

  const scopedData = useMemo(() => {
    if (!selectedStudent) return null;
    let goals: Goal[] = [];
    let entries: TrackingEntry[] = [];
    try {
      goals = (dataStorage.getGoals() as Goal[]).filter(g => g.studentId === selectedStudent.id);
      entries = (dataStorage.getTrackingEntries() as TrackingEntry[]).filter(e => e.studentId === selectedStudent.id);
    } catch {
      goals = [];
      entries = [];
    }
    const emotions: EmotionEntry[] = entries.flatMap(e => e.emotions);
    const sensoryInputs: SensoryEntry[] = entries.flatMap(e => e.sensoryInputs);
    return { goals, entries, emotions, sensoryInputs } as const;
  }, [selectedStudent]);

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8" role="main">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-2">
          <Breadcrumbs
            items={[
              { label: tCommon('buttons.home'), href: '/' },
              { label: tCommon('navigation.reports'), href: '/reports/hub' },
              { label: tCommon('reports.builder.title'), current: true },
            ]}
          />
          <h1 className="text-3xl font-bold text-foreground">
            {tCommon('reports.builder.title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {tCommon('reports.builder.description')}
          </p>
        </header>

        <Card className="bg-card border-0 shadow-soft">
          <CardHeader>
            <CardTitle>{tCommon('reports.builder.configure')}</CardTitle>
            <CardDescription>
              {tCommon('reports.builder.configureDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">
                {tCommon('reports.builder.student')}
              </label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder={tCommon('reports.builder.selectStudentPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {tCommon('reports.builder.template')}
              </label>
              <div className="text-sm text-muted-foreground">
                {tCommon(`reports.templates.${template}.name`)}
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedStudent && scopedData && (
          <Card className="bg-card border-0 shadow-soft">
            <CardHeader>
              <CardTitle>{tCommon('reports.builder.previewTitle', { name: selectedStudent.name })}</CardTitle>
              <CardDescription>{tCommon('reports.builder.previewDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <LazyReportBuilder
                student={selectedStudent}
                goals={scopedData.goals}
                trackingEntries={scopedData.entries}
                emotions={scopedData.emotions}
                sensoryInputs={scopedData.sensoryInputs}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
};

export default ReportBuilderPage;
