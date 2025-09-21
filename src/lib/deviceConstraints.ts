import type { PrecomputationConfig } from '@/lib/analyticsConfig';

// Module-level activity tracker
let lastActivityTs = Date.now();
let activityListenersAttached = false;

function attachActivityListeners(): void {
  if (typeof window === 'undefined' || activityListenersAttached) return;
  const update = () => { lastActivityTs = Date.now(); };
  try {
    window.addEventListener('mousemove', update, { passive: true });
    window.addEventListener('keydown', update, { passive: true } as EventListenerOptions);
    window.addEventListener('mousedown', update, { passive: true });
    window.addEventListener('touchstart', update, { passive: true });
    window.addEventListener('scroll', update, { passive: true });
    activityListenersAttached = true;
  } catch { /* noop */ }
}

attachActivityListeners();

export function isUserIdle(minIdleMs: number): boolean {
  return Date.now() - lastActivityTs >= Math.max(0, minIdleMs);
}

export interface BatteryStatus {
  level: number; // 0..1
  charging: boolean;
}

export async function getBatteryStatus(): Promise<BatteryStatus | null> {
  try {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      // @ts-expect-error Battery API not in TS lib
      const batt = await (navigator as any).getBattery();
      return { level: batt.level ?? 1, charging: !!batt.charging };
    }
  } catch { /* noop */ }
  return null;
}

export interface NetworkInfoSummary {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export function getNetworkInfo(): NetworkInfoSummary {
  try {
    const nav = typeof navigator !== 'undefined' ? (navigator as any) : undefined;
    const conn = nav?.connection || nav?.mozConnection || nav?.webkitConnection;
    if (conn) {
      return {
        effectiveType: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt,
        saveData: conn.saveData,
      };
    }
  } catch { /* noop */ }
  return {};
}

export function isNetworkSlow(info: NetworkInfoSummary): boolean {
  const type = (info.effectiveType || '').toLowerCase();
  if (type.includes('2g') || type.includes('slow-2g')) return true;
  if (typeof info.downlink === 'number' && info.downlink < 1) return true; // < 1 Mbps
  if (typeof info.rtt === 'number' && info.rtt > 800) return true; // very high latency
  if (info.saveData === true) return true;
  return false;
}

export async function estimateCpuBusy(thresholdMs = 40): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  // Sample a few frames to estimate responsiveness. If average frame interval is high, CPU likely busy.
  const samples = 6;
  let last = performance.now();
  const deltas: number[] = [];
  await new Promise<void>((resolve) => {
    let count = 0;
    const step = () => {
      const now = performance.now();
      deltas.push(now - last);
      last = now;
      count++;
      if (count >= samples) return resolve();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  const avg = deltas.reduce((a, b) => a + b, 0) / Math.max(1, deltas.length);
  return avg > thresholdMs; // e.g., >40ms implies <25 FPS
}

export function isMemoryPressureHigh(): boolean {
  try {
    const anyPerf: any = (performance as any);
    if (anyPerf && anyPerf.memory && typeof anyPerf.memory.usedJSHeapSize === 'number') {
      const { usedJSHeapSize, totalJSHeapSize } = anyPerf.memory;
      const ratio = usedJSHeapSize / Math.max(1, totalJSHeapSize);
      return ratio > 0.85;
    }
  } catch { /* noop */ }
  return false;
}

export async function canPrecompute(config: PrecomputationConfig): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // User idle preference
  if (config.precomputeOnlyWhenIdle) {
    const idleOk = isUserIdle(Math.max(1000, config.idleTimeout));
    if (!idleOk) return false;
  }

  // Battery constraints
  if (config.respectBatteryLevel) {
    const batt = await getBatteryStatus();
    if (batt && !batt.charging && !config.enableOnBattery) {
      if (batt.level <= 0.3) return false;
    }
  }

  // Network constraints
  if (config.respectNetworkConditions && !config.enableOnSlowNetwork) {
    const net = getNetworkInfo();
    if (isNetworkSlow(net)) return false;
  }

  // CPU/memory
  if (config.respectCPUUsage) {
    if (isMemoryPressureHigh()) return false;
    try {
      const cpuBusy = await estimateCpuBusy();
      if (cpuBusy) return false;
    } catch { /* noop */ }
  }

  // Pause on activity
  if (config.pauseOnUserActivity) {
    const idleOk = isUserIdle(1500);
    if (!idleOk) return false;
  }

  return true;
}

export const deviceConstraints = {
  isUserIdle,
  getBatteryStatus,
  getNetworkInfo,
  isNetworkSlow,
  estimateCpuBusy,
  isMemoryPressureHigh,
  canPrecompute,
};



