/**
 * Mobile Quick Entry Component
 *
 * Optimized for one-handed mobile use with 10-second data entry.
 * Features:
 * - Large emoji buttons for emotions (thumb-friendly)
 * - AI-powered context inference (auto-fills sensory data)
 * - One-tap save with smart defaults
 * - Progressive disclosure ("Add Details" for full form)
 * - Confidence indicators for suggestions
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Student, EmotionEntry, SensoryEntry } from '@/types/student';
import { inferContext, ContextPrediction } from '@/lib/contextInference';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { useTranslation } from '@/hooks/useTranslation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smile,
  Meh,
  Frown,
  Heart,
  Zap,
  Cloud,
  Sparkles,
  ChevronRight,
  Check,
  AlertCircle,
  TrendingUp
} from 'lucide-react';

interface MobileQuickEntryProps {
  student: Student;
  onSave: (emotions: Omit<EmotionEntry, 'id' | 'timestamp'>[], sensoryInputs: Omit<SensoryEntry, 'id' | 'timestamp'>[]) => Promise<void>;
  onExpandDetails?: () => void;
}

interface EmotionOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  hoverColor: string;
}

const emotionOptions: EmotionOption[] = [
  {
    id: 'happy',
    label: 'Happy',
    icon: <Smile className="h-8 w-8" />,
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    hoverColor: 'hover:bg-yellow-200 dark:hover:bg-yellow-800/40'
  },
  {
    id: 'calm',
    label: 'Calm',
    icon: <Heart className="h-8 w-8" />,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    hoverColor: 'hover:bg-blue-200 dark:hover:bg-blue-800/40'
  },
  {
    id: 'excited',
    label: 'Excited',
    icon: <Zap className="h-8 w-8" />,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    hoverColor: 'hover:bg-purple-200 dark:hover:bg-purple-800/40'
  },
  {
    id: 'sad',
    label: 'Sad',
    icon: <Cloud className="h-8 w-8" />,
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
    hoverColor: 'hover:bg-gray-200 dark:hover:bg-gray-800/40'
  },
  {
    id: 'anxious',
    label: 'Anxious',
    icon: <AlertCircle className="h-8 w-8" />,
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    hoverColor: 'hover:bg-orange-200 dark:hover:bg-orange-800/40'
  },
  {
    id: 'angry',
    label: 'Angry',
    icon: <Frown className="h-8 w-8" />,
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    hoverColor: 'hover:bg-red-200 dark:hover:bg-red-800/40'
  }
];

export const MobileQuickEntry: React.FC<MobileQuickEntryProps> = ({
  student,
  onSave,
  onExpandDetails
}) => {
  const { tTracking, tCommon } = useTranslation();
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<ContextPrediction | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrediction, setShowPrediction] = useState(false);

  // Run context inference when emotion is selected
  useEffect(() => {
    if (selectedEmotion) {
      try {
        const contextPrediction = inferContext({
          studentId: student.id,
          currentEmotion: selectedEmotion,
          currentTime: new Date()
        });

        setPrediction(contextPrediction);
        setShowPrediction(true);

        logger.info('Context inference completed', {
          studentId: student.id,
          emotion: selectedEmotion,
          confidence: contextPrediction.confidence,
          category: contextPrediction.suggestedCategory
        });
      } catch (error) {
        logger.error('Context inference failed', { error, studentId: student.id });
        setPrediction(null);
      }
    } else {
      setPrediction(null);
      setShowPrediction(false);
    }
  }, [selectedEmotion, student.id]);

  const handleEmotionSelect = (emotionId: string) => {
    setSelectedEmotion(emotionId);
  };

  const handleQuickSave = async () => {
    if (!selectedEmotion) {
      toast({
        title: String(tTracking('session.validationError')),
        description: 'Please select an emotion first',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);

    try {
      // Build emotion entry
      const emotionEntry: Omit<EmotionEntry, 'id' | 'timestamp'> = {
        emotion: selectedEmotion,
        intensity: 3, // Default moderate intensity
        studentId: student.id
      };

      // Use inferred sensory inputs from context prediction
      const sensoryInputs: Omit<SensoryEntry, 'id' | 'timestamp'>[] =
        prediction?.inferredSensoryInputs.map(sensory => ({
          sensoryType: sensory.sensoryType || '',
          response: sensory.response || '',
          intensity: sensory.intensity || 3,
          studentId: student.id
        })) || [];

      // Save the entry
      await onSave([emotionEntry], sensoryInputs);

      // Success feedback
      toast({
        title: '✓ Saved!',
        description: `${selectedEmotion} tracked for ${student.name}`,
        duration: 2000
      });

      // Reset for next entry
      setSelectedEmotion(null);
      setPrediction(null);
      setShowPrediction(false);
    } catch (error) {
      logger.error('Quick save failed', { error, studentId: student.id });
      toast({
        title: 'Save failed',
        description: 'Could not save entry. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/20 font-dyslexia">
      {/* Header Section - Top 20% */}
      <div className="flex-shrink-0 px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-lg">
            {student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {student.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              Quick Entry
            </p>
          </div>
        </div>

        {/* Context Suggestion Card */}
        <AnimatePresence>
          {showPrediction && prediction && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="bg-primary/5 border-primary/20 mb-4">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-primary">
                          AI Suggestion
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs"
                        >
                          {Math.round(prediction.confidence * 100)}% confident
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {prediction.reasoning}
                      </p>
                      {prediction.inferredSensoryInputs.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {prediction.inferredSensoryInputs.map((sensory, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-xs"
                            >
                              {sensory.sensoryType}: {sensory.response}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-sm text-muted-foreground">
          How is {student.name.split(' ')[0]} feeling right now?
        </p>
      </div>

      {/* Emotion Selection - Middle 50% (Thumb Zone) */}
      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {emotionOptions.map((option) => (
            <motion.button
              key={option.id}
              onClick={() => handleEmotionSelect(option.id)}
              className={`
                relative
                flex flex-col items-center justify-center
                p-6 rounded-2xl
                border-2 transition-all duration-200
                ${option.color}
                ${option.hoverColor}
                ${
                  selectedEmotion === option.id
                    ? 'border-primary ring-2 ring-primary/50 scale-105'
                    : 'border-transparent'
                }
                active:scale-95
                min-h-[120px]
              `}
              whileTap={{ scale: 0.95 }}
              aria-label={`Select ${option.label} emotion`}
              aria-pressed={selectedEmotion === option.id}
            >
              {selectedEmotion === option.id && (
                <motion.div
                  className="absolute top-2 right-2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                  <Check className="h-5 w-5 text-primary" />
                </motion.div>
              )}

              <div className="mb-2">
                {option.icon}
              </div>
              <span className="font-semibold text-sm">
                {option.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Action Buttons - Bottom 30% (Primary Actions) */}
      <div className="flex-shrink-0 px-4 pb-6 pt-4 bg-background/80 backdrop-blur-sm border-t">
        <div className="max-w-md mx-auto space-y-3">
          {/* Quick Save Button - Primary Action */}
          <Button
            size="lg"
            onClick={handleQuickSave}
            disabled={!selectedEmotion || isSaving}
            className="w-full h-14 text-lg font-semibold shadow-lg"
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-5 w-5 mr-2" />
                Save & Done
              </>
            )}
          </Button>

          {/* Add Details Button - Secondary Action */}
          {onExpandDetails && (
            <Button
              size="lg"
              variant="outline"
              onClick={onExpandDetails}
              disabled={!selectedEmotion}
              className="w-full h-12"
            >
              Add More Details
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {/* Time Saved Indicator */}
          {selectedEmotion && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Quick entry saves ~9 minutes vs. full form
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileQuickEntry;
