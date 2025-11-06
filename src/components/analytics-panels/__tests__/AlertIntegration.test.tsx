import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AlertCard } from '@/components/alerts/AlertCard';
import AlertsPanel from '@/components/analytics-panels/AlertsPanel';
import type { AlertEvent } from '@/lib/alerts/types';

function makeAlert(overrides: Partial<AlertEvent> = {}): AlertEvent {
  const base: AlertEvent = {
    id: Math.random().toString(36).slice(2),
    studentId: 's1',
    kind: 'behavior_change' as any,
    severity: 'Moderate' as any,
    status: 'new' as any,
    confidence: 0.72,
    createdAt: new Date().toISOString(),
    sources: [
      { type: 'detectorA', label: 'Outlier', details: { rank: 'S1' } } as any,
      { type: 'detectorB', label: 'Spike', details: { rank: 'S2' } } as any,
    ],
    metadata: {
      summary: 'Behavior shifted in afternoons',
      sparkValues: [1, 2, 3, 4, 3, 2, 4],
      sparkTimestamps: [1, 2, 3, 4, 5, 6, 7],
    },
  };
  return { ...base, ...overrides };
}

describe('Alert Integration', () => {
  const origDispatch = window.dispatchEvent;
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    window.dispatchEvent = origDispatch;
  });

  it('renders AlertCard with confidence and sources', () => {
    const alert = makeAlert();
    render(<AlertCard alert={alert as any} />);
    expect(screen.getByText(/Confidence 72%/i)).toBeInTheDocument();
    expect(screen.getByText(/Sources/i)).toBeInTheDocument();
  });

  it('Ack button is enabled only for New status', () => {
    const newAlert = makeAlert({ status: 'new' as any });
    const acked = makeAlert({ status: 'acknowledged' as any });
    const resolved = makeAlert({ status: 'resolved' as any });

    const { rerender } = render(<AlertCard alert={newAlert as any} />);
    const ackBtn1 = screen.getByRole('button', { name: /Acknowledge alert/i });
    expect(ackBtn1).not.toBeDisabled();

    rerender(<AlertCard alert={acked as any} />);
    const ackBtn2 = screen.getByRole('button', { name: /Acknowledge alert/i });
    expect(ackBtn2).toBeDisabled();

    rerender(<AlertCard alert={resolved as any} />);
    const ackBtn3 = screen.getByRole('button', { name: /Acknowledge alert/i });
    expect(ackBtn3).toBeDisabled();
  });

  it('expands sources and shows S1/S2/S3 ranks', () => {
    const alert = makeAlert({
      sources: [
        { type: 'detectorA', label: 'Outlier', details: { rank: 'S1' } } as any,
        { type: 'detectorB', label: 'Spike', details: { rank: 'S2' } } as any,
        { type: 'detectorC', label: 'Trend', details: { rank: 'S3' } } as any,
      ],
    });
    render(<AlertCard alert={alert as any} />);
    const toggle = screen.getByRole('button', { name: /Sources/i });
    act(() => toggle.click());
    expect(screen.getByLabelText(/Rank S1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Rank S2/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Rank S3/i)).toBeInTheDocument();
  });

  it('renders sparkline when sparkValues present', () => {
    const alert = makeAlert();
    render(<AlertCard alert={alert as any} />);
    // Sparkline svg has role img with title containing "sparkline"
    expect(screen.getByRole('img', { name: /sparkline/i })).toBeInTheDocument();
  });

  it('aggregated AlertsPanel shows per-student alerts after update event', async () => {
    localStorage.clear();
    const alert = makeAlert();
    localStorage.setItem('alerts:list:s1', JSON.stringify([alert]));

    render(
      <AlertsPanel
        filteredData={{ entries: [], emotions: [], sensoryInputs: [] }}
        studentId={'all'}
      />
    );

    expect(await screen.findByText(/Total:/)).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new CustomEvent('alerts:updated', { detail: { studentId: 's1' } }));
    });

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    expect(screen.getByText(/Total:/)).toBeInTheDocument();
  });

  it('shows governance badges after update when flags are persisted', async () => {
    localStorage.clear();
    const alert = makeAlert();
    const withGov = { ...alert, governance: { snoozed: true } } as any;
    localStorage.setItem('alerts:list:s1', JSON.stringify([withGov]));

    render(
      <AlertsPanel
        filteredData={{ entries: [], emotions: [], sensoryInputs: [] }}
        studentId={'all'}
      />
    );

    act(() => {
      window.dispatchEvent(new CustomEvent('alerts:updated', { detail: { studentId: 's1' } }));
    });

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    // Governance badges container exists and includes Snoozed
    expect(await screen.findByText(/Snoozed/i)).toBeInTheDocument();
  });
});


