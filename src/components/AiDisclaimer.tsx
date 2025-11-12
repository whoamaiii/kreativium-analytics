import { useState, useEffect } from 'react';
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
              <DialogTitle className="text-2xl">AI Analytics Disclaimer</DialogTitle>
              <DialogDescription>Important information before proceeding</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Primary Warning */}
          <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-amber-900 dark:text-amber-100">
              <strong>Critical Notice:</strong> AI-generated insights must be reviewed by qualified
              professionals before making any IEP decisions.
            </AlertDescription>
          </Alert>

          {/* Detailed Warnings */}
          <div className="space-y-3 text-sm">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                What AI Analytics Does
              </h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Identifies patterns in tracked observations</li>
                <li>• Suggests potential correlations and triggers</li>
                <li>• Generates summary insights from data</li>
                <li>• Provides intervention recommendations</li>
              </ul>
            </div>

            <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-900">
              <h4 className="font-semibold mb-2 text-red-900 dark:text-red-100">
                Important Limitations
              </h4>
              <ul className="space-y-1 text-red-800 dark:text-red-200 text-sm">
                <li>
                  ⚠️ <strong>Not legally binding:</strong> AI insights do not constitute legal
                  advice or IEP requirements
                </li>
                <li>
                  ⚠️ <strong>Requires human review:</strong> All recommendations must be validated
                  by qualified special education professionals
                </li>
                <li>
                  ⚠️ <strong>May be inaccurate:</strong> AI can make mistakes, miss context, or
                  suggest inappropriate interventions
                </li>
                <li>
                  ⚠️ <strong>Not diagnostic:</strong> Cannot diagnose conditions or replace
                  professional assessments
                </li>
                <li>
                  ⚠️ <strong>Your judgment prevails:</strong> Teacher professional judgment always
                  supersedes AI recommendations
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
              <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
                Data Privacy & Security
              </h4>
              <ul className="space-y-1 text-blue-800 dark:text-blue-200 text-sm">
                <li>
                  • <strong>External processing:</strong> Data is sent to third-party AI services
                  (OpenRouter)
                </li>
                <li>• Student data should be anonymized before using AI features</li>
                <li>• Check your school/district policy before enabling</li>
                <li>• Local-only analysis available in Settings (reduces AI accuracy)</li>
              </ul>
            </div>

            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-900">
              <h4 className="font-semibold mb-2 text-green-900 dark:text-green-100">
                Best Practices
              </h4>
              <ul className="space-y-1 text-green-800 dark:text-green-200 text-sm">
                <li>✓ Use AI as a supplementary tool, not primary decision-maker</li>
                <li>✓ Always review AI suggestions with your special education team</li>
                <li>✓ Cross-reference AI insights with direct observations</li>
                <li>✓ Document which insights you implement and why</li>
                <li>✓ Disable AI features if your district policy prohibits external data sharing</li>
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
              <strong>I understand and accept these terms:</strong>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>• AI insights require professional review before acting</li>
                <li>• AI recommendations are not legally binding</li>
                <li>• My professional judgment supersedes AI suggestions</li>
                <li>• I will comply with my school/district policies</li>
                <li>• I will anonymize student data appropriately</li>
              </ul>
            </label>
          </div>
        </div>

        <DialogFooter className="flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel - Don't Enable AI
          </Button>
          <Button onClick={handleAccept} disabled={!understood} className="bg-gradient-primary">
            I Accept - Enable AI Analytics
          </Button>
        </DialogFooter>

        <p className="text-xs text-center text-muted-foreground mt-4">
          You can disable AI features anytime in Settings → Advanced
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
