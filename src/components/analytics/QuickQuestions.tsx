import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from '@/hooks/useTranslation';
import { useSyncedTabParam } from '@/hooks/useSyncedTabParam';
import { useSyncedExplorePreset } from '@/hooks/useSyncedExplorePreset';
import type { ExplorePreset, TabKey } from '@/types/analytics';
import type { FilterCriteria } from '@/lib/filterUtils';
import { announceToScreenReader } from '@/utils/accessibility';
import { subDays } from 'date-fns';
import {
  CHALLENGING_EMOTION_TOKENS,
  POSITIVE_EMOTION_TOKENS_CORE,
  SENSORY_TYPE_TOKENS,
  CLASSROOM_ACTIVITY_TOKENS,
  NATURAL_LIGHTING_TOKENS,
} from '@/types/filters';

export interface QuickQuestionsProps {
  onNavigate?: (tab: TabKey, preset: ExplorePreset) => void;
  onFiltersApply?: (criteria: FilterCriteria) => void;
  className?: string;
}

type QuestionId =
  | 'peakTiming'
  | 'activityLoad'
  | 'difficultTriggers'
  | 'sensoryChanges'
  | 'timePatterns'
  | 'bestEnvironments';

interface QuickQuestionItem {
  id: QuestionId;
  preset: ExplorePreset;
  buildCriteria: () => FilterCriteria;
}

const DEFAULT_CRITERIA: FilterCriteria = {
  dateRange: { start: null, end: null },
  emotions: { types: [], intensityRange: [0, 5], includeTriggers: [], excludeTriggers: [] },
  sensory: { types: [], responses: [], intensityRange: [0, 5] },
  environmental: {
    locations: [],
    activities: [],
    conditions: { noiseLevel: [0, 10], temperature: [-10, 40], lighting: [] },
    weather: [],
    timeOfDay: [],
  },
  patterns: { anomaliesOnly: false, minConfidence: 0, patternTypes: [] },
  realtime: false,
};

const buildWith = (overrides: Partial<FilterCriteria>): FilterCriteria => ({
  ...DEFAULT_CRITERIA,
  ...overrides,
  emotions: { ...DEFAULT_CRITERIA.emotions, ...(overrides.emotions || {}) },
  sensory: { ...DEFAULT_CRITERIA.sensory, ...(overrides.sensory || {}) },
  environmental: {
    ...DEFAULT_CRITERIA.environmental,
    ...(overrides.environmental || {}),
    conditions: {
      ...DEFAULT_CRITERIA.environmental.conditions,
      ...((overrides.environmental && overrides.environmental.conditions) || {}),
    },
  },
  patterns: { ...DEFAULT_CRITERIA.patterns, ...(overrides.patterns || {}) },
});

