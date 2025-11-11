import { useCallback, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { AlertSeverity, AlertKind, AlertWithGovernance } from '@/lib/alerts/types';

export type AlertGroupMode = 'severity' | 'source' | 'status';
export type AlertSortMode = 'newest' | 'confidence' | 'severity';

export interface SourceTypeOption {
  type: string;
  labels: string[];
  display: string;
}

export interface AlertCounts {
  total: number;
  bySeverity: Record<AlertSeverity, number>;
}

export interface GroupedAlerts {
  bySeverity: Record<AlertSeverity, AlertWithGovernance[]>;
  bySource: Record<string, AlertWithGovernance[]>;
  byStatus: Record<string, AlertWithGovernance[]>;
}

export interface AlertFilterState {
  selectedSeverities: AlertSeverity[];
  selectedKinds: AlertKind[];
  timeWindowHours?: number;
  minConfidence: number;
  sourceFilters: string[];
  sourceLabelFilters: string[];
  dateStart: string;
  dateEnd: string;
  searchQuery: string;
  groupMode: AlertGroupMode;
  hasInterventionOnly: boolean;
  sortMode: AlertSortMode;
}

export interface AlertFilterActions {
  setSelectedSeverities: Dispatch<SetStateAction<AlertSeverity[]>>;
  setSelectedKinds: Dispatch<SetStateAction<AlertKind[]>>;
  setTimeWindowHours: Dispatch<SetStateAction<number | undefined>>;
  setMinConfidence: Dispatch<SetStateAction<number>>;
  setSourceFilters: Dispatch<SetStateAction<string[]>>;
  setSourceLabelFilters: Dispatch<SetStateAction<string[]>>;
  setDateStart: Dispatch<SetStateAction<string>>;
  setDateEnd: Dispatch<SetStateAction<string>>;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  setGroupMode: Dispatch<SetStateAction<AlertGroupMode>>;
  setHasInterventionOnly: Dispatch<SetStateAction<boolean>>;
  setSortMode: Dispatch<SetStateAction<AlertSortMode>>;
  toggleSourceFilter: (type: string) => void;
  toggleSourceLabelFilter: (label: string) => void;
  resetSourceFilters: () => void;
  resetSourceLabelFilters: () => void;
}

export interface UseAlertFiltersOptions {
  defaultTimeWindowHours?: number;
  defaultMinConfidence?: number;
  defaultGroupMode?: AlertGroupMode;
  defaultSortMode?: AlertSortMode;
  initialSeverities?: AlertSeverity[];
}

export interface UseAlertFilterStateResult {
  state: AlertFilterState;
  actions: AlertFilterActions;
  queryFilters: {
    severity: string[];
    kinds: string[];
    timeWindowHours?: number;
  };
}

export interface AlertDerivedData {
  availableSourceTypes: SourceTypeOption[];
  availableSourceLabels: string[];
  activeAlerts: AlertWithGovernance[];
  counts: AlertCounts;
  grouped: GroupedAlerts;
}

export const severityOrder: Record<AlertSeverity, number> = {
  [AlertSeverity.Critical]: 4,
  [AlertSeverity.Important]: 3,
  [AlertSeverity.Moderate]: 2,
  [AlertSeverity.Low]: 1,
};

const DEFAULT_SEVERITIES: AlertSeverity[] = [
  AlertSeverity.Critical,
  AlertSeverity.Important,
  AlertSeverity.Moderate,
  AlertSeverity.Low,
];

const isFuzzyMatch = (needle: string, haystack: string): boolean => {
  if (!needle) return true;
  let i = 0;
  const n = needle.toLowerCase();
  const h = haystack.toLowerCase();
  for (let j = 0; j < h.length && i < n.length; j += 1) {
    if (h[j] === n[i]) i += 1;
  }
  return i === n.length;
};

export const useAlertFilterState = ({
  defaultTimeWindowHours = 72,
  defaultMinConfidence = 0.5,
  defaultGroupMode = 'severity',
  defaultSortMode = 'newest',
  initialSeverities = DEFAULT_SEVERITIES,
}: UseAlertFiltersOptions = {}): UseAlertFilterStateResult => {
  const [selectedSeverities, setSelectedSeverities] = useState<AlertSeverity[]>(initialSeverities);
  const [selectedKinds, setSelectedKinds] = useState<AlertKind[]>([]);
  const [timeWindowHours, setTimeWindowHours] = useState<number | undefined>(
    defaultTimeWindowHours,
  );
  const [minConfidence, setMinConfidence] = useState<number>(defaultMinConfidence);
  const [sourceFilters, setSourceFilters] = useState<string[]>([]);
  const [sourceLabelFilters, setSourceLabelFilters] = useState<string[]>([]);
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [groupMode, setGroupMode] = useState<AlertGroupMode>(defaultGroupMode);
  const [hasInterventionOnly, setHasInterventionOnly] = useState<boolean>(false);
  const [sortMode, setSortMode] = useState<AlertSortMode>(defaultSortMode);

  const toggleSourceFilter = useCallback((type: string) => {
    setSourceFilters((prev) =>
      prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type],
    );
  }, []);

  const toggleSourceLabelFilter = useCallback((label: string) => {
    setSourceLabelFilters((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label],
    );
  }, []);

  const resetSourceFilters = useCallback(() => setSourceFilters([]), []);
  const resetSourceLabelFilters = useCallback(() => setSourceLabelFilters([]), []);

  return {
    state: {
      selectedSeverities,
      selectedKinds,
      timeWindowHours,
      minConfidence,
      sourceFilters,
      sourceLabelFilters,
      dateStart,
      dateEnd,
      searchQuery,
      groupMode,
      hasInterventionOnly,
      sortMode,
    },
    actions: {
      setSelectedSeverities,
      setSelectedKinds,
      setTimeWindowHours,
      setMinConfidence,
      setSourceFilters,
      setSourceLabelFilters,
      setDateStart,
      setDateEnd,
      setSearchQuery,
      setGroupMode,
      setHasInterventionOnly,
      setSortMode,
      toggleSourceFilter,
      toggleSourceLabelFilter,
      resetSourceFilters,
      resetSourceLabelFilters,
    },
    queryFilters: {
      severity: selectedSeverities as unknown as string[],
      kinds: selectedKinds as unknown as string[],
      timeWindowHours,
    },
  };
};

