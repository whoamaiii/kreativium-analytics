import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Switch } from '@/components/ui/switch';
import { useStorageState, useStorageFlag, useStorageRemove } from '@/lib/storage/useStorageState';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { storageService } from '@/lib/storage/storageService';
import { toast } from '@/hooks/use-toast';
import { downloadBlob } from '@/lib/utils';

interface SessionStats {
  total: number;
  active: number;
  paused: number;
  completed: number;
}

const Settings = (): JSX.Element => {
  const { tSettings, tCommon } = useTranslation();
  const navigate = useNavigate();

  // Accessibility settings - using storage hooks for automatic persistence
  const [motionReduced, setMotionReduced] = useStorageFlag(STORAGE_KEYS.MOTION_REDUCED, false);
  const [soundVolume, setSoundVolume] = useStorageState(STORAGE_KEYS.SOUND_VOLUME, 0.16);
  const [hintsEnabled, setHintsEnabled] = useStorageFlag(STORAGE_KEYS.HINTS_ENABLED, true);
  const [highContrast, setHighContrast] = useStorageFlag(STORAGE_KEYS.HIGH_CONTRAST, false);
  const [quietRewards, setQuietRewards] = useStorageFlag(STORAGE_KEYS.QUIET_REWARDS, false);

  // Detector configuration
  const [detectorType, setDetectorType] = useStorageState(
    STORAGE_KEYS.EMOTION_DETECTOR_TYPE,
    'faceapi-worker',
  );

  // Adult mode PIN
  const [adultPin, setAdultPin] = useStorageState(STORAGE_KEYS.ADULT_PIN, '1234');
  const [verifiedUntil, setVerifiedUntil] = useStorageState<number | null>(
    STORAGE_KEYS.ADULT_PIN_VERIFIED_UNTIL,
    null,
    {
      deserialize: (value) => {
        const n = Number(JSON.parse(value));
        return Number.isFinite(n) ? n : null;
      },
    },
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [footprint, setFootprint] = useState<Array<{ key: string; bytes: number }>>([]);
  const [isDataActionBusy, setIsDataActionBusy] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>(() =>
    storageService.getSessionStats(),
  );

  const removeCalibration = useStorageRemove(STORAGE_KEYS.EMOTION_CALIBRATION);

  const handleExportSnapshot = async () => {
    setIsDataActionBusy(true);
    try {
      const snapshot = storageService.exportSnapshot();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
        type: 'application/json',
      });
      const filename = `kreativium_snapshot_${new Date().toISOString().split('T')[0]}.json`;
      downloadBlob(blob, filename);
      toast.success('Lokal kopi eksportert');
    } catch (error) {
      toast.error('Kunne ikke eksportere snapshot');
    } finally {
      setIsDataActionBusy(false);
    }
  };

  const handleSnapshotImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsDataActionBusy(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      storageService.importSnapshot(parsed);
      toast.success('Data importert lokalt');
      window.location.reload();
    } catch (error) {
      toast.error('Kunne ikke importere filen');
    } finally {
      setIsDataActionBusy(false);
      event.target.value = '';
    }
  };

  const handleClearLocalData = () => {
    const confirmed = window.confirm(
      'Dette sletter all lokal lagring for Kreativium på denne enheten. Vil du fortsette?',
    );
    if (!confirmed) return;
    storageService.clearAll();
    toast.success('All lokal data er slettet');
    window.location.reload();
  };

  const handleFootprintCheck = () => {
    setFootprint(storageService.footprint());
  };

  const refreshSessionStats = () => {
    setSessionStats(storageService.getSessionStats());
  };

  const handleWipeLocalSessions = () => {
    const confirmed = window.confirm(
      'Denne handlingen sletter alle lokale økter. Dataen beholdes i backup dersom du har eksportert det. Fortsette?',
    );
    if (!confirmed) return;
    storageService.clearSessions();
    refreshSessionStats();
    setFootprint(storageService.footprint());
    toast.success('Lokale økter fjernet');
  };

  const totalFootprint = footprint.reduce((sum, entry) => sum + entry.bytes, 0);

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
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/reports')}
                  data-testid="settings-link-reports"
                >
                  {String(tSettings('data.export'))}
                </Button>
              </li>
            </ul>
          </aside>

          <section className="md:col-span-3 space-y-4">
            <Card className="bg-gradient-card border-0 shadow-soft">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-semibold">
                  {String(
                    tCommon('settings.accessibility', { defaultValue: 'Accessibility & Motion' }),
                  )}
                </h2>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {String(tCommon('settings.motion', { defaultValue: 'Reduce motion' }))}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {String(
                        tCommon('settings.motionDesc', {
                          defaultValue: 'Limit animations and confetti',
                        }),
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={motionReduced}
                    onCheckedChange={(v) => {
                      setMotionReduced(v);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {String(tCommon('settings.sound', { defaultValue: 'Sound volume' }))}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {String(
                        tCommon('settings.soundDesc', {
                          defaultValue: 'Success and level-up effects',
                        }),
                      )}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={soundVolume}
                    onChange={(e) => {
                      setSoundVolume(Number(e.target.value));
                    }}
                    aria-label={String(tCommon('settings.sound'))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {String(tCommon('settings.hints', { defaultValue: 'Enable hints' }))}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {String(
                        tCommon('settings.hintsDesc', {
                          defaultValue: 'Allow in-round hint prompts',
                        }),
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={hintsEnabled}
                    onCheckedChange={(v) => {
                      setHintsEnabled(v);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {String(tCommon('settings.highContrast', { defaultValue: 'High contrast' }))}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {String(
                        tCommon('settings.highContrastDesc', {
                          defaultValue: 'Increase contrast for legibility',
                        }),
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={highContrast}
                    onCheckedChange={(v) => {
                      setHighContrast(v);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {String(tCommon('settings.quietRewards', { defaultValue: 'Quiet rewards' }))}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {String(
                        tCommon('settings.quietRewardsDesc', {
                          defaultValue: 'Use subtle visuals instead of sounds',
                        }),
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={quietRewards}
                    onCheckedChange={(v) => {
                      setQuietRewards(v);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {String(tCommon('settings.detector', { defaultValue: 'Detector' }))}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {String(
                        tCommon('settings.detectorDesc', {
                          defaultValue: 'Choose detection backend (requires reload)',
                        }),
                      )}
                    </div>
                  </div>
                  <select
                    value={detectorType}
                    onChange={(e) => {
                      setDetectorType(e.target.value);
                    }}
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
                    <div className="font-medium">
                      {String(tCommon('settings.calibration', { defaultValue: 'Calibration' }))}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {String(
                        tCommon('settings.calibrationDesc', {
                          defaultValue: 'Reset and re-run calibration flow',
                        }),
                      )}
                    </div>
                  </div>
                  <Button variant="outline" onClick={removeCalibration}>
                    {String(tCommon('settings.resetCalibration', { defaultValue: 'Reset' }))}
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-card border-0 shadow-soft">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-semibold">
                  {String(tCommon('settings.adultPin', { defaultValue: 'Adult PIN' }))}
                </h2>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="adult-pin">
                    PIN
                  </label>
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
                    {verifiedUntil
                      ? `${String(tCommon('settings.unlockedUntil', { defaultValue: 'Unlocked until' }))} ${new Date(verifiedUntil).toLocaleTimeString()}`
                      : String(tCommon('settings.locked', { defaultValue: 'Locked' }))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      /* PIN automatically saved via useStorageState */
                    }}
                  >
                    {String(tCommon('buttons.save', { defaultValue: 'Save' }))}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setVerifiedUntil(null);
                    }}
                  >
                    {String(
                      tCommon('settings.resetVerification', { defaultValue: 'Reset verification' }),
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAdultPin('1234');
                    }}
                  >
                    {String(tCommon('settings.setDefaultPin', { defaultValue: 'Set 1234' }))}
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-card border-0 shadow-soft">
              <CardContent className="p-6 space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">{tSettings('data.title')}</h2>
                  <p className="text-sm text-muted-foreground">
                    {tSettings('dataExport.description')}
                  </p>
                </div>
                <div>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/reports')}
                    aria-label={tSettings('data.export')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {String(tSettings('data.export'))}
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Button onClick={handleExportSnapshot} disabled={isDataActionBusy}>
                    Eksporter lokalt
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isDataActionBusy}
                  >
                    Importer fil
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleClearLocalData}
                    disabled={isDataActionBusy}
                  >
                    Tøm lokal data
                  </Button>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Lokal lagringsfotavtrykk</p>
                    <Button variant="ghost" size="sm" onClick={handleFootprintCheck}>
                      Oppdater
                    </Button>
                  </div>
                  {footprint.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Ingen nøkler å vise enda. Trykk «Oppdater» for å hente oversikt.
                    </p>
                  ) : (
                    <div className="mt-2 max-h-32 overflow-auto rounded-lg border bg-background/70 text-xs divide-y">
                      {footprint.map((entry) => (
                        <div
                          key={entry.key}
                          className="flex items-center justify-between px-3 py-1"
                        >
                          <span className="truncate pr-2">{entry.key}</span>
                          <span>{(entry.bytes / 1024).toFixed(1)} KB</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-3 py-1 font-semibold">
                        <span>Totalt</span>
                        <span>{(totalFootprint / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-0 shadow-soft">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Lokale økter & analytics</h2>
                    <p className="text-sm text-muted-foreground">
                      Alle writer-operations går via `storageService` og emittes på storage events. Analytics caches
                      invalidates automatisk via `ensureSessionAnalyticsBridge`.
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={refreshSessionStats}>
                    Oppdater status
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">Totale økter</p>
                    <p className="text-xl font-semibold">{sessionStats.total}</p>
                  </div>
                  <div className="rounded-lg border bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">Aktive</p>
                    <p className="text-xl font-semibold">{sessionStats.active}</p>
                  </div>
                  <div className="rounded-lg border bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">Utkast (pauset)</p>
                    <p className="text-xl font-semibold">{sessionStats.paused}</p>
                  </div>
                  <div className="rounded-lg border bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">Fullførte</p>
                    <p className="text-xl font-semibold">{sessionStats.completed}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={refreshSessionStats}>Oppdater statistikk</Button>
                  <Button variant="outline" onClick={handleFootprintCheck}>
                    Oppdater foot-print
                  </Button>
                  <Button variant="destructive" onClick={handleWipeLocalSessions}>
                    Slett lokale økter
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Bruk eksport/import til å fullføre backup. Hvis du trenger å fjerne kun sesjoner (for eksempel før
                  demonstrasjoner), trykk «Slett lokale økter» – studentdata og analytics cache forblir intakt fordi
                  `storageService` bare berører `sessions`-nøkkelen.
                </p>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleSnapshotImport}
      />
    </div>
  );
};

export default Settings;
