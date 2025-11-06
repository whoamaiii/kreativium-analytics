import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "./ui/dialog";
import { HelpCircle, BookOpen, Sparkles } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useOnboarding } from "@/components/onboarding/OnboardingTutorial";
import { ExampleEntriesDialog } from "@/components/help/ExampleEntriesDialog";

/**
 * Renders a localized "Help & Support" dialog trigger and content.
 */
export const HelpAndSupport = () => {
  const { tCommon } = useTranslation();
  const { restart } = useOnboarding();
  const [showExamples, setShowExamples] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  const handleReplayTutorial = () => {
    setHelpDialogOpen(false);
    restart();
  };

  const handleShowExamples = () => {
    setHelpDialogOpen(false);
    setShowExamples(true);
  };

  return (
    <>
      <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
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
            <DialogDescription>
              {String(tCommon('help.description'))}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Quick Help</h3>

              <Button
                variant="outline"
                onClick={handleReplayTutorial}
                className="w-full justify-start gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Replay Tutorial
              </Button>

              <Button
                variant="outline"
                onClick={handleShowExamples}
                className="w-full justify-start gap-2"
              >
                <BookOpen className="h-4 w-4" />
                View Example Entries
              </Button>
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold mb-2">Contact Support</h3>
              <p className="text-sm text-muted-foreground mb-2">{tCommon('help.description')}</p>
              <a href="mailto:support@example.com" className="text-primary text-sm hover:underline">
                {tCommon('help.email')}
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Example Entries Dialog */}
      <ExampleEntriesDialog open={showExamples} onOpenChange={setShowExamples} />
    </>
  );
};
