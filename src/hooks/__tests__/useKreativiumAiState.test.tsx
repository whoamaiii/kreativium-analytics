import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useKreativiumAiState } from '@/hooks/useKreativiumAiState';

const mockStudents = [
  { id: 'student-1', name: 'Student One' },
  { id: 'student-2', name: 'Student Two' },
] as const;

const analyzeStudentMock = vi.fn().mockResolvedValue({
  patterns: [],
  correlations: [],
  insights: [],
  suggestedInterventions: [],
});

vi.mock('@/lib/analysis/llmAnalysisEngine', () => ({
  LLMAnalysisEngine: vi.fn(() => ({
    analyzeStudent: analyzeStudentMock,
  })),
}));

vi.mock('@/lib/aiConfig', () => ({
  loadAiConfig: vi.fn(() => ({
    baseUrl: 'http://localhost:3000',
    modelName: 'local-model',
    localOnly: true,
  })),
}));

vi.mock('@/hooks/useDataQualitySummaries', () => ({
  useDataQualitySummaries: vi.fn(() => ({
    current: null,
    baseline: null,
    isBaselineInsufficient: false,
  })),
}));

vi.mock('@/lib/evidence', () => ({
  resolveSources: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/lib/ai/openrouterClient', () => ({
  openRouterClient: {
    chat: vi.fn(() => Promise.resolve({ content: 'pong' })),
  },
}));

vi.mock('@/lib/dataStorage', () => ({
  dataStorage: {
    getStudents: vi.fn(() => [...mockStudents]),
    getEntriesForStudent: vi.fn(() => []),
    getGoalsForStudent: vi.fn(() => []),
  },
}));

describe('useKreativiumAiState', () => {
  beforeEach(() => {
    analyzeStudentMock.mockClear();
  });

  it('initializes student selection from data storage', async () => {
    const { result } = renderHook(() => useKreativiumAiState());

    expect(result.current.students).toHaveLength(mockStudents.length);

    await waitFor(() => {
      expect(result.current.studentId).toBe('student-1');
    });
  });

  it('updates comparison mode only when value is valid', async () => {
    const { result } = renderHook(() => useKreativiumAiState());

    await waitFor(() => {
      expect(result.current.compareMode).toBe('previous');
    });

    act(() => {
      result.current.onCompareModeChange('invalid-mode');
    });
    expect(result.current.compareMode).toBe('previous');

    act(() => {
      result.current.onCompareModeChange('lastMonth');
    });
    expect(result.current.compareMode).toBe('lastMonth');
  });

  it('invokes analysis engine when analyze is called', async () => {
    const { result } = renderHook(() => useKreativiumAiState());

    await waitFor(() => {
      expect(result.current.studentId).toBe('student-1');
    });

    await act(async () => {
      await result.current.analyze();
    });

    expect(analyzeStudentMock).toHaveBeenCalled();
    expect(result.current.results).not.toBeNull();
  });
});
