import { useState, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { IntensityScale } from '@/components/ui/intensity-scale';
import { TagInput } from '@/components/ui/tag-input';
import { EmotionEntry } from '@/types/student';
import { Heart, Frown, Angry, Smile, Zap, Sun } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { logger } from '@/lib/logger';

interface EmotionTrackerProps {
  onEmotionAdd: (emotion: Omit<EmotionEntry, 'id' | 'timestamp'>) => void;
  studentId: string;
}

const emotions = [
  { type: 'happy' as const, icon: Smile, color: 'emotion-happy' },
  { type: 'calm' as const, icon: Heart, color: 'emotion-calm' },
  { type: 'excited' as const, icon: Zap, color: 'emotion-excited' },
  { type: 'sad' as const, icon: Frown, color: 'emotion-sad' },
  { type: 'anxious' as const, icon: Sun, color: 'emotion-anxious' },
  { type: 'angry' as const, icon: Angry, color: 'emotion-angry' },
];

// Sub-emotions for each primary emotion
const subEmotions: Record<string, string[]> = {
  happy: ['joyful', 'content', 'cheerful', 'pleased', 'delighted'],
  calm: ['peaceful', 'relaxed', 'serene', 'tranquil', 'centered'],
  excited: ['energetic', 'enthusiastic', 'thrilled', 'eager', 'animated'],
  sad: ['disappointed', 'lonely', 'grieving', 'melancholy', 'dejected'],
  anxious: ['worried', 'nervous', 'fearful', 'stressed', 'panicked'],
  angry: ['frustrated', 'irritated', 'furious', 'annoyed', 'resentful'],
};

/**
 * EmotionTracker Component
 *
 * Provides an accessible interface for tracking and recording student emotions
 * with intensity levels, triggers, and contextual information.
 *
 * @component
 * @param {EmotionTrackerProps} props - Component props
 * @param {Function} props.onEmotionAdd - Callback when emotion is added
 * @param {string} props.studentId - ID of the student being tracked
 */
const EmotionTrackerComponent = ({ onEmotionAdd, studentId }: EmotionTrackerProps) => {
  const { tTracking, tCommon } = useTranslation();
  const [selectedEmotion, setSelectedEmotion] = useState<string>('');
  const [selectedSubEmotion, setSelectedSubEmotion] = useState<string>('');
  const [intensity, setIntensity] = useState<number>(3);
  const [duration, setDuration] = useState<number>(0);
  const [escalationPattern, setEscalationPattern] = useState<'sudden' | 'gradual' | 'unknown'>(
    'unknown',
  );
  const [notes, setNotes] = useState('');
  const [triggers, setTriggers] = useState<string[]>([]);

  const handleSubmit = () => {
    if (!selectedEmotion) {
      logger.warn('Attempted to submit emotion without selection');
      return;
    }

    onEmotionAdd({
      studentId,
      emotion: selectedEmotion as EmotionEntry['emotion'],
      subEmotion: selectedSubEmotion || undefined,
      intensity: intensity as EmotionEntry['intensity'],
      duration: duration > 0 ? duration : undefined,
      escalationPattern: escalationPattern !== 'unknown' ? escalationPattern : undefined,
      notes: notes.trim() || undefined,
      triggers: triggers.length > 0 ? triggers : undefined,
    });

    // Reset form
    setSelectedEmotion('');
    setSelectedSubEmotion('');
    setIntensity(3);
    setDuration(0);
    setEscalationPattern('unknown');
    setNotes('');
    setTriggers([]);
  };

  return (
    <Card className="font-dyslexia bg-gradient-card border-0">
      <CardHeader>
        <CardTitle className="text-xl text-foreground">
          {String(tTracking('emotions.title'))}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Emotion Selection */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">
            {String(tTracking('emotions.selectEmotion'))}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {emotions.map((emotion) => {
              const Icon = emotion.icon;
              return (
                <Button
                  key={emotion.type}
                  variant={selectedEmotion === emotion.type ? 'default' : 'outline'}
                  className={`h-20 flex-col gap-2 font-dyslexia hover-lift press-scale transition-all duration-300 ${
                    selectedEmotion === emotion.type
                      ? 'bg-gradient-primary shadow-glow animate-bounce-in'
                      : 'hover:scale-105 animate-fade-in hover:shadow-soft'
                  }`}
                  onClick={() => setSelectedEmotion(emotion.type)}
                  aria-label={`Select ${String(tTracking(`emotions.types.${emotion.type}`))}`}
                  aria-pressed={selectedEmotion === emotion.type}
                >
                  <Icon className="h-6 w-6 transform transition-transform duration-200 hover:scale-110" />
                  <span className="text-sm">
                    {String(tTracking(`emotions.types.${emotion.type}`))}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Sub-emotion Selection */}
        {selectedEmotion && subEmotions[selectedEmotion] && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">
              {String(tTracking('emotions.specificFeeling'))}
            </h3>
            <div className="flex flex-wrap gap-2">
              {subEmotions[selectedEmotion].map((subEmotion) => (
                <Badge
                  key={subEmotion}
                  variant={selectedSubEmotion === subEmotion ? 'default' : 'outline'}
                  className="cursor-pointer font-dyslexia hover-lift transition-all duration-200"
                  onClick={() =>
                    setSelectedSubEmotion(selectedSubEmotion === subEmotion ? '' : subEmotion)
                  }
                  role="button"
                  tabIndex={0}
                  aria-pressed={selectedSubEmotion === subEmotion}
                  aria-label={`Select ${subEmotion}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedSubEmotion(selectedSubEmotion === subEmotion ? '' : subEmotion);
                    }
                  }}
                >
                  {subEmotion}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Intensity Scale */}
        {selectedEmotion && (
          <IntensityScale
            value={intensity}
            onChange={setIntensity}
            label={String(tTracking('emotions.intensity'))}
            min={1}
            max={5}
            showInput={false}
            className="hover-lift press-scale transition-all duration-200"
          />
        )}

        {/* Duration */}
        {selectedEmotion && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">
              {String(tTracking('emotions.duration'))}
            </h3>
            <div className="flex gap-2">
              <input
                type="number"
                value={duration}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty string for better UX while typing
                  if (value === '') {
                    setDuration(0);
                    return;
                  }
                  // Parse and validate the number
                  const parsed = parseInt(value, 10);
                  if (!isNaN(parsed)) {
                    setDuration(Math.max(0, Math.min(999, parsed))); // Cap at 999 minutes
                  }
                }}
                placeholder={String(tTracking('emotions.durationPlaceholder'))}
                className="w-32 px-3 py-2 border border-border rounded-lg font-dyslexia bg-input focus:ring-2 focus:ring-ring focus:border-transparent"
                min="0"
                max="999"
                aria-label={String(tTracking('emotions.durationAriaLabel'))}
                aria-describedby="duration-help"
              />
              <div className="flex gap-1">
                {[5, 15, 30, 60].map((minutes) => (
                  <Button
                    key={minutes}
                    variant="outline"
                    size="sm"
                    onClick={() => setDuration(minutes)}
                    className="font-dyslexia"
                  >
                    {minutes < 60 ? `${minutes}m` : '1h'}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Escalation Pattern */}
        {selectedEmotion && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">
              {String(tTracking('emotions.escalation'))}
            </h3>
            <div className="flex gap-2">
              <Button
                variant={escalationPattern === 'sudden' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEscalationPattern('sudden')}
                className="font-dyslexia"
              >
                {String(tTracking('emotions.escalationSudden'))}
              </Button>
              <Button
                variant={escalationPattern === 'gradual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEscalationPattern('gradual')}
                className="font-dyslexia"
              >
                {String(tTracking('emotions.escalationGradual'))}
              </Button>
              <Button
                variant={escalationPattern === 'unknown' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEscalationPattern('unknown')}
                className="font-dyslexia"
              >
                {String(tTracking('emotions.escalationUnknown'))}
              </Button>
            </div>
          </div>
        )}

        {/* Triggers */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">
            {String(tTracking('emotions.triggers'))}
          </h3>
          <TagInput
            value={triggers}
            onChange={setTriggers}
            placeholder={String(tTracking('emotions.triggersPlaceholder'))}
            label={String(tTracking('emotions.triggersLabel'))}
            addButtonText={String(tCommon('buttons.add'))}
            className="font-dyslexia"
          />
        </div>

        {/* Notes */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">
            {String(tTracking('emotions.notes'))}
          </h3>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={String(tTracking('emotions.notesPlaceholder'))}
            className="font-dyslexia bg-input border-border focus:ring-ring"
            rows={3}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!selectedEmotion}
          className="w-full font-dyslexia bg-gradient-primary hover:opacity-90 transition-all duration-200"
        >
          {String(tTracking('emotions.addEmotion'))}
        </Button>
      </CardContent>
    </Card>
  );
};

export const EmotionTracker = memo(EmotionTrackerComponent);
