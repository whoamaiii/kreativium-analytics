/**
 * @file Alert filter controls component
 *
 * Comprehensive filter UI for alerts including:
 * - Severity and kind toggles
 * - Date range selectors
 * - Time window dropdown
 * - Confidence slider
 * - Source and algorithm filters
 * - Group and sort mode selectors
 * - Intervention filter checkbox
 * - Export button
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/useToast';
import { AlertSeverity, AlertKind, AlertWithGovernance } from '@/lib/alerts/types';
import { useTranslation } from '@/hooks/useTranslation';

export interface AlertFilterControlsProps {
  // Severity filters
  selectedSeverities: AlertSeverity[];
  onSelectedSeveritiesChange: (severities: AlertSeverity[]) => void;

  // Kind filters
  selectedKinds: AlertKind[];
  onSelectedKindsChange: (kinds: AlertKind[]) => void;

  // Date range
  dateStart: string;
  dateEnd: string;
  onDateStartChange: (date: string) => void;
  onDateEndChange: (date: string) => void;

  // Time window
  timeWindowHours?: number;
  onTimeWindowChange: (hours: number | undefined) => void;

  // Confidence
  minConfidence: number;
  onMinConfidenceChange: (confidence: number) => void;

  // Source filters
  availableSourceTypes: Array<{ type: string; display: string; labels: string[] }>;
  sourceFilters: string[];
  onToggleSourceFilter: (type: string) => void;
  onResetSourceFilters: () => void;

  // Algorithm filters
  availableSourceLabels: string[];
  sourceLabelFilters: string[];
  onToggleSourceLabelFilter: (label: string) => void;
  onResetSourceLabelFilters: () => void;

  // Group and sort
  groupMode: 'severity' | 'source' | 'status';
  onGroupModeChange: (mode: 'severity' | 'source' | 'status') => void;
  sortMode: 'newest' | 'confidence' | 'severity';
  onSortModeChange: (mode: 'newest' | 'confidence' | 'severity') => void;

  // Intervention filter
  hasInterventionOnly: boolean;
  onHasInterventionOnlyChange: (enabled: boolean) => void;

  // Export
  activeAlerts: AlertWithGovernance[];
}

/**
 * Comprehensive filter controls for the alerts panel
 *
 * Provides all filtering, grouping, sorting, and export functionality
 * in a unified component. Handles layout and interaction logic.
 */
