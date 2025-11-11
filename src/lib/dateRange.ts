export type DatePreset = '7d' | '30d' | '90d' | 'qtd' | 'all' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

export function computeDateRange(
  preset: DatePreset,
  customStart?: string,
  customEnd?: string,
): DateRange | undefined {
  if (preset === 'all') return undefined;
  const now = new Date();
  if (preset === '7d' || preset === '30d' || preset === '90d') {
    const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
    const start = new Date(now);
    start.setDate(now.getDate() - days);
    return { start, end: now };
  }
  if (preset === 'qtd') {
    const month = now.getMonth();
    const qStartMonth = month - (month % 3);
    const start = new Date(now.getFullYear(), qStartMonth, 1);
    return { start, end: now };
  }
  if (preset === 'custom') {
    if (!customStart || !customEnd) return undefined;
    const start = new Date(customStart);
    const end = new Date(customEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return undefined;
    return { start, end };
  }
  return undefined;
}

export function isCustomRangeInvalid(
  preset: DatePreset,
  customStart?: string,
  customEnd?: string,
): boolean {
  if (preset !== 'custom') return false;
  if (!customStart || !customEnd) return true;
  const start = new Date(customStart);
  const end = new Date(customEnd);
  return isNaN(start.getTime()) || isNaN(end.getTime()) || start > end;
}
