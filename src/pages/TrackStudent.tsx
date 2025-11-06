import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EmotionTracker } from "@/components/EmotionTracker";
import { SensoryTracker } from "@/components/SensoryTracker";
import { EnvironmentalTracker } from "@/components/EnvironmentalTracker";
import { MobileQuickEntry } from "@/components/tracking/MobileQuickEntry";
import { Student, EmotionEntry, SensoryEntry, TrackingEntry, EnvironmentalEntry } from "@/types/student";
import { ArrowLeft, Save, User, Smartphone, Monitor } from "lucide-react";
import { toast } from '@/hooks/use-toast';
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageSettings } from "@/components/LanguageSettings";
import { logger } from "@/lib/logger";
import { saveTrackingEntry as saveTrackingEntryUnified } from "@/lib/tracking/saveTrackingEntry";
import { dataStorage } from "@/lib/dataStorage";

const TrackStudent = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [emotions, setEmotions] = useState<Omit<EmotionEntry, 'id' | 'timestamp'>[]>([]);
  const [sensoryInputs, setSensoryInputs] = useState<Omit<SensoryEntry, 'id' | 'timestamp'>[]>([]);
  const [environmentalData, setEnvironmentalData] = useState<Omit<EnvironmentalEntry, 'id' | 'timestamp'> | null>(null);
  const [generalNotes, setGeneralNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { tTracking, tCommon } = useTranslation();

  // Mobile-first: Detect screen size and default view
  const [isMobileView, setIsMobileView] = useState(true);
  const [userPreferredView, setUserPreferredView] = useState<'auto' | 'mobile' | 'full'>('auto');

  // Responsive detection hook
  useEffect(() => {
    if (userPreferredView === 'auto') {
      const checkMobile = () => {
        setIsMobileView(window.innerWidth < 768);
      };

      checkMobile(); // Initial check
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    } else {
      setIsMobileView(userPreferredView === 'mobile');
    }
  }, [userPreferredView]);

  useEffect(() => {
    if (!studentId) return;

    // Load student data using dataStorage API
    const foundStudent = dataStorage.getStudentById(studentId);
    if (foundStudent) {
      setStudent(foundStudent);
    } else {
      toast({
        title: String(tTracking('session.validationError')),
        description: String(tTracking('session.validationError')),
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [studentId, navigate, tTracking]);

  const handleEmotionAdd = (emotion: Omit<EmotionEntry, 'id' | 'timestamp'>) => {
    setEmotions([...emotions, emotion]);
    toast({
      title: "Emotion recorded!",
      description: "Emotion recorded!",
    });
  };

  const handleSensoryAdd = (sensory: Omit<SensoryEntry, 'id' | 'timestamp'>) => {
    setSensoryInputs([...sensoryInputs, sensory]);
    toast({
      title: "Sensory input recorded!",
      description: "Sensory input recorded!",
    });
  };

  const handleEnvironmentalAdd = (environmental: Omit<EnvironmentalEntry, 'id' | 'timestamp'>) => {
    setEnvironmentalData(environmental);
    toast({
      title: "Environmental conditions recorded!",
      description: "Environmental conditions recorded!",
    });
  };

  const handleSaveSession = async () => {
    if (!student) return;

    if (emotions.length === 0 && sensoryInputs.length === 0) {
      toast({
        title: String(tTracking('session.validationError')),
        description: String(tTracking('session.validationError')),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const timestamp = new Date();

      // Create the tracking entry
      const trackingEntry: TrackingEntry = {
        id: crypto.randomUUID(),
        studentId: student.id,
        timestamp,
        emotions: emotions.map(e => ({
          ...e,
          id: crypto.randomUUID(),
          timestamp
        })),
        sensoryInputs: sensoryInputs.map(s => ({
          ...s,
          id: crypto.randomUUID(),
          timestamp
        })),
        environmentalData: environmentalData ? {
          ...environmentalData,
          id: crypto.randomUUID(),
          timestamp
        } : undefined,
        notes: generalNotes.trim() || undefined
      };

      // Unified save flow
      const result = await saveTrackingEntryUnified(trackingEntry, { minDataPoints: 1 });
      if (!result.success) {
        result.errors?.forEach(err => toast({
          title: err,
          description: err,
          variant: 'destructive',
        }));
        return;
      }

      toast({
        title: String(tTracking('session.sessionSaved')),
        description: String(tTracking('session.sessionSaved')),
      });
      navigate(`/student/${student.id}`);
    } catch (error) {
      logger.error('Failed to save tracking session', { error });
      toast({
        title: String(tTracking('session.saveError')),
        description: String(tTracking('session.saveError')),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for mobile quick entry save
  const handleQuickEntrySave = async (
    quickEmotions: Omit<EmotionEntry, 'id' | 'timestamp'>[],
    quickSensory: Omit<SensoryEntry, 'id' | 'timestamp'>[]
  ) => {
    if (!student) return;

    const timestamp = new Date();

    const trackingEntry: TrackingEntry = {
      id: crypto.randomUUID(),
      studentId: student.id,
      timestamp,
      emotions: quickEmotions.map(e => ({
        ...e,
        id: crypto.randomUUID(),
        timestamp
      })),
      sensoryInputs: quickSensory.map(s => ({
        ...s,
        id: crypto.randomUUID(),
        timestamp
      }))
    };

    const result = await saveTrackingEntryUnified(trackingEntry, { minDataPoints: 1 });
    if (!result.success) {
      throw new Error(result.errors?.join(', ') || 'Save failed');
    }

    // Navigate back to student profile
    navigate(`/student/${student.id}`);
  };

  // Handler to expand from quick entry to full form
  const handleExpandToFullForm = () => {
    setUserPreferredView('full');
  };

  if (!student) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{String(tCommon('status.loading'))}</p>
        </div>
      </div>
    );
  }

  // Conditional rendering: Mobile Quick Entry vs. Full Form
  if (isMobileView) {
    return (
      <MobileQuickEntry
        student={student}
        onSave={handleQuickEntrySave}
        onExpandDetails={handleExpandToFullForm}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background font-dyslexia">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate(`/student/${student.id}`)}
              className="font-dyslexia"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {String(tCommon('buttons.back'))}
            </Button>
            <div className="flex items-center gap-2">
              {/* View toggle button - desktop only */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUserPreferredView(userPreferredView === 'mobile' ? 'full' : 'mobile')}
                className="font-dyslexia hidden md:flex"
                title="Toggle between quick entry and full form"
              >
                {userPreferredView === 'mobile' || isMobileView ? (
                  <>
                    <Monitor className="h-4 w-4 mr-2" />
                    Full Form
                  </>
                ) : (
                  <>
                    <Smartphone className="h-4 w-4 mr-2" />
                    Quick Entry
                  </>
                )}
              </Button>
              <LanguageSettings />
            </div>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-lg">
              {student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {String(tTracking('session.title')).replace('{{studentName}}', student.name)}
              </h1>
            </div>
          </div>

          <p className="text-muted-foreground">
            {String(tTracking('session.description'))}
          </p>
        </div>

        {/* Session Summary */}
        <div className="mb-6 p-4 bg-primary-soft rounded-lg border border-primary/20">
          <h3 className="text-lg font-semibold text-primary-foreground mb-2">
            {String(tTracking('session.summary'))}
          </h3>
          <div className="flex items-center gap-4 text-sm text-primary-foreground">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{String(tTracking('session.emotionsRecorded')).replace('{{count}}', emotions.length.toString())}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>{String(tTracking('session.sensoryInputsRecorded')).replace('{{count}}', sensoryInputs.length.toString())}</span>
            </div>
          </div>
        </div>

        {/* Tracking Forms */}
        <div className="space-y-8 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <EmotionTracker 
              onEmotionAdd={handleEmotionAdd}
              studentId={student.id}
            />
            <SensoryTracker 
              onSensoryAdd={handleSensoryAdd}
              studentId={student.id}
            />
          </div>
          
          {/* Environmental Tracking */}
          <div className="w-full">
            <EnvironmentalTracker 
              onEnvironmentalAdd={handleEnvironmentalAdd}
              studentId={student.id}
            />
          </div>
        </div>

        {/* General Notes */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-3">
            {String(tTracking('session.generalNotes'))}
          </h3>
          <textarea
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            placeholder={String(tTracking('session.generalNotesPlaceholder'))}
            aria-label={String(tTracking('session.generalNotes'))}
            className="w-full p-4 border border-border rounded-lg font-dyslexia bg-input focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
            rows={4}
          />
        </div>

        {/* Save Session */}
        <div className="flex gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(`/student/${student.id}`)}
            className="flex-1 font-dyslexia"
          >
            {String(tTracking('session.cancelSession'))}
          </Button>
          <Button
            onClick={handleSaveSession}
            disabled={isLoading || (emotions.length === 0 && sensoryInputs.length === 0)}
            className="flex-1 font-dyslexia bg-gradient-primary hover:opacity-90 transition-all duration-200"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                {String(tCommon('status.saving'))}
              </div>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {String(tTracking('session.saveSession'))}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TrackStudent;
