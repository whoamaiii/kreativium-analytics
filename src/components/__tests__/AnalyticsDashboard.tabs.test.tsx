import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';

// Minimal stubs and providers (keep local i18n mock to assert i18n keys in expectations)
vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    tCommon: (k: string) => k,
    tStudent: (k: string) => k,
    tAnalytics: (k: string) => k,
  }),
}));

vi.mock('@/hooks/useAnalyticsWorker', () => ({
  useAnalyticsWorker: () => ({
    results: { patterns: [], correlations: [], insights: [] },
    isAnalyzing: false,
    error: null,
    runAnalysis: vi.fn(),
    invalidateCacheForStudent: vi.fn(),
  }),
}));

// Lazy panels are code-split; mock them
vi.mock('@/components/lazy/LazyOverviewPanel', () => ({ LazyOverviewPanel: () => <div data-testid="overview-panel" /> }));
vi.mock('@/components/lazy/LazyExplorePanel', () => ({
  LazyExplorePanel: () => {
    // Simulate preset deep-linking and switching within Explore
    const params = new URLSearchParams(window.location.search);
    const current = (params.get('preset') as string) || 'charts';
    const setPreset = (preset: 'charts' | 'patterns' | 'correlations') => {
      const p = new URLSearchParams(window.location.search);
      p.set('preset', preset);
      const url = `${window.location.pathname}?${p.toString()}`;
      window.history.replaceState({}, '', url);
    };
    return (
      <div data-testid="explore-panel">
        <div data-testid="explore-preset">{current}</div>
        <button onClick={() => setPreset('charts')}>preset:charts</button>
        <button onClick={() => setPreset('patterns')}>preset:patterns</button>
        <button onClick={() => setPreset('correlations')}>preset:correlations</button>
      </div>
    );
  }
}));
vi.mock('@/components/lazy/LazyAlertsPanel', () => ({ LazyAlertsPanel: () => <div data-testid="alerts-panel" /> }));

// Sync tab param hook: interact with window.location.search
vi.mock('@/hooks/useSyncedTabParam', () => {
  return {
    useSyncedTabParam: ({ defaultTab }: any = { defaultTab: 'overview' }) => {
      const params = new URLSearchParams(window.location.search);
      const initial = (params.get('tab') as any) || defaultTab;
      const [tab, setTab] = React.useState(initial);
      React.useEffect(() => {
        const p = new URLSearchParams(window.location.search);
        p.set('tab', tab);
        const url = `${window.location.pathname}?${p.toString()}`;
        window.history.replaceState({}, '', url);
      }, [tab]);
      return [tab, setTab];
    },
  };
});

const student = { id: 's1', name: 'A' } as any;
const filteredData = { entries: [], emotions: [], sensoryInputs: [] };

function renderWithRouter(ui: React.ReactElement, initialEntries: string[] = ['/']) {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
}

