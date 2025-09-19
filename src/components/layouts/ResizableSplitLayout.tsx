import React from 'react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

export interface ResizableSplitLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultRatio?: number; // proportion for left pane [0..1]
  minLeftPx?: number;
  minRightPx?: number;
  storageKey: string;
  collapsedRight?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onResizeStart?: () => void;
  onResizeEnd?: (ratio: number) => void;
  className?: string;
}

/**
 * ResizableSplitLayout
 *
 * Accessible, high-performance split layout with a draggable separator.
 * - Keyboard: focus the separator and use ArrowLeft/Right (Shift = larger step)
 * - Pointer: drag the handle (requestAnimationFrame throttled)
 * - Double-click on the handle resets to defaultRatio
 * - State persistence using localStorage via storageKey
 */
export function ResizableSplitLayout({
  left,
  right,
  defaultRatio = 0.55,
  minLeftPx = 320,
  minRightPx = 360,
  storageKey,
  collapsedRight: collapsedRightProp,
  onCollapsedChange,
  onResizeStart,
  onResizeEnd,
  className,
}: ResizableSplitLayoutProps): React.ReactElement {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [ratio, setRatio] = React.useState<number>(() => {
    try { const v = localStorage.getItem(`${storageKey}:ratio`); return v ? Math.min(0.9, Math.max(0.1, parseFloat(v))) : defaultRatio; } catch { return defaultRatio; }
  });
  const [collapsedRight, setCollapsedRight] = React.useState<boolean>(() => {
    if (typeof collapsedRightProp === 'boolean') return collapsedRightProp;
    try { const v = localStorage.getItem(`${storageKey}:collapsedRight`); return v === '1'; } catch { return false; }
  });

  React.useEffect(() => {
    if (typeof collapsedRightProp === 'boolean') setCollapsedRight(collapsedRightProp);
  }, [collapsedRightProp]);

  const persist = (nextRatio: number, nextCollapsed: boolean | null = null) => {
    try { localStorage.setItem(`${storageKey}:ratio`, String(nextRatio)); } catch {}
    if (nextCollapsed !== null) {
      try { localStorage.setItem(`${storageKey}:collapsedRight`, nextCollapsed ? '1' : '0'); } catch {}
    }
  };

  const setCollapsed = (v: boolean) => {
    setCollapsedRight(v);
    persist(ratio, v);
    try { onCollapsedChange?.(v); logger.info('[UI] split.collapse.change', { collapsed: v }); } catch {}
  };

  const clampRatio = (r: number, containerWidth: number) => {
    const minLeftRatio = minLeftPx / containerWidth;
    const minRightRatio = minRightPx / containerWidth;
    return Math.min(1 - minRightRatio, Math.max(minLeftRatio, r));
  };

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const bounds = container.getBoundingClientRect();
    const startX = e.clientX;
    const startRatio = ratio;
    let frame = 0;
    try { onResizeStart?.(); logger.info('[UI] split.drag.start'); } catch {}

    const move = (clientX: number) => {
      const containerWidth = bounds.width;
      const leftPx = Math.max(0, Math.min(containerWidth, clientX - bounds.left));
      const next = clampRatio(leftPx / containerWidth, containerWidth);
      setRatio(next);
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        move(ev.clientX);
      });
    };
    const onPointerUp = () => {
      try { onResizeEnd?.(ratio); logger.info('[UI] split.drag.end', { ratio }); } catch {}
      persist(ratio);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp, { once: true });
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.getBoundingClientRect().width;
    const step = (e.shiftKey ? 0.08 : 0.02);
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = clampRatio(ratio - step, containerWidth);
      setRatio(next); persist(next);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = clampRatio(ratio + step, containerWidth);
      setRatio(next); persist(next);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setCollapsed(!collapsedRight);
    }
  };

  const onDoubleClick: React.MouseEventHandler<HTMLDivElement> = () => {
    setRatio(defaultRatio); persist(defaultRatio);
  };

  const gridTemplate = collapsedRight
    ? '1fr var(--split-handle) 0px'
    : `${Math.round(ratio * 100)}% var(--split-handle) 1fr`;

  return (
    <div
      ref={containerRef}
      className={cn('relative h-full w-full', className)}
      style={{
        // handle width as CSS var
        ['--split-handle' as any]: '12px',
        display: 'grid',
        gridTemplateColumns: gridTemplate,
      }}
    >
      <div className="min-w-0 overflow-hidden border-r">{left}</div>
      <div
        role="separator"
        aria-orientation="vertical"
        tabIndex={0}
        aria-label="Resizer"
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        onDoubleClick={onDoubleClick}
        className="group relative flex items-stretch justify-center cursor-col-resize outline-none"
      >
        <div className="pointer-events-none absolute inset-y-0 w-px bg-border" />
        <button
          type="button"
          className="m-auto h-16 w-1.5 rounded-full bg-border group-hover:bg-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Dra for å endre størrelse"
          title="Dra for å endre størrelse • Dobbeltklikk for å nullstille • Enter for å skjule/vis"
          onClick={(e) => { e.preventDefault(); }}
        />
      </div>
      <div className={cn('min-w-0 overflow-hidden', collapsedRight ? 'hidden' : '')}>{right}</div>
    </div>
  );
}


