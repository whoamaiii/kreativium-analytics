# ShadcN Integration - Code Fix Examples

## Fix 1: Complete Dropdown Menu Exports

### Current Code (INCOMPLETE)
**File**: `src/components/ui/dropdown-menu.tsx` (lines 182-189)
```typescript
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  
}
```

### Fixed Code
```typescript
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuRadioGroup,
}
```

---

## Fix 2: Complete Select Exports

### Current Code (INCOMPLETE)
**File**: `src/components/ui/select.tsx` (lines 147-154)
```typescript
export {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  
}
```

### Fixed Code
```typescript
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
```

---

## Fix 3: Refactor Custom Modal to Use Dialog

### Current Code (LevelCompleteModal)
**File**: `src/components/game/LevelCompleteModal.tsx`
```typescript
import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ConfettiBurst } from '@/components/game/ConfettiBurst';
import { StickerMachine } from '@/components/game/StickerMachine';
import { playLevelUpFanfare } from '@/lib/sound';
import { useTranslation } from '@/hooks/useTranslation';

interface LevelCompleteModalProps {
  visible: boolean;
  onClose?: () => void;
  onNext?: () => void;
  onReplay?: () => void;
  onFreePlay?: () => void;
  onPayout?: (stickerId: string) => void;
}

export function LevelCompleteModal({ 
  visible, 
  onClose, 
  onNext, 
  onReplay, 
  onFreePlay, 
  onPayout 
}: LevelCompleteModalProps) {
  const { tCommon } = useTranslation();
  
  useEffect(() => {
    if (!visible) return;
    try { playLevelUpFanfare(0.18); } catch {}
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div 
          className="fixed inset-0 z-50 grid place-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={onClose} 
          />
          <ConfettiBurst 
            active={true} 
            durationMs={1500} 
            particles={220} 
            className="absolute inset-0" 
          />
          <motion.div
            className="relative z-10 w-[min(94vw,560px)] rounded-3xl bg-gradient-to-b from-[#150b2e] to-[#0d0a16] border border-white/10 p-6 text-center text-white shadow-2xl"
            initial={{ scale: 0.9, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, y: 8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            role="dialog"
            aria-modal="true"
            aria-label={String(tCommon('game.complete.title', { defaultValue: 'Nivå fullført!' }))}
          >
            <div className="text-4xl font-extrabold tracking-tight">
              {String(tCommon('game.complete.title', { defaultValue: 'Nivå fullført!' }))}
            </div>
            <div className="mt-2 text-foreground/80">
              {String(tCommon('game.complete.desc', { defaultValue: 'Bra jobbet! Hent premien din og velg hva du vil gjøre videre.' }))}
            </div>

            <div className="mt-4">
              <StickerMachine visible={true} onPayout={onPayout} />
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button 
                className="rounded-xl bg-white/10 hover:bg-white/15 px-4 py-3 transition" 
                onClick={onNext}
              >
                {String(tCommon('game.complete.next', { defaultValue: 'Neste nivå' }))}
              </button>
              <button 
                className="rounded-xl bg-white/10 hover:bg-white/15 px-4 py-3 transition" 
                onClick={onReplay}
              >
                {String(tCommon('game.complete.replay', { defaultValue: 'Øv igjen' }))}
              </button>
              <button 
                className="rounded-xl bg-white/10 hover:bg-white/15 px-4 py-3 transition" 
                onClick={onFreePlay}
              >
                {String(tCommon('game.complete.free', { defaultValue: 'Frilek' }))}
              </button>
            </div>
            <button 
              className="mt-5 text-sm text-white/70 hover:text-white" 
              onClick={onClose}
            >
              {String(tCommon('buttons.close'))}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### Refactored Code (Using Dialog + Framer Motion)
```typescript
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ConfettiBurst } from '@/components/game/ConfettiBurst';
import { StickerMachine } from '@/components/game/StickerMachine';
import { playLevelUpFanfare } from '@/lib/sound';
import { useTranslation } from '@/hooks/useTranslation';

interface LevelCompleteModalProps {
  visible: boolean;
  onClose?: () => void;
  onNext?: () => void;
  onReplay?: () => void;
  onFreePlay?: () => void;
  onPayout?: (stickerId: string) => void;
}

