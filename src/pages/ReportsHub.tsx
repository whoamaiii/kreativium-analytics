import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useTranslation } from '@/hooks/useTranslation';
import { FileText, BarChart3, Brain, CalendarClock, Download } from 'lucide-react';

interface ReportCardMeta {
  id: string;
  icon: React.ReactNode;
  sections: number;
}

const reportCards: ReportCardMeta[] = [
  { id: 'progress-summary', icon: <BarChart3 className="h-5 w-5" />, sections: 4 },
  { id: 'iep-meeting', icon: <FileText className="h-5 w-5" />, sections: 6 },
  { id: 'behavioral-analysis', icon: <Brain className="h-5 w-5" />, sections: 5 },
  { id: 'quarterly-review', icon: <CalendarClock className="h-5 w-5" />, sections: 6 },
];

const ReportsHub = (): JSX.Element => {
  const { tCommon } = useTranslation();

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8" role="main">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="space-y-2">
          <Breadcrumbs
            items={[
              { label: tCommon('buttons.home'), href: '/' },
              { label: tCommon('navigation.reports'), current: true },
            ]}
          />
          <h1 className="text-3xl font-bold text-foreground">
            {tCommon('reports.hubTitle')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {tCommon('reports.hubDescription')}
          </p>
          <div className="mt-4">
            <Link to="/reports" className="inline-block">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                {tCommon('reports.goToExports')}
              </Button>
            </Link>
          </div>
        </header>

        <section aria-labelledby="reports-templates-heading" className="space-y-4">
          <h2 id="reports-templates-heading" className="sr-only">
            {tCommon('reports.templatesHeading')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {reportCards.map((card) => (
              <Card key={card.id} className="bg-card border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span aria-hidden>{card.icon}</span>
                    {tCommon(`reports.templates.${card.id}.name`)}
                  </CardTitle>
                  <CardDescription>
                    {tCommon(`reports.templates.${card.id}.description`)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {tCommon('reports.sectionsCount', { count: card.sections })}
                  </span>
                  <Link to={`/reports/builder?template=${card.id}`} className="inline-block">
                    <Button>
                      <FileText className="h-4 w-4 mr-2" />
                      {tCommon('reports.createReport')}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default ReportsHub;