export const useAlertDerivedData = (
  alerts: AlertWithGovernance[],
  state: AlertFilterState,
): AlertDerivedData => {
  const availableSourceTypes = useMemo<SourceTypeOption[]>(() => {
    const counts = new Map<string, Set<string>>();
    alerts.forEach((alert) => {
      (alert.sources ?? []).forEach((src) => {
        if (!src.type) return;
        const labels = counts.get(src.type) ?? new Set<string>();
        if (typeof src.label === 'string' && src.label.length) {
          labels.add(src.label);
        }
        counts.set(src.type, labels);
      });
    });
    return Array.from(counts.entries())
      .map(([type, labels]) => {
        const sampleLabel = labels.size ? Array.from(labels)[0] : undefined;
        return {
          type,
          labels: Array.from(labels).sort(),
          display: sampleLabel ? `${type} (${sampleLabel})` : type,
        };
      })
      .sort((a, b) => a.type.localeCompare(b.type));
  }, [alerts]);

  const availableSourceLabels = useMemo<string[]>(() => {
    const set = new Set<string>();
    alerts.forEach((alert) => {
      (alert.sources ?? []).forEach((src) => {
        const label = src.label ?? src.type ?? '';
        if (label) set.add(label);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [alerts]);

  const activeAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const confidenceOk = (alert.confidence ?? 0) >= state.minConfidence;
      if (!confidenceOk) return false;
      const sources = alert.sources ?? [];
      const passesType =
        state.sourceFilters.length === 0 ||
        sources.some((source) => state.sourceFilters.includes(source.type));
      if (!passesType) return false;
      const passesLabel =
        state.sourceLabelFilters.length === 0 ||
        sources.some((source) =>
          state.sourceLabelFilters.includes(source.label ?? source.type ?? ''),
        );
      if (!passesLabel) return false;
      if (state.hasInterventionOnly && !(alert.metadata && (alert.metadata as any).interventionId))
        return false;
      if (state.dateStart) {
        const startMs = new Date(state.dateStart).getTime();
        if (new Date(alert.createdAt).getTime() < startMs) return false;
      }
      if (state.dateEnd) {
        const endMs = new Date(state.dateEnd).getTime() + 24 * 3600_000 - 1;
        if (new Date(alert.createdAt).getTime() > endMs) return false;
      }
      if (state.searchQuery.trim()) {
        const q = state.searchQuery.toLowerCase();
        const hay = [
          alert.kind,
          alert.severity,
          alert.metadata?.summary,
          alert.metadata?.label,
          ...sources.map((s) => `${s.type} ${s.label ?? ''}`),
        ]
          .join(' ')
          .toLowerCase();
        if (!isFuzzyMatch(q, hay)) return false;
      }
      return true;
    });
  }, [
    alerts,
    state.minConfidence,
    state.sourceFilters,
    state.sourceLabelFilters,
    state.hasInterventionOnly,
    state.dateStart,
    state.dateEnd,
    state.searchQuery,
  ]);

  const counts = useMemo<AlertCounts>(() => {
    const bySeverity: Record<AlertSeverity, number> = {
      [AlertSeverity.Critical]: 0,
      [AlertSeverity.Important]: 0,
      [AlertSeverity.Moderate]: 0,
      [AlertSeverity.Low]: 0,
    };
    activeAlerts.forEach((alert) => {
      bySeverity[alert.severity] = (bySeverity[alert.severity] ?? 0) + 1;
    });
    return {
      total: activeAlerts.length,
      bySeverity,
    };
  }, [activeAlerts]);

  const grouped = useMemo<GroupedAlerts>(() => {
    const bySeverity: Record<AlertSeverity, AlertWithGovernance[]> = {
      [AlertSeverity.Critical]: [],
      [AlertSeverity.Important]: [],
      [AlertSeverity.Moderate]: [],
      [AlertSeverity.Low]: [],
    };
    const bySource: Record<string, AlertWithGovernance[]> = {};
    const byStatus: Record<string, AlertWithGovernance[]> = {};

    activeAlerts.forEach((alert) => {
      bySeverity[alert.severity].push(alert);
      const type = alert.sources?.[0]?.type ?? 'unknown';
      bySource[type] = bySource[type] || [];
      bySource[type].push(alert);
      const status = alert.status ?? 'new';
      byStatus[status] = byStatus[status] || [];
      byStatus[status].push(alert);
    });

    const sorters: Record<
      AlertSortMode,
      (x: AlertWithGovernance, y: AlertWithGovernance) => number
    > = {
      newest: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      confidence: (a, b) => (b.confidence ?? 0) - (a.confidence ?? 0),
      severity: (a, b) => severityOrder[b.severity] - severityOrder[a.severity],
    };

    const sorter = sorters[state.sortMode];
    Object.values(bySeverity).forEach((arr) => arr.sort(sorter));
    Object.values(bySource).forEach((arr) => arr.sort(sorter));
    Object.values(byStatus).forEach((arr) => arr.sort(sorter));

    return { bySeverity, bySource, byStatus };
  }, [activeAlerts, state.sortMode]);

  return {
    availableSourceTypes,
    availableSourceLabels,
    activeAlerts,
    counts,
    grouped,
  };
};
