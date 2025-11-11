import { renderHook, act } from '@testing-library/react';
import { useFormReset } from './useFormReset';

/**
 * Test suite for useFormReset hook
 * Validates form state management and reset functionality
 */
describe('useFormReset', () => {
  describe('Basic usage', () => {
    it('should initialize with provided initial state', () => {
      const initialState = {
        title: 'Test',
        value: 42,
      };

      const { result } = renderHook(() => useFormReset(initialState));

      expect(result.current.values).toEqual(initialState);
    });

    it('should update values using full object replacement', () => {
      const initialState = { title: '', value: 0 };

      const { result } = renderHook(() => useFormReset(initialState));

      act(() => {
        result.current.setValues({ title: 'Updated', value: 10 });
      });

      expect(result.current.values).toEqual({ title: 'Updated', value: 10 });
    });

    it('should update values using updater function', () => {
      const initialState = { title: 'Initial', value: 5 };

      const { result } = renderHook(() => useFormReset(initialState));

      act(() => {
        result.current.setValues((prev) => ({
          ...prev,
          title: 'Updated',
          value: prev.value + 1,
        }));
      });

      expect(result.current.values).toEqual({ title: 'Updated', value: 6 });
    });

    it('should reset to initial state', () => {
      const initialState = { title: 'Initial', value: 0 };

      const { result } = renderHook(() => useFormReset(initialState));

      act(() => {
        result.current.setValues({ title: 'Changed', value: 100 });
      });

      expect(result.current.values.title).toBe('Changed');

      act(() => {
        result.current.reset();
      });

      expect(result.current.values).toEqual(initialState);
    });
  });

  describe('Complex state', () => {
    it('should handle nested objects', () => {
      const initialState = {
        basic: 'text',
        nested: {
          start: '2024-01-01',
          end: '2024-12-31',
        },
      };

      const { result } = renderHook(() => useFormReset(initialState));

      act(() => {
        result.current.setValues((prev) => ({
          ...prev,
          nested: { ...prev.nested, start: '2024-02-01' },
        }));
      });

      expect(result.current.values.nested.start).toBe('2024-02-01');
      expect(result.current.values.nested.end).toBe('2024-12-31');
    });

    it('should handle array fields', () => {
      const initialState = {
        items: [] as string[],
      };

      const { result } = renderHook(() => useFormReset(initialState));

      act(() => {
        result.current.setValues((prev) => ({
          ...prev,
          items: [...prev.items, 'new item'],
        }));
      });

      expect(result.current.values.items).toEqual(['new item']);

      act(() => {
        result.current.reset();
      });

      expect(result.current.values.items).toEqual([]);
    });

    it('should handle mixed complex state like GoalManager', () => {
      const initialState = {
        title: '',
        description: '',
        category: 'behavioral' as const,
        measurableObjective: '',
        targetDate: '',
        targetValue: 100,
        baselineValue: 0,
      };

      const { result } = renderHook(() => useFormReset(initialState));

      // Simulate form input
      act(() => {
        result.current.setValues((prev) => ({
          ...prev,
          title: 'New Goal',
          description: 'Goal description',
        }));
      });

      expect(result.current.values.title).toBe('New Goal');
      expect(result.current.values.description).toBe('Goal description');
      expect(result.current.values.baselineValue).toBe(0); // unchanged

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.values).toEqual(initialState);
    });

    it('should handle mixed complex state like SensoryTracker', () => {
      const initialState = {
        selectedType: '',
        selectedResponse: '',
        intensity: 3,
        notes: '',
        environment: '',
        location: '',
        copingStrategies: [] as string[],
        newCopingStrategy: '',
      };

      const { result } = renderHook(() => useFormReset(initialState));

      // Add coping strategy
      act(() => {
        result.current.setValues((prev) => ({
          ...prev,
          copingStrategies: [...prev.copingStrategies, 'Deep breathing'],
          newCopingStrategy: '',
        }));
      });

      expect(result.current.values.copingStrategies).toContain('Deep breathing');

      // Reset clears everything
      act(() => {
        result.current.reset();
      });

      expect(result.current.values).toEqual(initialState);
    });

    it('should handle mixed complex state like ReportBuilder', () => {
      const initialState = {
        title: '',
        dateRange: {
          start: '2024-01-01',
          end: '2024-12-31',
        },
        sections: [] as string[],
        includeCharts: true,
        includeRawData: false,
        customNotes: '',
        reportingTeacher: '',
        schoolDistrict: '',
      };

      const { result } = renderHook(() => useFormReset(initialState));

      // Update nested date range
      act(() => {
        result.current.setValues((prev) => ({
          ...prev,
          dateRange: {
            ...prev.dateRange,
            start: '2024-06-01',
          },
        }));
      });

      expect(result.current.values.dateRange.start).toBe('2024-06-01');
      expect(result.current.values.dateRange.end).toBe('2024-12-31');

      // Add sections
      act(() => {
        result.current.setValues((prev) => ({
          ...prev,
          sections: [...prev.sections, 'student-info', 'goal-progress'],
        }));
      });

      expect(result.current.values.sections).toHaveLength(2);

      // Reset returns everything to initial state
      act(() => {
        result.current.reset();
      });

      expect(result.current.values).toEqual(initialState);
    });
  });

  describe('Function references', () => {
    it('should return stable function references', () => {
      const initialState = { value: 0 };

      const { result, rerender } = renderHook(() => useFormReset(initialState));

      const resetRef1 = result.current.reset;
      const setValuesRef1 = result.current.setValues;

      rerender();

      const resetRef2 = result.current.reset;
      const setValuesRef2 = result.current.setValues;

      // Functions should be stable references
      expect(resetRef1).toBe(resetRef2);
      expect(setValuesRef1).toBe(setValuesRef2);
    });
  });

  describe('Edge cases', () => {
    it('should handle null/undefined values in state', () => {
      const initialState = {
        required: 'value',
        optional: null as string | null,
      };

      const { result } = renderHook(() => useFormReset(initialState));

      act(() => {
        result.current.setValues((prev) => ({
          ...prev,
          optional: 'filled',
        }));
      });

      expect(result.current.values.optional).toBe('filled');

      act(() => {
        result.current.reset();
      });

      expect(result.current.values.optional).toBeNull();
    });

    it('should handle empty initial state', () => {
      const initialState = {};

      const { result } = renderHook(() => useFormReset(initialState));

      expect(result.current.values).toEqual({});

      act(() => {
        result.current.reset();
      });

      expect(result.current.values).toEqual({});
    });

    it('should work with primitive types as state', () => {
      const initialState = 'text';

      const { result } = renderHook(() => useFormReset(initialState));

      expect(result.current.values).toBe('text');

      act(() => {
        result.current.setValues('updated');
      });

      expect(result.current.values).toBe('updated');

      act(() => {
        result.current.reset();
      });

      expect(result.current.values).toBe('text');
    });
  });
});
