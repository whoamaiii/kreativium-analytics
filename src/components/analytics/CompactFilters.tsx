import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { CategoryBrowser } from '@/components/CategoryBrowser';
import { Filter, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import type { FilterCriteria } from '@/lib/filterUtils';

interface CompactFiltersProps {
  filters: FilterCriteria;
  onFiltersChange: (filters: FilterCriteria) => void;
  activeCount: number;
}

const EMOTION_TYPES = ['Happy', 'Calm', 'Excited', 'Anxious', 'Frustrated', 'Focused'];
const SENSORY_TYPES = ['Visual', 'Auditory', 'Tactile', 'Vestibular'];

export const CompactFilters: React.FC<CompactFiltersProps> = ({
  filters,
  onFiltersChange,
  activeCount
}) => {
  const { tAnalytics } = useTranslation();
  const [open, setOpen] = useState(false);

  const updateEmotions = (types: string[]) => {
    onFiltersChange({
      ...filters,
      emotions: { ...filters.emotions, types }
    });
  };

  const updateSensory = (types: string[]) => {
    onFiltersChange({
      ...filters,
      sensory: { ...filters.sensory, types }
    });
  };

  const updateEmotionIntensity = (range: [number, number]) => {
    onFiltersChange({
      ...filters,
      emotions: { ...filters.emotions, intensityRange: range }
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
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
    });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          {String(tAnalytics('filters.title', { defaultValue: 'Filters' }))}
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{String(tAnalytics('filters.quickFilters', { defaultValue: 'Quick Filters' }))}</h3>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 px-2 text-xs">
                <X className="h-3 w-3 mr-1" />
                {String(tAnalytics('filters.clear', { defaultValue: 'Clear' }))}
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
          {/* Emotions */}
          <div>
            <CategoryBrowser
              label={String(tAnalytics('filters.categories.emotions', { defaultValue: 'Emotions' }))}
              options={EMOTION_TYPES.map(e => e.toLowerCase())}
              selected={filters.emotions.types}
              onChange={updateEmotions}
              columns={2}
              searchable
              showCount
            />
            <div className="mt-3">
              <label className="text-xs text-muted-foreground mb-2 block">
                {String(tAnalytics('filters.emotions.intensity', { defaultValue: 'Intensity' }))} 
                ({filters.emotions.intensityRange[0]}-{filters.emotions.intensityRange[1]})
              </label>
              <Slider
                value={filters.emotions.intensityRange}
                min={0}
                max={5}
                step={1}
                onValueChange={(value) => updateEmotionIntensity([value[0], value[1]])}
              />
            </div>
          </div>

          {/* Sensory */}
          <div>
            <CategoryBrowser
              label={String(tAnalytics('filters.categories.sensory', { defaultValue: 'Sensory' }))}
              options={SENSORY_TYPES.map(s => s.toLowerCase())}
              selected={filters.sensory.types}
              onChange={updateSensory}
              columns={2}
              searchable
              showCount
            />
          </div>
        </div>

        <div className="p-3 border-t bg-muted/20">
          <Button 
            size="sm" 
            className="w-full" 
            onClick={() => setOpen(false)}
          >
            {String(tAnalytics('filters.apply', { defaultValue: 'Apply Filters' }))}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

