import { STORAGE_KEYS } from '@/lib/storage/keys';

export type StickerId = 'hold-master' | 'name-hero' | 'streak-star';

export interface DailyProgress {
  date: string; // YYYY-MM-DD
  neutralHolds: number;
  correctChoices: number;
  nameItCorrect: number;
  streak: number;
  stickers: StickerId[];
}

function todayKey(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function storageKeyForStudent(studentId: string): string {
  return `${STORAGE_KEYS.PROGRESS_PREFIX}${studentId}`;
}

function getCurrentStudentId(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_STUDENT_ID) || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

function migrateGlobalToStudentOnce(studentId: string): void {
  try {
    const marker = `${STORAGE_KEYS.PROGRESS_MIGRATION_PREFIX}${studentId}`;
    if (localStorage.getItem(marker) === '1') return;
    const raw = localStorage.getItem(STORAGE_KEYS.PROGRESS_DAILY);
    if (!raw) return;
    const legacy = JSON.parse(raw) as Record<string, DailyProgress>;
    const existingRaw = localStorage.getItem(storageKeyForStudent(studentId));
    const merged = existingRaw ? { ...JSON.parse(existingRaw), ...legacy } : legacy;
    localStorage.setItem(storageKeyForStudent(studentId), JSON.stringify(merged));
    localStorage.setItem(marker, '1');
  } catch {}
}

export function loadStudentProgress(
  studentId: string = getCurrentStudentId(),
): Record<string, DailyProgress> {
  try {
    migrateGlobalToStudentOnce(studentId);
    const raw = localStorage.getItem(storageKeyForStudent(studentId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStudentProgress(studentId: string, map: Record<string, DailyProgress>): void {
  try {
    localStorage.setItem(storageKeyForStudent(studentId), JSON.stringify(map));
  } catch {}
}

// Backwards‑compatible aliases now scoped to current student
export function loadProgress(): Record<string, DailyProgress> {
  return loadStudentProgress(getCurrentStudentId());
}

export function saveProgress(map: Record<string, DailyProgress>): void {
  try {
    saveStudentProgress(getCurrentStudentId(), map);
  } catch {}
}

function ensureToday(map: Record<string, DailyProgress>): DailyProgress {
  const key = todayKey();
  if (!map[key]) {
    map[key] = {
      date: key,
      neutralHolds: 0,
      correctChoices: 0,
      nameItCorrect: 0,
      streak: 0,
      stickers: [],
    };
  }
  return map[key];
}

export function incCorrectChoice(studentId?: string): void {
  const sid = studentId || getCurrentStudentId();
  const map = loadStudentProgress(sid);
  const t = ensureToday(map);
  t.correctChoices += 1;
  t.streak += 1;
  saveStudentProgress(sid, map);
}

export function incNameIt(studentId?: string): void {
  const sid = studentId || getCurrentStudentId();
  const map = loadStudentProgress(sid);
  const t = ensureToday(map);
  t.nameItCorrect += 1;
  t.streak += 1;
  saveStudentProgress(sid, map);
}

export function incNeutralHold(studentId?: string): void {
  const sid = studentId || getCurrentStudentId();
  const map = loadStudentProgress(sid);
  const t = ensureToday(map);
  t.neutralHolds += 1;
  t.streak += 1;
  saveStudentProgress(sid, map);
}
