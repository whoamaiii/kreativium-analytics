# useFormReset Hook - Refactoring Guide

This document shows how to refactor the duplicate form reset patterns across components using the new `useFormReset` hook.

## 1. GoalManager.tsx

### Before (Original Pattern)
```tsx
// Lines 50-58: Initial state
const [newGoal, setNewGoal] = useState({
  title: "",
  description: "",
  category: "behavioral" as Goal['category'],
  measurableObjective: "",
  targetDate: "",
  targetValue: 100,
  baselineValue: 0
});

// Lines 247-257: Reset function
const resetForm = () => {
  setNewGoal({
    title: "",
    description: "",
    category: "behavioral",
    measurableObjective: "",
    targetDate: "",
    targetValue: 100,
    baselineValue: 0
  });
};

// Usage in handlers (e.g., line 138)
createGoal() {
  // ... validation ...
  dataStorage.saveGoal(goal);
  loadGoals();
  resetForm();  // Manual reset
  setShowCreateDialog(false);
}

// Usage in dialog (line 375)
<Button variant="outline" onClick={() => { resetForm(); setShowCreateDialog(false); }}>
```

### After (Refactored with useFormReset)
```tsx
import { useFormReset } from '@/hooks/useFormReset';

// Single hook call replaces both useState and resetForm function
const { values: newGoal, setValues: setNewGoal, reset: resetForm } = useFormReset({
  title: "",
  description: "",
  category: "behavioral" as Goal['category'],
  measurableObjective: "",
  targetDate: "",
  targetValue: 100,
  baselineValue: 0
});

// Usage remains the same:
const createGoal = () => {
  if (!newGoal.title.trim() || !newGoal.description.trim() || !newGoal.measurableObjective.trim()) {
    // ... validation ...
  }
  dataStorage.saveGoal(goal);
  loadGoals();
  resetForm();  // Same function call
  setShowCreateDialog(false);
};

// Updating fields still works the same
<Input
  id="title"
  value={newGoal.title}
  onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
/>

// Reset in dialog
<Button variant="outline" onClick={() => { resetForm(); setShowCreateDialog(false); }}>
```

**Benefits:**
- Eliminates duplicate state definition (8 fields)
- Single point of change for initial values
- Reset function automatically maintains consistency

---

## 2. SensoryTracker.tsx

### Before (Original Pattern - Multiple useState calls)
```tsx
// Lines 46-58: Multiple independent state variables
const [selectedType, setSelectedType] = useState<string>('');
const [selectedResponse, setSelectedResponse] = useState<string>('');
const [intensity, setIntensity] = useState<number>(3);
const [notes, setNotes] = useState('');
const [environment, setEnvironment] = useState('');
const [location, setLocation] = useState('');
const [copingStrategies, setCopingStrategies] = useState<string[]>([]);
const [newCopingStrategy, setNewCopingStrategy] = useState('');

// Lines 85-92: Manual reset in multiple setters
const handleSubmit = () => {
  if (!selectedType || !selectedResponse) return;

  onSensoryAdd({
    studentId,
    sensoryType: selectedType as SensoryEntry['sensoryType'],
    response: selectedResponse as SensoryEntry['response'],
    intensity: intensity as SensoryEntry['intensity'],
    location: location || undefined,
    notes: notes.trim() || undefined,
    environment: environment.trim() || undefined,
    copingStrategies: copingStrategies.length > 0 ? copingStrategies : undefined,
  });

  // Reset form - 7 lines of duplicate code
  setSelectedType('');
  setSelectedResponse('');
  setIntensity(3);
  setLocation('');
  setNotes('');
  setEnvironment('');
  setCopingStrategies([]);
};
```

