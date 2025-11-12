import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IntensityScale } from '@/components/ui/intensity-scale';
import { Student, EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import { Heart, Frown, Angry, Smile, Zap, Sun, Save, ChevronRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { saveTrackingEntry as saveTrackingEntryUnified } from '@/lib/tracking/saveTrackingEntry';
import { logger } from '@/lib/logger';

interface QuickTrackProps {
  student: Student;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const emotions = [
  { type: 'happy' as const, icon: Smile, color: 'text-green-600' },
  { type: 'calm' as const, icon: Heart, color: 'text-blue-600' },
  { type: 'excited' as const, icon: Zap, color: 'text-yellow-600' },
  { type: 'sad' as const, icon: Frown, color: 'text-gray-600' },
  { type: 'anxious' as const, icon: Sun, color: 'text-orange-600' },
  { type: 'angry' as const, icon: Angry, color: 'text-red-600' },
];

/**
 * QuickTrack Component
 *
 * Simplified 3-step observation entry for classroom use:
 * 1. Select primary emotion
 * 2. Set intensity level
 * 3. Save (with optional notes in expansion)
 *
 * Designed for quick data capture in under 10 seconds.
 */
export const QuickTrack = ({ student, open, onOpenChange, onSuccess }: QuickTrackProps) => {
  const { tTracking, tCommon } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedEmotion, setSelectedEmotion] = useState<string>('');
  const [intensity, setIntensity] = useState<number>(3);
  const [notes, setNotes] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleReset = () => {
    setStep(1);
    setSelectedEmotion('');
    setIntensity(3);
    setNotes('');
    setIsExpanded(false);
  };

  const handleEmotionSelect = (emotion: string) => {
    setSelectedEmotion(emotion);
    setStep(2);
  };

  const handleSave = async () => {
    if (!selectedEmotion) {
      toast({
        title: String(tTracking('quickTrack.errorNoEmotion')),
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const timestamp = new Date();
      const emotionEntry: Omit<EmotionEntry, 'id' | 'timestamp'> & {
        id: string;
        timestamp: Date;
      } = {
        id: crypto.randomUUID(),
        timestamp,
        studentId: student.id,
        emotion: selectedEmotion as EmotionEntry['emotion'],
        intensity: intensity as EmotionEntry['intensity'],
        notes: notes.trim() || undefined,
      };

      const trackingEntry: TrackingEntry = {
        id: crypto.randomUUID(),
        studentId: student.id,
        timestamp,
        emotions: [emotionEntry],
        sensoryInputs: [],
        notes: notes.trim() || undefined,
      };

      const result = await saveTrackingEntryUnified(trackingEntry, { minDataPoints: 1 });
      if (!result.success) {
        throw new Error(result.errors?.join(', ') || 'Save failed');
      }

      toast({
        title: String(tTracking('quickTrack.successSaved')),
        description: String(tTracking('quickTrack.successDescription')),
      });

      handleReset();
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      logger.error('Quick track save failed', { error });
      toast({
        title: String(tTracking('quickTrack.errorSaving')),
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {String(tTracking('quickTrack.title'))} - {student.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {String(tTracking('quickTrack.subtitle'))}
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Emotion Selection */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">
                1. {String(tTracking('quickTrack.step1Title'))}
              </h3>
              {selectedEmotion && (
                <Badge variant="secondary">{String(tTracking(`emotions.types.${selectedEmotion}`))}</Badge>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {emotions.map((emotion) => {
                const Icon = emotion.icon;
                const isSelected = selectedEmotion === emotion.type;
                return (
                  <Button
                    key={emotion.type}
                    variant={isSelected ? 'default' : 'outline'}
                    className={`h-24 flex-col gap-2 transition-all duration-200 ${
                      isSelected ? 'ring-2 ring-primary shadow-lg scale-105' : 'hover:scale-102'
                    }`}
                    onClick={() => handleEmotionSelect(emotion.type)}
                    disabled={step > 1 && !isSelected}
                  >
                    <Icon className={`h-8 w-8 ${isSelected ? '' : emotion.color}`} />
                    <span className="text-sm font-medium">
                      {String(tTracking(`emotions.types.${emotion.type}`))}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Intensity */}
          {step >= 2 && selectedEmotion && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">
                  2. {String(tTracking('quickTrack.step2Title'))}
                </h3>
                <Badge variant="secondary">{intensity}/5</Badge>
              </div>
              <IntensityScale
                value={intensity}
                onChange={setIntensity}
                label=""
                min={1}
                max={5}
                showInput={false}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{String(tTracking('quickTrack.intensityLow'))}</span>
                <span>{String(tTracking('quickTrack.intensityHigh'))}</span>
              </div>
            </div>
          )}

          {/* Step 3: Optional Notes (Expandable) */}
          {step >= 2 && (
            <div className="animate-fade-in">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm"
              >
                {isExpanded ? '▼' : '▶'} {String(tTracking('quickTrack.addNotesOptional'))}
              </Button>

              {isExpanded && (
                <div className="mt-3 animate-fade-in">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={String(tTracking('quickTrack.notesPlaceholder'))}
                    className="w-full px-3 py-2 border border-border rounded-lg font-dyslexia bg-input focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {step >= 2 && (
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isSaving}
                className="flex-1"
              >
                {String(tCommon('buttons.reset'))}
              </Button>
              <Button
                variant="default"
                onClick={handleSave}
                disabled={isSaving || !selectedEmotion}
                className="flex-1 bg-gradient-primary"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                    {String(tCommon('status.saving'))}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {String(tTracking('quickTrack.saveObservation'))}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Need More Detail Link */}
          {step >= 2 && (
            <div className="text-center">
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  // Navigate to full tracking page
                  window.location.href = `/track/${student.id}`;
                }}
                className="text-xs text-muted-foreground"
              >
                {String(tTracking('quickTrack.needMoreDetail'))}
                <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
