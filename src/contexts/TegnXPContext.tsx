import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useStorageState } from '@/lib/storage/useStorageState';
import { STORAGE_KEYS } from '@/lib/storage/keys';

interface TegnXPContextValue {
  xp: number;
  level: number;
  addXP: (amount: number) => void;
}

const TegnXPContext = createContext<TegnXPContextValue | null>(null);

export const TegnXPProvider = ({ children }: { children: React.ReactNode }) => {
  const [xp, setXp] = useStorageState(
    STORAGE_KEYS.TEGN_XP_TOTAL,
    0,
    {
      serialize: (value) => String(Math.max(0, value)),
      deserialize: (value) => Math.max(0, parseInt(value, 10) || 0),
    }
  );

  const addXP = useCallback((amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    setXp(prev => prev + Math.floor(amount));
  }, []);

  const level = useMemo(() => {
    return Math.floor(xp / 100) + 1;
  }, [xp]);

  const value = useMemo(() => ({ xp, level, addXP }), [xp, level, addXP]);

  return (
    <TegnXPContext.Provider value={value}>
      {children}
    </TegnXPContext.Provider>
  );
};

export const useTegnXP = (): TegnXPContextValue => {
  const ctx = useContext(TegnXPContext);
  if (!ctx) throw new Error('useTegnXP must be used within TegnXPProvider');
  return ctx;
};


