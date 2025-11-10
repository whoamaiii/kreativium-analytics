import React from 'react';
import type { DetectionBox } from '@/detector/types';

type TargetKey = 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised';

interface HintHeatmapOverlayProps {
  visible: boolean;
  box: DetectionBox | null;
  target: TargetKey;
  mirror?: boolean;
  sourceWidth?: number;
  sourceHeight?: number;
}

function getRegionsForTarget(target: TargetKey): { upper: boolean; lower: boolean } {
  switch (target) {
    case 'happy':
    case 'disgusted':
      return { upper: false, lower: true };
    case 'surprised':
      return { upper: true, lower: true };
    case 'angry':
    case 'sad':
    case 'fearful':
      return { upper: true, lower: false };
    case 'neutral':
    default:
      return { upper: false, lower: false };
  }
}

export function HintHeatmapOverlay({
  visible,
  box,
  target,
  mirror = false,
  sourceWidth,
  sourceHeight,
}: HintHeatmapOverlayProps) {
  if (!visible || !box) return null;
  const sw = sourceWidth ?? 0;
  const sh = sourceHeight ?? 0;
  if (sw === 0 || sh === 0) return null;

  const normLeft = (mirror ? sw - (box.x + box.width) : box.x) / sw;
  const normTop = box.y / sh;
  const normW = box.width / sw;
  const normH = box.height / sh;
  const regions = getRegionsForTarget(target);

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {/* Upper (eyes/brows) hint */}
      {regions.upper && (
        <div
          className="absolute"
          style={{
            left: `${normLeft * 100}%`,
            top: `${normTop * 100}%`,
            width: `${normW * 100}%`,
            height: `${normH * 45}%`,
            background:
              'radial-gradient(ellipse at center, rgba(59,130,246,0.28) 0%, rgba(59,130,246,0.18) 40%, rgba(59,130,246,0.0) 70%)',
            boxShadow: '0 0 0 1px rgba(59,130,246,0.2) inset',
            borderRadius: '12px',
          }}
        />
      )}
      {/* Lower (mouth/jaw) hint */}
      {regions.lower && (
        <div
          className="absolute"
          style={{
            left: `${normLeft * 100}%`,
            top: `${(normTop + normH * 0.55) * 100}%`,
            width: `${normW * 100}%`,
            height: `${normH * 45}%`,
            background:
              'radial-gradient(ellipse at center, rgba(16,185,129,0.3) 0%, rgba(16,185,129,0.18) 40%, rgba(16,185,129,0.0) 70%)',
            boxShadow: '0 0 0 1px rgba(16,185,129,0.2) inset',
            borderRadius: '12px',
          }}
        />
      )}
    </div>
  );
}

export default HintHeatmapOverlay;
