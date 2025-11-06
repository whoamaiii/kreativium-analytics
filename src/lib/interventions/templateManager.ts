import { getInterventionById } from '@/lib/interventions/library';
import type { AlertEvent } from '@/lib/alerts/types';
import type { Intervention } from '@/types/student';
import { dataStorage } from '@/lib/dataStorage';
import { safeGet, safeSet } from '@/lib/storage';

export class InterventionTemplateManager {
  createFromAlert(alert: AlertEvent, templateId: string, overrides?: Partial<Intervention>): Intervention | null {
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

    dataStorage.saveIntervention(intervention);
    return intervention;
  }

  customizeTemplate(intervention: Intervention, updates: Partial<Intervention>): Intervention {
    const next: Intervention = { ...intervention, ...updates } as Intervention;
    dataStorage.saveIntervention(next);
    return next;
  }

  scheduleReview(intervention: Intervention, daysFromNow = 7): Date {
    const date = new Date(Date.now() + daysFromNow * 24 * 3600_000);
    // For now, store as endDate to signal a review window
    const next = { ...intervention, endDate: date } as Intervention;
    dataStorage.saveIntervention(next);
    return date;
  }

  /**
   * Create a lightweight reminder entry tied to an alert without requiring a template.
   * Stored under per-student key and returns the saved reminder on success.
   */
  createReminder(alert: AlertEvent, dateISO: string): { id: string; studentId: string; alertId: string; dueAt: string; title: string; createdAt: string } | null {
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
          window.dispatchEvent(new CustomEvent('reminders:updated', { detail: { studentId: alert.studentId } }));
        }
      } catch { /* noop */ }
      return reminder;
    } catch {
      return null;
    }
  }
}

export default InterventionTemplateManager;


