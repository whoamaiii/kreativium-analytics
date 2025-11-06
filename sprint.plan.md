<!-- b37f9d6e-f734-4a3f-933f-0cacd1d8dfdc dd933af4-1941-42a2-81a8-fc882fafa8ec -->
# Sprint 1 Foundations: Workerized Detector, Calibration, Ring-on-Face, Tutorial

## What we’ll deliver

- Worker-based detector behind a clean `Detector` interface (swappable FaceAPI/MediaPipe).
- 10–15s calibration flow to set per-device thresholds and smoothing.
- Progress ring anchored to face box with an “Almost there” halo.
- Tutorial/onboarding overlay for first run.
- Celebration timing polish (ring morph → banner → confetti) with motion-reduce/ARIA.
- Settings toggles: motion, audio volume, threshold assist.

## Key existing code to integrate with

```77:101:src/hooks/useExpressionDetector.ts
const results = await faceapi
  .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold }))
  .withFaceExpressions();

let box: DetectionBox | null = null;
let probabilities: Record<string, number> = {};
let topLabel = 'neutral';
let topProbability = 0;

if (largest) {
  const b = largest.box;
  box = { x: b.x, y: b.y, width: b.width, height: b.height };
  probabilities = largest.expressions as unknown as Record<string, number>;
  for (const [k, v] of Object.entries(probabilities)) {
    if (v > topProbability) { topProbability = v; topLabel = k; }
  }
}
```



```182:201:src/pages/EmotionGame.tsx
<div className="relative">
  <video ref={videoRef} className="w-full h-auto rounded-lg" playsInline muted />
  <ScanSweep active={!detector.ready || game.phase === 'prompt'} />
  {/* Animated ring */}
  <div className="absolute right-4 bottom-4">
    <AnimatedProgressRing size={96} stroke={8} progress={holdState.progress} />
  </div>
  {/* Reward banner near camera */}
  <RewardBanner visible={game.phase === 'reward'} stars={game.metrics.stars || 1} xpGained={game.metrics.stars ? (10 + Math.max(0, (game.metrics.stars - 1) * 3) + Math.min(game.metrics.streak * 2, 10)) : undefined} />
  <AlmostThereHint visible={game.phase === 'detecting' && !!game.round && ((detector.probabilities as Record<string, number>)[game.round.target] ?? 0) >= (game.round.threshold * 0.8)} />
  {/* Debug HUD to visualize detector readiness and target probability */}
```



```45:58:src/components/game/AnimatedProgressRing.tsx
return (
  <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`progress ${(clamped * 100).toFixed(0)}%`} className={className}>
    <circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={stroke} fill="none" />
    <motion.circle
      cx={size / 2}
      cy={size / 2}
      r={radius}
      stroke={strokeColor}
      strokeWidth={stroke}
      fill="none"
      strokeLinecap="round"
      transform={`rotate(-90 ${size / 2} ${size / 2})`}
      style={{ strokeDasharray: dashArray }}
    />
```

## Implementation outline

1) Detector architecture

- Create `src/detector/types.ts` with `Detector` interface and `DetectorSnapshot` shape (align to current snapshot from `useExpressionDetector`).
- Add `src/detector/faceapi.detector.ts` (main-thread) to preserve `EmotionLab` behavior.
- Add `src/workers/detector.worker.ts` implementing FaceAPI with tfjs wasm backend, consuming `ImageBitmap` frames; post snapshot messages.
- Add `src/detector/worker.detector.ts` that abstracts worker messaging and adaptive FPS (15–24fps target) with health checks.
- Optional: scaffold `src/detector/mediapipe.detector.ts` (behind flag) with identical contract for later swap.

2) Hook integration

- Add `src/hooks/useDetector.ts` returning the same shape as `useExpressionDetector`, choosing worker when supported, falling back to faceapi main-thread.
- Migrate `src/pages/EmotionGame.tsx` to use `useDetector` with existing smoothing and `useHoldTimer` logic.
- Keep `src/hooks/useExpressionDetector.ts` for `EmotionLab` and deprecate usage in game.

