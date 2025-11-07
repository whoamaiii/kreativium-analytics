import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CONFETTI, ANGLE, NORMALIZATION, DPR } from '@/config/constants';

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
  durationMs = CONFETTI.DURATION_MS,
  particles = CONFETTI.PARTICLES,
  colors = CONFETTI.COLORS,
  className,
  origin = { x: CONFETTI.ORIGIN_X, y: CONFETTI.ORIGIN_Y },
  spreadDeg = CONFETTI.SPREAD_DEG,
  speed = CONFETTI.SPEED,
  origins,
}: ConfettiBurstProps) {
  // Defer initial readiness to the next paint; keep hooks order stable across renders
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Normalize object/array props to primitives to avoid effect re-runs from identity changes
  const originX = origin?.x ?? CONFETTI.ORIGIN_X;
  const originY = origin?.y ?? CONFETTI.ORIGIN_Y;
  // Memoize colors to a stable array to prevent React internal warnings when DevTools/dev-mode checks identity
  const palette = useMemo(() => (Array.isArray(colors) ? [...colors] : [...CONFETTI.COLORS]), [/* static */]);

  useEffect(() => {
    if (!active || !ready) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const motionReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (motionReduced) return; // respect user setting

    const dpr = Math.max(DPR.MIN, Math.floor(window.devicePixelRatio || DPR.MIN));
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
          cx: Math.max(NORMALIZATION.MIN, Math.min(NORMALIZATION.MAX, o.x)) * width,
          cy: Math.max(NORMALIZATION.MIN, Math.min(NORMALIZATION.MAX, o.y)) * height,
          spread: Math.max(DPR.MIN, Math.min(CONFETTI.FULL_CIRCLE_DEG, o.spreadDeg ?? spreadDeg)) * ANGLE.DEG_TO_RAD,
          speed: o.speed ?? speed,
          particles: Math.max(DPR.MIN, Math.floor(o.particles ?? particles)),
        }))
      : [{ cx: Math.max(NORMALIZATION.MIN, Math.min(NORMALIZATION.MAX, originX)) * width, cy: Math.max(NORMALIZATION.MIN, Math.min(NORMALIZATION.MAX, originY)) * height, spread: Math.max(DPR.MIN, Math.min(CONFETTI.FULL_CIRCLE_DEG, spreadDeg)) * ANGLE.DEG_TO_RAD, speed, particles }]
    );

    const parts: Array<{ x: number; y: number; vx: number; vy: number; r: number; c: string; g: number; life: number; rot: number }> = [];
    for (const g of groups) {
      const startAngle = (ANGLE.FULL_CIRCLE_RAD - g.spread) / 2;
      for (let i = 0; i < g.particles; i += 1) {
        const angle = startAngle + Math.random() * g.spread;
        const mag = (CONFETTI.PHYSICS.VELOCITY_MIN + Math.random() * CONFETTI.PHYSICS.VELOCITY_RANGE) * g.speed;
        parts.push({
          x: g.cx,
          y: g.cy,
          vx: Math.cos(angle) * mag,
          vy: Math.sin(angle) * mag,
          r: Math.random() * CONFETTI.PHYSICS.RADIUS_RANGE + CONFETTI.PHYSICS.RADIUS_MIN,
          c: palette[Math.floor(Math.random() * palette.length)],
          g: CONFETTI.PHYSICS.GRAVITY_BASE + Math.random() * CONFETTI.PHYSICS.GRAVITY_VARIANCE,
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
        p.vx *= CONFETTI.PHYSICS.AIR_RESISTANCE; // air resistance
        p.vy *= CONFETTI.PHYSICS.AIR_RESISTANCE;
        p.rot += CONFETTI.PHYSICS.ROTATION_SPEED;
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



