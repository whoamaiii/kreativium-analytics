import { useState, useCallback, useMemo } from 'react';

/**
 * Hook return type for form reset functionality
 * @template T - The type of the form state
 */
interface FormResetReturn<T> {
  /** Current form values */
  values: T;
  /** Function to reset form to initial state */
  reset: () => void;
  /** Function to update form values (supports both full updates and updater functions) */
  setValues: (updater: T | ((prev: T) => T)) => void;
}

/**
 * useFormReset Hook
 *
 * Eliminates duplicate form reset patterns across components by providing
 * a reusable hook for managing form state with reset functionality.
 *
 * Supports:
 * - Simple and nested object states
 * - Array fields
 * - Functional updates
 * - Type-safe operations with TypeScript generics
 *
 * @template T - The type of the form state (inferred from initialState)
 * @param {T} initialState - The initial form state
 * @returns {FormResetReturn<T>} Object containing current values, reset function, and setValues function
 *
 * @example
 * // Simple form reset
 * const { values, reset, setValues } = useFormReset({
 *   title: '',
 *   description: '',
 *   intensity: 3
 * });
 *
 * // Update individual fields
 * setValues(prev => ({ ...prev, title: 'New Title' }));
 *
 * // Replace entire form state
 * setValues({ title: '', description: '', intensity: 3 });
 *
 * // Reset to initial state
 * reset();
 *
 * @example
 * // Complex nested state (like ReportBuilder)
 * const { values, reset, setValues } = useFormReset({
 *   title: '',
 *   dateRange: {
 *     start: '2024-01-01',
 *     end: '2024-12-31'
 *   },
 *   sections: [] as string[],
 *   includeCharts: true
 * });
 *
 * // Update nested field
 * setValues(prev => ({
 *   ...prev,
 *   dateRange: { ...prev.dateRange, start: '2024-02-01' }
 * }));
 *
 * @example
 * // Usage in component with multiple independent fields
 * const Component = () => {
 *   const { values, reset, setValues } = useFormReset({
 *     selectedType: '',
 *     selectedResponse: '',
 *     intensity: 3,
 *     location: '',
 *     notes: '',
 *     environment: '',
 *     copingStrategies: [] as string[]
 *   });
 *
 *   const handleSubmit = () => {
 *     // ... submit logic ...
 *     reset(); // Reset all fields at once
 *   };
 *
 *   return (
 *     <form>
 *       <input
 *         value={values.selectedType}
 *         onChange={(e) => setValues(prev => ({
 *           ...prev,
 *           selectedType: e.target.value
 *         }))}
 *       />
 *       <button onClick={reset}>Reset Form</button>
 *     </form>
 *   );
 * };
 */
export function useFormReset<T>(initialState: T): FormResetReturn<T> {
  const [values, setStateValues] = useState<T>(initialState);

  /**
   * Reset form to initial state
   * Memoized to prevent unnecessary re-renders in dependencies
   */
  const reset = useCallback(() => {
    setStateValues(initialState);
  }, [initialState]);

  /**
   * Update form values
   * Supports both full state replacement and functional updates
   *
   * @param updater - Either a new state object or a function that takes previous state
   */
  const setValues = useCallback((updater: T | ((prev: T) => T)) => {
    setStateValues(updater);
  }, []);

  /**
   * Memoize return object to prevent unnecessary re-renders
   * when values or callbacks haven't changed
   */
  return useMemo(
    () => ({
      values,
      reset,
      setValues,
    }),
    [values, reset, setValues],
  );
}