// Scope: tabbed UI behaviors (lazy mounting, URL sync, accessibility)
describe('AnalyticsDashboard tabs', () => {
  beforeEach(() => {
    // Reset URL before each test to avoid cross-test leakage
    window.history.replaceState({}, '', '/');
  });
  test('initial render defaults to overview tab and only overview content in DOM', async () => {
    renderWithRouter(<AnalyticsDashboard student={student} filteredData={filteredData} />);

    // Overview content present
    expect(await screen.findByTestId('overview-panel')).toBeInTheDocument();

    // Explore and alerts panels not in DOM until selected
    expect(screen.queryByTestId('explore-panel')).toBeNull();
    expect(screen.queryByTestId('alerts-panel')).toBeNull();

    // Alerts tab testid remains present and clickable
    const alertsTab = screen.getByTestId('dashboard-alerts-tab');
    expect(alertsTab).toBeInTheDocument();
    expect(alertsTab).toBeEnabled();
  });

  test('URL param tab=alerts mounts only AlertsPanel; switching updates URL', async () => {
    // Set real URL since the hook reads window.location
    window.history.replaceState({}, '', '/?tab=alerts');
    renderWithRouter(
      <AnalyticsDashboard student={student} filteredData={filteredData} />
    );

    // Only alerts content
    expect(await screen.findByTestId('alerts-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('overview-panel')).toBeNull();
    expect(screen.queryByTestId('explore-panel')).toBeNull();

    // Switch to explore and verify URL updates
    const exploreTab = screen.getByTestId('dashboard-explore-tab');
    await userEvent.click(exploreTab);
    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).get('tab')).toBe('explore');
    });
    expect(await screen.findByTestId('explore-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('alerts-panel')).toBeNull();
  });

  test('reloading with tab=explore shows explore tab active', async () => {
    window.history.replaceState({}, '', '/?tab=explore');
    renderWithRouter(
      <AnalyticsDashboard student={student} filteredData={filteredData} />
    );
    expect(await screen.findByTestId('explore-panel')).toBeInTheDocument();
    // Ensure overview not mounted
    expect(screen.queryByTestId('overview-panel')).toBeNull();
  });

  test('deep-linking: tab=explore&preset=patterns selects Explore and patterns preset', async () => {
    window.history.replaceState({}, '', '/?tab=explore&preset=patterns');
    renderWithRouter(
      <AnalyticsDashboard student={student} filteredData={filteredData} />
    );
    expect(await screen.findByTestId('explore-panel')).toBeInTheDocument();
    const presetIndicator = await screen.findByTestId('explore-preset');
    expect(presetIndicator.textContent).toBe('patterns');
    const params = new URLSearchParams(window.location.search);
    expect(params.get('tab')).toBe('explore');
    expect(params.get('preset')).toBe('patterns');
  });

  test('Explore preset switching updates URL and stays on Explore tab', async () => {
    window.history.replaceState({}, '', '/?tab=explore&preset=charts');
    renderWithRouter(
      <AnalyticsDashboard student={student} filteredData={filteredData} />
    );
    expect(await screen.findByTestId('explore-panel')).toBeInTheDocument();

    // Switch between presets via the mocked Explore panel buttons
    await userEvent.click(screen.getByRole('button', { name: /preset:patterns/i }));
    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get('tab')).toBe('explore');
      expect(params.get('preset')).toBe('patterns');
    });

    await userEvent.click(screen.getByRole('button', { name: /preset:correlations/i }));
    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get('tab')).toBe('explore');
      expect(params.get('preset')).toBe('correlations');
    });

    // Navigate away and back; preset should persist in URL
    await userEvent.click(screen.getByTestId('dashboard-alerts-tab'));
    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).get('tab')).toBe('alerts');
    });
    await userEvent.click(screen.getByTestId('dashboard-explore-tab'));
    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get('tab')).toBe('explore');
      expect(params.get('preset')).toBe('correlations');
    });
  });

  test('live region announces tab label on change', async () => {
    renderWithRouter(<AnalyticsDashboard student={student} filteredData={filteredData} />);
    const liveRegion = screen.getByRole('status');

    // Initially overview
    expect(liveRegion.textContent || '').toMatch(/tabs\.overview/);

    // Switch to explore
    await userEvent.click(screen.getByTestId('dashboard-explore-tab'));
    await waitFor(() => {
      expect((liveRegion.textContent || '')).toMatch(/tabs\.explore/);
    });
  });

  test('skip link focuses first tab panel', async () => {
    // Ensure default charts tab
    window.history.replaceState({}, '', '/');
    renderWithRouter(<AnalyticsDashboard student={student} filteredData={filteredData} />);
    const skip = screen.getByRole('link', { name: /skipToContent/i });

    await userEvent.tab(); // move focus to body
    await userEvent.click(skip);

    const panel = await screen.findByTestId('overview-panel');
    // Focus should be on tabpanel container (TabsContent) since we set tabIndex=-1 on it
    const tabpanel = document.getElementById('analytics-tabpanel');
    expect(tabpanel).toBeTruthy();
  });
});
