/* eslint-disable no-restricted-syntax */
// Vite builds this as a module worker (see vite.config.ts worker.format = 'es')
import { exportSystem as ExportSystem } from '@/lib/exportSystem';
import type { Student, TrackingEntry, EmotionEntry, SensoryEntry, Goal } from '@/types/student';

/**
 * Export options for CSV/JSON generation
 */
export interface ExportOptions {
  format: 'csv' | 'json';
  includeFields: string[];
  dateRange?: { start: Date; end: Date } | null;
  anonymize?: boolean;
}

/**
 * All data structure for export operations
 */
export interface AllDataForExport {
  trackingEntries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  goals: Goal[];
}

export type ReportsWorkerRequest = {
  id: string;
  kind: 'csv' | 'json';
  payload: {
    students: Student[];
    allData: AllDataForExport;
    options: {
      format: 'csv' | 'json';
      includeFields: string[];
      dateRange?: { start: string; end: string } | null;
      anonymize?: boolean;
    };
  };
};

export type ReportsWorkerResponse =
  | { id: string; type: 'progress'; progress: number; message?: string }
  | { id: string; type: 'success'; content: string; kind: 'csv' | 'json' }
  | { id: string; type: 'error'; error: string };

self.addEventListener('message', (evt: MessageEvent<ReportsWorkerRequest>) => {
  const msg = evt.data;
  const respond = (data: ReportsWorkerResponse) => (self as unknown as Worker).postMessage(data);

  try {
    respond({ id: msg.id, type: 'progress', progress: 0.05, message: 'starting' });

    const { students, allData, options } = msg.payload;

    // Progress hint: filtering window
    respond({ id: msg.id, type: 'progress', progress: 0.2, message: 'preparing' });

    const exportOptions: ExportOptions = {
      ...options,
      dateRange: options.dateRange
        ? { start: new Date(options.dateRange.start), end: new Date(options.dateRange.end) }
        : null,
    };

    let content = '';
    if (msg.kind === 'csv') {
      content = ExportSystem.generateCSVExport(students, allData, exportOptions);
    } else if (msg.kind === 'json') {
      content = ExportSystem.generateJSONExport(students, allData, exportOptions);
    }

    respond({ id: msg.id, type: 'progress', progress: 0.95, message: 'finalizing' });
    respond({ id: msg.id, type: 'success', content, kind: msg.kind });
  } catch (e) {
    respond({ id: msg.id, type: 'error', error: e instanceof Error ? e.message : 'Unknown error' });
  }
});
