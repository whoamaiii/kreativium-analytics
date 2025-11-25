/**
 * Tests for useAlertBulkActions hook
 *
 * Tests bulk alert operations including acknowledge by confidence,
 * acknowledge/resolve by source, snooze similar, and acknowledge by label.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAlertBulkActions } from '../useAlertBulkActions';
import {
  AlertSeverity,
  AlertKind,
  AlertStatus,
  type AlertWithGovernance,
} from '@/lib/alerts/types';

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

import { toast } from '@/hooks/useToast';

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
// Tests
// ============================================================================

describe('useAlertBulkActions', () => {
  let mockAlerts: AlertWithGovernance[];
  let mockActiveAlerts: AlertWithGovernance[];
  let mockAcknowledge: ReturnType<typeof vi.fn>;
  let mockResolve: ReturnType<typeof vi.fn>;
  let mockSnooze: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAlerts = [
      createMockAlert({
        id: 'alert-1',
        severity: AlertSeverity.Critical,
        confidence: 0.95,
        sources: [{ type: 'heuristic', label: 'emotion-detector', contributingEntries: [] }],
      }),
      createMockAlert({
        id: 'alert-2',
        severity: AlertSeverity.Important,
        confidence: 0.85,
        sources: [{ type: 'ml', label: 'ml-classifier', contributingEntries: [] }],
      }),
      createMockAlert({
        id: 'alert-3',
        severity: AlertSeverity.Moderate,
        confidence: 0.75,
        sources: [{ type: 'heuristic', label: 'pattern-detector', contributingEntries: [] }],
      }),
      createMockAlert({
        id: 'alert-4',
        severity: AlertSeverity.Low,
        confidence: 0.65,
        sources: [{ type: 'heuristic', label: 'emotion-detector', contributingEntries: [] }],
      }),
    ];

    // Active alerts are a filtered subset
    mockActiveAlerts = mockAlerts.filter((a) => (a.confidence ?? 0) >= 0.7);

    mockAcknowledge = vi.fn();
    mockResolve = vi.fn();
    mockSnooze = vi.fn();
  });

  describe('acknowledgeByConfidence', () => {
    it('acknowledges all alerts above confidence threshold', () => {
      const { result } = renderHook(() =>
        useAlertBulkActions({
          alerts: mockAlerts,
          activeAlerts: mockActiveAlerts,
          sourceFilters: [],
          sourceLabelFilters: [],
          acknowledge: mockAcknowledge,
          resolve: mockResolve,
          snooze: mockSnooze,
        }),
      );

      act(() => {
        result.current.acknowledgeByConfidence(0.8);
      });

      expect(mockAcknowledge).toHaveBeenCalledTimes(2);
      expect(mockAcknowledge).toHaveBeenCalledWith('alert-1');
      expect(mockAcknowledge).toHaveBeenCalledWith('alert-2');
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Acknowledged 2 alerts'));
    });

    it('shows info when no alerts meet threshold', () => {
      const { result } = renderHook(() =>
        useAlertBulkActions({
          alerts: mockAlerts,
          activeAlerts: mockActiveAlerts,
          sourceFilters: [],
          sourceLabelFilters: [],
          acknowledge: mockAcknowledge,
          resolve: mockResolve,
          snooze: mockSnooze,
        }),
      );

      act(() => {
        result.current.acknowledgeByConfidence(0.99);
      });

      expect(mockAcknowledge).not.toHaveBeenCalled();
      expect(toast.info).toHaveBeenCalledWith(
        expect.stringContaining('No alerts at or above 99% confidence'),
      );
    });

    it('handles single alert correctly', () => {
      const { result } = renderHook(() =>
        useAlertBulkActions({
          alerts: mockAlerts,
          activeAlerts: mockActiveAlerts,
          sourceFilters: [],
          sourceLabelFilters: [],
          acknowledge: mockAcknowledge,
          resolve: mockResolve,
          snooze: mockSnooze,
        }),
      );

      act(() => {
        result.current.acknowledgeByConfidence(0.9);
      });

      expect(mockAcknowledge).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Acknowledged 1 alert'));
      expect(toast.success).toHaveBeenCalledWith(
        expect.not.stringContaining('alerts'), // Singular, not plural
      );
    });

    it('handles acknowledge errors gracefully', () => {
      mockAcknowledge.mockImplementation((id) => {
        if (id === 'alert-1') {
          throw new Error('Acknowledge failed');
        }
      });

      const { result } = renderHook(() =>
        useAlertBulkActions({
          alerts: mockAlerts,
          activeAlerts: mockActiveAlerts,
          sourceFilters: [],
          sourceLabelFilters: [],
          acknowledge: mockAcknowledge,
          resolve: mockResolve,
          snooze: mockSnooze,
        }),
      );

      act(() => {
        result.current.acknowledgeByConfidence(0.8);
      });

      // Should still call for both alerts
      expect(mockAcknowledge).toHaveBeenCalledTimes(2);
      // Toast should still be called (errors are caught silently)
      expect(toast.success).toHaveBeenCalled();
    });
  });

  describe('acknowledgeBySource', () => {
    it('acknowledges all alerts from specified source type', () => {
      const { result } = renderHook(() =>
        useAlertBulkActions({
          alerts: mockAlerts,
          activeAlerts: mockActiveAlerts,
          sourceFilters: [],
          sourceLabelFilters: [],
          acknowledge: mockAcknowledge,
          resolve: mockResolve,
          snooze: mockSnooze,
        }),
      );

      act(() => {
        result.current.acknowledgeBySource('heuristic');
      });

      expect(mockAcknowledge).toHaveBeenCalledTimes(3);
      expect(mockAcknowledge).toHaveBeenCalledWith('alert-1');
      expect(mockAcknowledge).toHaveBeenCalledWith('alert-3');
      expect(mockAcknowledge).toHaveBeenCalledWith('alert-4');
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('from heuristic'));
    });

    it('shows info when no alerts match source', () => {
      const { result } = renderHook(() =>
        useAlertBulkActions({
          alerts: mockAlerts,
          activeAlerts: mockActiveAlerts,
          sourceFilters: [],
          sourceLabelFilters: [],
          acknowledge: mockAcknowledge,
          resolve: mockResolve,
          snooze: mockSnooze,
        }),
      );

      act(() => {
        result.current.acknowledgeBySource('nonexistent');
      });

      expect(mockAcknowledge).not.toHaveBeenCalled();
      expect(toast.info).toHaveBeenCalledWith(
        expect.stringContaining('No alerts for source nonexistent'),
      );
    });

    it('uses correct pluralization', () => {
      const alerts = [
        createMockAlert({
          id: 'alert-only',
          sources: [{ type: 'custom', label: 'custom-detector', contributingEntries: [] }],
        }),
      ];

      const { result } = renderHook(() =>
        useAlertBulkActions({
          alerts,
          activeAlerts: alerts,
          sourceFilters: [],
          sourceLabelFilters: [],
          acknowledge: mockAcknowledge,
          resolve: mockResolve,
          snooze: mockSnooze,
        }),
      );

      act(() => {
        result.current.acknowledgeBySource('custom');
      });

      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('1 alert from'));
    });
  });

  describe('resolveBySourceType', () => {
    it('resolves all alerts from specified source type', () => {
      const { result } = renderHook(() =>
        useAlertBulkActions({
          alerts: mockAlerts,
          activeAlerts: mockActiveAlerts,
          sourceFilters: [],
          sourceLabelFilters: [],
          acknowledge: mockAcknowledge,
          resolve: mockResolve,
          snooze: mockSnooze,
        }),
      );

      act(() => {
        result.current.resolveBySourceType('ml');
      });

      expect(mockResolve).toHaveBeenCalledTimes(1);
      expect(mockResolve).toHaveBeenCalledWith('alert-2');
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Resolved 1 alert from ml'),
      );
    });

    it('shows info when no alerts match source', () => {
      const { result } = renderHook(() =>
        useAlertBulkActions({
          alerts: mockAlerts,
          activeAlerts: mockActiveAlerts,
          sourceFilters: [],
          sourceLabelFilters: [],
          acknowledge: mockAcknowledge,
          resolve: mockResolve,
          snooze: mockSnooze,
        }),
      );

      act(() => {
        result.current.resolveBySourceType('nonexistent');
      });

      expect(mockResolve).not.toHaveBeenCalled();
      expect(toast.info).toHaveBeenCalledWith(
        expect.stringContaining('No alerts for source nonexistent'),
      );
    });

    it('handles resolve errors gracefully', () => {
      mockResolve.mockImplementation(() => {
        throw new Error('Resolve failed');
      });

      const { result } = renderHook(() =>
        useAlertBulkActions({
          alerts: mockAlerts,
          activeAlerts: mockActiveAlerts,
          sourceFilters: [],
          sourceLabelFilters: [],
          acknowledge: mockAcknowledge,
          resolve: mockResolve,
          snooze: mockSnooze,
        }),
      );

      act(() => {
        result.current.resolveBySourceType('ml');
      });

      expect(mockResolve).toHaveBeenCalled();
      // Toast should still be called (errors are caught silently)
      expect(toast.success).toHaveBeenCalled();
    });
  });

  describe('snoozeSimilar', () => {
    it('snoozes alerts matching source label filter', () => {
      const { result } = renderHook(() =>
        useAlertBulkActions({
          alerts: mockAlerts,
          activeAlerts: mockActiveAlerts,
          sourceFilters: [],
          sourceLabelFilters: ['emotion-detector'],
          acknowledge: mockAcknowledge,
          resolve: mockResolve,
          snooze: mockSnooze,
        }),
      );

      act(() => {
        result.current.snoozeSimilar();
      });

      expect(mockSnooze).toHaveBeenCalledTimes(2);
      expect(mockSnooze).toHaveBeenCalledWith('alert-1');
      expect(mockSnooze).toHaveBeenCalledWith('alert-4');
      expect(toast.success).toHaveBeenCalledWith('Snoozed 2 alerts');
    });

    it('snoozes alerts matching source type filter', () => {
      const { result } = renderHook(() =>
        useAlertBulkActions({
          alerts: mockAlerts,
          activeAlerts: mockActiveAlerts,
          sourceFilters: ['ml'],
          sourceLabelFilters: [],
          acknowledge: mockAcknowledge,
          resolve: mockResolve,
          snooze: mockSnooze,
        }),
      );

      act(() => {
        result.current.snoozeSimilar();
      });

      expect(mockSnooze).toHaveBeenCalledTimes(1);
      expect(mockSnooze).toHaveBeenCalledWith('alert-2');
    });

    it('prioritizes label filter over type filter', () => {
      const { result } = renderHook(() =>
        useAlertBulkActions({
          alerts: mockAlerts,
          activeAlerts: mockActiveAlerts,
          sourceFilters: ['heuristic'],
          sourceLabelFilters: ['ml-classifier'],
          acknowledge: mockAcknowledge,
          resolve: mockResolve,
          snooze: mockSnooze,
        }),
      );

      act(() => {
        result.current.snoozeSimilar();
      });

      // Should match by label, not type
      expect(mockSnooze).toHaveBeenCalledTimes(1);
      expect(mockSnooze).toHaveBeenCalledWith('alert-2');
    });

    it('shows info when no filters are active', () => {
      const { result } = renderHook(() =>
        useAlertBulkActions({
          alerts: mockAlerts,
          activeAlerts: mockActiveAlerts,
          sourceFilters: [],
          sourceLabelFilters: [],
          acknowledge: mockAcknowledge,
          resolve: mockResolve,
          snooze: mockSnooze,
        }),
      );

      act(() => {
        result.current.snoozeSimilar();
      });

      expect(mockSnooze).not.toHaveBeenCalled();
      expect(toast.info).toHaveBeenCalledWith('No similar alerts to snooze');
    });

    it('shows info when no alerts match filters', () => {
      const { result } = renderHook(() =>
        useAlertBulkActions({
          alerts: mockAlerts,
          activeAlerts: mockActiveAlerts,
          sourceFilters: ['nonexistent'],
          sourceLabelFilters: [],
          acknowledge: mockAcknowledge,
          resolve: mockResolve,
          snooze: mockSnooze,
        }),
      );

      act(() => {
        result.current.snoozeSimilar();
      });

      expect(mockSnooze).not.toHaveBeenCalled();
      expect(toast.info).toHaveBeenCalledWith('No similar alerts to snooze');
    });

    it('handles snooze errors gracefully', () => {
      mockSnooze.mockImplementation(() => {
        throw new Error('Snooze failed');
      });

      const { result } = renderHook(() =>
        useAlertBulkActions({
          alerts: mockAlerts,
          activeAlerts: mockActiveAlerts,
          sourceFilters: ['ml'],
          sourceLabelFilters: [],
          acknowledge: mockAcknowledge,
          resolve: mockResolve,
          snooze: mockSnooze,
        }),
      );

      act(() => {
        result.current.snoozeSimilar();
      });

      expect(mockSnooze).toHaveBeenCalled();
      // Toast should still be called (errors are caught silently)
      expect(toast.success).toHaveBeenCalled();
    });
  });

  describe('acknowledgeByLabel', () => {
    it('acknowledges all alerts with specified label', () => {
      const { result } = renderHook(() =>
        useAlertBulkActions({
          alerts: mockAlerts,
          activeAlerts: mockActiveAlerts,
          sourceFilters: [],
          sourceLabelFilters: [],
          acknowledge: mockAcknowledge,
          resolve: mockResolve,
          snooze: mockSnooze,
        }),
      );

      act(() => {
        result.current.acknowledgeByLabel('emotion-detector');
      });

      expect(mockAcknowledge).toHaveBeenCalledTimes(2);
      expect(mockAcknowledge).toHaveBeenCalledWith('alert-1');
      expect(mockAcknowledge).toHaveBeenCalledWith('alert-4');
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('for emotion-detector'));
    });

    it('falls back to source type if label is missing', () => {
      const alertsWithoutLabel = [
        createMockAlert({
          id: 'alert-no-label',
          sources: [{ type: 'custom', contributingEntries: [] }],
        }),
      ];

      const { result } = renderHook(() =>
        useAlertBulkActions({
          alerts: alertsWithoutLabel,
          activeAlerts: alertsWithoutLabel,
          sourceFilters: [],
          sourceLabelFilters: [],
          acknowledge: mockAcknowledge,
          resolve: mockResolve,
          snooze: mockSnooze,
        }),
      );

      act(() => {
        result.current.acknowledgeByLabel('custom');
      });

      expect(mockAcknowledge).toHaveBeenCalledWith('alert-no-label');
    });

    it('shows info when no alerts match label', () => {
      const { result } = renderHook(() =>
        useAlertBulkActions({
          alerts: mockAlerts,
          activeAlerts: mockActiveAlerts,
          sourceFilters: [],
          sourceLabelFilters: [],
          acknowledge: mockAcknowledge,
          resolve: mockResolve,
          snooze: mockSnooze,
        }),
      );

      act(() => {
        result.current.acknowledgeByLabel('nonexistent-label');
      });

      expect(mockAcknowledge).not.toHaveBeenCalled();
      expect(toast.info).toHaveBeenCalledWith(
        expect.stringContaining('No alerts for nonexistent-label'),
      );
    });

    it('uses correct pluralization', () => {
      const { result } = renderHook(() =>
        useAlertBulkActions({
          alerts: mockAlerts,
          activeAlerts: mockActiveAlerts,
          sourceFilters: [],
          sourceLabelFilters: [],
          acknowledge: mockAcknowledge,
          resolve: mockResolve,
          snooze: mockSnooze,
        }),
      );

      act(() => {
        result.current.acknowledgeByLabel('ml-classifier');
      });

      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('1 alert for'));
    });
  });

  describe('Edge Cases', () => {
    it('handles empty alerts array', () => {
      const { result } = renderHook(() =>
        useAlertBulkActions({
          alerts: [],
          activeAlerts: [],
          sourceFilters: [],
          sourceLabelFilters: [],
          acknowledge: mockAcknowledge,
          resolve: mockResolve,
          snooze: mockSnooze,
        }),
      );

      act(() => {
        result.current.acknowledgeByConfidence(0.8);
      });

      expect(mockAcknowledge).not.toHaveBeenCalled();
      expect(toast.info).toHaveBeenCalled();
    });

    it('handles alerts without sources', () => {
      const alertsWithoutSources = [createMockAlert({ id: 'alert-no-source', sources: undefined })];

      const { result } = renderHook(() =>
        useAlertBulkActions({
          alerts: alertsWithoutSources,
          activeAlerts: alertsWithoutSources,
          sourceFilters: [],
          sourceLabelFilters: [],
          acknowledge: mockAcknowledge,
          resolve: mockResolve,
          snooze: mockSnooze,
        }),
      );

      act(() => {
        result.current.acknowledgeBySource('heuristic');
      });

      expect(mockAcknowledge).not.toHaveBeenCalled();
      expect(toast.info).toHaveBeenCalled();
    });

    it('handles alerts with empty sources array', () => {
      const alertsWithEmptySources = [createMockAlert({ id: 'alert-empty-sources', sources: [] })];

      const { result } = renderHook(() =>
        useAlertBulkActions({
          alerts: alertsWithEmptySources,
          activeAlerts: alertsWithEmptySources,
          sourceFilters: [],
          sourceLabelFilters: [],
          acknowledge: mockAcknowledge,
          resolve: mockResolve,
          snooze: mockSnooze,
        }),
      );

      act(() => {
        result.current.acknowledgeBySource('heuristic');
      });

      expect(mockAcknowledge).not.toHaveBeenCalled();
    });

    it('handles alerts with undefined confidence', () => {
      const alertsWithoutConfidence = [
        createMockAlert({ id: 'alert-no-confidence', confidence: undefined }),
      ];

      const { result } = renderHook(() =>
        useAlertBulkActions({
          alerts: alertsWithoutConfidence,
          activeAlerts: alertsWithoutConfidence,
          sourceFilters: [],
          sourceLabelFilters: [],
          acknowledge: mockAcknowledge,
          resolve: mockResolve,
          snooze: mockSnooze,
        }),
      );

      act(() => {
        result.current.acknowledgeByConfidence(0.5);
      });

      expect(mockAcknowledge).not.toHaveBeenCalled();
    });
  });

  describe('Memoization', () => {
    it('maintains function references across re-renders', () => {
      // Use stable prop instances to test memoization
      const stableSourceFilters: string[] = [];
      const stableSourceLabelFilters: string[] = [];
      const props = {
        alerts: mockAlerts,
        activeAlerts: mockActiveAlerts,
        sourceFilters: stableSourceFilters,
        sourceLabelFilters: stableSourceLabelFilters,
        acknowledge: mockAcknowledge,
        resolve: mockResolve,
        snooze: mockSnooze,
      };

      const { result, rerender } = renderHook(() => useAlertBulkActions(props));

      const firstRenderFunctions = {
        acknowledgeByConfidence: result.current.acknowledgeByConfidence,
        acknowledgeBySource: result.current.acknowledgeBySource,
        resolveBySourceType: result.current.resolveBySourceType,
        snoozeSimilar: result.current.snoozeSimilar,
        acknowledgeByLabel: result.current.acknowledgeByLabel,
      };

      rerender();

      // Functions should be stable
      expect(result.current.acknowledgeByConfidence).toBe(
        firstRenderFunctions.acknowledgeByConfidence,
      );
      expect(result.current.acknowledgeBySource).toBe(firstRenderFunctions.acknowledgeBySource);
      expect(result.current.resolveBySourceType).toBe(firstRenderFunctions.resolveBySourceType);
      expect(result.current.snoozeSimilar).toBe(firstRenderFunctions.snoozeSimilar);
      expect(result.current.acknowledgeByLabel).toBe(firstRenderFunctions.acknowledgeByLabel);
    });
  });
});
