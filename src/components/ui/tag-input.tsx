import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TagInputProps {
  /** Current array of tags */
  value: string[];
  /** Callback when tags array changes */
  onChange: (tags: string[]) => void;
  /** Optional callback when a tag is added */
  onAddTag?: (tag: string) => void;
  /** Optional callback when a tag is removed */
  onRemoveTag?: (tag: string) => void;
  /** Placeholder text for the input field */
  placeholder?: string;
  /** Optional list of suggested tags to display */
  suggestions?: string[];
  /** Label for the input field (for accessibility) */
  label?: string;
  /** ID for the input field */
  id?: string;
  /** Additional CSS classes for the container */
  className?: string;
  /** Whether to show the add button (default: true) */
  showAddButton?: boolean;
  /** Text for the add button */
  addButtonText?: string;
  /** Maximum number of tags allowed */
  maxTags?: number;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Additional classes for the input container */
  inputClassName?: string;
  /** Additional classes for the tags container */
  tagsClassName?: string;
}

/**
 * TagInput Component
 *
 * A reusable component for managing tags with input, suggestions, and removal functionality.
 * Prevents duplicate tags and provides full keyboard accessibility.
 *
 * @component
 * @example
 * ```tsx
 * const [tags, setTags] = useState<string[]>([]);
 *
 * <TagInput
 *   value={tags}
 *   onChange={setTags}
 *   placeholder="Add a tag..."
 *   suggestions={["Option 1", "Option 2"]}
 *   label="Tags"
 * />
 * ```
 */
const TagInputComponent = ({
  value,
  onChange,
  onAddTag,
  onRemoveTag,
  placeholder = 'Add a tag...',
  suggestions = [],
  label = 'Add tag',
  id,
  className,
  showAddButton = true,
  addButtonText = 'Add',
  maxTags,
  disabled = false,
  inputClassName,
  tagsClassName,
}: TagInputProps) => {
  const [inputValue, setInputValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  /**
   * Handles adding a new tag from the input field
   * Validates: non-empty, not duplicate, under max limit
   */
  const handleAddTag = React.useCallback(() => {
    const trimmedValue = inputValue.trim();

    // Validate tag before adding
    if (!trimmedValue) return;
    if (value.includes(trimmedValue)) return;
    if (maxTags && value.length >= maxTags) return;

    const newTags = [...value, trimmedValue];
    onChange(newTags);
    onAddTag?.(trimmedValue);
    setInputValue('');

    // Refocus input for better UX
    inputRef.current?.focus();
  }, [inputValue, value, onChange, onAddTag, maxTags]);

  /**
   * Handles removing a tag from the list
   */
  const handleRemoveTag = React.useCallback(
    (tag: string) => {
      const newTags = value.filter((t) => t !== tag);
      onChange(newTags);
      onRemoveTag?.(tag);
    },
    [value, onChange, onRemoveTag],
  );

  /**
   * Handles keyboard events on the input field
   * Adds tag on Enter key press
   */
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTag();
      }
    },
    [handleAddTag],
  );

  /**
   * Handles clicking on a suggestion to add it as a tag
   */
  const handleSuggestionClick = React.useCallback(
    (suggestion: string) => {
      if (value.includes(suggestion)) return;
      if (maxTags && value.length >= maxTags) return;

      const newTags = [...value, suggestion];
      onChange(newTags);
      onAddTag?.(suggestion);
    },
    [value, onChange, onAddTag, maxTags],
  );

  const isMaxReached = maxTags ? value.length >= maxTags : false;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Input field with optional add button */}
      <div className={cn('flex gap-2', inputClassName)}>
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isMaxReached ? `Max ${maxTags} tags reached` : placeholder}
          aria-label={label}
          disabled={disabled || isMaxReached}
          className="flex-1 font-dyslexia"
        />
        {showAddButton && (
          <Button
            onClick={handleAddTag}
            size="sm"
            variant="outline"
            disabled={disabled || isMaxReached || !inputValue.trim()}
            type="button"
            className="font-dyslexia"
          >
            {addButtonText}
          </Button>
        )}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2" role="list" aria-label="Suggested tags">
          {suggestions.map((suggestion) => {
            const isAlreadyAdded = value.includes(suggestion);
            return (
              <Badge
                key={suggestion}
                variant="outline"
                className={cn(
                  'cursor-pointer text-xs font-dyslexia transition-all duration-200 hover-lift',
                  isAlreadyAdded && 'opacity-50 cursor-not-allowed',
                )}
                onClick={() => !isAlreadyAdded && !disabled && handleSuggestionClick(suggestion)}
                role="button"
                tabIndex={isAlreadyAdded || disabled ? -1 : 0}
                aria-label={`Add suggestion: ${suggestion}`}
                aria-disabled={isAlreadyAdded || disabled}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !isAlreadyAdded && !disabled) {
                    e.preventDefault();
                    handleSuggestionClick(suggestion);
                  }
                }}
              >
                + {suggestion}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Selected tags */}
      {value.length > 0 && (
        <div
          className={cn('flex flex-wrap gap-2', tagsClassName)}
          role="list"
          aria-label="Selected tags"
        >
          {value.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="cursor-pointer group font-dyslexia transition-all duration-200 hover:bg-secondary/80"
              onClick={() => !disabled && handleRemoveTag(tag)}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-label={`Remove tag: ${tag}`}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
                  e.preventDefault();
                  handleRemoveTag(tag);
                }
              }}
            >
              <span className="mr-1">{tag}</span>
              <X
                className="h-3 w-3 transition-transform duration-200 group-hover:scale-110"
                aria-hidden="true"
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

TagInputComponent.displayName = 'TagInput';

export const TagInput = React.memo(TagInputComponent);
