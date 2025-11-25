/**
 * @file Unified storage service for Kreativium.
 *
 * This is the single source of truth for all localStorage operations.
 * It provides:
 * - Zod schema validation for all entities
 * - Event emission for reactivity
 * - Backup/restore functionality
 * - Type-safe CRUD operations
 */

import {
  Alert,
  BackupSnapshot,
  Goal,
  Student,
  TrackingSession,
  UUID,
  XpSnapshot,
} from './types';
import { STORAGE_KEYS, STORAGE_NAMESPACE, StorageKey } from './storageKeys';
import { LocalStorageAdapter } from './localStorageAdapter';
import {
  alertSchema,
  backupSnapshotSchema,
  goalSchema,
  settingsSchema,
  studentSchema,
  trackingSessionSchema,
  xpSnapshotSchema,
} from './schema';
import { emitStorageEvent } from './storageEvents';
import { logger } from '@/lib/logger';

type Schema<T> = { safeParse(data: unknown): { success: true; data: T } | { success: false } };

const CURRENT_VERSION = 1;

const nowIso = (): string => new Date().toISOString();

const generateId = (): UUID => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `local_${Math.random().toString(36).slice(2, 10)}`;
};

const shouldLogStorageEvents = (): boolean => {
  const dev = Boolean((import.meta as ImportMeta).env?.DEV);
  if (dev) return true;
  if (typeof window !== 'undefined') {
    const win = window as typeof window & { __KREATIVIUM_DEBUG_STORAGE__?: boolean };
    return Boolean(win.__KREATIVIUM_DEBUG_STORAGE__);
  }
  return false;
};

const logStorageEvent = (event: string, details?: Record<string, unknown>) => {
  if (!shouldLogStorageEvents()) return;
  logger.debug('[storageService]', { event, ...(details ?? {}) });
};

export interface StorageRepositories {
  students: Student[];
  sessions: TrackingSession[];
  goals: Goal[];
  alerts: Alert[];
  xp: XpSnapshot;
  settings: Record<string, unknown>;
}

export interface SessionStats {
  total: number;
  active: number;
  paused: number;
  completed: number;
}

export class StorageService {
  private readonly adapter = new LocalStorageAdapter();

  constructor() {
    this.ensureVersion();
  }

  private ensureVersion(): void {
    const version = this.adapter.read<number>(STORAGE_KEYS.version);
    if (version === CURRENT_VERSION) return;
    this.adapter.write(STORAGE_KEYS.version, CURRENT_VERSION);
  }

  private readCollection<T>(key: string, schema: Schema<T[]>): T[] {
    const data = this.adapter.read<unknown>(key);
    if (!data) return [];
    const parsed = schema.safeParse(data);
    if (!parsed.success) return [];
    return parsed.data;
  }

  private notify(key: StorageKey): void {
    switch (key) {
      case STORAGE_KEYS.students:
        emitStorageEvent('students');
        break;
      case STORAGE_KEYS.sessions:
        emitStorageEvent('sessions');
        break;
      case STORAGE_KEYS.goals:
        emitStorageEvent('goals');
        break;
      case STORAGE_KEYS.alerts:
        emitStorageEvent('alerts');
        break;
      case STORAGE_KEYS.xp:
        emitStorageEvent('xp');
        break;
      case STORAGE_KEYS.settings:
        emitStorageEvent('settings');
        break;
      default:
        break;
    }
  }

  private writeCollection<T>(key: StorageKey, items: T[]): void {
    this.adapter.write(key, items);
    logStorageEvent('writeCollection', {
      key,
      count: Array.isArray(items) ? items.length : undefined,
    });
    this.notify(key);
  }

  private readObject<T>(key: StorageKey, schema: Schema<T>, fallback: T): T {
    const data = this.adapter.read<unknown>(key);
    if (!data) return fallback;
    const parsed = schema.safeParse(data);
    if (!parsed.success) return fallback;
    return parsed.data;
  }

  // Students
  listStudents(): Student[] {
    return this.readCollection(STORAGE_KEYS.students, studentSchema.array());
  }

