import { memo } from 'react';
import { Button } from '@/components/ui/button';

interface IntensityScaleProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  showInput?: boolean;
  showButtons?: boolean;
  className?: string;
}

/**
 * IntensityScale - Reusable intensity selector with buttons and optional number input
 * Used across emotion and sensory tracking components
 */
const IntensityScaleComponent = ({
  value,
  onChange,
  min = 1,
  max = 5,
  label,
  showInput = true,
  showButtons = true,
  className = '',
}: IntensityScaleProps) => {
  const handleChange = (newValue: number) => {
    const clamped = Math.max(min, Math.min(max, newValue));
    onChange(clamped);
  };

  const levels = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  return (
    <div className={className}>
      {label && (
        <h3 className="text-sm font-medium text-foreground mb-3">
          {label}: {value}/{max}
        </h3>
      )}

      {showButtons && (
        <div className="flex gap-2">
          {levels.map((level) => (
            <Button
              key={level}
              variant={value === level ? 'default' : 'outline'}
              size="sm"
              className={`w-12 h-12 rounded-full font-dyslexia ${
                value === level ? 'bg-gradient-primary' : ''
              }`}
              onClick={() => handleChange(level)}
              aria-label={`Intensity level ${level}`}
              aria-pressed={value === level}
            >
              {level}
            </Button>
          ))}
        </div>
      )}

      {showInput && (
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="w-16 px-2 py-1 mt-2 rounded border border-input bg-background"
          aria-label="Manual intensity input"
        />
      )}
    </div>
  );
};

export const IntensityScale = memo(IntensityScaleComponent);
