/**
 * Interactive Onboarding Tutorial System
 *
 * Guides new users through their first experience with Kreativium Analytics.
 * Features:
 * - Multi-step walkthrough
 * - Progress tracking
 * - Skip/restart options
 * - Persistent state (localStorage)
 * - Responsive design
 * - Accessible (keyboard nav, screen readers)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  UserPlus,
  ClipboardList,
  BarChart3,
  Sparkles,
  Video
} from 'lucide-react';
import { logger } from '@/lib/logger';

const ONBOARDING_STORAGE_KEY = 'kreativium_onboarding_completed';
const ONBOARDING_DISMISSED_KEY = 'kreativium_onboarding_dismissed';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  videoUrl?: string; // Optional video tutorial link
}

interface OnboardingTutorialProps {
  onComplete?: () => void;
  onSkip?: () => void;
  autoShow?: boolean; // Show automatically for new users
}

/**
 * Main onboarding tutorial component
 */
export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  onComplete,
  onSkip,
  autoShow = true
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Kreativium Analytics! 👋',
      description: 'Track sensory patterns and emotions for your students with ease. This quick tour will show you the basics in just 3 minutes.',
      icon: <Sparkles className="h-12 w-12 text-primary" />,
    },
    {
      id: 'add-student',
      title: 'Add Your First Student',
      description: 'Start by adding a student profile. You only need their first name to begin tracking. All data stays private on your device.',
      icon: <UserPlus className="h-12 w-12 text-blue-500" />,
      action: {
        label: 'Add Student Now',
        onClick: () => {
          // Navigate to add student
          window.location.href = '/#/add-student';
          handleComplete();
        }
      }
    },
    {
      id: 'quick-entry',
      title: 'Track in 10 Seconds ⚡',
      description: 'Use Quick Entry on mobile to track emotions with a single tap. Our AI automatically infers sensory patterns based on history.',
      icon: <ClipboardList className="h-12 w-12 text-green-500" />,
      videoUrl: 'https://example.com/quick-entry-demo' // Replace with actual video
    },
    {
      id: 'insights',
      title: 'Get AI-Powered Insights 🧠',
      description: 'After a few tracking sessions, our analytics will identify patterns, correlations, and recommend interventions.',
      icon: <BarChart3 className="h-12 w-12 text-purple-500" />,
    },
    {
      id: 'tooltips',
      title: 'Help is Always Available',
      description: 'See a term you don\'t recognize? Hover over the help icon (?) next to any sensory term for a simple explanation and examples.',
      icon: <Sparkles className="h-12 w-12 text-orange-500" />,
    },
    {
      id: 'complete',
      title: 'You\'re All Set! 🎉',
      description: 'You can replay this tutorial anytime from Settings. Ready to start tracking?',
      icon: <Check className="h-12 w-12 text-green-600" />,
    }
  ];

  // Check if user has completed or dismissed onboarding
  useEffect(() => {
    try {
      const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
      const dismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY) === 'true';

      setIsCompleted(completed);

      // Show automatically for new users (unless dismissed)
      if (autoShow && !completed && !dismissed) {
        setIsVisible(true);
      }
    } catch (error) {
      logger.error('Failed to check onboarding status', { error });
    }
  }, [autoShow]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      setIsCompleted(true);
      setIsVisible(false);
      onComplete?.();

      logger.info('Onboarding completed', { stepsViewed: currentStep + 1 });
    } catch (error) {
      logger.error('Failed to save onboarding completion', { error });
    }
  };

  const handleSkip = () => {
    try {
      localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true');
      setIsVisible(false);
      onSkip?.();

      logger.info('Onboarding skipped', { stepsViewed: currentStep + 1 });
    } catch (error) {
      logger.error('Failed to save onboarding skip', { error });
    }
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setIsVisible(true);
  };

  if (!isVisible) return null;

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleSkip();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <Card className="w-full max-w-2xl shadow-2xl">
            {/* Progress bar */}
            <div className="h-2 bg-muted rounded-t-lg overflow-hidden">
              <motion.div
                className="h-full bg-gradient-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <CardContent className="p-8">
              {/* Close button */}
              <div className="flex justify-between items-start mb-6">
                <Badge variant="outline" className="text-xs">
                  Step {currentStep + 1} of {steps.length}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSkip}
                  aria-label="Skip tutorial"
                  className="hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Step content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Icon */}
                  <div className="flex justify-center">
                    {currentStepData.icon}
                  </div>

                  {/* Title */}
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-foreground mb-3">
                      {currentStepData.title}
                    </h2>
                    <p className="text-muted-foreground leading-relaxed max-w-lg mx-auto">
                      {currentStepData.description}
                    </p>
                  </div>

                  {/* Optional video link */}
                  {currentStepData.videoUrl && (
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(currentStepData.videoUrl, '_blank')}
                        className="gap-2"
                      >
                        <Video className="h-4 w-4" />
                        Watch 30-second demo
                      </Button>
                    </div>
                  )}

                  {/* Optional action button */}
                  {currentStepData.action && (
                    <div className="flex justify-center pt-4">
                      <Button
                        onClick={currentStepData.action.onClick}
                        className="gap-2"
                      >
                        {currentStepData.action.label}
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex justify-between items-center mt-8 pt-6 border-t">
                <Button
                  variant="ghost"
                  onClick={handlePrevious}
                  disabled={isFirstStep}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>

                <div className="flex gap-2">
                  {!isLastStep && (
                    <Button
                      variant="ghost"
                      onClick={handleSkip}
                    >
                      Skip Tutorial
                    </Button>
                  )}

                  <Button
                    onClick={handleNext}
                    className="gap-2"
                  >
                    {isLastStep ? (
                      <>
                        Get Started
                        <Check className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Hook to manage onboarding state
 */
export function useOnboarding() {
  const [isCompleted, setIsCompleted] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    try {
      const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
      const dismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY) === 'true';

      setIsCompleted(completed);
      setIsDismissed(dismissed);
    } catch (error) {
      logger.error('Failed to load onboarding state', { error });
    }
  }, []);

  const restart = () => {
    try {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
      setIsCompleted(false);
      setIsDismissed(false);
    } catch (error) {
      logger.error('Failed to restart onboarding', { error });
    }
  };

  return {
    isCompleted,
    isDismissed,
    shouldShow: !isCompleted && !isDismissed,
    restart
  };
}

/**
 * Compact trigger button for showing onboarding from settings/help menu
 */
export const OnboardingTrigger: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="gap-2 w-full justify-start"
    >
      <Sparkles className="h-4 w-4" />
      Replay Tutorial
    </Button>
  );
};

export default OnboardingTutorial;
