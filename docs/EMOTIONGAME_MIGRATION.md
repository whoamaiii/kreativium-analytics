# EmotionGame State Migration Guide

## Overview

This guide documents the migration of EmotionGame from 26+ `useState` hooks to a single `useGameState` reducer-based state machine.

## Before: The Problem

```typescript
// EmotionGame.tsx (906 lines, 26 useState calls)
const [worldIndex, setWorldIndex] = useState<number>(...);
const [cameraActive, setCameraActive] = useState<boolean>(false);
const [usedHint, setUsedHint] = useState<boolean>(false);
const [combo, setCombo] = useState<number>(1);
const [roundTimerMs, setRoundTimerMs] = useState<number>(0);
const [timerActive, setTimerActive] = useState<boolean>(false);
const [hints, setHints] = useState<HintsState>(...);
const [showTutorial, setShowTutorial] = useState<boolean>(...);
const [showCalibration, setShowCalibration] = useState<boolean>(...);
const [showLevelComplete, setShowLevelComplete] = useState<boolean>(false);
const [showStickerBook, setShowStickerBook] = useState<boolean>(false);
const [themeId, setThemeId] = useState<'regnbueland' | 'rom'>(...);
const [showWorldBanner, setShowWorldBanner] = useState<boolean>(false);
const [mode, setMode] = useState<GameMode>(...);
const [practice, setPractice] = useState<PracticeMode>(...);
const [effectParams, setEffectParams] = useState<EffectParams>(...);
const [lastPerfect, setLastPerfect] = useState<boolean>(false);
const [showConfidencePrompt, setShowConfidencePrompt] = useState<boolean>(false);
const [confidenceValue, setConfidenceValue] = useState<number>(0.7);
const [showSummary, setShowSummary] = useState<...>(null);
const [difficulty, setDifficulty] = useState<DifficultyState>(...);
const [levelUpVisible, setLevelUpVisible] = useState<boolean>(false);
const [fpsBuckets, setFpsBuckets] = useState<Record<string, number>>({});
// ... and more
```

**Problems:**
- 26 separate useState calls = complex state dependencies
- Difficult to reason about state transitions
- Hard to test (component-level testing required)
- Performance issues from cascading setState calls
- No single source of truth

## After: The Solution

```typescript
// EmotionGame.tsx (simplified)
import { useGameState } from '@/hooks/useGameState';

export default function EmotionGame() {
  const { state, dispatch, incrementCombo, useHint, completeRound } = useGameState();

  // Access state
  const combo = state.combo;
  const showTutorial = state.showTutorial;
  const difficulty = state.difficulty;

  // Update state
  dispatch({ type: 'INCREMENT_COMBO' });
  dispatch({ type: 'SHOW_TUTORIAL', payload: false });
  incrementCombo(); // helper function

  // ...
}
```

**Benefits:**
- Single state object = predictable state transitions
- Testable pure reducer function
- Better performance (batched updates)
- Type-safe actions with discriminated unions
- Centralized state logic

## Migration Steps

### Step 1: Replace Simple State Updates

**Before:**
```typescript
const [combo, setCombo] = useState<number>(1);
setCombo(combo + 1);
```

**After:**
```typescript
const { state, dispatch } = useGameState();
dispatch({ type: 'INCREMENT_COMBO' });
// Or use helper
incrementCombo();
```

### Step 2: Replace Boolean Flags

**Before:**
```typescript
const [showTutorial, setShowTutorial] = useState<boolean>(true);
setShowTutorial(false);
```

**After:**
```typescript
const { state, dispatch } = useGameState();
dispatch({ type: 'SHOW_TUTORIAL', payload: false });
```

### Step 3: Replace Complex Object Updates

**Before:**
```typescript
const [difficulty, setDifficulty] = useState({ threshold: 0.6, holdMs: 900, streak: 0 });
setDifficulty({ ...difficulty, threshold: 0.75, streak: 5 });
```

**After:**
```typescript
const { state, dispatch } = useGameState();
dispatch({
  type: 'SET_DIFFICULTY',
  payload: { threshold: 0.75, streak: 5 }
});
```

### Step 4: Replace Compound Updates

**Before:**
```typescript
setRoundTimerMs(0);
setTimerActive(true);
setUsedHint(false);
setShowSummary(null);
setLastPerfect(false);
```

**After:**
```typescript
dispatch({ type: 'START_NEW_ROUND' });
// Or use helper
startNewRound();
```

## Complete Action Reference

### Progress Actions
- `SET_WORLD_INDEX` - Change current world
- `SET_COMBO` - Set combo value directly
- `INCREMENT_COMBO` - Increment combo by 1
- `RESET_COMBO` - Reset combo to 1
- `SET_MODE` - Change game mode (classic/zen/timed)
- `SET_PRACTICE` - Change practice mode

### UI Modal Actions
- `SHOW_TUTORIAL` - Show/hide tutorial overlay
- `SHOW_CALIBRATION` - Show/hide calibration overlay
- `SHOW_LEVEL_COMPLETE` - Show/hide level complete modal
- `SHOW_STICKER_BOOK` - Show/hide sticker collection
- `SHOW_WORLD_BANNER` - Show/hide world transition banner
- `SHOW_CONFIDENCE_PROMPT` - Show/hide confidence adjustment
- `SHOW_SUMMARY` - Show/hide round summary card
- `SHOW_LEVEL_UP` - Show/hide level up animation

