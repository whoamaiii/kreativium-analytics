/**
 * @file Alert search bar component
 *
 * Provides a focused search input for filtering alerts by text.
 * Supports keyboard shortcuts and ref forwarding for external focus control.
 */

import React, { forwardRef } from 'react';
import { Input } from '@/components/ui/input';

export interface AlertSearchBarProps {
  /** Current search query value */
  value: string;

  /** Callback when search query changes */
  onChange: (value: string) => void;

  /** Optional placeholder text */
  placeholder?: string;

  /** Optional CSS class name */
  className?: string;
}

/**
 * Search bar component for filtering alerts
 *
 * Features:
 * - Controlled input with onChange callback
 * - Keyboard shortcut support (focus via ref)
 * - Consistent styling with 48-char width
 *
 * @example
 * const searchRef = useRef<HTMLInputElement>(null);
 *
 * <AlertSearchBar
 *   value={searchQuery}
 *   onChange={setSearchQuery}
 *   ref={searchRef}
 * />
 */
export const AlertSearchBar = forwardRef<HTMLInputElement, AlertSearchBarProps>(
  ({ value, onChange, placeholder = 'Search alerts', className = 'w-48 h-8' }, ref) => {
    return (
      <Input
        ref={ref}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        aria-label="Search alerts"
      />
    );
  },
);

AlertSearchBar.displayName = 'AlertSearchBar';