### After (Refactored with useFormReset)
```tsx
import { useFormReset } from '@/hooks/useFormReset';

// Single hook call replaces 8 useState calls
const { values, setValues, reset } = useFormReset({
  selectedType: '',
  selectedResponse: '',
  intensity: 3,
  notes: '',
  environment: '',
  location: '',
  copingStrategies: [] as string[],
  newCopingStrategy: '' // Also managed by hook
});

// Handlers remain mostly the same, using values and setValues
const handleAddCopingStrategy = () => {
  if (values.newCopingStrategy.trim() && !values.copingStrategies.includes(values.newCopingStrategy.trim())) {
    setValues(prev => ({
      ...prev,
      copingStrategies: [...prev.copingStrategies, prev.newCopingStrategy.trim()],
      newCopingStrategy: ''
    }));
  }
};

const handleSubmit = () => {
  if (!values.selectedType || !values.selectedResponse) return;

  onSensoryAdd({
    studentId,
    sensoryType: values.selectedType as SensoryEntry['sensoryType'],
    response: values.selectedResponse as SensoryEntry['response'],
    intensity: values.intensity as SensoryEntry['intensity'],
    location: values.location || undefined,
    notes: values.notes.trim() || undefined,
    environment: values.environment.trim() || undefined,
    copingStrategies: values.copingStrategies.length > 0 ? values.copingStrategies : undefined,
  });

  reset();  // Single line replaces 7-line reset
};

// Form usage
<Input
  value={values.location}
  onChange={(e) => setValues(prev => ({ ...prev, location: e.target.value }))}
/>
```

**Benefits:**
- Eliminates 8 separate useState calls
- Reduces mental overhead (single source of truth)
- Reset goes from 7 lines to 1 line
- Easier to add/remove fields

---

## 3. EmotionTracker.tsx

### Before (Original Pattern - Multiple useState calls)
```tsx
// Lines 48-55: Seven independent state variables
const [selectedEmotion, setSelectedEmotion] = useState<string>('');
const [selectedSubEmotion, setSelectedSubEmotion] = useState<string>('');
const [intensity, setIntensity] = useState<number>(3);
const [duration, setDuration] = useState<number>(0);
const [escalationPattern, setEscalationPattern] = useState<'sudden' | 'gradual' | 'unknown'>('unknown');
const [notes, setNotes] = useState('');
const [triggers, setTriggers] = useState<string[]>([]);
const [newTrigger, setNewTrigger] = useState('');

// Lines 85-93: Manual reset code
const handleSubmit = () => {
  if (!selectedEmotion) {
    logger.warn('Attempted to submit emotion without selection');
    return;
  }

  onEmotionAdd({
    studentId,
    emotion: selectedEmotion as EmotionEntry['emotion'],
    subEmotion: selectedSubEmotion || undefined,
    intensity: intensity as EmotionEntry['intensity'],
    duration: duration > 0 ? duration : undefined,
    escalationPattern: escalationPattern !== 'unknown' ? escalationPattern : undefined,
    notes: notes.trim() || undefined,
    triggers: triggers.length > 0 ? triggers : undefined,
  });

  // Reset form - 7 lines
  setSelectedEmotion('');
  setSelectedSubEmotion('');
  setIntensity(3);
  setDuration(0);
  setEscalationPattern('unknown');
  setNotes('');
  setTriggers([]);
};
```

### After (Refactored with useFormReset)
```tsx
import { useFormReset } from '@/hooks/useFormReset';

// Single hook call replaces 8 useState calls
const { values, setValues, reset } = useFormReset({
  selectedEmotion: '',
  selectedSubEmotion: '',
  intensity: 3,
  duration: 0,
  escalationPattern: 'unknown' as 'sudden' | 'gradual' | 'unknown',
  notes: '',
  triggers: [] as string[],
  newTrigger: ''
});

// Handlers simplified
const handleAddTrigger = () => {
  if (values.newTrigger.trim() && !values.triggers.includes(values.newTrigger.trim())) {
    setValues(prev => ({
      ...prev,
      triggers: [...prev.triggers, prev.newTrigger.trim()],
      newTrigger: ''
    }));
  }
};

const handleSubmit = () => {
  if (!values.selectedEmotion) {
    logger.warn('Attempted to submit emotion without selection');
    return;
  }

  onEmotionAdd({
    studentId,
    emotion: values.selectedEmotion as EmotionEntry['emotion'],
    subEmotion: values.selectedSubEmotion || undefined,
    intensity: values.intensity as EmotionEntry['intensity'],
    duration: values.duration > 0 ? values.duration : undefined,
    escalationPattern: values.escalationPattern !== 'unknown' ? values.escalationPattern : undefined,
    notes: values.notes.trim() || undefined,
    triggers: values.triggers.length > 0 ? values.triggers : undefined,
  });

  reset();  // Single line replaces 7-line reset
};
```

