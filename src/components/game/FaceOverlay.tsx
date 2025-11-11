import React from 'react';
import type { DetectionBox } from '@/detector/types';
import { AnimatedProgressRing } from '@/components/game/AnimatedProgressRing';

interface FaceOverlayProps {
  box: DetectionBox | null;
  progress: number; // 0..1
  almostThere: boolean;
  // When true, the progress ring is not rendered (useful when placing a fixed ring elsewhere)
  hideRing?: boolean;
  // If the source video is mirrored (e.g., CSS scaleX(-1))
  mirror?: boolean;
  // Intrinsic source video size to scale detection box to rendered element
  sourceWidth?: number;
  sourceHeight?: number;
}

export function FaceOverlay({
  box,
  progress,
  almostThere: _almostThere,
  hideRing,
  mirror = false,
  sourceWidth,
  sourceHeight,
}: FaceOverlayProps) {
  if (!box) return null;
  const sw = sourceWidth ?? 0;
  const sh = sourceHeight ?? 0;
  // Require intrinsic video dimensions to avoid measuring the DOM; if missing, skip overlay
  if (sw === 0 || sh === 0) return null;

  // Normalize to source coordinate space → percentages; container will scale visually with the video
  const normLeft = (mirror ? sw - (box.x + box.width) : box.x) / sw;
  const normTop = box.y / sh;
  const normW = box.width / sw;
  const normH = box.height / sh;
  const centerXPct = (normLeft + normW / 2) * 100;
  const centerYPct = (normTop + normH / 2) * 100;
  const ringSizePx = Math.max(48, Math.min(200, Math.min(box.width, box.height)));
  const ringSizeXPct = (ringSizePx / sw) * 100;
  const ringSizeYPct = (ringSizePx / sh) * 100;
  const haloSizePx = Math.round(ringSizePx * 1.18);
  const haloSizeXPct = (haloSizePx / sw) * 100;
  const haloSizeYPct = (haloSizePx / sh) * 100;

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {/* Progress ring anchored to face center */}
      {!hideRing && (
        <div
          className="absolute"
          style={{
            left: `calc(${centerXPct}% - ${ringSizeXPct / 2}%)`,
            top: `calc(${centerYPct}% - ${ringSizeYPct / 2}%)`,
            width: `${ringSizeXPct}%`,
            height: `${ringSizeYPct}%`,
          }}
        >
          <AnimatedProgressRing
            size={120}
            stroke={8}
            progress={progress}
            className="w-full h-full"
          />
        </div>
      )}
    </div>
  );
}

export default FaceOverlay;
