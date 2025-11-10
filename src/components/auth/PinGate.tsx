import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useStorageState } from '@/lib/storage/useStorageState';
import { STORAGE_KEYS } from '@/lib/storage/keys';

interface PinGateProps {
  children: React.ReactNode;
  /** Optional: override storage key namespace */
  storageKey?: string;
  /** Optional: minutes to keep the session verified */
  sessionMinutes?: number;
}

/**
 * Simple PIN gate for the Adult Zone.
 * - Stores a hashed-ish PIN in localStorage (not secure, but sufficient as a soft guard)
 * - Maintains an ephemeral verified session for a limited time (default 15 minutes)
 */
export function PinGate({
  children,
  storageKey = STORAGE_KEYS.ADULT_PIN,
  sessionMinutes = 15,
}: PinGateProps): JSX.Element {
  const [entered, setEntered] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [verified, setVerified] = useState<boolean>(false);

  const sessionKey = useMemo(() => `${storageKey}.verifiedUntil`, [storageKey]);

  // Use storage hook for PIN
  const [storedPin] = useStorageState<string>(storageKey, '1234');

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

  const verify = useCallback(() => {
    if (entered.trim() === storedPin) {
      setError('');
      setVerified(true);
      const until = Date.now() + Math.max(1, sessionMinutes) * 60_000;
      setSessionExpiry(until);
    } else {
      setError('Feil PIN');
    }
  }, [entered, storedPin, sessionMinutes, setSessionExpiry]);

  if (verified) return <>{children}</>;

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
            className="w-full rounded-md border px-3 py-2"
            placeholder="••••"
            aria-label="PIN"
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
          <div className="text-xs text-muted-foreground">
            Tips: Standard PIN er 1234 (kan endres).
          </div>
        </div>
      </Card>
    </div>
  );
}

export default PinGate;
