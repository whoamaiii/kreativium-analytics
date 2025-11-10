let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return ctx;
  } catch {
    return null;
  }
}

export function playSuccessChime(volume: number = 0.15) {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const o1 = ac.createOscillator();
  const g = ac.createGain();
  o1.type = 'sine';
  o1.frequency.setValueAtTime(660, now);
  o1.frequency.exponentialRampToValueAtTime(990, now + 0.18);
  g.gain.value = Math.max(0, Math.min(1, volume));
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  o1.connect(g).connect(ac.destination);
  o1.start(now);
  o1.stop(now + 0.26);
}

export function playLevelUpFanfare(volume: number = 0.18) {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const g = ac.createGain();
  g.gain.value = Math.max(0, Math.min(1, volume));
  g.connect(ac.destination);

  const o1 = ac.createOscillator();
  o1.type = 'triangle';
  o1.frequency.setValueAtTime(523.25, now); // C5
  o1.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // E5
  o1.connect(g);
  o1.start(now);
  o1.stop(now + 0.28);

  const o2 = ac.createOscillator();
  o2.type = 'triangle';
  o2.frequency.setValueAtTime(783.99, now + 0.08); // G5
  o2.frequency.exponentialRampToValueAtTime(987.77, now + 0.28); // B5
  o2.connect(g);
  o2.start(now + 0.08);
  o2.stop(now + 0.36);

  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
}