export function LevelCompleteModal({ 
  visible, 
  onClose, 
  onNext, 
  onReplay, 
  onFreePlay, 
  onPayout 
}: LevelCompleteModalProps) {
  const { tCommon } = useTranslation();
  
  useEffect(() => {
    if (!visible) return;
    try { playLevelUpFanfare(0.18); } catch {}
  }, [visible]);

  return (
    <Dialog open={visible} onOpenChange={onClose}>
      <DialogContent 
        asChild
        className="p-0 border-0 bg-transparent shadow-none"
      >
        <motion.div
          className="w-[min(94vw,560px)] rounded-3xl bg-gradient-to-b from-[#150b2e] to-[#0d0a16] border border-white/10 overflow-hidden"
          initial={{ scale: 0.9, y: 18, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.98, y: 8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        >
          <ConfettiBurst 
            active={true} 
            durationMs={1500} 
            particles={220} 
            className="absolute inset-0" 
          />
          
          <div className="relative z-10 p-6 text-center text-white">
            <DialogHeader>
              <DialogTitle className="text-4xl font-extrabold tracking-tight text-white">
                {String(tCommon('game.complete.title', { defaultValue: 'Nivå fullført!' }))}
              </DialogTitle>
            </DialogHeader>

            <div className="mt-2 text-foreground/80">
              {String(tCommon('game.complete.desc', { defaultValue: 'Bra jobbet! Hent premien din og velg hva du vil gjøre videre.' }))}
            </div>

            <div className="mt-4">
              <StickerMachine visible={true} onPayout={onPayout} />
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button 
                variant="outline"
                onClick={onNext}
                className="rounded-xl bg-white/10 hover:bg-white/15 border-white/20 text-white"
              >
                {String(tCommon('game.complete.next', { defaultValue: 'Neste nivå' }))}
              </Button>
              <Button 
                variant="outline"
                onClick={onReplay}
                className="rounded-xl bg-white/10 hover:bg-white/15 border-white/20 text-white"
              >
                {String(tCommon('game.complete.replay', { defaultValue: 'Øv igjen' }))}
              </Button>
              <Button 
                variant="outline"
                onClick={onFreePlay}
                className="rounded-xl bg-white/10 hover:bg-white/15 border-white/20 text-white"
              >
                {String(tCommon('game.complete.free', { defaultValue: 'Frilek' }))}
              </Button>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
```

### Key Improvements:
1. ✓ Uses Dialog primitives for proper a11y (focus management, keyboard support)
2. ✓ No manual overlay management (Dialog handles it)
3. ✓ Proper Escape key handling (built-in)
4. ✓ Focus trap automatically applied
5. ✓ Cleaner code - less manual positioning
6. ✓ Consistent with project's shadcn patterns
7. ✓ Still supports custom animations via `motion.div` and `asChild`
8. ✓ Uses Button component instead of raw `<button>`

---

## Fix 4: Clean Up Card Component

### Current Code (With Custom Classes)
**File**: `src/components/ui/card.tsx` (lines 11-14)
```typescript
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl glass-card p-6 animate-fade-in",
      className
    )}
    {...props}
  />
))
```

### Option 1: Keep Base Card Clean
```typescript
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border border-border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
```

Then apply glass effect at usage:
```typescript
<Card className="glass-card animate-fade-in">
  {/* content */}
</Card>
```

### Option 2: Create Styled Variants
```typescript
// In a separate file: card-variants.ts
import { cva } from "class-variance-authority"

export const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm",
  {
    variants: {
      variant: {
        default: "",
        glass: "glass-card backdrop-blur-sm border-white/20",
        premium: "glass-card animate-fade-in shadow-lg",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)
```

---

## Fix 5: Document Custom Tailwind Classes

### Create: `tailwind.config.js` (Add to existing config)
```javascript
module.exports = {
  theme: {
    extend: {
      backgroundColor: {
        "gradient-primary": "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
        "gradient-glass": "rgba(255, 255, 255, 0.05)",
      },
      boxShadow: {
        "soft": "0 4px 6px rgba(0, 0, 0, 0.07)",
        "glow": "0 0 20px rgba(99, 102, 241, 0.4)",
        "medium": "0 10px 15px rgba(0, 0, 0, 0.1)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
}
```

### Create: `THEME.md` Documentation
```markdown
# Theme and Customization Guide

## Custom Tailwind Classes

The following custom classes are defined in `tailwind.config.js`:

### Gradients
- `bg-gradient-primary`: Primary gradient (indigo to purple)
- `bg-gradient-glass`: Glassmorphism background

### Shadows
- `shadow-soft`: Subtle shadow for depth
- `shadow-glow`: Glowing shadow for interactive elements
- `shadow-medium`: Medium depth shadow

### Animations
- `animate-fade-in`: Smooth fade-in effect (0.3s)

## Usage Examples

```tsx
// Button with custom variant
<Button variant="premium" className="shadow-glow">
  Premium Action
</Button>

// Card with glass effect
<Card className="glass-card">
  Glass Card Content
</Card>

// Animated element
<div className="animate-fade-in">
  Fading content
</div>
```
```

---

## Fix 6: Simplify Dialog Registry (Optional)

### Current Complex Implementation
```typescript
// Lines 10-46 in dialog.tsx - lots of registry code
```

### Simplified Version
If you don't need the registry pattern, simply always include a fallback title:

```typescript
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  // Always include sr-only title and description for a11y
  // Let users override with their own DialogTitle/DialogDescription
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border/40 backdrop-blur-md bg-background/90 p-6 shadow-lg duration-200 motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=closed]:zoom-out-95 motion-safe:data-[state=open]:zoom-in-95 motion-safe:data-[state=closed]:slide-out-to-left-1/2 motion-safe:data-[state=closed]:slide-out-to-top-[48%] motion-safe:data-[state=open]:slide-in-from-left-1/2 motion-safe:data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Title className="sr-only">Dialog</DialogPrimitive.Title>
        <DialogPrimitive.Description className="sr-only">Dialog content</DialogPrimitive.Description>
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
```

This is simpler and still passes a11y requirements.

---

## Summary Table

| Issue | Effort | Impact | Status |
|-------|--------|--------|--------|
| Fix dropdown-menu exports | 5 min | High | Critical |
| Fix select exports | 5 min | High | Critical |
| Refactor LevelCompleteModal | 30 min | High | High Priority |
| Refactor LevelUpModal | 30 min | High | High Priority |
| Document custom Tailwind classes | 15 min | Medium | Medium Priority |
| Simplify Dialog registry | 20 min | Low | Optional |

