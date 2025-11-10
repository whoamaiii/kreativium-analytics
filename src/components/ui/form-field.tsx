/**
 * @fileoverview FormField - Reusable form field wrapper component
 *
 * Provides a consistent form field layout with label, input, error, and help text.
 * Eliminates duplicate form field patterns across components.
 *
 * @module components/ui/form-field
 */

import { memo, useId, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface FormFieldProps {
  /** The label text to display */
  label: string;
  /** Whether the field is required (adds asterisk) */
  required?: boolean;
  /** Error message to display below the input */
  error?: string;
  /** Help text to display below the input */
  helpText?: string;
  /** Optional custom ID (auto-generated if not provided) */
  id?: string;
  /** Additional CSS classes for the container */
  className?: string;
  /** The input component to render */
  children: ReactNode;
}

/**
 * FormField Component
 *
 * A reusable wrapper for form inputs that provides consistent styling,
 * labels, error messages, and help text. Automatically associates labels
 * with inputs using proper ARIA attributes.
 *
 * @component
 * @example
 * ```tsx
 * <FormField label="Email" required error={errors.email} helpText="We'll never share your email">
 *   <Input type="email" value={email} onChange={handleChange} />
 * </FormField>
 * ```
 */
const FormFieldComponent = ({
  label,
  required = false,
  error,
  helpText,
  id: providedId,
  className,
  children,
}: FormFieldProps) => {
  const generatedId = useId();
  const fieldId = providedId || generatedId;
  const errorId = `${fieldId}-error`;
  const helpTextId = `${fieldId}-help`;

  // Clone the child element to pass proper id and aria attributes
  const childElement = isValidElement(children)
    ? cloneElement(children as ReactElement<any>, {
        id: fieldId,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': cn(
          error ? errorId : undefined,
          helpText ? helpTextId : undefined
        ) || undefined,
      })
    : children;

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={fieldId} className="text-foreground">
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-label="required">
            *
          </span>
        )}
      </Label>

      {childElement}

      {error && (
        <p
          id={errorId}
          className="text-sm text-destructive font-medium"
          role="alert"
        >
          {error}
        </p>
      )}

      {helpText && !error && (
        <p
          id={helpTextId}
          className="text-sm text-muted-foreground"
        >
          {helpText}
        </p>
      )}
    </div>
  );
};

/**
 * Memoized FormField component to prevent unnecessary re-renders.
 */
export const FormField = memo(FormFieldComponent);
