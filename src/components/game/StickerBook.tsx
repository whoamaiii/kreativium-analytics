import React from 'react';
import { useStorageState } from '@/lib/storage/useStorageState';
import { STORAGE_KEYS } from '@/lib/storage/keys';

interface StickerBookProps {
  visible: boolean;
}

interface OwnedSticker {
  id: string;
  x: number;
  y: number;
}

export function StickerBook({ visible }: StickerBookProps) {
  const [owned] = useStorageState<OwnedSticker[]>(STORAGE_KEYS.EMOTION_STICKERS, [], {
    deserialize: (value) => {
      try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
          (item): item is OwnedSticker =>
            typeof item === 'object' &&
            item !== null &&
            typeof item.id === 'string' &&
            typeof item.x === 'number' &&
            typeof item.y === 'number',
        );
      } catch {
        return [];
      }
    },
  });

  if (!visible) return null;

  return (
    <div className="rounded-2xl border border-white/10 p-4 bg-gradient-to-b from-white/5 to-white/10">
      <div className="text-white font-semibold mb-2">Klistremerkebok</div>
      <div
        className="relative h-64 bg-black/20 rounded-xl"
        role="region"
        aria-label="Klistremerkebok"
      >
        {owned.map((s, i) => (
          <div
            key={i}
            className="absolute px-2 py-1 rounded bg-white/20 text-white text-sm select-none"
            style={{ left: s.x, top: s.y }}
          >
            {s.id}
          </div>
        ))}
        <div className="absolute inset-0 grid place-items-center text-white/60 text-sm">
          Dra og slipp kommer i V2 – klistremerkene lagres allerede lokalt.
        </div>
      </div>
    </div>
  );
}

export default StickerBook;
