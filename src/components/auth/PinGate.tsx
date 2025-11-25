import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useStorageState } from '@/lib/storage/useStorageState';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { hashPin, verifyPin, validatePinComplexity } from '@/lib/auth/pinUtils';

interface PinGateProps {
  children: React.ReactNode;
  /** Optional: override storage key namespace */
  storageKey?: string;
  /** Optional: minutes to keep the session verified */
  sessionMinutes?: number;
}

/**
 * Secure PIN gate for the Adult Zone.
 * - Stores a hashed PIN in localStorage using SHA-256
 * - Maintains an ephemeral verified session for a limited time (default 15 minutes)
 * - Enforces PIN complexity requirements
 */
export function PinGate({
  children,
  storageKey = STORAGE_KEYS.ADULT_PIN,
  sessionMinutes = 15,
}: PinGateProps): JSX.Element {
  const [entered, setEntered] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [verified, setVerified] = useState<boolean>(false);
  const [isSettingUp, setIsSettingUp] = useState<boolean>(false);

  const sessionKey = useMemo(() => `${storageKey}.verifiedUntil`, [storageKey]);

  // Use storage hook for PIN hash (empty string triggers setup)
  const [storedPinHash, setStoredPinHash] = useStorageState<string>(storageKey, '');

  // Use storage hook for session expiry
  const [sessionExpiry, setSessionExpiry] = useStorageState<number>(sessionKey, 0, {
    serialize: (value) => String(value),
    deserialize: (value) => Number(JSON.parse(value)) || 0,
  });

  // Check if session is still valid on mount
  useEffect(() => {
    if (Number.isFinite(sessionExpiry) && sessionExpiry > Date.now()) {
      setVerified(true);
    }
  }, [sessionExpiry]);

  // Check if we need to show setup flow
  useEffect(() => {
    if (!storedPinHash || storedPinHash.trim() === '') {
      setIsSettingUp(true);
    }
  }, [storedPinHash]);

  const setupPin = useCallback(async () => {
    // Validate PIN complexity
    const validation = validatePinComplexity(entered);
    if (!validation.valid) {
      setError(validation.error || 'Ugyldig PIN');
      return;
    }

    // Check if PINs match
    if (entered !== confirmPin) {
      setError('PIN-kodene matcher ikke');
      return;
    }

    try {
      // Hash and store the PIN
      const hash = await hashPin(entered);
      setStoredPinHash(hash);
      setError('');
      setIsSettingUp(false);
      setEntered('');
      setConfirmPin('');
      // Don't auto-verify after setup, make user enter it once
    } catch {
      setError('Kunne ikke lagre PIN. Prøv igjen.');
    }
  }, [entered, confirmPin, setStoredPinHash]);

  const verify = useCallback(async () => {
    if (!storedPinHash) {
      setError('Ingen PIN er satt opp');
      return;
    }

    try {
      const isValid = await verifyPin(entered.trim(), storedPinHash);
      if (isValid) {
        setError('');
        setVerified(true);
        const until = Date.now() + Math.max(1, sessionMinutes) * 60_000;
        setSessionExpiry(until);
      } else {
        setError('Feil PIN');
      }
    } catch {
      setError('Kunne ikke verifisere PIN. Prøv igjen.');
    }
  }, [entered, storedPinHash, sessionMinutes, setSessionExpiry]);

  if (verified) return <>{children}</>;

  // Setup flow when no PIN exists
  if (isSettingUp) {
    return (
      <div className="min-h-[50vh] grid place-items-center">
        <Card className="w-full max-w-sm p-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Opprett PIN-kode</h2>
            <p className="text-sm text-muted-foreground">
              Opprett en sikker PIN-kode for voksensonen. PIN må være 4-6 siffer og kan ikke være
              vanlige kombinasjoner som 1234.
            </p>
            <div>
              <label htmlFor="pin-setup" className="text-sm font-medium mb-1 block">
                PIN-kode
              </label>
              <input
                id="pin-setup"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={entered}
                onChange={(e) => {
                  setEntered(e.target.value.replace(/\D+/g, '').slice(0, 6));
                  setError('');
                }}
                className="w-full rounded-md border px-3 py-2"
                placeholder="••••"
                aria-label="PIN-kode"
                type="password"
              />
            </div>
            <div>
              <label htmlFor="pin-confirm" className="text-sm font-medium mb-1 block">
                Bekreft PIN-kode
              </label>
              <input
                id="pin-confirm"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => {
                  setConfirmPin(e.target.value.replace(/\D+/g, '').slice(0, 6));
                  setError('');
                }}
                className="w-full rounded-md border px-3 py-2"
                placeholder="••••"
                aria-label="Bekreft PIN-kode"
                type="password"
              />
            </div>
            {error && (
              <div className="text-sm text-destructive" role="alert">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <Button className="flex-1" onClick={setupPin}>
                Lagre PIN
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setEntered('');
                  setConfirmPin('');
                  setError('');
                }}
              >
                Tøm
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Verification flow when PIN exists
  return (
    <div className="min-h-[50vh] grid place-items-center">
      <Card className="w-full max-w-sm p-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Voksensone</h2>
          <p className="text-sm text-muted-foreground">Skriv inn PIN for å fortsette.</p>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={entered}
            onChange={(e) => {
              setEntered(e.target.value.replace(/\D+/g, '').slice(0, 6));
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void verify();
              }
            }}
            className="w-full rounded-md border px-3 py-2"
            placeholder="••••"
            aria-label="PIN"
            type="password"
          />
          {error && (
            <div className="text-sm text-destructive" role="alert">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <Button className="flex-1" onClick={verify}>
              Lås opp
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setEntered('')}>
              Tøm
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default PinGate;
