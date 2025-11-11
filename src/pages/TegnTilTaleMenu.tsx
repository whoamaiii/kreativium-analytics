import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { Link } from 'react-router-dom';
import { GraduationCap, Library, Brain, BarChart3 } from 'lucide-react';
import { POC_MODE } from '@/lib/env';
import { POCBadge } from '@/components/POCBadge';

const TegnTilTaleMenu = () => {
  const { tCommon } = useTranslation();

  return (
    <section className="space-y-6">
      {POC_MODE && (
        <div className="flex justify-end">
          <POCBadge />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <GraduationCap className="h-5 w-5" />
              {String(tCommon('tegn.learn'))}
            </div>
            <p className="text-sm text-muted-foreground">{String(tCommon('tegn.learnDesc'))}</p>
            <Button
              asChild
              className="w-full"
              aria-label={tCommon('tegn.learn')}
              data-testid="tegn-menu-learn"
            >
              <Link to="learn">{String(tCommon('tegn.open'))}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <Library className="h-5 w-5" />
              {String(tCommon('tegn.tegnbase'))}
            </div>
            <p className="text-sm text-muted-foreground">{String(tCommon('tegn.tegnbaseDesc'))}</p>
            <Button
              asChild
              className="w-full"
              aria-label={tCommon('tegn.tegnbase')}
              data-testid="tegn-menu-tegnbase"
            >
              <Link to="tegnbase">{String(tCommon('tegn.open'))}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <Brain className="h-5 w-5" />
              {String(tCommon('tegn.memory'))}
            </div>
            <p className="text-sm text-muted-foreground">{String(tCommon('tegn.memoryDesc'))}</p>
            <Button
              asChild
              className="w-full"
              aria-label={tCommon('tegn.memory')}
              data-testid="tegn-menu-memory"
            >
              <Link to="memory">{String(tCommon('tegn.open'))}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <BarChart3 className="h-5 w-5" />
              {String(tCommon('tegn.progress'))}
            </div>
            <p className="text-sm text-muted-foreground">{String(tCommon('tegn.progressDesc'))}</p>
            <Button
              asChild
              className="w-full"
              aria-label={tCommon('tegn.progress')}
              data-testid="tegn-menu-progress"
            >
              <Link to="progress">{String(tCommon('tegn.open'))}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default TegnTilTaleMenu;
