import React, { useEffect, useState } from 'react';

interface StickerBookProps {
  visible: boolean;
}

interface OwnedSticker { id: string; x: number; y: number; }

const KEY = 'emotion.stickers.v1';

export function StickerBook({ visible }: StickerBookProps) {
  const [owned, setOwned] = useState<OwnedSticker[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setOwned(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(owned)); } catch {}
  }, [owned]);

  if (!visible) return null;

  return (
    <div className="rounded-2xl border border-white/10 p-4 bg-gradient-to-b from-white/5 to-white/10">
      <div className="text-white font-semibold mb-2">Klistremerkebok</div>
      <div className="relative h-64 bg-black/20 rounded-xl" role="region" aria-label="Klistremerkebok">
        {owned.map((s, i) => (
          <div key={i} className="absolute px-2 py-1 rounded bg-white/20 text-white text-sm select-none" style={{ left: s.x, top: s.y }}>{s.id}</div>
        ))}
        <div className="absolute inset-0 grid place-items-center text-white/60 text-sm">
          Dra og slipp kommer i V2 – klistremerkene lagres allerede lokalt.
        </div>
      </div>
    </div>
  );
}

export default StickerBook;






