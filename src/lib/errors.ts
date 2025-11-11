/**
 * Shared error utilities.
 *
 * Provides a lightweight helper to normalize unknown values into Error
 * instances without depending on React components.
 */
export function toError(input: unknown): Error {
  if (input instanceof Error) {
    return input;
  }

  if (typeof input === 'string') {
    return new Error(input);
  }

  try {
    const serialized = JSON.stringify(input);
    return new Error(serialized);
  } catch {
    return new Error('Unknown error');
  }
}
