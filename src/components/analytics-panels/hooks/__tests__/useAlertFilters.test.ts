/**
 * Tests for useAlertFilters hooks
 *
 * Tests filter state management, derived data computation, and
 * alert filtering/grouping/sorting logic.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAlertFilterState, useAlertDerivedData, severityOrder } from '../useAlertFilters';
import { AlertSeverity, AlertKind, AlertStatus, type AlertWithGovernance } from '@/lib/alerts/types';
import type { AlertFilterState } from '../useAlertFilters';

// ============================================================================
// Mock Data
// ============================================================================

const createMockAlert = (overrides: Partial<AlertWithGovernance> = {}): AlertWithGovernance => ({
  id: `alert-${Math.random()}`,
  studentId: 'student-1',
  kind: AlertKind.EmotionPattern,
  severity: AlertSeverity.Important,
  status: AlertStatus.New,
  confidence: 0.8,
  createdAt: new Date().toISOString(),
  sources: [
    {
      type: 'heuristic',
      label: 'emotion-detector',
      contributingEntries: [],
    },
  ],
  metadata: {
    summary: 'Test alert',
    label: 'test',
  },
  ...overrides,
});

// ============================================================================
// useAlertFilterState Tests
// ============================================================================

describe('useAlertFilterState', () => {
  describe('Initial State', () => {
    it('initializes with default values', () => {
      const { result } = renderHook(() => useAlertFilterState());

      expect(result.current.state.selectedSeverities).toEqual([
        AlertSeverity.Critical,
        AlertSeverity.Important,
        AlertSeverity.Moderate,
        AlertSeverity.Low,
      ]);
      expect(result.current.state.selectedKinds).toEqual([]);
      expect(result.current.state.timeWindowHours).toBe(72);
      expect(result.current.state.minConfidence).toBe(0.5);
      expect(result.current.state.sourceFilters).toEqual([]);
      expect(result.current.state.sourceLabelFilters).toEqual([]);
      expect(result.current.state.dateStart).toBe('');
      expect(result.current.state.dateEnd).toBe('');
      expect(result.current.state.searchQuery).toBe('');
      expect(result.current.state.groupMode).toBe('severity');
      expect(result.current.state.hasInterventionOnly).toBe(false);
      expect(result.current.state.sortMode).toBe('newest');
    });

    it('accepts custom default values', () => {
      const { result } = renderHook(() =>
        useAlertFilterState({
          defaultTimeWindowHours: 24,
          defaultMinConfidence: 0.7,
          defaultGroupMode: 'source',
          defaultSortMode: 'confidence',
          initialSeverities: [AlertSeverity.Critical, AlertSeverity.Important],
        })
      );

      expect(result.current.state.selectedSeverities).toEqual([
        AlertSeverity.Critical,
        AlertSeverity.Important,
      ]);
      expect(result.current.state.timeWindowHours).toBe(24);
      expect(result.current.state.minConfidence).toBe(0.7);
      expect(result.current.state.groupMode).toBe('source');
      expect(result.current.state.sortMode).toBe('confidence');
    });

    it('provides queryFilters for useAlerts hook', () => {
      const { result } = renderHook(() => useAlertFilterState());

      expect(result.current.queryFilters).toEqual({
        severity: expect.any(Array),
        kinds: [],
        timeWindowHours: 72,
      });
    });
  });

  describe('Severity Filters', () => {
    it('updates selected severities', () => {
      const { result } = renderHook(() => useAlertFilterState());

      act(() => {
        result.current.actions.setSelectedSeverities([AlertSeverity.Critical]);
      });

      expect(result.current.state.selectedSeverities).toEqual([AlertSeverity.Critical]);
    });

    it('allows multiple severity selections', () => {
      const { result } = renderHook(() => useAlertFilterState());

      act(() => {
        result.current.actions.setSelectedSeverities([
          AlertSeverity.Critical,
          AlertSeverity.Important,
        ]);
      });

      expect(result.current.state.selectedSeverities).toEqual([
        AlertSeverity.Critical,
        AlertSeverity.Important,
      ]);
    });
  });

  describe('Kind Filters', () => {
    it('updates selected kinds', () => {
      const { result } = renderHook(() => useAlertFilterState());

      act(() => {
        result.current.actions.setSelectedKinds([AlertKind.EmotionPattern]);
      });

      expect(result.current.state.selectedKinds).toEqual([AlertKind.EmotionPattern]);
    });

    it('updates queryFilters when kinds change', () => {
      const { result } = renderHook(() => useAlertFilterState());

      act(() => {
        result.current.actions.setSelectedKinds([
          AlertKind.EmotionPattern,
          AlertKind.SensoryInput,
        ]);
      });

      expect(result.current.queryFilters.kinds).toHaveLength(2);
    });
  });

  describe('Time Window Filters', () => {
    it('updates time window hours', () => {
      const { result } = renderHook(() => useAlertFilterState());

      act(() => {
        result.current.actions.setTimeWindowHours(24);
      });

      expect(result.current.state.timeWindowHours).toBe(24);
      expect(result.current.queryFilters.timeWindowHours).toBe(24);
    });

    it('allows clearing time window', () => {
      const { result } = renderHook(() => useAlertFilterState());

      act(() => {
        result.current.actions.setTimeWindowHours(undefined);
      });

      expect(result.current.state.timeWindowHours).toBeUndefined();
      expect(result.current.queryFilters.timeWindowHours).toBeUndefined();
    });
  });

  describe('Confidence Filter', () => {
    it('updates minimum confidence', () => {
      const { result } = renderHook(() => useAlertFilterState());

      act(() => {
        result.current.actions.setMinConfidence(0.9);
      });

      expect(result.current.state.minConfidence).toBe(0.9);
    });

    it('accepts confidence values between 0 and 1', () => {
      const { result } = renderHook(() => useAlertFilterState());

      act(() => {
        result.current.actions.setMinConfidence(0);
      });
      expect(result.current.state.minConfidence).toBe(0);

      act(() => {
        result.current.actions.setMinConfidence(1);
      });
      expect(result.current.state.minConfidence).toBe(1);
    });
  });

  describe('Source Filters', () => {
    it('toggles source filter on', () => {
      const { result } = renderHook(() => useAlertFilterState());

      act(() => {
        result.current.actions.toggleSourceFilter('heuristic');
      });

      expect(result.current.state.sourceFilters).toEqual(['heuristic']);
    });

    it('toggles source filter off', () => {
      const { result } = renderHook(() => useAlertFilterState());

      act(() => {
        result.current.actions.toggleSourceFilter('heuristic');
        result.current.actions.toggleSourceFilter('heuristic');
      });

      expect(result.current.state.sourceFilters).toEqual([]);
    });

    it('supports multiple source filters', () => {
      const { result } = renderHook(() => useAlertFilterState());

      act(() => {
        result.current.actions.toggleSourceFilter('heuristic');
        result.current.actions.toggleSourceFilter('ml');
      });

      expect(result.current.state.sourceFilters).toEqual(['heuristic', 'ml']);
    });

    it('resets source filters', () => {
      const { result } = renderHook(() => useAlertFilterState());

      act(() => {
        result.current.actions.toggleSourceFilter('heuristic');
        result.current.actions.toggleSourceFilter('ml');
        result.current.actions.resetSourceFilters();
      });

      expect(result.current.state.sourceFilters).toEqual([]);
    });
  });

  describe('Source Label Filters', () => {
    it('toggles source label filter', () => {
      const { result } = renderHook(() => useAlertFilterState());

      act(() => {
        result.current.actions.toggleSourceLabelFilter('emotion-detector');
      });

      expect(result.current.state.sourceLabelFilters).toEqual(['emotion-detector']);
    });

    it('resets source label filters', () => {
      const { result } = renderHook(() => useAlertFilterState());

      act(() => {
        result.current.actions.toggleSourceLabelFilter('emotion-detector');
        result.current.actions.resetSourceLabelFilters();
      });

      expect(result.current.state.sourceLabelFilters).toEqual([]);
    });
  });

  describe('Date Range Filters', () => {
    it('sets date start', () => {
      const { result } = renderHook(() => useAlertFilterState());

      act(() => {
        result.current.actions.setDateStart('2024-01-01');
      });

      expect(result.current.state.dateStart).toBe('2024-01-01');
    });

    it('sets date end', () => {
      const { result } = renderHook(() => useAlertFilterState());

      act(() => {
        result.current.actions.setDateEnd('2024-12-31');
      });

      expect(result.current.state.dateEnd).toBe('2024-12-31');
    });

    it('supports date range filtering', () => {
      const { result } = renderHook(() => useAlertFilterState());

      act(() => {
        result.current.actions.setDateStart('2024-01-01');
        result.current.actions.setDateEnd('2024-12-31');
      });

      expect(result.current.state.dateStart).toBe('2024-01-01');
      expect(result.current.state.dateEnd).toBe('2024-12-31');
    });
  });

  describe('Search Query', () => {
    it('updates search query', () => {
      const { result } = renderHook(() => useAlertFilterState());

      act(() => {
        result.current.actions.setSearchQuery('emotion');
      });

      expect(result.current.state.searchQuery).toBe('emotion');
    });

    it('allows clearing search query', () => {
      const { result } = renderHook(() => useAlertFilterState());

      act(() => {
        result.current.actions.setSearchQuery('emotion');
        result.current.actions.setSearchQuery('');
      });

      expect(result.current.state.searchQuery).toBe('');
    });
  });

  describe('Group Mode', () => {
    it('changes group mode', () => {
      const { result } = renderHook(() => useAlertFilterState());

      act(() => {
        result.current.actions.setGroupMode('source');
      });

      expect(result.current.state.groupMode).toBe('source');
    });

    it('supports all group modes', () => {
      const { result } = renderHook(() => useAlertFilterState());

      act(() => {
        result.current.actions.setGroupMode('severity');
      });
      expect(result.current.state.groupMode).toBe('severity');

      act(() => {
        result.current.actions.setGroupMode('source');
      });
      expect(result.current.state.groupMode).toBe('source');

      act(() => {
        result.current.actions.setGroupMode('status');
      });
      expect(result.current.state.groupMode).toBe('status');
    });
  });

  describe('Sort Mode', () => {
    it('changes sort mode', () => {
      const { result } = renderHook(() => useAlertFilterState());

      act(() => {
        result.current.actions.setSortMode('confidence');
      });

      expect(result.current.state.sortMode).toBe('confidence');
    });

    it('supports all sort modes', () => {
      const { result } = renderHook(() => useAlertFilterState());

      act(() => {
        result.current.actions.setSortMode('newest');
      });
      expect(result.current.state.sortMode).toBe('newest');

      act(() => {
        result.current.actions.setSortMode('confidence');
      });
      expect(result.current.state.sortMode).toBe('confidence');

      act(() => {
        result.current.actions.setSortMode('severity');
      });
      expect(result.current.state.sortMode).toBe('severity');
    });
  });

  describe('Intervention Filter', () => {
    it('toggles intervention only filter', () => {
      const { result } = renderHook(() => useAlertFilterState());

      act(() => {
        result.current.actions.setHasInterventionOnly(true);
      });

      expect(result.current.state.hasInterventionOnly).toBe(true);

      act(() => {
        result.current.actions.setHasInterventionOnly(false);
      });

      expect(result.current.state.hasInterventionOnly).toBe(false);
    });
  });
});

// ============================================================================
// useAlertDerivedData Tests
// ============================================================================

describe('useAlertDerivedData', () => {
  let mockAlerts: AlertWithGovernance[];
  let defaultState: AlertFilterState;

  beforeEach(() => {
    mockAlerts = [
      createMockAlert({
        id: 'alert-1',
        severity: AlertSeverity.Critical,
        confidence: 0.95,
        createdAt: '2024-01-03T10:00:00Z',
        sources: [{ type: 'heuristic', label: 'emotion-detector', contributingEntries: [] }],
      }),
      createMockAlert({
        id: 'alert-2',
        severity: AlertSeverity.Important,
        confidence: 0.75,
        createdAt: '2024-01-02T10:00:00Z',
        sources: [{ type: 'ml', label: 'ml-classifier', contributingEntries: [] }],
      }),
      createMockAlert({
        id: 'alert-3',
        severity: AlertSeverity.Moderate,
        confidence: 0.45,
        createdAt: '2024-01-01T10:00:00Z',
        sources: [{ type: 'heuristic', label: 'pattern-detector', contributingEntries: [] }],
      }),
    ];

    defaultState = {
      selectedSeverities: [AlertSeverity.Critical, AlertSeverity.Important, AlertSeverity.Moderate, AlertSeverity.Low],
      selectedKinds: [],
      timeWindowHours: undefined,
      minConfidence: 0.5,
      sourceFilters: [],
      sourceLabelFilters: [],
      dateStart: '',
      dateEnd: '',
      searchQuery: '',
      groupMode: 'severity',
      hasInterventionOnly: false,
      sortMode: 'newest',
    };
  });

  describe('Available Sources', () => {
    it('extracts unique source types', () => {
      const { result } = renderHook(() => useAlertDerivedData(mockAlerts, defaultState));

      const sourceTypes = result.current.availableSourceTypes.map((s) => s.type);
      expect(sourceTypes).toContain('heuristic');
      expect(sourceTypes).toContain('ml');
    });

    it('groups labels by source type', () => {
      const { result } = renderHook(() => useAlertDerivedData(mockAlerts, defaultState));

      const heuristic = result.current.availableSourceTypes.find((s) => s.type === 'heuristic');
      expect(heuristic?.labels).toEqual(['emotion-detector', 'pattern-detector']);
    });

    it('sorts source types alphabetically', () => {
      const { result } = renderHook(() => useAlertDerivedData(mockAlerts, defaultState));

      const types = result.current.availableSourceTypes.map((s) => s.type);
      expect(types).toEqual([...types].sort());
    });
  });

  describe('Available Source Labels', () => {
    it('extracts unique source labels', () => {
      const { result } = renderHook(() => useAlertDerivedData(mockAlerts, defaultState));

      expect(result.current.availableSourceLabels).toContain('emotion-detector');
      expect(result.current.availableSourceLabels).toContain('ml-classifier');
      expect(result.current.availableSourceLabels).toContain('pattern-detector');
    });

    it('sorts labels alphabetically', () => {
      const { result } = renderHook(() => useAlertDerivedData(mockAlerts, defaultState));

      const labels = result.current.availableSourceLabels;
      expect(labels).toEqual([...labels].sort());
    });
  });

  describe('Active Alerts (Filtering)', () => {
    it('filters by minimum confidence', () => {
      const state = { ...defaultState, minConfidence: 0.8 };
      const { result } = renderHook(() => useAlertDerivedData(mockAlerts, state));

      expect(result.current.activeAlerts).toHaveLength(1);
      expect(result.current.activeAlerts[0].id).toBe('alert-1');
    });

    it('filters by source type', () => {
      const state = { ...defaultState, sourceFilters: ['heuristic'] };
      const { result } = renderHook(() => useAlertDerivedData(mockAlerts, state));

      expect(result.current.activeAlerts).toHaveLength(2);
      expect(result.current.activeAlerts.every((a) => a.sources?.some((s) => s.type === 'heuristic'))).toBe(true);
    });

    it('filters by source label', () => {
      const state = { ...defaultState, sourceLabelFilters: ['emotion-detector'] };
      const { result } = renderHook(() => useAlertDerivedData(mockAlerts, state));

      expect(result.current.activeAlerts).toHaveLength(1);
      expect(result.current.activeAlerts[0].sources?.[0].label).toBe('emotion-detector');
    });

    it('filters by date start', () => {
      const state = { ...defaultState, dateStart: '2024-01-02' };
      const { result } = renderHook(() => useAlertDerivedData(mockAlerts, state));

      expect(result.current.activeAlerts).toHaveLength(2);
      expect(result.current.activeAlerts.every((a) => new Date(a.createdAt) >= new Date('2024-01-02'))).toBe(true);
    });

    it('filters by date end', () => {
      const state = { ...defaultState, dateEnd: '2024-01-02' };
      const { result } = renderHook(() => useAlertDerivedData(mockAlerts, state));

      expect(result.current.activeAlerts).toHaveLength(2);
    });

    it('filters by search query (fuzzy match)', () => {
      const state = { ...defaultState, searchQuery: 'emotion' };
      const { result } = renderHook(() => useAlertDerivedData(mockAlerts, state));

      // Should match alerts with 'emotion' in any field
      expect(result.current.activeAlerts.length).toBeGreaterThan(0);
    });

    it('filters by intervention presence', () => {
      const alertsWithIntervention = [
        ...mockAlerts,
        createMockAlert({
          id: 'alert-4',
          metadata: { interventionId: 'intervention-1', summary: 'Has intervention' },
        }),
      ];

      const state = { ...defaultState, hasInterventionOnly: true };
      const { result } = renderHook(() => useAlertDerivedData(alertsWithIntervention, state));

      expect(result.current.activeAlerts).toHaveLength(1);
      expect(result.current.activeAlerts[0].id).toBe('alert-4');
    });

    it('applies multiple filters simultaneously', () => {
      const state = {
        ...defaultState,
        minConfidence: 0.7,
        sourceFilters: ['heuristic'],
      };
      const { result } = renderHook(() => useAlertDerivedData(mockAlerts, state));

      expect(result.current.activeAlerts).toHaveLength(1);
      expect(result.current.activeAlerts[0].id).toBe('alert-1');
    });
  });

  describe('Counts', () => {
    it('calculates total count', () => {
      const { result } = renderHook(() => useAlertDerivedData(mockAlerts, defaultState));

      expect(result.current.counts.total).toBe(2); // alert-3 filtered out by minConfidence
    });

    it('calculates counts by severity', () => {
      const { result } = renderHook(() => useAlertDerivedData(mockAlerts, defaultState));

      expect(result.current.counts.bySeverity[AlertSeverity.Critical]).toBe(1);
      expect(result.current.counts.bySeverity[AlertSeverity.Important]).toBe(1);
      expect(result.current.counts.bySeverity[AlertSeverity.Moderate]).toBe(0);
      expect(result.current.counts.bySeverity[AlertSeverity.Low]).toBe(0);
    });
  });

  describe('Grouping', () => {
    it('groups by severity', () => {
      const { result } = renderHook(() => useAlertDerivedData(mockAlerts, defaultState));

      expect(result.current.grouped.bySeverity[AlertSeverity.Critical]).toHaveLength(1);
      expect(result.current.grouped.bySeverity[AlertSeverity.Important]).toHaveLength(1);
      expect(result.current.grouped.bySeverity[AlertSeverity.Moderate]).toHaveLength(0);
    });

    it('groups by source', () => {
      const { result } = renderHook(() => useAlertDerivedData(mockAlerts, defaultState));

      expect(result.current.grouped.bySource['heuristic']).toHaveLength(1);
      expect(result.current.grouped.bySource['ml']).toHaveLength(1);
    });

    it('groups by status', () => {
      const alerts = [
        createMockAlert({ id: 'alert-1', status: AlertStatus.New }),
        createMockAlert({ id: 'alert-2', status: AlertStatus.Acknowledged }),
        createMockAlert({ id: 'alert-3', status: AlertStatus.Resolved, confidence: 0.9 }),
      ];

      const { result } = renderHook(() => useAlertDerivedData(alerts, defaultState));

      expect(result.current.grouped.byStatus['new']).toHaveLength(1);
      expect(result.current.grouped.byStatus['acknowledged']).toHaveLength(1);
      expect(result.current.grouped.byStatus['resolved']).toHaveLength(1);
    });
  });

  describe('Sorting', () => {
    it('sorts by newest first', () => {
      const state = { ...defaultState, sortMode: 'newest' as const };
      const { result } = renderHook(() => useAlertDerivedData(mockAlerts, state));

      const dates = result.current.grouped.bySeverity[AlertSeverity.Critical]
        .concat(result.current.grouped.bySeverity[AlertSeverity.Important])
        .map((a) => new Date(a.createdAt).getTime());

      expect(dates[0]).toBeGreaterThan(dates[1]);
    });

    it('sorts by confidence', () => {
      const state = { ...defaultState, sortMode: 'confidence' as const };
      const { result } = renderHook(() => useAlertDerivedData(mockAlerts, state));

      const confidences = result.current.grouped.bySeverity[AlertSeverity.Critical]
        .concat(result.current.grouped.bySeverity[AlertSeverity.Important])
        .map((a) => a.confidence ?? 0);

      expect(confidences[0]).toBeGreaterThanOrEqual(confidences[1]);
    });

    it('sorts by severity', () => {
      const state = { ...defaultState, sortMode: 'severity' as const };
      const { result } = renderHook(() => useAlertDerivedData(mockAlerts, state));

      const allAlerts = Object.values(result.current.grouped.bySeverity).flat();
      const severities = allAlerts.map((a) => severityOrder[a.severity]);

      for (let i = 1; i < severities.length; i++) {
        expect(severities[i - 1]).toBeGreaterThanOrEqual(severities[i]);
      }
    });
  });

  describe('Reactivity', () => {
    it('recomputes when alerts change', () => {
      const { result, rerender } = renderHook(
        ({ alerts, state }) => useAlertDerivedData(alerts, state),
        { initialProps: { alerts: mockAlerts, state: defaultState } }
      );

      const initialCount = result.current.counts.total;

      const newAlerts = [
        ...mockAlerts,
        createMockAlert({ id: 'alert-4', severity: AlertSeverity.Critical, confidence: 0.9 }),
      ];

      rerender({ alerts: newAlerts, state: defaultState });

      expect(result.current.counts.total).toBeGreaterThan(initialCount);
    });

    it('recomputes when filter state changes', () => {
      const { result, rerender } = renderHook(
        ({ alerts, state }) => useAlertDerivedData(alerts, state),
        { initialProps: { alerts: mockAlerts, state: defaultState } }
      );

      const initialCount = result.current.counts.total;

      const newState = { ...defaultState, minConfidence: 0.9 };
      rerender({ alerts: mockAlerts, state: newState });

      expect(result.current.counts.total).toBeLessThan(initialCount);
    });
  });
});
