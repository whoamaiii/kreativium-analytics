/**
 * @file src/lib/validationTypes.ts
 * Shared validation types to avoid duplication across validation modules.
 */

export type ValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
};
