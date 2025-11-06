import React, { useEffect, useMemo, useRef, useState } from 'react';

interface ConfettiBurstProps {
  active: boolean;
  durationMs?: number;
  particles?: number;
  colors?: string[];
  className?: string;
  origin?: { x: number; y: number }; // normalized 0..1 within canvas
  spreadDeg?: number; // 360 = full circle
  speed?: number; // base velocity multiplier
  origins?: Array<{ x: number; y: number; spreadDeg?: number; speed?: number; particles?: number }>; // optional multi-source
}

/**
 * Lightweight canvas confetti with better spread and DPR scaling.
 * Mount only while active to run the burst.
 */
export function ConfettiBurst({
  active,
  durationMs = 900,
  particles = 110,
  colors = ['#34d399', '#60a5fa', '#f472b6', '#f59e0b', '#a78bfa'],
  className,
  origin = { x: 0.5, y: 0.6 },
  spreadDeg = 320,
  speed = 1,
  origins,
}: ConfettiBurstProps) {
  // Defer initial readiness to the next paint; keep hooks order stable across renders
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Normalize object/array props to primitives to avoid effect re-runs from identity changes
  const originX = origin?.x ?? 0.5;
  const originY = origin?.y ?? 0.6;
  // Memoize colors to a stable array to prevent React internal warnings when DevTools/dev-mode checks identity
  const palette = useMemo(() => (Array.isArray(colors) ? [...colors] : ['#34d399', '#60a5fa', '#f472b6', '#f59e0b', '#a78bfa']), [/* static */]);

  useEffect(() => {
    if (!active || !ready) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const motionReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (motionReduced) return; // respect user setting

    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    let width = canvas.clientWidth;
    let height = canvas.clientHeight;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const onResize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas);

    const groups = (origins && origins.length
      ? origins.map(o => ({
          cx: Math.max(0, Math.min(1, o.x)) * width,
          cy: Math.max(0, Math.min(1, o.y)) * height,
          spread: Math.max(1, Math.min(360, o.spreadDeg ?? spreadDeg)) * (Math.PI / 180),
          speed: o.speed ?? speed,
          particles: Math.max(1, Math.floor(o.particles ?? particles)),
        }))
      : [{ cx: Math.max(0, Math.min(1, originX)) * width, cy: Math.max(0, Math.min(1, originY)) * height, spread: Math.max(1, Math.min(360, spreadDeg)) * (Math.PI / 180), speed, particles }]
    );

    const parts: Array<{ x: number; y: number; vx: number; vy: number; r: number; c: string; g: number; life: number; rot: number }> = [];
    for (const g of groups) {
      const startAngle = (Math.PI * 2 - g.spread) / 2;
      for (let i = 0; i < g.particles; i += 1) {
        const angle = startAngle + Math.random() * g.spread;
        const mag = (2.2 + Math.random() * 5.2) * g.speed;
        parts.push({
          x: g.cx,
          y: g.cy,
          vx: Math.cos(angle) * mag,
          vy: Math.sin(angle) * mag,
          r: Math.random() * 2.6 + 1.6,
          c: palette[Math.floor(Math.random() * palette.length)],
          g: 0.22 + Math.random() * 0.14,
          life: 1,
          rot: Math.random() * Math.PI,
        });
      }
    }

    let raf = 0;
    const startTs = performance.now();
    const tick = (t: number) => {
      const elapsed = t - startTs;
      ctx.clearRect(0, 0, width, height);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.g; // gravity
        p.vx *= 0.992; // air resistance
        p.vy *= 0.992;
        p.rot += 0.08;
        p.life = Math.max(0, 1 - elapsed / durationMs);
        ctx.globalAlpha = Math.min(1, Math.max(0, p.life));
        ctx.fillStyle = p.c;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
        ctx.restore();
      }
      if (elapsed < durationMs) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  // Intentionally exclude `colors` array to avoid effect restarts from referential changes
  }, [active, ready, durationMs, particles, originX, originY, spreadDeg, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={className ?? 'absolute inset-0 pointer-events-none'}
      style={{ display: active && ready ? 'block' : 'none' }}
    />
  );
}

export default ConfettiBurst;



