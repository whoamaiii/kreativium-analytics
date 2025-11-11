import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from './ui/dialog';
import { HelpCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Renders a localized "Help & Support" dialog trigger and content.
 */
export const HelpAndSupport = () => {
  const { tCommon } = useTranslation();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={String(tCommon('help.button'))}
          title={String(tCommon('help.title'))}
          className="hidden sm:flex items-center justify-center group text-muted-foreground hover:text-foreground transition-colors"
        >
          <HelpCircle className="mr-2 h-4 w-4 transition-transform group-hover:rotate-12" />
          {String(tCommon('help.button'))}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tCommon('help.title')}</DialogTitle>
          <DialogDescription>{String(tCommon('help.description'))}</DialogDescription>
        </DialogHeader>
        <div>
          <p>{tCommon('help.description')}</p>
          <a href="mailto:support@example.com" className="text-primary">
            {tCommon('help.email')}
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
};
