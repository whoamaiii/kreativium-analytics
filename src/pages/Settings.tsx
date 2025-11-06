import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { FileText, BookOpen } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Switch } from '@/components/ui/switch';
import { OnboardingTrigger, useOnboarding } from '@/components/onboarding/OnboardingTutorial';
import { ExampleEntriesDialog } from '@/components/help/ExampleEntriesDialog';

const Settings = (): JSX.Element => {
  const { tSettings, tCommon } = useTranslation();
  const navigate = useNavigate();
  const { restart } = useOnboarding();
  const [showExamples, setShowExamples] = React.useState(false);
  const [motionReduced, setMotionReduced] = React.useState<boolean>(() => {
    try { return localStorage.getItem('emotion.motionReduced') === '1'; } catch { return false; }
  });
  const [soundVolume, setSoundVolume] = React.useState<number>(() => {
    try { return Number(localStorage.getItem('emotion.soundVolume') ?? '0.16'); } catch { return 0.16; }
  });
  const [hintsEnabled, setHintsEnabled] = React.useState<boolean>(() => {
    try { return localStorage.getItem('emotion.hintsEnabled') !== '0'; } catch { return true; }
  });
  const [highContrast, setHighContrast] = React.useState<boolean>(() => {
    try { return localStorage.getItem('emotion.highContrast') === '1'; } catch { return false; }
  });
  const [detectorType, setDetectorType] = React.useState<string>(() => {
    try { return localStorage.getItem('emotion.detectorType') || 'faceapi-worker'; } catch { return 'faceapi-worker'; }
  });
  const [quietRewards, setQuietRewards] = React.useState<boolean>(() => {
    try { return localStorage.getItem('emotion.quietRewards') === '1'; } catch { return false; }
  });
  const [adultPin, setAdultPin] = React.useState<string>(() => {
    try { return localStorage.getItem('adult.pin') || '1234'; } catch { return '1234'; }
  });
  const [verifiedUntil, setVerifiedUntil] = React.useState<number | null>(() => {
    try {
      const raw = localStorage.getItem('adult.pin.verifiedUntil');
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) ? n : null;
    } catch { return null; }
  });

  function persist() {
    try {
      localStorage.setItem('emotion.motionReduced', motionReduced ? '1' : '0');
      localStorage.setItem('emotion.soundVolume', String(soundVolume));
      localStorage.setItem('emotion.hintsEnabled', hintsEnabled ? '1' : '0');
      localStorage.setItem('emotion.detectorType', detectorType);
      localStorage.setItem('emotion.quietRewards', quietRewards ? '1' : '0');
      localStorage.setItem('emotion.highContrast', highContrast ? '1' : '0');
    } catch {}
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-2">
          <Breadcrumbs
            items={[
              { label: tCommon('buttons.home'), href: '/' },
              { label: tSettings('title'), current: true },
            ]}
          />
          <h1 className="text-3xl font-bold text-foreground">{tSettings('title')}</h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <aside className="md:col-span-1 space-y-2" aria-label="Settings navigation">
            <ul className="text-sm">
              <li>
<Button variant="outline" className="w-full justify-start" onClick={() => navigate('/reports')} data-testid="settings-link-reports">
                  {String(tSettings('data.export'))}
                </Button>
              </li>
            </ul>
          </aside>

          <section className="md:col-span-3 space-y-4">
            <Card className="bg-gradient-card border-0 shadow-soft">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-semibold">{String(tCommon('settings.accessibility', { defaultValue: 'Accessibility & Motion' }))}</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{String(tCommon('settings.motion', { defaultValue: 'Reduce motion' }))}</div>
                    <div className="text-sm text-muted-foreground">{String(tCommon('settings.motionDesc', { defaultValue: 'Limit animations and confetti' }))}</div>
                  </div>
                  <Switch checked={motionReduced} onCheckedChange={(v) => { setMotionReduced(v); persist(); }} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{String(tCommon('settings.sound', { defaultValue: 'Sound volume' }))}</div>
                    <div className="text-sm text-muted-foreground">{String(tCommon('settings.soundDesc', { defaultValue: 'Success and level-up effects' }))}</div>
                  </div>
                  <input type="range" min={0} max={1} step={0.01} value={soundVolume} onChange={(e) => { setSoundVolume(Number(e.target.value)); persist(); }} aria-label={String(tCommon('settings.sound'))} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{String(tCommon('settings.hints', { defaultValue: 'Enable hints' }))}</div>
                    <div className="text-sm text-muted-foreground">{String(tCommon('settings.hintsDesc', { defaultValue: 'Allow in-round hint prompts' }))}</div>
                  </div>
                  <Switch checked={hintsEnabled} onCheckedChange={(v) => { setHintsEnabled(v); persist(); }} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{String(tCommon('settings.highContrast', { defaultValue: 'High contrast' }))}</div>
                    <div className="text-sm text-muted-foreground">{String(tCommon('settings.highContrastDesc', { defaultValue: 'Increase contrast for legibility' }))}</div>
                  </div>
                  <Switch checked={highContrast} onCheckedChange={(v) => { setHighContrast(v); persist(); }} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{String(tCommon('settings.quietRewards', { defaultValue: 'Quiet rewards' }))}</div>
                    <div className="text-sm text-muted-foreground">{String(tCommon('settings.quietRewardsDesc', { defaultValue: 'Use subtle visuals instead of sounds' }))}</div>
                  </div>
                  <Switch checked={quietRewards} onCheckedChange={(v) => { setQuietRewards(v); persist(); }} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{String(tCommon('settings.detector', { defaultValue: 'Detector' }))}</div>
                    <div className="text-sm text-muted-foreground">{String(tCommon('settings.detectorDesc', { defaultValue: 'Choose detection backend (requires reload)' }))}</div>
                  </div>
                  <select
                    value={detectorType}
                    onChange={(e) => { setDetectorType(e.target.value); persist(); }}
                    className="rounded-md bg-white/10 px-2 py-1"
                    aria-label={String(tCommon('settings.detector'))}
                  >
                    <option value="faceapi-worker">FaceAPI (Worker)</option>
                    <option value="faceapi-main">FaceAPI (Main thread)</option>
                    <option value="mediapipe">MediaPipe (Experimental)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <div className="font-medium">{String(tCommon('settings.calibration', { defaultValue: 'Calibration' }))}</div>
                    <div className="text-sm text-muted-foreground">{String(tCommon('settings.calibrationDesc', { defaultValue: 'Reset and re-run calibration flow' }))}</div>
                  </div>
                  <Button variant="outline" onClick={() => { try { localStorage.removeItem('emotion.calibration.v1'); } catch {}; }}>{String(tCommon('settings.resetCalibration', { defaultValue: 'Reset' }))}</Button>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-card border-0 shadow-soft">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-semibold">{String(tCommon('settings.adultPin', { defaultValue: 'Adult PIN' }))}</h2>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="adult-pin">PIN</label>
                  <input
                    id="adult-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={adultPin}
                    onChange={(e) => setAdultPin(e.target.value.replace(/\D+/g, '').slice(0, 6))}
                    className="w-full rounded-md border px-3 py-2"
                    placeholder="1234"
                    aria-label="Adult PIN"
                  />
                  <div className="text-xs text-muted-foreground">
                    {verifiedUntil ? `${String(tCommon('settings.unlockedUntil', { defaultValue: 'Unlocked until' }))} ${new Date(verifiedUntil).toLocaleTimeString()}` : String(tCommon('settings.locked', { defaultValue: 'Locked' }))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => { try { localStorage.setItem('adult.pin', adultPin || '1234'); } catch {} }}>{String(tCommon('buttons.save', { defaultValue: 'Save' }))}</Button>
                  <Button variant="outline" onClick={() => { try { localStorage.removeItem('adult.pin.verifiedUntil'); setVerifiedUntil(null); } catch {} }}>{String(tCommon('settings.resetVerification', { defaultValue: 'Reset verification' }))}</Button>
                  <Button variant="outline" onClick={() => { setAdultPin('1234'); try { localStorage.setItem('adult.pin', '1234'); } catch {} }}>{String(tCommon('settings.setDefaultPin', { defaultValue: 'Set 1234' }))}</Button>
                </div>
              </CardContent>
            </Card>

            {/* Help & Support Section */}
            <Card className="bg-gradient-card border-0 shadow-soft">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-semibold">Help & Support</h2>
                <p className="text-sm text-muted-foreground">
                  Access tutorials and examples to get the most out of Kreativium Analytics
                </p>

                <div className="space-y-3">
                  <OnboardingTrigger onClick={restart} />

                  <Button
                    variant="outline"
                    onClick={() => setShowExamples(true)}
                    className="w-full justify-start gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    View Example Entries
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-0 shadow-soft">
              <CardContent className="p-6 space-y-3">
            <h2 className="text-xl font-semibold">{tSettings('data.title')}</h2>
            <p className="text-sm text-muted-foreground">{tSettings('dataExport.description')}</p>
            <div>
              <Button variant="outline" onClick={() => navigate('/reports')} aria-label={tSettings('data.export')}>
                <FileText className="h-4 w-4 mr-2" />
                {String(tSettings('data.export'))}
              </Button>
            </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>

      {/* Example Entries Dialog */}
      <ExampleEntriesDialog open={showExamples} onOpenChange={setShowExamples} />
    </div>
  );
};

export default Settings;

