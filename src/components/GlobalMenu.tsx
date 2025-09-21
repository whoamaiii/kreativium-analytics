import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Wrench, FileText, Hand } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { IS_PROD, POC_MODE } from '@/lib/env';

export const GlobalMenu = (): JSX.Element => {
  const navigate = useNavigate();
  const { tCommon } = useTranslation();

  const goReports = useCallback(() => navigate('/reports'), [navigate]);
  const goDevTools = useCallback(() => navigate('/dev-tools'), [navigate]);
  const goSettings = useCallback(() => navigate('/settings'), [navigate]);
  const goTegn = useCallback(() => navigate('/tegn'), [navigate]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' text-muted-foreground hover:text-foreground transition-colors'}
        aria-label={tCommon('navigation.globalMenu')}
        data-testid="global-menu-trigger"
        id="global-menu-trigger"
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="backdrop-blur-md bg-popover/90 border border-border/40 shadow-lg">
        <DropdownMenuItem onClick={goTegn} className="cursor-pointer" data-testid="menu-tegn">
          <Hand className="h-4 w-4 mr-2" /> {String(tCommon('navigation.tegnTilTale'))}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={goReports} className="cursor-pointer" data-testid="menu-reports">
          <FileText className="h-4 w-4 mr-2" /> {String(tCommon('navigation.reports'))}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={goSettings} className="cursor-pointer" data-testid="menu-settings">
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .66.26 1.3.73 1.77.47.47 1.11.73 1.77.73H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
          {String(tCommon('navigation.settings'))}
        </DropdownMenuItem>
        {(!IS_PROD || POC_MODE) && (
          <DropdownMenuItem onClick={goDevTools} className="cursor-pointer" data-testid="menu-devtools">
            <Wrench className="h-4 w-4 mr-2" /> {String(tCommon('navigation.devTools'))}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
