# ShadcN Integration - Quick Reference

## What Was Found

Your shadcn/ui integration is **7/10** - good overall, but with some gaps to fix.

---

## Critical Issues (2) - Fix ASAP

### 1. Dropdown Menu Missing Exports (5 min fix)

```typescript
// File: src/components/ui/dropdown-menu.tsx
// Lines 182-189
// ADD to exports:
export {
  // ... existing exports ...
  DropdownMenuCheckboxItem, // MISSING
  DropdownMenuRadioItem, // MISSING
  DropdownMenuLabel, // MISSING
  DropdownMenuShortcut, // MISSING
  DropdownMenuGroup, // MISSING
  DropdownMenuSub, // MISSING
  DropdownMenuSubContent, // MISSING
  DropdownMenuSubTrigger, // MISSING
  DropdownMenuPortal, // MISSING
  DropdownMenuRadioGroup, // MISSING
};
```

### 2. Select Menu Missing Exports (5 min fix)

```typescript
// File: src/components/ui/select.tsx
// Lines 147-154
// ADD to exports:
export {
  // ... existing exports ...
  SelectGroup, // MISSING
  SelectLabel, // MISSING
  SelectSeparator, // MISSING
  SelectScrollUpButton, // MISSING
  SelectScrollDownButton, // MISSING
};
```

---

## High Priority Issues (2) - Fix This Week

### 3. LevelCompleteModal - Use Dialog Instead (30-45 min)

```typescript
// File: src/components/game/LevelCompleteModal.tsx
// Current: Custom modal with manual a11y
// Problem: No Escape key, no focus trap, inconsistent
// Solution: Use shadcn Dialog (see SHADCN_FIXES.md for full code)
```

### 4. LevelUpModal - Use Dialog Instead (30-45 min)

```typescript
// File: src/components/game/LevelUpModal.tsx
// Current: Custom modal with manual a11y
// Problem: Same as LevelCompleteModal
// Solution: Use shadcn Dialog (see SHADCN_FIXES.md for full code)
```

---

## Medium Priority Issues (3) - Improve Quality

### 5. Document Custom Tailwind Classes (15 min)

These custom classes need to be in `tailwind.config.js`:

- `gradient-primary` - custom gradient
- `shadow-soft`, `shadow-glow` - custom shadows
- `shadow-medium` - medium shadow
- `gradient-glass` - glass effect
- `animate-fade-in` - fade animation
- `glass-card` - card glass effect

### 6. Clean Button Variant Customization (15 min)

**File**: `src/components/ui/button-variants.ts` Decide: Keep customizations but document them, or
simplify?

### 7. Clean Card Component Customization (15 min)

**File**: `src/components/ui/card.tsx` line 12 Remove `glass-card` and `animate-fade-in` from base
component, apply at usage sites instead.

---

## Optional Improvements (1)

### 8. Simplify Dialog Registry (20-30 min) - Optional

**File**: `src/components/ui/dialog.tsx` lines 10-46 Current complex registry can be simplified to
just include fallback title.

---

## What's Good (No Changes Needed)

1. ✓ Component patterns follow shadcn conventions
2. ✓ Proper use of forwardRef and cn()
3. ✓ Good a11y practices (ARIA attributes, portals)
4. ✓ Consistent displayName usage
5. ✓ Good examples: ExportDialog, StudentProfileSidebar
6. ✓ Custom Breadcrumbs is well-implemented
7. ✓ Consistent icon usage (Lucide)

---

## Implementation Priority

```
WEEK 1:
┌─ Monday   → Fix dropdown exports (5 min) + select exports (5 min)
├─ Tuesday  → Start LevelCompleteModal refactor
├─ Wednesday→ Finish LevelCompleteModal (+ tests)
├─ Thursday → Complete LevelUpModal refactor (+ tests)
└─ Friday   → Polish & a11y verification

WEEK 2:
┌─ Monday   → Document Tailwind classes + update config
├─ Tuesday  → Review button variant customization
├─ Wednesday→ Review card customization
├─ Thursday → (Optional) Simplify dialog registry
└─ Friday   → Full regression testing
```

---

## File Locations

| File                                         | Issue               | Type     |
| -------------------------------------------- | ------------------- | -------- |
| `src/components/ui/dropdown-menu.tsx`        | Incomplete exports  | Critical |
| `src/components/ui/select.tsx`               | Incomplete exports  | Critical |
| `src/components/game/LevelCompleteModal.tsx` | Custom modal        | High     |
| `src/components/game/LevelUpModal.tsx`       | Custom modal        | High     |
| `src/components/ui/button-variants.ts`       | Custom classes      | Medium   |
| `src/components/ui/card.tsx`                 | Custom classes      | Medium   |
| `src/components/ui/dialog.tsx`               | Complex code        | Medium   |
| `tailwind.config.js`                         | Missing definitions | Medium   |

---

## Documentation Files

1. **SHADCN_INTEGRATION_SUMMARY.md** - You are here (this file)
2. **SHADCN_ANALYSIS.md** - Detailed analysis of all issues
3. **SHADCN_FIXES.md** - Before/after code examples
4. **SHADCN_QUICK_REFERENCE.md** - Quick lookup (this file)

---

## Quick Checklist

- [ ] Read SHADCN_ANALYSIS.md for details
- [ ] Read SHADCN_FIXES.md for code examples
- [ ] Fix dropdown-menu exports
- [ ] Fix select exports
- [ ] Refactor LevelCompleteModal to use Dialog
- [ ] Refactor LevelUpModal to use Dialog
- [ ] Document custom Tailwind classes
- [ ] Run tests: npm test
- [ ] Run a11y tests: npm run e2e:a11y
- [ ] Verify on mobile

---

## Tips for Implementation

1. **Start small**: Fix exports first (10 minutes total)
2. **Use examples**: Copy patterns from ExportDialog
3. **Test immediately**: Each change should be tested
4. **Reference code**: All fixes have before/after in SHADCN_FIXES.md
5. **Ask questions**: If unclear, check the detailed analysis

---

## Need Help?

- **Code examples?** → See SHADCN_FIXES.md
- **Why this matters?** → See SHADCN_ANALYSIS.md
- **What should I do?** → See SHADCN_INTEGRATION_SUMMARY.md
- **Radix UI docs?** → https://www.radix-ui.com/
- **ShadcN docs?** → https://ui.shadcn.com/
