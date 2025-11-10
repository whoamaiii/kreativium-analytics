import { useState } from 'react';
import { format, subDays, subMonths, startOfDay, endOfDay } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';

export interface TimeRange {
  start: Date;
  end: Date;
  label: string;
}

interface DateRangeSelectorProps {
  onRangeChange: (range: TimeRange) => void;
  selectedRange: TimeRange;
  className?: string;
}

export const DateRangeSelector = ({
  onRangeChange,
  selectedRange,
  className,
}: DateRangeSelectorProps) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: selectedRange.start,
    to: selectedRange.end,
  });

  // Canonical presets; keep in sync across the app
  const presetRanges = [
    {
      label: 'Last 7 days',
      value: '7d',
      getRange: () => ({
        start: startOfDay(subDays(new Date(), 6)),
        end: endOfDay(new Date()),
        label: 'Last 7 days',
      }),
    },
    {
      label: 'Last 30 days',
      value: '30d',
      getRange: () => ({
        start: startOfDay(subDays(new Date(), 29)),
        end: endOfDay(new Date()),
        label: 'Last 30 days',
      }),
    },
    {
      label: 'Last 3 months',
      value: '3m',
      getRange: () => ({
        start: startOfDay(subMonths(new Date(), 3)),
        end: endOfDay(new Date()),
        label: 'Last 3 months',
      }),
    },
    {
      label: 'Last 6 months',
      value: '6m',
      getRange: () => ({
        start: startOfDay(subMonths(new Date(), 6)),
        end: endOfDay(new Date()),
        label: 'Last 6 months',
      }),
    },
    {
      label: 'This week',
      value: 'week',
      getRange: () => {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const startOfWeek = subDays(now, dayOfWeek);
        return {
          start: startOfDay(startOfWeek),
          end: endOfDay(now),
          label: 'This week',
        };
      },
    },
    {
      label: 'This month',
      value: 'month',
      getRange: () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return {
          start: startOfDay(startOfMonth),
          end: endOfDay(now),
          label: 'This month',
        };
      },
    },
  ];

  const handlePresetSelect = (value: string) => {
    const preset = presetRanges.find((p) => p.value === value);
    if (preset) {
      const range = preset.getRange();
      onRangeChange(range);
      setDateRange({ from: range.start, to: range.end });
    }
  };

  const handleCustomDateSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      onRangeChange({
        start: startOfDay(range.from),
        end: endOfDay(range.to),
        label: `${format(range.from, 'MMM d')} - ${format(range.to, 'MMM d, yyyy')}`,
      });
    }
  };

  return (
    <div className={cn('flex items-center gap-2 font-dyslexia', className)}>
      {/* Preset Selector */}
      <Select onValueChange={handlePresetSelect}>
        <SelectTrigger className="w-[160px] bg-input border-border">
          <SelectValue placeholder="Quick select" />
        </SelectTrigger>
        <SelectContent>
          {presetRanges.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Custom Date Range */}
      <DatePickerWithRange
        value={dateRange}
        onChange={handleCustomDateSelect}
        className={cn('w-[280px]')}
      />

      {/* Current Selection Display */}
      <div className="text-sm text-muted-foreground">
        <span className="hidden md:inline">Selected: </span>
        <span className="font-medium text-foreground">{selectedRange.label}</span>
      </div>
    </div>
  );
};
