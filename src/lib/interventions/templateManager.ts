import { getInterventionById } from '@/lib/interventions/library';
import type { AlertEvent } from '@/lib/alerts/types';
import type { Intervention } from '@/types/student';
import { safeGet, safeSet } from '@/lib/storage';
import { storageService } from '@/lib/storage/storageService';

const INTERVENTION_SETTINGS_KEY = '__interventions:v1__';

type StoredIntervention = Omit<
  Intervention,
  'implementationDate' | 'endDate' | 'dataCollection'
> & {
  implementationDate: string;
  endDate?: string;
  dataCollection: Array<
    Omit<Intervention['dataCollection'][number], 'timestamp'> & { timestamp: string }
  >;
};

const serializeIntervention = (intervention: Intervention): StoredIntervention => ({
  ...intervention,
  implementationDate: intervention.implementationDate.toISOString(),
  endDate: intervention.endDate ? intervention.endDate.toISOString() : undefined,
  dataCollection: intervention.dataCollection.map((point) => ({
    ...point,
    timestamp: point.timestamp.toISOString(),
  })),
});

const deserializeIntervention = (intervention: StoredIntervention): Intervention => ({
  ...intervention,
  implementationDate: new Date(intervention.implementationDate),
  endDate: intervention.endDate ? new Date(intervention.endDate) : undefined,
  dataCollection: intervention.dataCollection.map((point) => ({
    ...point,
    timestamp: new Date(point.timestamp),
  })),
});

const readInterventionStore = (): Record<string, StoredIntervention[]> => {
  const settings = storageService.getSettings<Record<string, unknown>>();
  const raw = settings[INTERVENTION_SETTINGS_KEY];
  if (raw && typeof raw === 'object') {
    return raw as Record<string, StoredIntervention[]>;
  }
  return {};
};

const writeInterventionStore = (store: Record<string, StoredIntervention[]>): void => {
  const settings = storageService.getSettings<Record<string, unknown>>();
  storageService.saveSettings({
    ...settings,
    [INTERVENTION_SETTINGS_KEY]: store,
  });
};

const persistIntervention = (intervention: Intervention): Intervention => {
  const store = readInterventionStore();
  const serialized = serializeIntervention(intervention);
  const perStudent = store[intervention.studentId] ? [...store[intervention.studentId]] : [];
  const idx = perStudent.findIndex((item) => item.id === intervention.id);
  if (idx >= 0) {
    perStudent[idx] = serialized;
  } else {
    perStudent.push(serialized);
  }
  store[intervention.studentId] = perStudent;
  writeInterventionStore(store);
  return intervention;
};

export class InterventionTemplateManager {
  createFromAlert(
    alert: AlertEvent,
    templateId: string,
    overrides?: Partial<Intervention>,
  ): Intervention | null {
    const tpl = getInterventionById(templateId);
    if (!tpl) return null;
    const now = new Date();
    const intervention: Intervention = {
      id: `${alert.id}:${templateId}`,
      studentId: alert.studentId,
      title: tpl.hypothesis,
      description: tpl.rationale,
      category: 'behavioral',
      strategy: tpl.strategies.map((s) => s.title).join(', '),
      implementationDate: now,
      status: 'active',
      effectiveness: 3,
      frequency: 'daily',
      implementedBy: [],
      dataCollection: [],
      relatedGoals: [],
      ...overrides,
    } as Intervention;

    return persistIntervention(intervention);
  }

  customizeTemplate(intervention: Intervention, updates: Partial<Intervention>): Intervention {
    const next: Intervention = { ...intervention, ...updates } as Intervention;
    return persistIntervention(next);
  }

  scheduleReview(intervention: Intervention, daysFromNow = 7): Date {
    const date = new Date(Date.now() + daysFromNow * 24 * 3600_000);
    // For now, store as endDate to signal a review window
    const next = { ...intervention, endDate: date } as Intervention;
    persistIntervention(next);
    return date;
  }

  /**
   * Create a lightweight reminder entry tied to an alert without requiring a template.
   * Stored under per-student key and returns the saved reminder on success.
   */
  createReminder(
    alert: AlertEvent,
    dateISO: string,
  ): {
    id: string;
    studentId: string;
    alertId: string;
    dueAt: string;
    title: string;
    createdAt: string;
  } | null {
    try {
      const key = `reminders:list:${alert.studentId}`;
      const raw = safeGet(key);
      const list: any[] = raw ? (JSON.parse(raw) as any[]) : [];
      const reminder = {
        id: `${alert.id}:reminder:${Date.now()}`,
        studentId: alert.studentId,
        alertId: alert.id,
        dueAt: new Date(dateISO).toISOString(),
        title: (alert.metadata as any)?.summary || `Check-in for ${alert.kind}`,
        createdAt: new Date().toISOString(),
      };
      list.push(reminder);
      safeSet(key, JSON.stringify(list.slice(-500)));
      // Optionally broadcast an event for consumers
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('reminders:updated', { detail: { studentId: alert.studentId } }),
          );
        }
      } catch {
        /* noop */
      }
      return reminder;
    } catch {
      return null;
    }
  }
}

export default InterventionTemplateManager;