### Round State Actions
- `SET_ROUND_TIMER` - Update round timer (ms)
- `START_TIMER` - Start the round timer
- `STOP_TIMER` - Stop the round timer
- `SET_DIFFICULTY` - Update difficulty parameters
- `USE_HINT` - Consume a hint (decrements count)
- `RESET_HINT_FLAG` - Reset the "used hint this round" flag

### Effects Actions
- `SET_EFFECT_PARAMS` - Update visual effect parameters
- `SET_LAST_PERFECT` - Mark if last round was perfect
- `RELOAD_HINTS` - Reload hint count

### Settings Actions
- `SET_THEME` - Change visual theme
- `SET_CAMERA_ACTIVE` - Enable/disable camera

### Performance Actions
- `UPDATE_FPS_BUCKETS` - Update FPS histogram
- `SET_CONFIDENCE_VALUE` - Update confidence threshold

### Compound Actions
- `START_NEW_ROUND` - Reset all round-specific state
- `COMPLETE_ROUND` - Handle round completion (updates combo, shows summary)
- `RESET_GAME` - Reset entire game state

## Migration Patterns

### Pattern 1: Simple Value Update

```typescript
// Before
setCombo(10);

// After
dispatch({ type: 'SET_COMBO', payload: 10 });
```

### Pattern 2: Toggle Boolean

```typescript
// Before
setShowTutorial(!showTutorial);

// After
dispatch({ type: 'SHOW_TUTORIAL', payload: !state.showTutorial });
```

### Pattern 3: Increment/Decrement

```typescript
// Before
setCombo(combo + 1);

// After
dispatch({ type: 'INCREMENT_COMBO' });
// Or
incrementCombo();
```

### Pattern 4: Multiple Related Updates

```typescript
// Before
setLastPerfect(true);
setCombo(combo + 1);
setShowSummary({ visible: true, timeMs: 4500 });

// After
completeRound(true, 4500);
```

### Pattern 5: Partial Object Update

```typescript
// Before
setEffectParams({ ...effectParams, particleCount: 100 });

// After
dispatch({
  type: 'SET_EFFECT_PARAMS',
  payload: { particleCount: 100 }
});
```

## Testing Examples

### Testing the Reducer

```typescript
import { gameReducer, createInitialGameState } from '@/hooks/useGameState';

it('increments combo correctly', () => {
  const state = createInitialGameState();
  const newState = gameReducer(state, { type: 'INCREMENT_COMBO' });

  expect(newState.combo).toBe(2);
  expect(newState).not.toBe(state); // immutability check
});

it('completes round with perfect score', () => {
  const state = { ...createInitialGameState(), combo: 5 };
  const newState = gameReducer(state, {
    type: 'COMPLETE_ROUND',
    payload: { perfect: true, timeMs: 4500 }
  });

  expect(newState.lastPerfect).toBe(true);
  expect(newState.combo).toBe(6);
  expect(newState.showSummary?.timeMs).toBe(4500);
});
```

### Testing the Hook

```typescript
import { renderHook, act } from '@testing-library/react';
import { useGameState } from '@/hooks/useGameState';

it('increments combo using helper', () => {
  const { result } = renderHook(() => useGameState());

  act(() => {
    result.current.incrementCombo();
  });

  expect(result.current.state.combo).toBe(2);
});
```

## Performance Improvements

### Before: Cascading Updates
```typescript
// 5 separate state updates = 5 re-renders
setRoundTimerMs(0);        // render 1
setTimerActive(true);      // render 2
setUsedHint(false);        // render 3
setShowSummary(null);      // render 4
setLastPerfect(false);     // render 5
```

### After: Single Update
```typescript
// 1 state update = 1 re-render
dispatch({ type: 'START_NEW_ROUND' });
```

**Result:** 80% reduction in re-renders for compound operations

## Gradual Migration Strategy

1. **Phase 1**: Add useGameState alongside existing useState hooks
2. **Phase 2**: Migrate UI modals (low risk, high visibility)
3. **Phase 3**: Migrate progress tracking (combo, world, mode)
4. **Phase 4**: Migrate round state and timers
5. **Phase 5**: Remove old useState hooks
6. **Phase 6**: Add persistence middleware (localStorage sync)

## Backwards Compatibility

The new hook **does not break** existing code. You can:
- Use both systems in parallel during migration
- Migrate incrementally, one feature at a time
- Keep existing useState hooks for state not in the reducer

## Next Steps

1. Review and test the new `useGameState` hook
2. Start migration with low-risk UI modals
3. Gradually replace useState calls
4. Add integration tests
5. Monitor performance improvements
6. Document any edge cases discovered

## Resources

- `src/hooks/useGameState.ts` - State machine implementation
- `src/hooks/__tests__/useGameState.test.ts` - Comprehensive tests (450+ lines)
- Original component: `src/pages/EmotionGame.tsx` (906 lines)

## Questions?

If you encounter any issues during migration:
1. Check if the action exists in `GameAction` type
2. Verify payload shape matches action definition
3. Test reducer function in isolation
4. Review test file for usage examples