export const QuickQuestions: React.FC<QuickQuestionsProps> = ({ onNavigate, onFiltersApply, className }) => {
  const { tAnalytics } = useTranslation();
  const [, setTab] = useSyncedTabParam();
  const [, setPreset] = useSyncedExplorePreset();

  const [open, setOpen] = useState(false);
  const [, setFocusedIndex] = useState<number>(0);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Focus first item when popover opens for better keyboard flow
  useEffect(() => {
    if (open) {
      setFocusedIndex(0);
      itemRefs.current[0]?.focus();
    }
  }, [open]);

  const questions: QuickQuestionItem[] = useMemo(() => [
    {
      id: 'peakTiming',
      preset: 'charts',
      buildCriteria: () => buildWith({
        dateRange: { start: subDays(new Date(), 7), end: new Date() },
        emotions: { ...DEFAULT_CRITERIA.emotions, intensityRange: [4, 5] },
        sensory: { ...DEFAULT_CRITERIA.sensory, intensityRange: [4, 5] },
      }),
    },
    {
      id: 'activityLoad',
      preset: 'correlations',
      buildCriteria: () => buildWith({
        environmental: { ...DEFAULT_CRITERIA.environmental, activities: [...CLASSROOM_ACTIVITY_TOKENS] },
      }),
    },
    {
      id: 'difficultTriggers',
      preset: 'patterns',
      buildCriteria: () => buildWith({
        emotions: { ...DEFAULT_CRITERIA.emotions, types: [...CHALLENGING_EMOTION_TOKENS] },
        patterns: { anomaliesOnly: false, minConfidence: 40, patternTypes: ['correlation', 'trend'] },
      }),
    },
    {
      id: 'sensoryChanges',
      preset: 'charts',
      buildCriteria: () => buildWith({
        sensory: { ...DEFAULT_CRITERIA.sensory, types: [...SENSORY_TYPE_TOKENS] },
      }),
    },
    {
      id: 'timePatterns',
      preset: 'patterns',
      buildCriteria: () => buildWith({
        dateRange: { start: subDays(new Date(), 30), end: new Date() },
        patterns: { anomaliesOnly: false, minConfidence: 30, patternTypes: ['trend'] },
      }),
    },
    {
      id: 'bestEnvironments',
      preset: 'correlations',
      buildCriteria: () => buildWith({
        emotions: { ...DEFAULT_CRITERIA.emotions, types: [...POSITIVE_EMOTION_TOKENS_CORE] },
        environmental: {
          ...DEFAULT_CRITERIA.environmental,
          conditions: { ...DEFAULT_CRITERIA.environmental.conditions, noiseLevel: [0, 4], temperature: [18, 24], lighting: [...NATURAL_LIGHTING_TOKENS] },
        },
      }),
    },
  ], []);

  const closePopover = useCallback(() => setOpen(false), []);

  const handleSelect = useCallback((item: QuickQuestionItem) => {
    setTab('explore');
    setPreset(item.preset);
    onNavigate?.('explore', item.preset);
    const criteria = item.buildCriteria();
    onFiltersApply?.(criteria);
    try {
      announceToScreenReader(
        String(tAnalytics('quickQuestions.navigatingTo', { preset: String(tAnalytics(`explore.presets.${item.preset}`)) })),
        'polite'
      );
    } catch (_err) {
      // non-fatal announcement failure
    }
    closePopover();
  }, [closePopover, onFiltersApply, onNavigate, setPreset, setTab, tAnalytics]);

  const onKeyDownList = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const max = questions.length - 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((i) => {
        const next = Math.min(max, i + 1);
        itemRefs.current[next]?.focus();
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((i) => {
        const next = Math.max(0, i - 1);
        itemRefs.current[next]?.focus();
        return next;
      });
    } else if (e.key === 'Home') {
      e.preventDefault();
      itemRefs.current[0]?.focus();
      setFocusedIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      itemRefs.current[max]?.focus();
      setFocusedIndex(max);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closePopover();
    }
  }, [questions.length, closePopover]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={className}
                aria-label={String(tAnalytics('aria.quickQuestions.trigger'))}
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                {String(tAnalytics('quickQuestions.triggerLabel'))}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            {String(tAnalytics('quickQuestions.triggerTooltip'))}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent
        align="start"
        sideOffset={8}
        aria-label={String(tAnalytics('aria.quickQuestions.popover'))}
        className="w-80 max-w-[90vw] p-0"
      >
        <div className="p-4 border-b">
          <div className="text-sm font-medium">{String(tAnalytics('quickQuestions.title'))}</div>
          <div className="text-xs text-muted-foreground mt-1">{String(tAnalytics('quickQuestions.subtitle'))}</div>
        </div>

        <div
          role="menu"
          aria-orientation="vertical"
          aria-label={String(tAnalytics('aria.quickQuestions.questionsList'))}
          onKeyDown={onKeyDownList}
          className="p-2 max-h-[60vh] overflow-auto"
          tabIndex={0}
        >
          {questions.map((q, idx) => {
            const qKey = `quickQuestions.questions.${q.id}`;
            const question = String(tAnalytics(`${qKey}.question`));
            const description = String(tAnalytics(`${qKey}.description`));
            const descId = `qq-desc-${q.id}`;
            return (
              <button
                key={q.id}
                ref={(el) => (itemRefs.current[idx] = el)}
                role="menuitem"
                aria-label={String(tAnalytics('aria.quickQuestions.questionButton', { question }))}
                aria-describedby={descId}
                onClick={() => handleSelect(q)}
                className="w-full text-left rounded-md px-3 py-2 hover:bg-accent focus:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="text-sm font-medium">{question}</div>
                <div id={descId} className="text-xs text-muted-foreground mt-0.5">
                  {String(tAnalytics('aria.quickQuestions.questionDescription', { description }))}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {String(tAnalytics('explore.presets.' + q.preset))}
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-2 border-t flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={closePopover} aria-label={String(tAnalytics('quickQuestions.actions.closeQuestions'))}>
            {String(tAnalytics('quickQuestions.actions.closeQuestions'))}
          </Button>
          <Button variant="default" size="sm" disabled aria-label={String(tAnalytics('quickQuestions.actions.viewResults'))}>
            {String(tAnalytics('quickQuestions.actions.viewResults'))}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

 
