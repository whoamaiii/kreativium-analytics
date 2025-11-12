import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Wrench, FileText, Sparkles, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { IS_PROD, POC_MODE } from '@/lib/env';
import { AiDisclaimer, isAiEnabled } from '@/components/AiDisclaimer';

export const GlobalMenu = (): JSX.Element => {
  const navigate = useNavigate();
  const { tCommon } = useTranslation();
  const [showAiDisclaimer, setShowAiDisclaimer] = useState(false);

  const goReports = useCallback(() => navigate('/reports'), [navigate]);
  const goDevTools = useCallback(() => navigate('/dev-tools'), [navigate]);
  const goSettings = useCallback(() => navigate('/settings'), [navigate]);

  const goAi = useCallback(() => {
    if (isAiEnabled()) {
      navigate('/kreativium-ai');
    } else {
      setShowAiDisclaimer(true);
    }
  }, [navigate]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={
            buttonVariants({ variant: 'ghost', size: 'sm' }) +
            ' text-muted-foreground hover:text-foreground transition-colors'
          }
          aria-label={tCommon('navigation.globalMenu')}
          data-testid="global-menu-trigger"
          id="global-menu-trigger"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="backdrop-blur-md bg-popover/90 border border-border/40 shadow-lg"
        >
          <DropdownMenuItem onClick={goReports} className="cursor-pointer" data-testid="menu-reports">
            <FileText className="h-4 w-4 mr-2" /> {String(tCommon('navigation.reports'))}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={goAi} className="cursor-pointer" data-testid="menu-ai">
            <Sparkles className="h-4 w-4 mr-2" /> AI Analytics
            {!isAiEnabled() && <span className="ml-auto text-xs text-muted-foreground">(Advanced)</span>}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={goSettings}
            className="cursor-pointer"
            data-testid="menu-settings"
          >
            <Settings className="h-4 w-4 mr-2" />
            {String(tCommon('navigation.settings'))}
          </DropdownMenuItem>
          {(!IS_PROD || POC_MODE) && (
            <DropdownMenuItem
              onClick={goDevTools}
              className="cursor-pointer"
              data-testid="menu-devtools"
            >
              <Wrench className="h-4 w-4 mr-2" /> {String(tCommon('navigation.devTools'))}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* AI Disclaimer Modal */}
      <AiDisclaimer
        open={showAiDisclaimer}
        onOpenChange={setShowAiDisclaimer}
        onAccept={() => {
          setShowAiDisclaimer(false);
          navigate('/kreativium-ai');
        }}
      />
    </>
  );
};