  upsertStudent(partial: Partial<Student> & Pick<Student, 'name'> & { id?: UUID }): Student {
    const students = this.listStudents();
    const now = nowIso();
    if (partial.id) {
      const idx = students.findIndex((student) => student.id === partial.id);
      if (idx >= 0) {
        const updated: Student = {
          ...students[idx],
          ...partial,
          updatedAt: now,
        };
        studentSchema.parse(updated);
        students[idx] = updated;
        this.writeCollection(STORAGE_KEYS.students, students);
        logStorageEvent('upsertStudent', { id: updated.id, mode: 'update' });
        return updated;
      }
    }
    const student: Student = {
      id: generateId(),
      name: partial.name,
      avatarUrl: partial.avatarUrl,
      gradeLevel: partial.gradeLevel,
      dateOfBirth: partial.dateOfBirth,
      language: partial.language,
      guardians: partial.guardians,
      notes: partial.notes,
      createdAt: now,
      updatedAt: now,
    };
    studentSchema.parse(student);
    students.push(student);
    this.writeCollection(STORAGE_KEYS.students, students);
    logStorageEvent('upsertStudent', { id: student.id, mode: 'create' });
    return student;
  }

  deleteStudent(studentId: UUID): void {
    this.writeCollection(
      STORAGE_KEYS.students,
      this.listStudents().filter((student) => student.id !== studentId),
    );
    this.writeCollection(
      STORAGE_KEYS.sessions,
      this.listSessions().filter((session) => session.studentId !== studentId),
    );
    this.writeCollection(
      STORAGE_KEYS.goals,
      this.listGoals().filter((goal) => goal.studentId !== studentId),
    );
    this.writeCollection(
      STORAGE_KEYS.alerts,
      this.listAlerts().filter((alert) => alert.studentId !== studentId),
    );
    logStorageEvent('deleteStudent', { id: studentId });
  }

  // Sessions
  listSessions(): TrackingSession[] {
    return this.readCollection(STORAGE_KEYS.sessions, trackingSessionSchema.array());
  }

  getSessionStats(studentId?: UUID): SessionStats {
    const sessions = studentId ? this.listSessionsForStudent(studentId) : this.listSessions();
    const tally = {
      total: sessions.length,
      active: 0,
      paused: 0,
      completed: 0,
    };
    sessions.forEach((session) => {
      if (session.status === 'active') tally.active += 1;
      if (session.status === 'paused') tally.paused += 1;
      if (session.status === 'completed') tally.completed += 1;
    });
    return tally;
  }

  listSessionsForStudent(studentId: UUID): TrackingSession[] {
    return this.listSessions().filter((session) => session.studentId === studentId);
  }

  saveSession(session: TrackingSession): TrackingSession {
    trackingSessionSchema.parse(session);
    const sessions = this.listSessions();
    const idx = sessions.findIndex((item) => item.id === session.id);
    if (idx >= 0) {
      sessions[idx] = session;
    } else {
      sessions.push(session);
    }
    this.writeCollection(STORAGE_KEYS.sessions, sessions);
    logStorageEvent('saveSession', { id: session.id, status: session.status });
    return session;
  }

  deleteSession(sessionId: UUID): void {
    this.writeCollection(
      STORAGE_KEYS.sessions,
      this.listSessions().filter((session) => session.id !== sessionId),
    );
    logStorageEvent('deleteSession', { id: sessionId });
  }

  clearSessions(studentId?: UUID): void {
    const sessions = studentId ? this.listSessions().filter((s) => s.studentId !== studentId) : [];
    this.writeCollection(STORAGE_KEYS.sessions, sessions);
    logStorageEvent('clearSessions', { studentId });
  }

  // Goals
  listGoals(studentId?: UUID): Goal[] {
    const goals = this.readCollection(STORAGE_KEYS.goals, goalSchema.array());
    return studentId ? goals.filter((goal) => goal.studentId === studentId) : goals;
  }

  upsertGoal(goal: Goal): Goal {
    goalSchema.parse(goal);
    const goals = this.listGoals();
    const idx = goals.findIndex((g) => g.id === goal.id);
    if (idx >= 0) {
      goals[idx] = goal;
    } else {
      goals.push(goal);
    }
    this.writeCollection(STORAGE_KEYS.goals, goals);
    logStorageEvent('upsertGoal', { id: goal.id, mode: idx >= 0 ? 'update' : 'create' });
    return goal;
  }

  deleteGoal(goalId: UUID): void {
    this.writeCollection(
      STORAGE_KEYS.goals,
      this.listGoals().filter((goal) => goal.id !== goalId),
    );
    logStorageEvent('deleteGoal', { id: goalId });
  }

