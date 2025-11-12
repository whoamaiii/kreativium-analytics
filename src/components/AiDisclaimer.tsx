import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from '@/hooks/useTranslation';

const AI_DISCLAIMER_KEY = 'kreativium_ai_disclaimer_accepted';
const AI_ENABLED_KEY = 'kreativium_ai_enabled';

interface AiDisclaimerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}

/**
 * AI Disclaimer Component
 *
 * Shows legal disclaimer and warnings about AI-generated insights before
 * allowing access to AI features. Required for first-time AI use.
 *
 * Critical warnings:
 * - AI outputs require human review
 * - Not legally binding for IEP decisions
 * - Teacher professional judgment supersedes AI
 * - Data privacy considerations
 */
export const AiDisclaimer = ({ open, onOpenChange, onAccept }: AiDisclaimerProps) => {
  const { tCommon } = useTranslation();
  const [understood, setUnderstood] = useState(false);

  const handleAccept = () => {
    if (understood) {
      localStorage.setItem(AI_DISCLAIMER_KEY, 'true');
      localStorage.setItem(AI_ENABLED_KEY, 'true');
      onAccept();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-2xl">{String(tCommon('aiDisclaimer.title'))}</DialogTitle>
              <DialogDescription>{String(tCommon('aiDisclaimer.subtitle'))}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Primary Warning */}
          <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-amber-900 dark:text-amber-100">
              <strong>{String(tCommon('aiDisclaimer.criticalNotice'))}</strong> {String(tCommon('aiDisclaimer.criticalMessage'))}
            </AlertDescription>
          </Alert>

          {/* Detailed Warnings */}
          <div className="space-y-3 text-sm">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {String(tCommon('aiDisclaimer.whatItDoes.title'))}
              </h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• {String(tCommon('aiDisclaimer.whatItDoes.point1'))}</li>
                <li>• {String(tCommon('aiDisclaimer.whatItDoes.point2'))}</li>
                <li>• {String(tCommon('aiDisclaimer.whatItDoes.point3'))}</li>
                <li>• {String(tCommon('aiDisclaimer.whatItDoes.point4'))}</li>
              </ul>
            </div>

            <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-900">
              <h4 className="font-semibold mb-2 text-red-900 dark:text-red-100">
                {String(tCommon('aiDisclaimer.limitations.title'))}
              </h4>
              <ul className="space-y-1 text-red-800 dark:text-red-200 text-sm">
                <li>
                  ⚠️ <strong>{String(tCommon('aiDisclaimer.limitations.notLegallyBinding.label'))}</strong> {String(tCommon('aiDisclaimer.limitations.notLegallyBinding.description'))}
                </li>
                <li>
                  ⚠️ <strong>{String(tCommon('aiDisclaimer.limitations.requiresReview.label'))}</strong> {String(tCommon('aiDisclaimer.limitations.requiresReview.description'))}
                </li>
                <li>
                  ⚠️ <strong>{String(tCommon('aiDisclaimer.limitations.mayBeInaccurate.label'))}</strong> {String(tCommon('aiDisclaimer.limitations.mayBeInaccurate.description'))}
                </li>
                <li>
                  ⚠️ <strong>{String(tCommon('aiDisclaimer.limitations.notDiagnostic.label'))}</strong> {String(tCommon('aiDisclaimer.limitations.notDiagnostic.description'))}
                </li>
                <li>
                  ⚠️ <strong>{String(tCommon('aiDisclaimer.limitations.judgmentPrevails.label'))}</strong> {String(tCommon('aiDisclaimer.limitations.judgmentPrevails.description'))}
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
              <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
                {String(tCommon('aiDisclaimer.privacy.title'))}
              </h4>
              <ul className="space-y-1 text-blue-800 dark:text-blue-200 text-sm">
                <li>
                  • <strong>{String(tCommon('aiDisclaimer.privacy.externalProcessing.label'))}</strong> {String(tCommon('aiDisclaimer.privacy.externalProcessing.description'))}
                </li>
                <li>• {String(tCommon('aiDisclaimer.privacy.anonymize'))}</li>
                <li>• {String(tCommon('aiDisclaimer.privacy.checkPolicy'))}</li>
                <li>• {String(tCommon('aiDisclaimer.privacy.localOnly'))}</li>
              </ul>
            </div>

            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-900">
              <h4 className="font-semibold mb-2 text-green-900 dark:text-green-100">
                {String(tCommon('aiDisclaimer.bestPractices.title'))}
              </h4>
              <ul className="space-y-1 text-green-800 dark:text-green-200 text-sm">
                <li>✓ {String(tCommon('aiDisclaimer.bestPractices.supplementary'))}</li>
                <li>✓ {String(tCommon('aiDisclaimer.bestPractices.reviewWithTeam'))}</li>
                <li>✓ {String(tCommon('aiDisclaimer.bestPractices.crossReference'))}</li>
                <li>✓ {String(tCommon('aiDisclaimer.bestPractices.document'))}</li>
                <li>✓ {String(tCommon('aiDisclaimer.bestPractices.disableIfProhibited'))}</li>
              </ul>
            </div>
          </div>

          {/* Consent Checkbox */}
          <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg">
            <Checkbox
              id="ai-disclaimer-accept"
              checked={understood}
              onCheckedChange={(checked) => setUnderstood(!!checked)}
              className="mt-1"
            />
            <label htmlFor="ai-disclaimer-accept" className="text-sm cursor-pointer">
              <strong>{String(tCommon('aiDisclaimer.consent.label'))}</strong>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>• {String(tCommon('aiDisclaimer.consent.requireReview'))}</li>
                <li>• {String(tCommon('aiDisclaimer.consent.notBinding'))}</li>
                <li>• {String(tCommon('aiDisclaimer.consent.judgmentSupersedes'))}</li>
                <li>• {String(tCommon('aiDisclaimer.consent.complyPolicy'))}</li>
                <li>• {String(tCommon('aiDisclaimer.consent.anonymizeData'))}</li>
              </ul>
            </label>
          </div>
        </div>

        <DialogFooter className="flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {String(tCommon('aiDisclaimer.buttons.cancel'))}
          </Button>
          <Button onClick={handleAccept} disabled={!understood} className="bg-gradient-primary">
            {String(tCommon('aiDisclaimer.buttons.accept'))}
          </Button>
        </DialogFooter>

        <p className="text-xs text-center text-muted-foreground mt-4">
          {String(tCommon('aiDisclaimer.footer'))}
        </p>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Check if user has accepted AI disclaimer
 */
export const hasAcceptedAiDisclaimer = (): boolean => {
  return localStorage.getItem(AI_DISCLAIMER_KEY) === 'true';
};

/**
 * Check if AI is enabled
 */
export const isAiEnabled = (): boolean => {
  return localStorage.getItem(AI_ENABLED_KEY) === 'true';
};

/**
 * Disable AI (can be called from Settings)
 */
export const disableAi = () => {
  localStorage.setItem(AI_ENABLED_KEY, 'false');
};

/**
 * Enable AI (shows disclaimer if not previously accepted)
 */
export const enableAi = (showDisclaimer: () => void) => {
  if (hasAcceptedAiDisclaimer()) {
    localStorage.setItem(AI_ENABLED_KEY, 'true');
  } else {
    showDisclaimer();
  }
};

/**
 * Reset AI settings (for testing)
 */
export const resetAiSettings = () => {
  localStorage.removeItem(AI_DISCLAIMER_KEY);
  localStorage.removeItem(AI_ENABLED_KEY);
};
