import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { UserPlus, ClipboardList, BarChart3, CheckCircle2, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

const ONBOARDING_KEY = 'kreativium_onboarding_completed';

interface OnboardingProps {
  forceOpen?: boolean;
}

/**
 * Onboarding Component
 *
 * First-time user experience that guides teachers through:
 * 1. Welcome and introduction
 * 2. Adding their first student
 * 3. Tracking their first observation
 * 4. Viewing analytics and reports
 *
 * Shows automatically on first visit, can be dismissed.
 */
export const Onboarding = ({ forceOpen = false }: OnboardingProps) => {
  const { tCommon } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    // Check if user has completed onboarding
    if (forceOpen) {
      setOpen(true);
      return;
    }

    const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_KEY);
    if (!hasCompletedOnboarding) {
      // Delay opening slightly for better UX
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [forceOpen]);

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setOpen(false);
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setOpen(false);
  };

  const handleStartAddStudent = () => {
    handleComplete();
    navigate('/add-student');
  };

  const steps = [
    {
      title: 'Welcome to Kreativium Analytics',
      description:
        'Track student observations, analyze patterns, and generate IEP reports - all in one simple tool.',
      icon: CheckCircle2,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Kreativium Analytics helps special education teachers track and analyze student
            behaviors, emotions, and sensory responses quickly and effectively.
          </p>
          <div className="bg-accent/20 p-4 rounded-lg border border-accent">
            <h4 className="font-semibold mb-2">Key Features:</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Quick observation tracking (under 30 seconds)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Automatic pattern analysis and insights</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>IEP-ready reports with one click</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Local-first privacy (your data stays on your device)</span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: 'Step 1: Add Your Students',
      description: 'Start by adding students you work with. You only need their name to begin.',
      icon: UserPlus,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-gradient-card border-0">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">Add Student Profile</h4>
                <p className="text-sm text-muted-foreground">Required: Name</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Optionally include grade level, date of birth, and notes. You can always add more
              details later.
            </p>
          </Card>
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-900">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>💡 Tip:</strong> Start with just 1-2 students to get familiar with the tool.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Step 2: Track Observations',
      description: 'Use Quick Track for fast data entry during classroom activities.',
      icon: ClipboardList,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-gradient-card border-0">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">Quick Track Mode</h4>
                <p className="text-sm text-muted-foreground">3 steps, under 30 seconds</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-primary">1.</span>
                <span>Select emotion (happy, sad, angry, calm, etc.)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-primary">2.</span>
                <span>Set intensity level (1-5)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-primary">3.</span>
                <span>Save (optional: add notes)</span>
              </div>
            </div>
          </Card>
          <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-900">
            <p className="text-sm text-green-900 dark:text-green-100">
              <strong>💡 Tip:</strong> Use Quick Track during class, add detailed notes later when
              you have time.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Step 3: View Analytics & Reports',
      description: 'Generate insights and IEP-ready reports automatically.',
      icon: BarChart3,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-gradient-card border-0">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">Automatic Insights</h4>
                <p className="text-sm text-muted-foreground">See patterns as you track</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              The tool automatically analyzes your observations and identifies:
            </p>
            <ul className="space-y-1 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Behavioral patterns and triggers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Time-of-day correlations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Progress toward goals</span>
              </li>
            </ul>
          </Card>
          <div className="bg-purple-50 dark:bg-purple-950/20 p-3 rounded-lg border border-purple-200 dark:border-purple-900">
            <p className="text-sm text-purple-900 dark:text-purple-100">
              <strong>💡 Tip:</strong> Export IEP reports with one click from the student profile
              page.
            </p>
          </div>
        </div>
      ),
    },
  ];

  const currentStep = steps[step - 1];
  const Icon = currentStep.icon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index + 1 === step
                    ? 'w-8 bg-primary'
                    : index + 1 < step
                      ? 'w-2 bg-primary/50'
                      : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            {step < steps.length ? 'Skip' : 'Close'}
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">{currentStep.title}</h2>
              <p className="text-muted-foreground">{currentStep.description}</p>
            </div>
          </div>

          <div className="mt-6">{currentStep.content}</div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-8 pt-6 border-t">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              Back
            </Button>
          )}
          {step < steps.length ? (
            <Button onClick={() => setStep(step + 1)} className="flex-1">
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleStartAddStudent} className="flex-1 bg-gradient-primary">
              Get Started - Add First Student
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Help link */}
        <div className="text-center mt-4">
          <button
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            I'll explore on my own
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Reset onboarding state (for testing or user request)
 */
export const resetOnboarding = () => {
  localStorage.removeItem(ONBOARDING_KEY);
};
