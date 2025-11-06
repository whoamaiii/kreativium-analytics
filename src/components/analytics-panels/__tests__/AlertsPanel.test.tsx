import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, render, screen } from '@testing-library/react';
import { useAlerts } from '@/hooks/useAlerts';
import { AlertSystemBridge } from '@/lib/alerts/bridge';
import { AlertsPanel } from '@/components/analytics-panels/AlertsPanel';
import type { AlertEvent } from '@/lib/alerts/types';

vi.mock('@/lib/alerts/bridge', () => {
  return {
    AlertSystemBridge: vi.fn().mockImplementation(() => ({
      detectLegacyPresent: vi.fn(() => true),
      convertLegacyToNew: vi.fn(() => []),
      migrateStorageFormat: vi.fn(() => ({ ok: true, added: 0, hadLegacy: true })),
      startLegacyPolling: vi.fn(() => () => {}),
    })),
  };
});

const mockCreateFromAlert = vi.fn();
const mockCreateReminder = vi.fn();
vi.mock('@/lib/interventions/templateManager', () => {
  return {
    __esModule: true,
    default: class InterventionTemplateManager {
      createFromAlert = mockCreateFromAlert;
      customizeTemplate = vi.fn((i, u) => ({ ...i, ...u }));
      scheduleReview = vi.fn();
      createReminder = mockCreateReminder;
    },
    InterventionTemplateManager: class InterventionTemplateManager {
      createFromAlert = mockCreateFromAlert;
      customizeTemplate = vi.fn((i, u) => ({ ...i, ...u }));
      scheduleReview = vi.fn();
      createReminder = mockCreateReminder;
    },
  };
});

describe('useAlerts bridge integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes and loads without throwing when no alerts', () => {
    const { result } = renderHook(() => useAlerts({ studentId: 's1' } as any));
    expect(result.current.alerts).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(AlertSystemBridge).toHaveBeenCalled();
  });

  it('fires alerts:updated to trigger reload', () => {
    const { result } = renderHook(() => useAlerts({ studentId: 's1' } as any));
    expect(result.current.alerts).toEqual([]);
    act(() => {
      window.dispatchEvent(new CustomEvent('alerts:updated', { detail: { studentId: 's1' } }));
    });
    expect(result.current.error).toBeNull();
  });

  it('migrates from legacy when convertLegacyToNew returns events', async () => {
    const legacyEvent: AlertEvent = { id: 'lx1', studentId: 's1', kind: 'data_quality' as any, severity: 'low' as any, confidence: 0.5, createdAt: new Date().toISOString(), status: 'new' as any };
    const Bridge = (AlertSystemBridge as unknown as vi.Mock);
    Bridge.mockImplementationOnce(() => ({
      detectLegacyPresent: vi.fn(() => true),
      convertLegacyToNew: vi.fn(() => [legacyEvent]),
      migrateStorageFormat: vi.fn(() => ({ ok: true, added: 1, hadLegacy: true })),
      startLegacyPolling: vi.fn(() => () => {}),
    }));
    const { result } = renderHook(() => useAlerts({ studentId: 's1' } as any));
    await Promise.resolve();
    expect(result.current.alerts.find((a) => a.id === 'lx1')).toBeTruthy();
  });
});

describe('AlertsPanel interactions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function seedAlerts(studentId = 's1') {
    const key = `alerts:list:${studentId}`;
    const now = new Date().toISOString();
    const sample: AlertEvent[] = [
      { id: 'a1', studentId, kind: 'behavior_spike' as any, severity: 'important' as any, confidence: 0.9, createdAt: now, status: 'new' as any, metadata: { summary: 'Spike' } },
      { id: 'a2', studentId, kind: 'data_quality' as any, severity: 'low' as any, confidence: 0.6, createdAt: now, status: 'new' as any, metadata: { summary: 'DQ' } },
    ];
    localStorage.setItem(key, JSON.stringify(sample));
  }

  it('renders filters and applies kind filter', async () => {
    seedAlerts();
    render(<AlertsPanel filteredData={{ entries: [], emotions: [], sensoryInputs: [] }} studentId="s1" />);
    expect(await screen.findByText(/Total:/)).toBeInTheDocument();
    const kindBtn = await screen.findByRole('button', { name: /data quality/i });
    act(() => kindBtn.click());
    expect(screen.getByText(/Total:/)).toBeInTheDocument();
  });

  it('opens Create Goal dialog from details', async () => {
    seedAlerts();
    render(<AlertsPanel filteredData={{ entries: [], emotions: [], sensoryInputs: [] }} studentId="s1" />);
    const detailsBtn = await screen.findByRole('button', { name: /details/i });
    act(() => detailsBtn.click());
    const createGoalBtn = await screen.findByRole('button', { name: /create goal/i });
    act(() => createGoalBtn.click());
    expect(await screen.findByText(/Create Goal from Alert/i)).toBeInTheDocument();
    // a11y: dialog role exists
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('invokes template manager and reminder scheduling actions', async () => {
    seedAlerts();
    mockCreateFromAlert.mockReset();
    mockCreateReminder.mockReset().mockReturnValue({ id: 'r1' });
    render(<AlertsPanel filteredData={{ entries: [], emotions: [], sensoryInputs: [] }} studentId="s1" />);
    const detailsBtn = await screen.findByRole('button', { name: /details/i });
    act(() => detailsBtn.click());
    const addTplBtn = await screen.findByRole('button', { name: /add template/i });
    act(() => addTplBtn.click());
    expect(mockCreateFromAlert).toHaveBeenCalled();
    const schedBtn = await screen.findByRole('button', { name: /schedule t\+7 review/i });
    act(() => schedBtn.click());
    expect(mockCreateReminder).toHaveBeenCalled();
  });

  it('bulk op Acknowledge ≥ 80% updates storage', async () => {
    seedAlerts();
    render(<AlertsPanel filteredData={{ entries: [], emotions: [], sensoryInputs: [] }} studentId="s1" />);
    const ackBtn = await screen.findByRole('button', { name: /Ack ≥ 80%/i });
    act(() => ackBtn.click());
    const raw = localStorage.getItem('alerts:list:s1');
    const arr = raw ? (JSON.parse(raw) as AlertEvent[]) : [];
    const updated = arr.find((a) => a.id === 'a1');
    expect(updated?.status).toBe('acknowledged');
  });
});