3) Calibration and adaptive thresholds

- Add `src/hooks/useCalibration.ts` with a guided 10–15s flow: neutral baseline, lighting check, recommended `threshold`, `holdMs`, and smoothing window.
- Persist per-device calibration to `localStorage` (keyed by `emotion.calibration.v1`). Provide reset in Settings.
- On `EmotionGame` start, if no calibration, show `CalibrationOverlay` modal to run once.

4) Ring-on-face overlay

- Add `src/components/game/FaceOverlay.tsx` that renders: face box, subtle tracking dots (if landmarks available), progress ring anchored to box center, and an “Almost there” halo when ≥80% of threshold.
- Replace the bottom-right ring in `EmotionGame` with `FaceOverlay` layered over the video.

5) Tutorial/onboarding overlay

- Add `src/components/game/TutorialOverlay.tsx` with 3-step tips; store `emotion.tutorialSeen=true` in `localStorage`.
- Show on first run or via a Help button.

6) Celebration orchestration

- Add `src/hooks/useCelebrations.ts` to time: ring morph at success, small stars pop, banner slide, then `ConfettiBurst`.
- Respect `prefers-reduced-motion`; add `aria-live="polite"` on success banner; expose a haptics toggle.

7) Settings & accessibility

- Expand `src/pages/Settings.tsx` with toggles: Motion, Sound volume, Enable hints, Reset calibration.
- Add i18n keys for tutorial/calibration text under `src/locales/**`.

## Files to add

- `src/detector/types.ts`
- `src/detector/faceapi.detector.ts`
- `src/detector/worker.detector.ts`
- `src/detector/mediapipe.detector.ts` (scaffold)
- `src/workers/detector.worker.ts`
- `src/hooks/useDetector.ts`
- `src/hooks/useCalibration.ts`
- `src/components/game/FaceOverlay.tsx`
- `src/components/game/TutorialOverlay.tsx`

## Files to edit

- `src/pages/EmotionGame.tsx` (switch hook, add overlays, celebration timings)
- `src/pages/EmotionLab.tsx` (optional: lab toggle to use worker)
- `src/components/game/RewardBanner.tsx` (ARIA live)
- `src/components/game/AnimatedProgressRing.tsx` (optional: halo prop)
- `src/pages/Settings.tsx` (new toggles)
- `src/locales/en/common.json`, `src/locales/nb/common.json` (tutorial/calibration)
- `vite.config.ts` (no change likely; worker bundling already configured similar to analytics/reports workers)

## Testing

- Unit: detector adapter contract (mock worker), hold timer edge cases, calibration math.
- Integration: `EmotionGame` happy path (prompt → detecting → success → reward), overlay positions, reduced-motion behavior.
- Performance: keep ≥14 fps on mid devices by throttling worker analyze loop.
- Accessibility: `axe` pass on overlays, ARIA live announcements.

## Acceptance

- With camera on, `EmotionGame` runs detection from worker by default; falls back gracefully.
- First-run calibration produces updated thresholds and smoothing that persist across reloads.
- Progress ring visibly tracks around the face box, halo at near-threshold.
- Tutorial shows once with localized copy; can be re-opened.
- Celebrations feel responsive and respect motion/volume settings.

### To-dos

- [x] Create detector interface and snapshot types under src/detector/types.ts
- [x] Build detector.worker and worker.detector with adaptive FPS + messaging
- [x] Add useDetector hook; swap EmotionGame to use it
- [x] Create useCalibration + CalibrationOverlay; persist results
- [x] Implement FaceOverlay anchored to face box with halo
- [x] Introduce useCelebrations and sequence ring→banner→confetti
- [x] Add 3-step TutorialOverlay with i18n and persistence
- [x] Add motion, audio, hints, reset calibration to Settings page
- [x] Add ARIA live, focus order, reduced-motion guards
- [x] Add unit/integration/perf and axe checks for new flows



