import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Student, EmotionEntry, SensoryEntry } from '@/types/student';
import { useTranslation } from '@/hooks/useTranslation';
import { Heart, Eye, Ear, Hand, Sparkles, Plus, TrendingUp, Clock, Info } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SmartDataEntryProps {
  student: Student;
  recentEmotions: EmotionEntry[];
  recentSensoryInputs: SensoryEntry[];
  onEmotionAdd: (emotion: Omit<EmotionEntry, 'id' | 'timestamp'>) => void;
  onSensoryAdd: (sensory: Omit<SensoryEntry, 'id' | 'timestamp'>) => void;
}

const commonEmotions = [
  'Happy', 'Sad', 'Angry', 'Excited', 'Anxious', 'Calm', 'Frustrated', 'Confused', 'Proud', 'Overwhelmed'
];

const sensoryTypes = [
  { value: 'sight', label: 'Sight', icon: Eye },
  { value: 'sound', label: 'Sound', icon: Ear },
  { value: 'touch', label: 'Touch', icon: Hand },
  { value: 'smell', label: 'Smell', icon: Sparkles },
  { value: 'taste', label: 'Taste', icon: Sparkles },
  { value: 'movement', label: 'Movement', icon: TrendingUp },
];

export function SmartDataEntry({
  student,
  recentEmotions,
  recentSensoryInputs,
  onEmotionAdd,
  onSensoryAdd,
}: SmartDataEntryProps) {
  const { tTracking, tStudent } = useTranslation();

  // Emotion form state
  const [selectedEmotion, setSelectedEmotion] = useState('');
  const [emotionIntensity, setEmotionIntensity] = useState<number>(3);
  const [emotionContext, setEmotionContext] = useState('');
  const [emotionTrigger, setEmotionTrigger] = useState('');
  const [emotionDuration, setEmotionDuration] = useState('');

  // Sensory form state
  const [sensoryType, setSensoryType] = useState('sight');
  const [sensoryInput, setSensoryInput] = useState('');
  const [sensoryResponse, setSensoryResponse] = useState('');
  const [sensoryIntensity, setSensoryIntensity] = useState<number>(3);
  const [sensoryContext, setSensoryContext] = useState('');

  // Get frequently used emotions and sensory inputs from recent data
  const frequentEmotions = useMemo(() => {
    const emotionCounts = new Map<string, number>();
    recentEmotions.forEach(entry => {
      const count = emotionCounts.get(entry.emotion) || 0;
      emotionCounts.set(entry.emotion, count + 1);
    });
    return Array.from(emotionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([emotion]) => emotion);
  }, [recentEmotions]);

  const frequentSensoryTypes = useMemo(() => {
    const typeCounts = new Map<string, number>();
    recentSensoryInputs.forEach(entry => {
      const type = entry.type || entry.sensoryType || 'other';
      const count = typeCounts.get(type) || 0;
      typeCounts.set(type, count + 1);
    });
    return Array.from(typeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);
  }, [recentSensoryInputs]);

  const handleEmotionSubmit = useCallback(() => {
    if (!selectedEmotion) {
      toast({
        title: String(tTracking('emotions.validationError')),
        description: String(tTracking('emotions.selectEmotion')),
        variant: 'destructive',
      });
      return;
    }

    onEmotionAdd({
      studentId: student.id,
      emotion: selectedEmotion,
      intensity: emotionIntensity,
      context: emotionContext || undefined,
      triggers: emotionTrigger ? [emotionTrigger] : undefined,
      duration: emotionDuration ? parseInt(emotionDuration) : undefined,
    });

    // Reset form
    setSelectedEmotion('');
    setEmotionIntensity(3);
    setEmotionContext('');
    setEmotionTrigger('');
    setEmotionDuration('');
  }, [selectedEmotion, emotionIntensity, emotionContext, emotionTrigger, emotionDuration, student.id, onEmotionAdd, tTracking]);

  const handleSensorySubmit = useCallback(() => {
    if (!sensoryInput || !sensoryResponse) {
      toast({
        title: String(tTracking('sensory.validationError')),
        description: String(tTracking('sensory.fillRequired')),
        variant: 'destructive',
      });
      return;
    }

    onSensoryAdd({
      studentId: student.id,
      sensoryType: sensoryType,
      type: sensoryType,
      input: sensoryInput,
      response: sensoryResponse,
      intensity: sensoryIntensity,
      context: sensoryContext || undefined,
    });

    // Reset form
    setSensoryInput('');
    setSensoryResponse('');
    setSensoryIntensity(3);
    setSensoryContext('');
  }, [sensoryType, sensoryInput, sensoryResponse, sensoryIntensity, sensoryContext, student.id, onSensoryAdd, tTracking]);

  const handleQuickEmotion = (emotion: string) => {
    setSelectedEmotion(emotion);
  };

  const handleQuickSensory = (type: string) => {
    setSensoryType(type);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {String(tTracking('smartEntry.title'))}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="emotions" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="emotions" className="font-dyslexia">
              <Heart className="h-4 w-4 mr-2" />
              {String(tStudent('interface.emotions'))}
            </TabsTrigger>
            <TabsTrigger value="sensory" className="font-dyslexia">
              <Eye className="h-4 w-4 mr-2" />
              {String(tStudent('interface.sensory'))}
            </TabsTrigger>
          </TabsList>

          {/* Emotions Tab */}
          <TabsContent value="emotions" className="space-y-4">
            {/* Quick Select from Frequent/Common */}
            {(frequentEmotions.length > 0 || commonEmotions.length > 0) && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  {String(tTracking('smartEntry.quickSelect'))}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {frequentEmotions.length > 0 && (
                    <>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {String(tTracking('smartEntry.recent'))}:
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{String(tTracking('smartEntry.recentTooltip'))}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {frequentEmotions.map(emotion => (
                        <Badge
                          key={emotion}
                          variant={selectedEmotion === emotion ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => handleQuickEmotion(emotion)}
                        >
                          {emotion}
                        </Badge>
                      ))}
                    </>
                  )}
                  {commonEmotions
                    .filter(e => !frequentEmotions.includes(e))
                    .slice(0, 5)
                    .map(emotion => (
                      <Badge
                        key={emotion}
                        variant={selectedEmotion === emotion ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => handleQuickEmotion(emotion)}
                      >
                        {emotion}
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            {/* Emotion Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emotion">
                    {String(tTracking('emotions.emotion'))} *
                  </Label>
                  <Input
                    id="emotion"
                    value={selectedEmotion}
                    onChange={(e) => setSelectedEmotion(e.target.value)}
                    placeholder={String(tTracking('emotions.emotionPlaceholder'))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trigger">
                    {String(tTracking('emotions.trigger'))}
                  </Label>
                  <Input
                    id="trigger"
                    value={emotionTrigger}
                    onChange={(e) => setEmotionTrigger(e.target.value)}
                    placeholder={String(tTracking('emotions.triggerPlaceholder'))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="intensity">
                  {String(tTracking('emotions.intensity'))}: {emotionIntensity}/5
                </Label>
                <Slider
                  id="intensity"
                  min={1}
                  max={5}
                  step={1}
                  value={[emotionIntensity]}
                  onValueChange={(value) => setEmotionIntensity(value[0])}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{String(tTracking('emotions.veryLow'))}</span>
                  <span>{String(tTracking('emotions.moderate'))}</span>
                  <span>{String(tTracking('emotions.veryHigh'))}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="context">
                    {String(tTracking('emotions.context'))}
                  </Label>
                  <Input
                    id="context"
                    value={emotionContext}
                    onChange={(e) => setEmotionContext(e.target.value)}
                    placeholder={String(tTracking('emotions.contextPlaceholder'))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">
                    {String(tTracking('emotions.duration'))} ({String(tTracking('emotions.minutes'))})
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    value={emotionDuration}
                    onChange={(e) => setEmotionDuration(e.target.value)}
                    placeholder={String(tTracking('emotions.durationPlaceholder'))}
                  />
                </div>
              </div>

              <Button onClick={handleEmotionSubmit} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                {String(tTracking('emotions.addEmotion'))}
              </Button>
            </div>
          </TabsContent>

          {/* Sensory Tab */}
          <TabsContent value="sensory" className="space-y-4">
            {/* Quick Select Sensory Types */}
            {frequentSensoryTypes.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  {String(tTracking('smartEntry.frequentTypes'))}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {sensoryTypes
                    .filter(type => frequentSensoryTypes.includes(type.value))
                    .map(({ value, label, icon: Icon }) => (
                      <Badge
                        key={value}
                        variant={sensoryType === value ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => handleQuickSensory(value)}
                      >
                        <Icon className="h-3 w-3 mr-1" />
                        {label}
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            {/* Sensory Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sensory-type">
                  {String(tTracking('sensory.type'))} *
                </Label>
                <Select value={sensoryType} onValueChange={setSensoryType}>
                  <SelectTrigger id="sensory-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sensoryTypes.map(({ value, label, icon: Icon }) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="input">
                  {String(tTracking('sensory.input'))} *
                </Label>
                <Textarea
                  id="input"
                  value={sensoryInput}
                  onChange={(e) => setSensoryInput(e.target.value)}
                  placeholder={String(tTracking('sensory.inputPlaceholder'))}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="response">
                  {String(tTracking('sensory.response'))} *
                </Label>
                <Textarea
                  id="response"
                  value={sensoryResponse}
                  onChange={(e) => setSensoryResponse(e.target.value)}
                  placeholder={String(tTracking('sensory.responsePlaceholder'))}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sensory-intensity">
                  {String(tTracking('sensory.intensity'))}: {sensoryIntensity}/5
                </Label>
                <Slider
                  id="sensory-intensity"
                  min={1}
                  max={5}
                  step={1}
                  value={[sensoryIntensity]}
                  onValueChange={(value) => setSensoryIntensity(value[0])}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{String(tTracking('sensory.veryLow'))}</span>
                  <span>{String(tTracking('sensory.moderate'))}</span>
                  <span>{String(tTracking('sensory.veryHigh'))}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sensory-context">
                  {String(tTracking('sensory.context'))}
                </Label>
                <Input
                  id="sensory-context"
                  value={sensoryContext}
                  onChange={(e) => setSensoryContext(e.target.value)}
                  placeholder={String(tTracking('sensory.contextPlaceholder'))}
                />
              </div>

              <Button onClick={handleSensorySubmit} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                {String(tTracking('sensory.addSensory'))}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Smart Suggestions Info */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">{String(tTracking('smartEntry.smartTip'))}</p>
              <p>{String(tTracking('smartEntry.smartDescription'))}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}