**Benefits:**
- Reduces 8 useState calls to 1 hook
- 7-line reset becomes 1 line
- Easier to maintain and extend
- Better state cohesion

---

## 4. ReportBuilder.tsx

### Before (Original Pattern - Complex nested state)
```tsx
// Lines 63-77: Complex state with nested object
const [reportData, setReportData] = useState({
  title: '',
  dateRange: {
    start: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  },
  sections: [] as string[],
  includeCharts: true,
  includeRawData: false,
  customNotes: '',
  reportingTeacher: '',
  schoolDistrict: ''
});

// Usage: manual updates with nested spread
<Input
  id="reportTitle"
  value={reportData.title}
  onChange={(e) => setReportData(prev => ({ ...prev, title: e.target.value }))}
/>

// Nested field updates are verbose
<Input
  id="startDate"
  type="date"
  value={reportData.dateRange.start}
  onChange={(e) => setReportData(prev => ({
    ...prev,
    dateRange: { ...prev.dateRange, start: e.target.value }
  }))}
/>
```

### After (Refactored with useFormReset)
```tsx
import { useFormReset } from '@/hooks/useFormReset';

// Same hook, clearer intent - hook handles complex state naturally
const { values: reportData, setValues: setReportData, reset: resetForm } = useFormReset({
  title: '',
  dateRange: {
    start: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  },
  sections: [] as string[],
  includeCharts: true,
  includeRawData: false,
  customNotes: '',
  reportingTeacher: '',
  schoolDistrict: ''
});

// Usage remains identical - no code change needed in handlers
// But now the hook clearly shows intent: this is a form that can be reset
<Input
  id="reportTitle"
  value={reportData.title}
  onChange={(e) => setReportData(prev => ({ ...prev, title: e.target.value }))}
/>

// Can optionally add reset functionality (e.g., "Clear Form" button)
<Button onClick={resetForm}>Reset Form</Button>
```

**Benefits:**
- Makes intent clear: "this is a form with reset capability"
- No behavior change, but semantic clarity
- Consistent with other form components
- Easy to add reset button if needed later

---

## Migration Checklist

Use this checklist when refactoring each component:

- [ ] Import `useFormReset` hook
- [ ] Identify all form-related useState calls
- [ ] Create initial state object
- [ ] Replace all useState with single useFormReset call
- [ ] Update state references from `state` to `values.state`
- [ ] Update setState calls from `setState` to `setValues(prev => ...)`
- [ ] Replace manual reset logic with single `reset()` call
- [ ] Test form input/output works the same
- [ ] Test reset functionality
- [ ] Verify no TypeScript errors

---

## Key Points

1. **Type Safety**: Generic type `T` is inferred from initial state
2. **Shallow Updates**: When updating nested objects, use spread operator as shown
3. **Performance**: Hook uses useCallback and useMemo for optimization
4. **Compatibility**: Works with any form structure - simple, nested, or mixed
5. **No Breaking Changes**: Existing update patterns remain valid

---

## Additional Usage Patterns

### Conditional Field Updates
```tsx
const handleChange = (field: keyof typeof values, value: unknown) => {
  setValues(prev => ({ ...prev, [field]: value }));
};
```

### Partial Reset (Reset only specific fields)
```tsx
const resetField = (field: keyof typeof values) => {
  const initialValue = {
    title: '',
    description: '',
  }[field];
  setValues(prev => ({ ...prev, [field]: initialValue }));
};
```

### Form Validation State
```tsx
// Store validation errors alongside form values
const { values: formState, setValues: setFormState, reset: resetForm } = useFormReset({
  data: { title: '', description: '' },
  errors: {} as Record<string, string>,
  touched: {} as Record<string, boolean>
});
```
