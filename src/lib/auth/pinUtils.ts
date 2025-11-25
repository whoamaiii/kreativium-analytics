/**
 * PIN security utilities
 * Uses SHA-256 via Web Crypto API for secure PIN hashing in the browser
 */

interface PinValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Hashes a PIN using SHA-256
 * @param pin - The PIN to hash
 * @returns Promise resolving to the hex-encoded hash
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Verifies a PIN against a stored hash
 * @param pin - The PIN to verify
 * @param hash - The stored hash to compare against
 * @returns Promise resolving to true if PIN matches, false otherwise
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  try {
    const pinHash = await hashPin(pin);
    return pinHash === hash;
  } catch {
    return false;
  }
}

/**
 * Validates PIN complexity requirements
 * @param pin - The PIN to validate
 * @returns Validation result with error message if invalid
 */
export function validatePinComplexity(pin: string): PinValidationResult {
  // Check if PIN is empty
  if (!pin || pin.trim().length === 0) {
    return {
      valid: false,
      error: 'PIN kan ikke være tom',
    };
  }

  // Check if PIN contains only digits
  if (!/^\d+$/.test(pin)) {
    return {
      valid: false,
      error: 'PIN må kun inneholde tall',
    };
  }

  // Check minimum length (4 digits)
  if (pin.length < 4) {
    return {
      valid: false,
      error: 'PIN må være minst 4 siffer',
    };
  }

  // Check maximum length (6 digits)
  if (pin.length > 6) {
    return {
      valid: false,
      error: 'PIN kan maksimalt være 6 siffer',
    };
  }

  // Check for weak PINs (e.g., 1234, 0000, 1111, etc.)
  const weakPins = ['1234', '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'];
  if (weakPins.includes(pin)) {
    return {
      valid: false,
      error: 'PIN er for enkel. Velg en mer kompleks kombinasjon',
    };
  }

  // Check for sequential patterns (e.g., 12345, 56789)
  const isSequential = (str: string): boolean => {
    for (let i = 1; i < str.length; i++) {
      const diff = parseInt(str[i]) - parseInt(str[i - 1]);
      if (diff !== 1 && diff !== -1) return false;
    }
    return true;
  };

  if (isSequential(pin)) {
    return {
      valid: false,
      error: 'PIN kan ikke være en sekvens (f.eks. 12345)',
    };
  }

  return { valid: true };
}
