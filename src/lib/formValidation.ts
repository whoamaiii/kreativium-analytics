import { z } from 'zod';
import DOMPurify from 'dompurify';

// Validation schemas
export const studentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  grade: z.string().max(50, 'Grade must be less than 50 characters').optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional()
    .or(z.literal('')),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
});

// Removed unused schemas: emotionEntrySchema, environmentalEntrySchema, sensoryEntrySchema

// Validation functions
export function validateStudent(data: unknown) {
  try {
    return {
      success: true,
      data: studentSchema.parse(data),
      errors: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      };
    }
    return {
      success: false,
      data: null,
      errors: [{ field: 'general', message: 'Validation failed' }],
    };
  }
}

// Removed unused validators: validateEnvironmentalEntry

// Input sanitization
export function sanitizeInput(input: string): string {
  // Use DOMPurify to sanitize HTML and prevent XSS attacks
  // RETURN_TRUSTED_TYPE: false ensures we get a string back
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: [], // Strip all attributes
    KEEP_CONTENT: true, // Keep text content
    RETURN_TRUSTED_TYPE: false,
  });
  return sanitized.trim().slice(0, 10000);
}

// Removed unused function: sanitizeObject
