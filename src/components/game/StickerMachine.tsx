import React, { useEffect, useMemo, useRef, useState } from 'react';

interface StickerMachineProps {
  onPayout?: (stickerId: string) => void;
  visible: boolean;
}

const CATALOG = ['stjerne-rosa', 'regnbue', 'glitter-hjerte', 'rakett', 'smilefjes', 'planet'];

export function StickerMachine({ visible, onPayout }: StickerMachineProps) {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const stickers = useMemo(() => CATALOG, []);
  const payoutRef = useRef<typeof onPayout>();
  useEffect(() => {
    payoutRef.current = onPayout;
  }, [onPayout]);

  useEffect(() => {
    if (!visible) return;
    setSpinning(true);
    setResult(null);
    const id = window.setTimeout(() => {
      const pick = stickers[Math.floor(Math.random() * stickers.length)];
      setResult(pick);
      setSpinning(false);
      try {
        payoutRef.current?.(pick);
      } catch {}
    }, 1200);
    return () => window.clearTimeout(id);
  }, [visible, stickers]);

  return (
    <div className="relative h-32 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-white/10">
      <div className="absolute inset-0 grid place-items-center">
        {spinning && <div className="animate-pulse text-white/70">Spinner…</div>}
        {!spinning && result && (
          <div className="text-white text-lg">
            Klistremerke: <span className="font-semibold">{result}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default StickerMachine;
