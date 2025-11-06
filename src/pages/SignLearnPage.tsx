import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/hooks/useTranslation";
import { SIGN_ITEMS } from "@/lib/tegn/signData";
import { Button } from "@/components/ui/button";
import { useCallback, useMemo, useState } from "react";
import { TegnXPBar } from "@/components/tegn/TegnXPBar";
import { useTegnXP } from "@/contexts/TegnXPContext";
import { Camera, Hand, Volume2 } from "lucide-react";
import { WebcamPreview } from "@/components/tegn/WebcamPreview";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";

const SignLearnPage = () => {
  const { tCommon, currentLanguage } = useTranslation();
  const sample = useMemo(() => SIGN_ITEMS.slice(0, 12), []);
  const { addXP } = useTegnXP();
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const cameraSupported = typeof window !== 'undefined' && Boolean(window.navigator?.mediaDevices?.getUserMedia);
  const { speak, supported: speechSupported, speaking, cancel } = useSpeechSynthesis({ preferredLang: currentLanguage });

  const current = sample[index % sample.length];

  const handleNext = () => {
    cancel();
    addXP(5);
    setIndex(prev => prev + 1);
    setShowAnswer(false);
    setCameraError(null);
  };

  const toggleCamera = () => {
    if (!cameraSupported) return;
    setCameraError(null);
    setCameraEnabled(prev => !prev);
  };

  const handleCameraError = useCallback((error: Error) => {
    const domError = error as DOMException;
    let message = String(tCommon('tegn.cameraError'));
    if (domError?.name === 'NotAllowedError') {
      message = String(tCommon('tegn.cameraPermissionDenied'));
    } else if (domError?.name === 'NotFoundError' || domError?.name === 'OverconstrainedError') {
      message = String(tCommon('tegn.cameraNotFound'));
    }
    setCameraError(message);
    setCameraEnabled(false);
  }, [tCommon]);

  const toggleAnswer = () => {
    if (!showAnswer && speechSupported) {
      speak(current.word);
    }
    if (showAnswer && speaking) {
      cancel();
    }
    setShowAnswer(prev => !prev);
  };

  const handleSpeak = () => {
    if (!speechSupported) return;
    speak(current.word);
  };

  return (
    <section className="space-y-6">
      <Card className="bg-gradient-card border-0 shadow-soft">
        <CardContent className="p-6 space-y-2">
          <h2 className="text-xl font-semibold">{String(tCommon('tegn.learn'))}</h2>
          <p className="text-sm text-muted-foreground">{String(tCommon('tegn.learnDesc'))}</p>
        </CardContent>
      </Card>

      <TegnXPBar />

      <Card className="glass-card border border-primary/10">
        <CardContent className="p-6 space-y-4">
          <div className="text-sm text-muted-foreground">{index + 1}/{sample.length}</div>
          <h3 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Hand className="h-5 w-5" /> Vis dette tegnet: <span className="text-primary">{current.word}</span>
          </h3>
          <div className="flex flex-col items-center gap-4">
            <img src={current.imageUrl} alt={current.alt} className="w-64 h-64 object-contain" />
            {showAnswer && (
              <div className="text-lg text-foreground">{current.word}</div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleSpeak}
              disabled={!speechSupported}
              aria-label={String(tCommon('tegn.playWordAria', { word: current.word }))}
            >
              <Volume2 className="h-4 w-4" />
              {String(tCommon(speaking ? 'tegn.playWordActive' : 'tegn.playWord'))}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={toggleAnswer}
              aria-label={String(tCommon(showAnswer ? 'tegn.hideAnswer' : 'tegn.showAnswer'))}
            >
              {String(tCommon(showAnswer ? 'tegn.hideAnswer' : 'tegn.showAnswer'))}
            </Button>
            <Button type="button" onClick={handleNext} aria-label={String(tCommon('tegn.nextPrompt'))}>
              👍 {String(tCommon('tegn.didIt'))}
            </Button>
            {!speechSupported && (
              <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
                {String(tCommon('tegn.speechUnsupported'))}
              </span>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Camera className="h-4 w-4" />
              {String(tCommon(cameraEnabled ? 'tegn.cameraAssistActive' : 'tegn.cameraAssist'))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={toggleCamera}
                disabled={!cameraSupported}
                aria-label={String(tCommon(cameraEnabled ? 'tegn.cameraDisable' : 'tegn.cameraEnable'))}
              >
                {String(tCommon(cameraEnabled ? 'tegn.cameraDisable' : 'tegn.cameraEnable'))}
              </Button>
              {!cameraSupported && (
                <span className="text-xs text-destructive" role="status" aria-live="polite">
                  {String(tCommon('tegn.cameraUnsupported'))}
                </span>
              )}
            </div>
            {cameraError && (
              <p className="text-xs text-destructive" role="alert">
                {cameraError}
              </p>
            )}
            <div className="relative max-w-md">
              <WebcamPreview active={cameraEnabled} className="max-w-md" onError={handleCameraError} />
              {!cameraEnabled && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/80 text-xs text-muted-foreground pointer-events-none" aria-hidden="true">
                  {String(tCommon('tegn.cameraInactiveOverlay'))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default SignLearnPage;
