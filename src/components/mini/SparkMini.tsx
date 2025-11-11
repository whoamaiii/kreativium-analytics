import React from 'react';

export interface SparkMiniProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  ariaLabel?: string;
}

export function SparkMini({
  values,
  width = 120,
  height = 40,
  color = '#0ea5e9',
  ariaLabel = 'trend',
}: SparkMiniProps) {
  if (!values || values.length < 2) {
    return (
      <div
        className="h-10 w-[120px] rounded bg-muted/40 text-xs grid place-items-center text-muted-foreground"
        role="img"
        aria-label={`${ariaLabel}: no data`}
      >
        —
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const path = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (width - 4) + 2;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  const areaPath = `${path} L${width - 2},${height - 2} L2,${height - 2} Z`;

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={ariaLabel}
      focusable="false"
      className="overflow-visible"
    >
      <path d={areaPath} fill={`${color}1a`} />
      <path d={path} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default SparkMini;