export const AlertFilterControls: React.FC<AlertFilterControlsProps> = ({
  selectedSeverities,
  onSelectedSeveritiesChange,
  selectedKinds,
  onSelectedKindsChange,
  dateStart,
  dateEnd,
  onDateStartChange,
  onDateEndChange,
  timeWindowHours,
  onTimeWindowChange,
  minConfidence,
  onMinConfidenceChange,
  availableSourceTypes,
  sourceFilters,
  onToggleSourceFilter,
  onResetSourceFilters,
  availableSourceLabels,
  sourceLabelFilters,
  onToggleSourceLabelFilter,
  onResetSourceLabelFilters,
  groupMode,
  onGroupModeChange,
  sortMode,
  onSortModeChange,
  hasInterventionOnly,
  onHasInterventionOnlyChange,
  activeAlerts,
}) => {
  const { tAnalytics } = useTranslation();

  const handleExport = () => {
    try {
      const blob = new Blob([JSON.stringify(activeAlerts, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'alerts.json';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported alerts.json');
    } catch {
      toast.error('Export failed');
    }
  };

  const toggleSeverity = (severity: AlertSeverity) => {
    const newSeverities = selectedSeverities.includes(severity)
      ? selectedSeverities.filter((s) => s !== severity)
      : [...selectedSeverities, severity];
    onSelectedSeveritiesChange(newSeverities);
  };

  const toggleKind = (kind: AlertKind) => {
    const newKinds = selectedKinds.includes(kind)
      ? selectedKinds.filter((k) => k !== kind)
      : [...selectedKinds, kind];
    onSelectedKindsChange(newKinds);
  };

  return (
    <div className="space-y-3">
      {/* Row 1: Severity, Kind, Date Range, Window, Group, Sort, Intervention */}
      <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Alert filters">
        {/* Severity filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600">Severity</span>
          <div className="flex flex-wrap gap-1">
            {[
              AlertSeverity.Critical,
              AlertSeverity.Important,
              AlertSeverity.Moderate,
              AlertSeverity.Low,
            ].map((sev) => (
              <Button
                key={sev}
                variant={selectedSeverities.includes(sev) ? 'default' : 'outline'}
                size="xs"
                onClick={() => toggleSeverity(sev)}
                aria-pressed={selectedSeverities.includes(sev)}
              >
                <span className="capitalize">{sev}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Kind filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600">Kind</span>
          <div className="flex flex-wrap gap-1 max-w-[360px]">
            {Object.values(AlertKind).map((kind) => (
              <Button
                key={kind}
                variant={selectedKinds.includes(kind) ? 'default' : 'outline'}
                size="xs"
                onClick={() => toggleKind(kind)}
                aria-pressed={selectedKinds.includes(kind)}
              >
                <span className="capitalize">{String(kind).replace('_', ' ')}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600">Start</span>
          <input
            type="date"
            className="h-8 text-xs"
            value={dateStart}
            onChange={(e) => onDateStartChange(e.target.value)}
            aria-label="Start date"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600">End</span>
          <input
            type="date"
            className="h-8 text-xs"
            value={dateEnd}
            onChange={(e) => onDateEndChange(e.target.value)}
            aria-label="End date"
          />
        </div>

        {/* Time window */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600">Window</span>
          <Select
            value={(timeWindowHours ?? 0).toString()}
            onValueChange={(v) => onTimeWindowChange(Number(v) || undefined)}
          >
            <SelectTrigger className="h-8 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24">Last 24h</SelectItem>
              <SelectItem value="48">Last 48h</SelectItem>
              <SelectItem value="72">Last 72h</SelectItem>
              <SelectItem value="168">Last 7d</SelectItem>
              <SelectItem value="0">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Group mode */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600">Group</span>
          <Select value={groupMode} onValueChange={(v) => onGroupModeChange(v as any)}>
            <SelectTrigger className="h-8 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="severity">Severity</SelectItem>
              <SelectItem value="source">Source</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort mode */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600">Sort</span>
          <Select value={sortMode} onValueChange={(v) => onSortModeChange(v as any)}>
            <SelectTrigger className="h-8 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="confidence">Confidence</SelectItem>
              <SelectItem value="severity">Severity</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Intervention filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              className="mr-1"
              checked={hasInterventionOnly}
              onChange={(e) => onHasInterventionOnlyChange(e.target.checked)}
            />
            Has intervention
          </label>
        </div>

        {/* Export button */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="xs" onClick={handleExport}>
            Export JSON
          </Button>
        </div>
      </div>

      {/* Row 2: Confidence slider */}
      <div
        className="flex flex-wrap items-center gap-3"
        role="group"
        aria-label="Confidence filter"
      >
        <label htmlFor="alerts-confidence" className="text-xs font-medium text-slate-600">
          Min confidence
        </label>
        <input
          id="alerts-confidence"
          type="range"
          min={0}
          max={100}
          value={Math.round(minConfidence * 100)}
          onChange={(e) => onMinConfidenceChange(Number(e.target.value) / 100)}
          className="h-1 w-40 cursor-pointer"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(minConfidence * 100)}
        />
        <span className="text-xs text-slate-500">{Math.round(minConfidence * 100)}%</span>
        <Button variant="ghost" size="xs" onClick={() => onMinConfidenceChange(0.5)}>
          Reset
        </Button>
      </div>

      {/* Row 3: Source type filters */}
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Source type filters"
      >
        <span className="text-xs font-medium text-slate-600">Sources</span>
        {availableSourceTypes.length === 0 ? (
          <span className="text-xs text-slate-400">No source types yet</span>
        ) : (
          availableSourceTypes.map((src) => (
            <Button
              key={src.type}
              variant={sourceFilters.includes(src.type) ? 'default' : 'outline'}
              size="xs"
              onClick={() => onToggleSourceFilter(src.type)}
              aria-pressed={sourceFilters.includes(src.type)}
              title={src.labels.length > 1 ? src.labels.join(', ') : undefined}
            >
              {src.display}
            </Button>
          ))
        )}
        {sourceFilters.length > 0 && (
          <Button variant="ghost" size="xs" onClick={onResetSourceFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Row 4: Algorithm filters */}
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Algorithm filters"
      >
        <span className="text-xs font-medium text-slate-600">Algorithms</span>
        {availableSourceLabels.length === 0 ? (
          <span className="text-xs text-slate-400">No detector labels yet</span>
        ) : (
          availableSourceLabels.map((label) => (
            <Button
              key={label}
              variant={sourceLabelFilters.includes(label) ? 'default' : 'outline'}
              size="xs"
              onClick={() => onToggleSourceLabelFilter(label)}
              aria-pressed={sourceLabelFilters.includes(label)}
            >
              {label}
            </Button>
          ))
        )}
        {sourceLabelFilters.length > 0 && (
          <Button variant="ghost" size="xs" onClick={onResetSourceLabelFilters}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
};

AlertFilterControls.displayName = 'AlertFilterControls';
