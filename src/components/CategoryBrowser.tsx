import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface CategoryBrowserProps {
  label?: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  className?: string;
  columns?: 2 | 3 | 4;
  searchable?: boolean;
  showCount?: boolean;
}

/**
 * CategoryBrowser
 * A compact, searchable grid selector for categories/tags.
 */
const CategoryBrowserComponent: React.FC<CategoryBrowserProps> = ({
  label,
  options,
  selected,
  onChange,
  className,
  columns = 3,
  searchable = true,
  showCount = false,
}) => {
  const [query, setQuery] = useState('');

  const normalizedOptions = useMemo(() => {
    return Array.from(new Set(options.filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalizedOptions;
    return normalizedOptions.filter((opt) => opt.toLowerCase().includes(q));
  }, [normalizedOptions, query]);

  const toggle = (value: string, checked: boolean | 'indeterminate') => {
    const isChecked = checked === true;
    const next = isChecked
      ? Array.from(new Set([...selected, value]))
      : selected.filter((v) => v !== value);
    onChange(next);
  };

  const clearAll = () => onChange([]);

  const colsCls = columns === 4
    ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
    : columns === 2
      ? 'grid-cols-2'
      : 'grid-cols-2 md:grid-cols-3';

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        {label && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{label}</span>
            {showCount && (
              <Badge variant="secondary">{selected.length}</Badge>
            )}
          </div>
        )}
        {selected.length > 0 && (
          <Button size="xs" variant="ghost" onClick={clearAll} aria-label="Clear selection">
            Clear
          </Button>
        )}
      </div>

      {searchable && (
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          aria-label="Search categories"
        />
      )}

      <div className={cn('grid gap-2', colsCls)}>
        {filtered.map((opt) => (
          <label key={opt} className="flex items-center gap-2 rounded-md px-2 py-2 border hover:bg-accent/40 cursor-pointer">
            <Checkbox
              checked={selected.includes(opt)}
              onCheckedChange={(c) => toggle(opt, c)}
              aria-label={opt}
            />
            <span className="text-sm truncate">{opt}</span>
          </label>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-xs text-muted-foreground">No results</div>
        )}
      </div>
    </div>
  );
};

export const CategoryBrowser = React.memo(CategoryBrowserComponent);
export default CategoryBrowser;


