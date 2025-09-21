import React, { useMemo, useCallback, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters';
import { useTranslation } from '@/hooks/useTranslation';
import { FILTER_PRESETS, type FilterCriteria } from '@/lib/filterUtils';

interface FiltersDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFiltersApply?: (criteria: FilterCriteria) => void;
  initialFilters?: Partial<FilterCriteria>;
}

// Option sources — using existing mockData and tracking conventions for consistency
const EMOTION_TYPES = ['Happy', 'Calm', 'Excited', 'Anxious', 'Frustrated', 'Focused', 'Tired', 'Overwhelmed', 'Content', 'Curious'];
const SENSORY_TYPES = ['Visual', 'Auditory', 'Tactile', 'Vestibular', 'Proprioceptive', 'Olfactory', 'Gustatory'];
const SENSORY_RESPONSES = ['seeking', 'avoiding'];
const LOCATIONS = ['classroom', 'playground', 'lunchroom', 'hallway', 'home', 'therapy', 'library'];
const ACTIVITIES = ['instruction', 'transition', 'free-time', 'testing', 'group-work'];
const LIGHTING = ['natural', 'fluorescent', 'sunlight', 'mixed', 'bright', 'moderate', 'dim'];
const WEATHER = ['sunny', 'cloudy', 'rainy', 'stormy', 'snowy'];
const TIME_OF_DAY = ['morning', 'afternoon', 'evening'];
const PATTERN_TYPES = ['trend', 'anomaly', 'correlation'];

