# XP Progress Bar

Animated XP bar integrated into `GameHUD`. Reflects XP gains with micro-animations and a level-up
flash, and respects reduced motion.

## Usage

```tsx
<XPProgressBar
  progress={xp / xpToNext}
  xp={xp}
  xpToNext={xpToNext}
  level={level}
  streak={streak}
  pendingDelta={delta}
  leveledUp={leveledUp}
  disableParticles={false}
/>
```

Get `delta` and `leveledUp` from `useXPGainEffects(xp, level)`; see `GameHUD.tsx` for a reference
integration.

## Accessibility

- `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.
- Respects `prefers-reduced-motion`: orbs are disabled; fill uses quick transitions.
