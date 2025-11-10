import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface TegnXPContextValue {
  xp: number;
  level: number;
  addXP: (amount: number) => void;
}

const TegnXPContext = createContext<TegnXPContextValue | null>(null);

const STORAGE_KEY = 'tegn_xp_total';

export const TegnXPProvider = ({ children }: { children: React.ReactNode }) => {
  const [xp, setXp] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(xp));
    } catch {
      // ignore persistence errors
    }
  }, [xp]);

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