export const FiltersDrawer: React.FC<FiltersDrawerProps> = ({ open, onOpenChange, onFiltersApply, initialFilters }) => {
  const { tAnalytics } = useTranslation();
  const { draft, setDraft, applyFilters, resetFilters, activeCounts, modifiedSinceApply } = useAdvancedFilters(initialFilters);

  // Collapsible state per section
  const [openEmotions, setOpenEmotions] = useState(true);
  const [openSensory, setOpenSensory] = useState(true);
  const [openEnvironmental, setOpenEnvironmental] = useState(false);
  const [openPatterns, setOpenPatterns] = useState(false);
  const [openAdvanced, setOpenAdvanced] = useState(false);

  const applyAndClose = useCallback(() => {
    applyFilters();
    onFiltersApply?.(draft);
    onOpenChange(false);
  }, [applyFilters, draft, onFiltersApply, onOpenChange]);

  const sectionBadge = (count: number) => (
    count > 0 ? <Badge variant="secondary" className="ml-2">{count}</Badge> : null
  );

  const intensityAria = useCallback((type: string) => String(tAnalytics('aria.filters.intensitySlider', { type })), [tAnalytics]);

  // Derived labels
  const labels = useMemo(() => ({
    title: String(tAnalytics('filters.title')),
    apply: String(tAnalytics('filters.apply')),
    reset: String(tAnalytics('filters.reset')),
    activeFilters: String(tAnalytics('filters.activeFilters', { count: activeCounts.total })),
    noActive: String(tAnalytics('filters.noActiveFilters')),
  }), [tAnalytics, activeCounts.total]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" aria-label={String(tAnalytics('aria.filters.drawer'))} className="flex flex-col p-0">
        <div className="flex-1 overflow-y-auto">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle>{labels.title}</SheetTitle>
            <SheetDescription>{activeCounts.total > 0 ? labels.activeFilters : labels.noActive}</SheetDescription>
          </SheetHeader>

          {/* Presets */}
          <div className="px-6 py-3">
            <div className="mb-2 text-sm font-medium">{String(tAnalytics('filters.advanced.presets'))}</div>
            <div className="flex flex-wrap gap-2">
              {FILTER_PRESETS.filter(p => !p.criteria.dateRange).map(preset => (
                <Button key={preset.name} variant="outline" size="sm" onClick={() => {
                  const clampRange = (r?: [number, number], max = 5): [number, number] | undefined =>
                    r ? [Math.max(0, Math.min(r[0], max)), Math.max(0, Math.min(r[1], max))] as [number, number] : undefined;
                  setDraft(() => ({
                    ...draft,
                    emotions: preset.criteria.emotions ? {
                      ...draft.emotions,
                      ...preset.criteria.emotions,
                      intensityRange: clampRange(preset.criteria.emotions.intensityRange, 5) ?? draft.emotions.intensityRange,
                    } : draft.emotions,
                    sensory: preset.criteria.sensory ? {
                      ...draft.sensory,
                      ...preset.criteria.sensory,
                      intensityRange: clampRange(preset.criteria.sensory.intensityRange, 5) ?? draft.sensory.intensityRange,
                    } : draft.sensory,
                    ...preset.criteria as Partial<FilterCriteria>,
                    dateRange: { start: null, end: null },
                  }) as FilterCriteria);
                }}>
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Emotions */}
          <section className="px-6 py-4" aria-label={String(tAnalytics('aria.filters.section', { section: tAnalytics('filters.categories.emotions') }))}>
            <Collapsible open={openEmotions} onOpenChange={setOpenEmotions}>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  aria-label={String(tAnalytics('aria.filters.section', { section: tAnalytics('filters.categories.emotions') }))}
                  className="text-sm font-medium"
                  onClick={() => setOpenEmotions(v => !v)}
                >
                  {String(tAnalytics('filters.categories.emotions'))}
                </button>
                <div className="flex items-center">
                  {sectionBadge(activeCounts.emotions)}
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={String(tAnalytics('filters.clear'))}
                    onClick={() => setDraft(prev => ({
                      ...prev,
                      emotions: { types: [], intensityRange: [0, 5], includeTriggers: [], excludeTriggers: [] },
                    }))}
                  >
                    {String(tAnalytics('filters.clear'))}
                  </Button>
                </div>
              </div>
              <CollapsibleContent>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {EMOTION_TYPES.map(e => (
                    <label key={e} className="flex items-center gap-2">
                      <Checkbox
                        aria-label={String(tAnalytics('aria.filters.filterCheckbox', { filter: e }))}
                        checked={draft.emotions.types.includes(e.toLowerCase())}
                        onCheckedChange={(checked) => setDraft(prev => ({
                          ...prev,
                          emotions: {
                            ...prev.emotions,
                            types: checked
                              ? Array.from(new Set([...prev.emotions.types, e.toLowerCase()]))
                              : prev.emotions.types.filter(x => x !== e.toLowerCase()),
                          }
                        }))}
                      />
                      <span className="text-sm">{e}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-4">
                  <div className="text-xs text-muted-foreground mb-2">{String(tAnalytics('filters.emotions.intensity'))}</div>
                  <Slider
                    aria-label={intensityAria('emotion')}
                    value={[draft.emotions.intensityRange[0], draft.emotions.intensityRange[1]]}
                    min={0}
                    max={5}
                    step={1}
                    onValueChange={(val) => setDraft(prev => ({
                      ...prev,
                      emotions: { ...prev.emotions, intensityRange: [val[0], val[1]] as [number, number] }
                    }))}
                  />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">{String(tAnalytics('filters.emotions.includeTriggers'))}</div>
                    <Select
                      onValueChange={(v) => setDraft(prev => ({
                        ...prev,
                        emotions: { ...prev.emotions, includeTriggers: Array.from(new Set([...(prev.emotions.includeTriggers || []), v])) }
                      }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={String(tAnalytics('filters.emotions.triggers'))} />
                      </SelectTrigger>
                      <SelectContent>
                        {['noise', 'transition', 'reward', 'task-change', 'peer-interaction', 'hunger', 'fatigue'].map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {draft.emotions.includeTriggers.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {draft.emotions.includeTriggers.map(t => (
                          <Badge key={t} variant="secondary" className="flex items-center gap-1">
                            <span>{t}</span>
                            <button
                              type="button"
                              aria-label={`Remove trigger ${t}`}
                              className="rounded p-0.5 hover:bg-muted"
                              onClick={() => setDraft(prev => ({
                                ...prev,
                                emotions: { ...prev.emotions, includeTriggers: prev.emotions.includeTriggers.filter(x => x !== t) }
                              }))}
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">{String(tAnalytics('filters.emotions.excludeTriggers'))}</div>
                    <Select
                      onValueChange={(v) => setDraft(prev => ({
                        ...prev,
                        emotions: { ...prev.emotions, excludeTriggers: Array.from(new Set([...(prev.emotions.excludeTriggers || []), v])) }
                      }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={String(tAnalytics('filters.emotions.triggers'))} />
                      </SelectTrigger>
                      <SelectContent>
                        {['noise', 'transition', 'reward', 'task-change', 'peer-interaction', 'hunger', 'fatigue'].map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {draft.emotions.excludeTriggers.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {draft.emotions.excludeTriggers.map(t => (
                          <Badge key={t} variant="secondary" className="flex items-center gap-1">
                            <span>{t}</span>
                            <button
                              type="button"
                              aria-label={`Remove trigger ${t}`}
                              className="rounded p-0.5 hover:bg-muted"
                              onClick={() => setDraft(prev => ({
                                ...prev,
                                emotions: { ...prev.emotions, excludeTriggers: prev.emotions.excludeTriggers.filter(x => x !== t) }
                              }))}
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </section>

          <Separator />

          {/* Sensory */}
          <section className="px-6 py-4" aria-label={String(tAnalytics('aria.filters.section', { section: tAnalytics('filters.categories.sensory') }))}>
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label={String(tAnalytics('aria.filters.section', { section: tAnalytics('filters.categories.sensory') }))}
                className="text-sm font-medium"
                onClick={() => setOpenSensory(v => !v)}
              >
                {String(tAnalytics('filters.categories.sensory'))}
              </button>
              <div className="flex items-center">
                {sectionBadge(activeCounts.sensory)}
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={String(tAnalytics('filters.clear'))}
                  onClick={() => setDraft(prev => ({
                    ...prev,
                    sensory: { types: [], responses: [], intensityRange: [0, 5] },
                  }))}
                >
                  {String(tAnalytics('filters.clear'))}
                </Button>
              </div>
            </div>
            {openSensory && (
            <>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {SENSORY_TYPES.map(s => (
                <label key={s} className="flex items-center gap-2">
                  <Checkbox
                    aria-label={String(tAnalytics('aria.filters.filterCheckbox', { filter: s }))}
                    checked={draft.sensory.types.includes(s.toLowerCase())}
                    onCheckedChange={(checked) => setDraft(prev => ({
                      ...prev,
                      sensory: {
                        ...prev.sensory,
                        types: checked
                          ? Array.from(new Set([...(prev.sensory.types || []), s.toLowerCase()]))
                          : prev.sensory.types.filter(x => x !== s.toLowerCase()),
                      }
                    }))}
                  />
                  <span className="text-sm">{s}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {SENSORY_RESPONSES.map(r => (
                <label key={r} className="flex items-center gap-2">
                  <Checkbox
                    aria-label={String(tAnalytics('aria.filters.filterCheckbox', { filter: r }))}
                    checked={draft.sensory.responses.includes(r)}
                    onCheckedChange={(checked) => setDraft(prev => ({
                      ...prev,
                      sensory: {
                        ...prev.sensory,
                        responses: checked
                          ? Array.from(new Set([...(prev.sensory.responses || []), r]))
                          : prev.sensory.responses.filter(x => x !== r),
                      }
                    }))}
                  />
                  <span className="text-sm capitalize">{r}</span>
                </label>
              ))}
            </div>
            <div className="mt-4">
              <div className="text-xs text-muted-foreground mb-2">{String(tAnalytics('filters.sensory.intensity'))}</div>
              <Slider
                aria-label={intensityAria('sensory')}
                value={[draft.sensory.intensityRange[0], draft.sensory.intensityRange[1]]}
                min={0}
                max={5}
                step={1}
                onValueChange={(val) => setDraft(prev => ({
                  ...prev,
                  sensory: { ...prev.sensory, intensityRange: [val[0], val[1]] as [number, number] }
                }))}
              />
            </div>
            </>
            )}
          </section>

          <Separator />

          {/* Environmental */}
          <section className="px-6 py-4" aria-label={String(tAnalytics('aria.filters.section', { section: tAnalytics('filters.categories.environmental') }))}>
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label={String(tAnalytics('aria.filters.section', { section: tAnalytics('filters.categories.environmental') }))}
                className="text-sm font-medium"
                onClick={() => setOpenEnvironmental(v => !v)}
              >
                {String(tAnalytics('filters.categories.environmental'))}
              </button>
              <div className="flex items-center">
                {sectionBadge(activeCounts.environmental)}
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={String(tAnalytics('filters.clear'))}
                  onClick={() => setDraft(prev => ({
                    ...prev,
                    environmental: {
                      locations: [],
                      activities: [],
                      conditions: { noiseLevel: [0, 10], temperature: [15, 30], lighting: [] },
                      weather: [],
                      timeOfDay: [],
                    },
                  }))}
                >
                  {String(tAnalytics('filters.clear'))}
                </Button>
              </div>
            </div>
            {openEnvironmental && (
            <>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-2">{String(tAnalytics('filters.environmental.locations'))}</div>
                <div className="grid grid-cols-2 gap-2">
                  {LOCATIONS.map(loc => (
                    <label key={loc} className="flex items-center gap-2">
                      <Checkbox
                        aria-label={String(tAnalytics('aria.filters.filterCheckbox', { filter: loc }))}
                        checked={draft.environmental.locations.includes(loc)}
                        onCheckedChange={(checked) => setDraft(prev => ({
                          ...prev,
                          environmental: {
                            ...prev.environmental,
                            locations: checked
                              ? Array.from(new Set([...(prev.environmental.locations || []), loc]))
                              : prev.environmental.locations.filter(x => x !== loc),
                          }
                        }))}
                      />
                      <span className="text-sm capitalize">{loc}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-2">{String(tAnalytics('filters.environmental.activities'))}</div>
                <div className="grid grid-cols-2 gap-2">
                  {ACTIVITIES.map(act => (
                    <label key={act} className="flex items-center gap-2">
                      <Checkbox
                        aria-label={String(tAnalytics('aria.filters.filterCheckbox', { filter: act }))}
                        checked={draft.environmental.activities.includes(act)}
                        onCheckedChange={(checked) => setDraft(prev => ({
                          ...prev,
                          environmental: {
                            ...prev.environmental,
                            activities: checked
                              ? Array.from(new Set([...(prev.environmental.activities || []), act]))
                              : prev.environmental.activities.filter(x => x !== act),
                          }
                        }))}
                      />
                      <span className="text-sm capitalize">{act}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-2">{String(tAnalytics('filters.environmental.noiseLevel'))}</div>
                <Slider
                  aria-label={intensityAria('noise')}
                  value={[draft.environmental.conditions.noiseLevel[0], draft.environmental.conditions.noiseLevel[1]]}
                  min={0}
                  max={10}
                  step={1}
                  onValueChange={(val) => setDraft(prev => ({
                    ...prev,
                    environmental: { ...prev.environmental, conditions: { ...prev.environmental.conditions, noiseLevel: [val[0], val[1]] as [number, number] } }
                  }))}
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-2">{String(tAnalytics('filters.environmental.temperature'))}</div>
                <Slider
                  aria-label={intensityAria('temperature')}
                  value={[draft.environmental.conditions.temperature[0], draft.environmental.conditions.temperature[1]]}
                  min={-10}
                  max={40}
                  step={1}
                  onValueChange={(val) => setDraft(prev => ({
                    ...prev,
                    environmental: { ...prev.environmental, conditions: { ...prev.environmental.conditions, temperature: [val[0], val[1]] as [number, number] } }
                  }))}
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-2">{String(tAnalytics('filters.environmental.lighting'))}</div>
                <div className="grid grid-cols-2 gap-2">
                  {LIGHTING.map(l => (
                    <label key={l} className="flex items-center gap-2">
                      <Checkbox
                        aria-label={String(tAnalytics('aria.filters.filterCheckbox', { filter: l }))}
                        checked={draft.environmental.conditions.lighting.includes(l)}
                        onCheckedChange={(checked) => setDraft(prev => ({
                          ...prev,
                          environmental: { ...prev.environmental, conditions: { ...prev.environmental.conditions, lighting: checked
                            ? Array.from(new Set([...(prev.environmental.conditions.lighting || []), l]))
                            : prev.environmental.conditions.lighting.filter(x => x !== l) } }
                        }))}
                      />
                      <span className="text-sm capitalize">{l}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-2">{String(tAnalytics('filters.environmental.weather'))}</div>
                <div className="grid grid-cols-2 gap-2">
                  {WEATHER.map(w => (
                    <label key={w} className="flex items-center gap-2">
                      <Checkbox
                        aria-label={String(tAnalytics('aria.filters.filterCheckbox', { filter: w }))}
                        checked={draft.environmental.weather.includes(w)}
                        onCheckedChange={(checked) => setDraft(prev => ({
                          ...prev,
                          environmental: { ...prev.environmental, weather: checked
                            ? Array.from(new Set([...(prev.environmental.weather || []), w]))
                            : prev.environmental.weather.filter(x => x !== w) }
                        }))}
                      />
                      <span className="text-sm capitalize">{w}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-xs text-muted-foreground mb-2">{String(tAnalytics('filters.environmental.timeOfDay'))}</div>
              <div className="grid grid-cols-3 gap-2">
                {TIME_OF_DAY.map(t => (
                  <label key={t} className="flex items-center gap-2">
                    <Checkbox
                      aria-label={String(tAnalytics('aria.filters.filterCheckbox', { filter: t }))}
                      checked={draft.environmental.timeOfDay.includes(t)}
                      onCheckedChange={(checked) => setDraft(prev => ({
                        ...prev,
                        environmental: { ...prev.environmental, timeOfDay: checked
                          ? Array.from(new Set([...(prev.environmental.timeOfDay || []), t]))
                          : prev.environmental.timeOfDay.filter(x => x !== t) }
                      }))}
                    />
                    <span className="text-sm capitalize">{t}</span>
                  </label>
                ))}
              </div>
            </div>
            </>
            )}
          </section>

          <Separator />

          {/* Patterns */}
          <section className="px-6 py-4" aria-label={String(tAnalytics('aria.filters.section', { section: tAnalytics('filters.categories.patterns') }))}>
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label={String(tAnalytics('aria.filters.section', { section: tAnalytics('filters.categories.patterns') }))}
                className="text-sm font-medium"
                onClick={() => setOpenPatterns(v => !v)}
              >
                {String(tAnalytics('filters.categories.patterns'))}
              </button>
              <div className="flex items-center">
                {sectionBadge(activeCounts.patterns)}
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={String(tAnalytics('filters.clear'))}
                  onClick={() => setDraft(prev => ({
                    ...prev,
                    patterns: { anomaliesOnly: false, minConfidence: 0, patternTypes: [] },
                  }))}
                >
                  {String(tAnalytics('filters.clear'))}
                </Button>
              </div>
            </div>
            {openPatterns && (
            <>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm">{String(tAnalytics('filters.patterns.anomaliesOnly'))}</span>
              <Switch
                aria-label={String(tAnalytics('filters.patterns.anomaliesOnly'))}
                checked={draft.patterns.anomaliesOnly}
                onCheckedChange={(checked) => setDraft(prev => ({ ...prev, patterns: { ...prev.patterns, anomaliesOnly: !!checked } }))}
              />
            </div>
            <div className="mt-4">
              <div className="text-xs text-muted-foreground mb-2">{String(tAnalytics('filters.patterns.minConfidence'))}</div>
              <Slider
                aria-label={String(tAnalytics('filters.patterns.confidence', { value: draft.patterns.minConfidence }))}
                value={[draft.patterns.minConfidence]}
                min={0}
                max={100}
                step={1}
                onValueChange={(val) => setDraft(prev => ({ ...prev, patterns: { ...prev.patterns, minConfidence: val[0] } }))}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {PATTERN_TYPES.map(p => (
                <label key={p} className="flex items-center gap-2">
                  <Checkbox
                    aria-label={String(tAnalytics('aria.filters.filterCheckbox', { filter: p }))}
                    checked={draft.patterns.patternTypes.includes(p.toLowerCase())}
                    onCheckedChange={(checked) => setDraft(prev => ({
                      ...prev,
                      patterns: { ...prev.patterns, patternTypes: checked
                        ? Array.from(new Set([...(prev.patterns.patternTypes || []), p.toLowerCase()]))
                        : prev.patterns.patternTypes.filter(x => x !== p.toLowerCase()) }
                    }))}
                  />
                  <span className="text-sm capitalize">{p}</span>
                </label>
              ))}
            </div>
            </>
            )}
          </section>

          <Separator />

          {/* Advanced */}
          <section className="px-6 py-4" aria-label={String(tAnalytics('aria.filters.section', { section: tAnalytics('filters.categories.advanced') }))}>
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label={String(tAnalytics('aria.filters.section', { section: tAnalytics('filters.categories.advanced') }))}
                className="text-sm font-medium"
                onClick={() => setOpenAdvanced(v => !v)}
              >
                {String(tAnalytics('filters.categories.advanced'))}
              </button>
              <div className="flex items-center">
                {sectionBadge(activeCounts.advanced)}
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={String(tAnalytics('filters.clear'))}
                  onClick={() => setDraft(prev => ({ ...prev, realtime: false }))}
                >
                  {String(tAnalytics('filters.clear'))}
                </Button>
              </div>
            </div>
            {openAdvanced && (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm">{String(tAnalytics('filters.advanced.realtime'))}</span>
                <Switch
                  aria-label={String(tAnalytics('filters.advanced.realtime'))}
                  checked={draft.realtime}
                  onCheckedChange={(checked) => setDraft(prev => ({ ...prev, realtime: !!checked }))}
                />
              </div>
            )}
          </section>
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 w-full border-t bg-background p-4 flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {activeCounts.total > 0 ? String(tAnalytics('filters.activeFilters', { count: activeCounts.total })) : String(tAnalytics('filters.noActiveFilters'))}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={resetFilters} aria-label={String(tAnalytics('aria.filters.resetButton'))}>
              {String(tAnalytics('filters.reset'))}
            </Button>
            {/* Patterns filters affect pattern-analysis views; base data filtering remains driven by emotions/sensory/environmental criteria. */}
            <Button onClick={applyAndClose} aria-label={String(tAnalytics('aria.filters.applyButton'))} disabled={!modifiedSinceApply}>
              {String(tAnalytics('filters.apply'))}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

 
