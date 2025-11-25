import { logger } from '@/lib/logger';
import { useEffect, useRef, useCallback } from 'react';
import type { ReportsWorkerRequest, ReportsWorkerResponse } from '@/workers/reports.worker';
import ReportsWorker from '@/workers/reports.worker?worker';

interface RunOptions {
  kind: 'csv' | 'json';
  students: unknown[];
  allData: {
    trackingEntries: unknown[];
    emotions: unknown[];
    sensoryInputs: unknown[];
    goals: unknown[];
  };
  options: {
    includeFields: string[];
    dateRange?: { start: Date; end: Date } | undefined;
    anonymize?: boolean;
  };
  onProgress?: (p: { progress: number; message?: string }) => void;
}

export function useReportsWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<
    Map<
      string,
      {
        resolve: (content: string) => void;
        reject: (error: Error) => void;
        onProgress?: (p: { progress: number; message?: string }) => void;
      }
    >
  >(new Map());

  useEffect(() => {
    const w = new ReportsWorker();
    const pendingMap = pendingRef.current;

    // Single message handler dispatches to the correct pending promise by id
    w.onmessage = (evt: MessageEvent<ReportsWorkerResponse>) => {
      const msg = evt.data;
      if (!msg) return;
      const entry = pendingRef.current.get(msg.id);
      if (!entry) return;

      if (msg.type === 'progress') {
        entry.onProgress?.({ progress: msg.progress, message: msg.message });
      } else if (msg.type === 'success') {
        pendingRef.current.delete(msg.id);
        entry.resolve(msg.content);
      } else if (msg.type === 'error') {
        pendingRef.current.delete(msg.id);
        entry.reject(new Error(msg.error));
      }
    };

    w.onerror = () => {
      // Reject all pending requests on fatal worker error
      pendingMap.forEach((entry, id) => {
        try {
          entry.reject(new Error('Reports worker error'));
        } catch (e) {
          try {
            logger.warn('[useReportsWorker] Failed to reject promise on worker error', e as Error);
          } catch {
            // @silent-ok: logger failure is non-critical
          }
        }
        pendingMap.delete(id);
      });
    };

    workerRef.current = w;
    return () => {
      // Reject any still-pending promises to avoid hanging callers
      pendingMap.forEach((entry, id) => {
        try {
          entry.reject(new Error('Reports worker terminated'));
        } catch (e) {
          try {
            logger.warn(
              '[useReportsWorker] Failed to reject promise on worker termination',
              e as Error,
            );
          } catch {
            // @silent-ok: logger failure is non-critical
          }
        }
        pendingMap.delete(id);
      });
      w.terminate();
      workerRef.current = null;
    };
  }, []);

  const run = useCallback(async (opts: RunOptions): Promise<string> => {
    if (!workerRef.current) throw new Error('Reports worker not initialized');
    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

    return new Promise<string>((resolve, reject) => {
      // Register pending handlers
      pendingRef.current.set(id, {
        resolve,
        reject,
        onProgress: opts.onProgress,
      });

      const payload: ReportsWorkerRequest = {
        id,
        kind: opts.kind,
        payload: {
          students: opts.students,
          allData: opts.allData,
          options: {
            format: opts.kind,
            includeFields: opts.options.includeFields,
            anonymize: opts.options.anonymize,
            dateRange: opts.options.dateRange
              ? {
                  start: opts.options.dateRange.start.toISOString(),
                  end: opts.options.dateRange.end.toISOString(),
                }
              : null,
          },
        },
      };
      workerRef.current!.postMessage(payload);
    });
  }, []);

  return { run };
}
