import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { TegnXPBar } from '@/components/tegn/TegnXPBar';
import { useTegnXP } from '@/contexts/TegnXPContext';
import { Trophy } from 'lucide-react';

const SignProgressPage = () => {
  const { tCommon } = useTranslation();
  const { xp, level } = useTegnXP();
  const progress = xp % 100;
  const remaining = 100 - progress;
  return (
    <section className="space-y-6">
      <Card className="bg-gradient-card border-0 shadow-soft">
        <CardContent className="p-6 space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {String(tCommon('tegn.progress'))}
          </h2>
          <p className="text-sm text-muted-foreground">{String(tCommon('tegn.progressDesc'))}</p>
          <div className="space-y-2">
            <div className="text-sm text-foreground">
              {String(tCommon('tegn.level'))}: {level}
            </div>
            <div className="text-sm text-muted-foreground">
              {String(tCommon('tegn.totalXP'))}: {xp}
            </div>
            <div className="text-sm text-muted-foreground">
              {String(tCommon('tegn.xpToNext', { remaining }))}
            </div>
          </div>
          <div aria-label={tCommon('tegn.xpProgressAria')}>
            <TegnXPBar />
            <div className="text-xs text-muted-foreground mt-1">
              {String(tCommon('tegn.levelProgressLabel', { level, progress }))}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default SignProgressPage;
