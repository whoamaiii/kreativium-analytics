import { safeLocalStorageGet, safeJsonParse, safeJsonStringify, safeLocalStorageSet } from '@/lib/utils/errorHandling';

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

const STORAGE_KEY = 'emotion.dailyProgress'; // legacy global
const STUDENT_PREFIX = 'progress:'; // progress:<studentId>

function storageKeyForStudent(studentId: string): string {
  return `${STUDENT_PREFIX}${studentId}`;
}

function getCurrentStudentId(): string {
  return safeLocalStorageGet('current.studentId', 'anonymous', 'progress-store.getCurrentStudentId');
}

function migrateGlobalToStudentOnce(studentId: string): void {
  const marker = `progress.migratedFor:${studentId}`;
  if (safeLocalStorageGet(marker, '', 'progress-store.migration') === '1') return;

  const raw = safeLocalStorageGet(STORAGE_KEY, '', 'progress-store.migrationLegacy');
  if (!raw) return;

  const legacy = safeJsonParse<Record<string, DailyProgress>>(raw, {}, 'progress-store.parseLegacy');
  const existingRaw = safeLocalStorageGet(storageKeyForStudent(studentId), '', 'progress-store.existing');
  const merged = existingRaw
    ? { ...safeJsonParse<Record<string, DailyProgress>>(existingRaw, {}, 'progress-store.parseExisting'), ...legacy }
    : legacy;

  const mergedJson = safeJsonStringify(merged, '{}', 'progress-store.stringifyMerged');
  safeLocalStorageSet(storageKeyForStudent(studentId), mergedJson, 'progress-store.saveMerged');
  safeLocalStorageSet(marker, '1', 'progress-store.setMarker');
}

export function loadStudentProgress(studentId: string = getCurrentStudentId()): Record<string, DailyProgress> {
  migrateGlobalToStudentOnce(studentId);
  const raw = safeLocalStorageGet(storageKeyForStudent(studentId), '', 'progress-store.load');
  return raw ? safeJsonParse<Record<string, DailyProgress>>(raw, {}, 'progress-store.parseLoad') : {};
}

export function saveStudentProgress(studentId: string, map: Record<string, DailyProgress>): void {
  const json = safeJsonStringify(map, '{}', 'progress-store.save');
  safeLocalStorageSet(storageKeyForStudent(studentId), json, 'progress-store.save');
}

// Backwards‑compatible aliases now scoped to current student
export function loadProgress(): Record<string, DailyProgress> {
  return loadStudentProgress(getCurrentStudentId());
}

export function saveProgress(map: Record<string, DailyProgress>): void {
  saveStudentProgress(getCurrentStudentId(), map);
}

function ensureToday(map: Record<string, DailyProgress>): DailyProgress {
  const key = todayKey();
  if (!map[key]) {
    map[key] = { date: key, neutralHolds: 0, correctChoices: 0, nameItCorrect: 0, streak: 0, stickers: [] };
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



