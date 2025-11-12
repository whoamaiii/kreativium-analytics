# Implementation Plan: Usability Improvements

## Based on Critical Analysis (USABILITY_ANALYSIS_CRITICAL.md)

**Start Date:** 2025-11-12 **Status:** In Progress

---

## PHASE 1: SIMPLIFY & FOCUS (Est. 4-6 hours)

### 1.1 Remove Unnecessary Features ✅ Starting Now

**Removing:**

- `/emotion-game` - Emotion game module
- `/emotion-lab` - Emotion lab
- `/modules/choose-right` - Choose Right game
- `/modules/name-it` - Name It module
- `/modules/calm-pause` - Calm Pause module
- `/modules/missions` - Daily Missions
- `/tegn/*` - Sign language (Tegn til Tale) entire section
- `/achievements` - Achievements page
- `/monitoring` - Calibration dashboard
- `/adult/*` - Adult overview/reports
- `/session/flow` - Session flow
- `/calibration/confidence` - Confidence calibration

**Keeping Core:**

- `/` - Dashboard
- `/add-student` - Add student
- `/student/:id` - Student profile
- `/track/:id` - Track observations
- `/settings` - Settings
- `/reports` - Reports/Export
- `/kreativium-ai` - AI (will add disclaimer/hide by default)

### 1.2 Fix Language Consistency

- Audit all components for mixed language
- Create complete translation keys
- Remove hardcoded Norwegian text
- Ensure all user-facing text uses `useTranslation`

### 1.3 Create Quick Entry Mode

- Add "Quick Track" button on dashboard
- Modal with 3-step workflow: Emotion → Intensity → Save
- Optional "Add Details" to expand to full form
- Default to quick mode for all tracking

---

## PHASE 2: ONBOARDING & GUIDANCE (Est. 3-4 hours)

### 2.1 First-Time User Experience

- Detect first visit (localStorage flag)
- Welcome modal with 3-step wizard:
  1. Welcome → "Let's add your first student"
  2. Student added → "Now let's track your first observation"
  3. Observation saved → "View your student's profile"
- Add "Help" tooltips to key buttons
- Create "Getting Started" section in dashboard

### 2.2 Role-Based Setup

- During onboarding, ask: "What best describes you?"
  - New to special education tracking
  - Experienced SPED teacher
  - Administrator/Coordinator
- Store preference and adjust UI complexity

---

## PHASE 3: MOBILE-FIRST (Est. 4-5 hours)

### 3.1 Touch-Optimized Tracking

- Increase button sizes (min 44x44px touch targets)
- Larger slider handles
- Simplified layouts for tablet portrait mode
- Test on iPad viewport (768x1024)

### 3.2 Responsive Layout Improvements

- Single column layouts for mobile
- Bottom sheet modals for forms
- Sticky action buttons at bottom
- Swipe gestures for navigation

---

## PHASE 4: REPORTING & COMPLIANCE (Est. 2-3 hours)

### 4.1 Simplify Export

- Remove CSV/JSON from main UI (move to Settings → Advanced)
- Single "Export IEP Report" button on student profile
- Pre-validated template with all required sections
- Add legal disclaimer: "Review with qualified professional"

### 4.2 Address AI Features

- Hide AI button by default
- Add setting: "Enable Advanced Analytics (AI)"
- When enabled, show large disclaimer about human review
- Track usage metrics to validate if teachers use it

---

## PHASE 5: TECHNICAL CLEANUP (Est. 2-3 hours)

### 5.1 Remove Development Artifacts

- Remove POC mode badges from production
- Hide "Load Mock Data" in production builds
- Move DevTools to admin-only section
- Clean up console logs and diagnostics

### 5.2 Production Readiness

- Review all user-facing text for professionalism
- Remove TODO comments visible in UI
- Ensure error messages are user-friendly
- Add proper loading states everywhere

---

## SUCCESS METRICS

**Before (Current State):**

- User-friendliness: 4/10
- Time to first observation: ~10 minutes
- Mobile usability: Poor
- Feature count: 25+ routes
- Mixed language issues: ~50+ instances

**Target (After Improvements):**

- User-friendliness: 8/10
- Time to first observation: <2 minutes
- Mobile usability: Good
- Feature count: ~8 core routes
- Language consistency: 100%

---

## ROLLOUT PLAN

1. **Complete changes on feature branch**
2. **Internal testing** (manual QA)
3. **User testing** (2-3 teachers if possible)
4. **Iterate based on feedback**
5. **Merge to main** with comprehensive changelog

---

## NOTES

- All removed features will be preserved in git history
- Can be restored later if validated need emerges
- Focus is on CORE SPED workflow: Track → View → Report
- Everything else is distraction from main value proposition

---

**Implementation Log:**

- 2025-11-12 14:30 - Plan created, starting Phase 1.1
