import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';

// Mock i18n translation hook to avoid loading actual resources
vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: (ns?: string) => ({
    t: (key: string) => `t:${ns ?? 'common'}:${key}`,
  }),
}));

// Spy on toast to verify user notifications are deduped
import * as toastModule from 'sonner';

// Provide a minimal host component to trigger the hook
import { useAnalyticsWorker } from '@/hooks/useAnalyticsWorker';

const makeData = () => ({
  entries: [],
  emotions: [],
  sensoryInputs: [],
});

function Host({ trigger }: { trigger?: boolean }) {
  const { runAnalysis } = useAnalyticsWorker();
  React.useEffect(() => {
    if (trigger) {
      void runAnalysis(makeData(), { student: { id: 's1', name: 'Test Student', createdAt: new Date() } as any, useAI: false });
    }
  }, [trigger, runAnalysis]);
  return null;
}

// Isolated module mock helpers
const resetAllMocks = () => {
  vi.resetModules();
  vi.clearAllMocks();
};

describe('useAnalyticsWorker: circuit and notifications', () => {
  beforeEach(() => {
    resetAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows one localized toast when worker is disabled via env flag (deduped)', async () => {
    // Mock env flags
    vi.doMock('@/lib/env', () => ({
      POC_MODE: false,
      DISABLE_ANALYTICS_WORKER: true,
    }));

    const toastSpy = vi.spyOn(toastModule, 'toast');

    // Import after mocks
    const { useAnalyticsWorker: Hook } = await import('@/hooks/useAnalyticsWorker');
    function HostInner({ trigger }: { trigger?: boolean }) {
      const { runAnalysis } = Hook();
      React.useEffect(() => {
        if (trigger) void runAnalysis(makeData(), { student: { id: 's1', name: 'Test Student', createdAt: new Date() } as any, useAI: false });
      }, [trigger, runAnalysis]);
      return null;
    }

    render(React.createElement(HostInner, { trigger: true }));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledTimes(1);
      const call = toastSpy.mock.calls[0]?.[0] as { title?: string; description?: string };
      expect(call.title).toContain('t:analytics:worker.disabledTitle');
      expect(call.description).toContain('t:analytics:worker.disabledDescription');
    });

    // Re-render to ensure dedupe (no second toast within window)
    render(React.createElement(HostInner, { trigger: true }));
    await new Promise(r => setTimeout(r, 10));
    expect(toastSpy).toHaveBeenCalledTimes(1);
  });

  it('opens circuit and shows one toast on worker runtime error (deduped)', async () => {
    // Enable worker; not disabled
    vi.doMock('@/lib/env', () => ({
      POC_MODE: false,
      DISABLE_ANALYTICS_WORKER: false,
    }));

    // Mock the worker constructor module used by the hook
    class FakeWorker {
      public onmessage: ((e: MessageEvent) => void) | null = null;
      public onerror: ((e: ErrorEvent) => void) | null = null;
      // Simulate immediate runtime error after creation
      constructor() {
        setTimeout(() => {
          this.onerror?.(new ErrorEvent('error', { message: 'boom' }));
        }, 0);
      }
      terminate() {/* noop */}
      postMessage() {/* noop */}
    }
    vi.doMock('@/workers/analytics.worker?worker', () => ({
      default: FakeWorker,
    }), { virtual: true });

    const toastSpy = vi.spyOn(toastModule, 'toast');

    // Import after mocks
    const { useAnalyticsWorker: Hook } = await import('@/hooks/useAnalyticsWorker');
    function HostInner({ trigger }: { trigger?: boolean }) {
      const { runAnalysis } = Hook();
      React.useEffect(() => {
        if (trigger) void runAnalysis(makeData(), { student: { id: 's1', name: 'Test Student', createdAt: new Date() } as any, useAI: false });
      }, [trigger, runAnalysis]);
      return null;
    }

    render(React.createElement(HostInner, { trigger: true }));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledTimes(1);
      const call = toastSpy.mock.calls[0]?.[0] as { title?: string; description?: string };
      // Fallback toast uses analytics worker fallback keys
      // We mock useTranslation to return t:<ns>:<key>
      expect(call.title).toContain('t:analytics:worker.fallbackTitle');
    });

    // Trigger again; dedupe should keep it at 1 within window
    render(React.createElement(HostInner, { trigger: true }));
    await new Promise(r => setTimeout(r, 10));
    expect(toastSpy).toHaveBeenCalledTimes(1);
  });
});