  // Alerts
  listAlerts(studentId?: UUID): Alert[] {
    const alerts = this.readCollection(STORAGE_KEYS.alerts, alertSchema.array());
    return studentId ? alerts.filter((alert) => alert.studentId === studentId) : alerts;
  }

  upsertAlert(alert: Alert): Alert {
    alertSchema.parse(alert);
    const alerts = this.listAlerts();
    const idx = alerts.findIndex((item) => item.id === alert.id);
    if (idx >= 0) {
      alerts[idx] = alert;
    } else {
      alerts.push(alert);
    }
    this.writeCollection(STORAGE_KEYS.alerts, alerts);
    logStorageEvent('upsertAlert', { id: alert.id, mode: idx >= 0 ? 'update' : 'create' });
    return alert;
  }

  deleteAlert(alertId: UUID): void {
    this.writeCollection(
      STORAGE_KEYS.alerts,
      this.listAlerts().filter((alert) => alert.id !== alertId),
    );
    logStorageEvent('deleteAlert', { id: alertId });
  }

  // XP
  getXpSnapshot(): XpSnapshot {
    return this.readObject(
      STORAGE_KEYS.xp,
      xpSnapshotSchema,
      { total: 0, streakDays: 0, perModule: {} },
    );
  }

  saveXpSnapshot(snapshot: XpSnapshot): void {
    xpSnapshotSchema.parse(snapshot);
    this.adapter.write(STORAGE_KEYS.xp, snapshot);
    logStorageEvent('saveXpSnapshot', { total: snapshot.total });
    this.notify(STORAGE_KEYS.xp);
  }

  // Settings
  getSettings<T extends Record<string, unknown>>(): T {
    return this.readObject(STORAGE_KEYS.settings, settingsSchema as Schema<T>, {} as T);
  }

  saveSettings<T extends Record<string, unknown>>(settings: T): void {
    settingsSchema.parse(settings);
    this.adapter.write(STORAGE_KEYS.settings, settings);
    logStorageEvent('saveSettings', { keys: Object.keys(settings).length });
    this.notify(STORAGE_KEYS.settings);
  }

  // Backup & restore
  exportSnapshot(): BackupSnapshot {
    const snapshot: BackupSnapshot = {
      version: CURRENT_VERSION,
      exportedAt: nowIso(),
      students: this.listStudents(),
      sessions: this.listSessions(),
      goals: this.listGoals(),
      alerts: this.listAlerts(),
      xp: this.getXpSnapshot(),
      settings: this.getSettings(),
    };
    backupSnapshotSchema.parse(snapshot);
    logStorageEvent('exportSnapshot', {
      students: snapshot.students.length,
      sessions: snapshot.sessions.length,
      goals: snapshot.goals.length,
      alerts: snapshot.alerts.length,
    });
    return snapshot;
  }

  importSnapshot(snapshot: BackupSnapshot, { merge = false } = {}): void {
    const parsed = backupSnapshotSchema.parse(snapshot);
    if (!merge) {
      this.clearAll();
    }
    this.writeCollection(STORAGE_KEYS.students, parsed.students);
    this.writeCollection(STORAGE_KEYS.sessions, parsed.sessions);
    this.writeCollection(STORAGE_KEYS.goals, parsed.goals);
    this.writeCollection(STORAGE_KEYS.alerts, parsed.alerts);
    this.saveXpSnapshot(parsed.xp);
    this.saveSettings(parsed.settings);
    this.adapter.write(STORAGE_KEYS.version, CURRENT_VERSION);
    logStorageEvent('importSnapshot', {
      merge,
      students: parsed.students.length,
      sessions: parsed.sessions.length,
      goals: parsed.goals.length,
      alerts: parsed.alerts.length,
    });
  }

  clearAll(): void {
    this.adapter.clearNamespace(STORAGE_NAMESPACE);
    logStorageEvent('clearAll');
  }

  footprint(): Array<{ key: string; bytes: number }> {
    const entries = this.adapter.footprint(STORAGE_NAMESPACE);
    logStorageEvent('footprint', { keys: entries.length });
    return entries;
  }
}

export const storageService = new StorageService();

export const createStudent = (name: string): Student =>
  storageService.upsertStudent({ name });



