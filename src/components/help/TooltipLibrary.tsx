/**
 * Tooltip Library Component
 *
 * Provides contextual help tooltips for sensory processing terms,
 * emotion definitions, and educational concepts throughout the app.
 *
 * Features:
 * - Hover/tap to reveal definitions
 * - Simple, teacher-friendly language
 * - Examples for each term
 * - Accessible (keyboard navigation, screen readers)
 * - Responsive (works on mobile and desktop)
 */

import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

/**
 * Definition structure for tooltip content
 */
export interface TermDefinition {
  term: string;
  definition: string;
  example?: string;
  category: 'sensory' | 'emotion' | 'environmental' | 'educational';
}

/**
 * Comprehensive library of educational terms with teacher-friendly definitions
 */
export const TOOLTIP_DEFINITIONS: Record<string, TermDefinition> = {
  // Sensory Processing Terms
  'visual': {
    term: 'Visual',
    definition: 'How the student processes what they see with their eyes',
    example: 'Bright lights, colors, movement, patterns',
    category: 'sensory'
  },
  'auditory': {
    term: 'Auditory',
    definition: 'How the student processes sounds and noises',
    example: 'Loud noises, background sounds, music, voices',
    category: 'sensory'
  },
  'tactile': {
    term: 'Tactile',
    definition: 'How the student processes touch and textures',
    example: 'Clothing tags, hugs, different textures, temperature',
    category: 'sensory'
  },
  'proprioceptive': {
    term: 'Proprioceptive',
    definition: 'Body awareness - knowing where your body is in space',
    example: 'Heavy work activities, pushing, pulling, jumping, carrying objects',
    category: 'sensory'
  },
  'vestibular': {
    term: 'Vestibular',
    definition: 'Balance and movement - how the body moves through space',
    example: 'Spinning, swinging, climbing, changes in position',
    category: 'sensory'
  },
  'gustatory': {
    term: 'Gustatory',
    definition: 'How the student processes tastes',
    example: 'Food preferences, texture of food, strong flavors',
    category: 'sensory'
  },
  'olfactory': {
    term: 'Olfactory',
    definition: 'How the student processes smells',
    example: 'Perfumes, food smells, cleaning products, environmental odors',
    category: 'sensory'
  },

  // Sensory Response Types
  'seeking': {
    term: 'Seeking',
    definition: 'Actively looking for or craving this type of sensory input',
    example: 'A student who seeks proprioceptive input might constantly move, fidget, or request heavy work activities',
    category: 'sensory'
  },
  'avoiding': {
    term: 'Avoiding',
    definition: 'Trying to stay away from or reduce this type of sensory input',
    example: 'A student who avoids auditory input might cover their ears, prefer quiet spaces, or become upset with loud noises',
    category: 'sensory'
  },
  'neutral': {
    term: 'Neutral',
    definition: 'No strong reaction - processes this input typically',
    example: 'The student handles this sensory input without difficulty or seeking',
    category: 'sensory'
  },
  'overwhelmed': {
    term: 'Overwhelmed',
    definition: 'Too much of this input causes stress or shutdown',
    example: 'The student may shut down, have a meltdown, or need to leave the situation',
    category: 'sensory'
  },

  // Emotion-Related Terms
  'intensity': {
    term: 'Intensity',
    definition: 'How strong the emotion feels (1 = mild, 5 = very strong)',
    example: 'Intensity 2: Slightly anxious. Intensity 5: Full panic',
    category: 'emotion'
  },
  'duration': {
    term: 'Duration',
    definition: 'How long the emotion lasted',
    example: 'Brief (< 5 min), Moderate (5-15 min), Extended (15-30 min), Prolonged (> 30 min)',
    category: 'emotion'
  },
  'escalation': {
    term: 'Escalation Pattern',
    definition: 'How quickly the emotion built up',
    example: 'Sudden: 0 to 100 immediately. Gradual: Slowly increased over time',
    category: 'emotion'
  },
  'triggers': {
    term: 'Triggers',
    definition: 'What caused or led to this emotional response',
    example: 'Transition to new activity, unexpected noise, peer conflict, schedule change',
    category: 'emotion'
  },

  // Environmental Terms
  'noiseLevelEnvironment': {
    term: 'Noise Level',
    definition: 'How loud the environment was (1 = very quiet, 5 = very loud)',
    example: 'Level 1: Library quiet. Level 5: Fire drill or cafeteria',
    category: 'environmental'
  },
  'lighting': {
    term: 'Lighting',
    definition: 'Brightness of the room or area',
    example: 'Dim (low light), Normal (typical classroom), Bright (all lights + sunlight)',
    category: 'environmental'
  },
  'temperature': {
    term: 'Temperature',
    definition: 'How hot or cold the room felt',
    example: 'Cool (under 20°C), Comfortable (20-24°C), Warm (over 24°C)',
    category: 'environmental'
  },

  // Educational/IEP Terms
  'baseline': {
    term: 'Baseline Data',
    definition: 'Starting point measurements before interventions begin',
    example: 'Used to track progress and measure intervention effectiveness',
    category: 'educational'
  },
  'intervention': {
    term: 'Intervention',
    definition: 'A strategy or support put in place to help the student',
    example: 'Noise-canceling headphones, sensory breaks, visual schedules',
    category: 'educational'
  },
  'correlation': {
    term: 'Correlation',
    definition: 'Two things that happen together or are related',
    example: 'High noise levels correlate with increased anxiety (they happen together)',
    category: 'educational'
  },
  'pattern': {
    term: 'Pattern',
    definition: 'A behavior or response that happens repeatedly in similar situations',
    example: 'Student seeks proprioceptive input during transitions (happens regularly)',
    category: 'educational'
  },
  'dataQuality': {
    term: 'Data Quality',
    definition: 'How complete and reliable your tracking data is',
    example: 'Higher quality = more entries, more days tracked, more detail',
    category: 'educational'
  }
};

/**
 * Props for the HelpTooltip component
 */
interface HelpTooltipProps {
  /** The term key from TOOLTIP_DEFINITIONS */
  term: string;
  /** Optional: Override default trigger (defaults to HelpCircle icon) */
  children?: React.ReactNode;
  /** Optional: Side placement of tooltip */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Optional: Additional CSS classes */
  className?: string;
}

/**
 * Reusable tooltip component that displays educational definitions
 *
 * Usage:
 * ```tsx
 * <HelpTooltip term="proprioceptive" />
 *
 * // With custom trigger:
 * <HelpTooltip term="vestibular">
 *   <span className="underline">Vestibular</span>
 * </HelpTooltip>
 * ```
 */
export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  term,
  children,
  side = 'top',
  className = ''
}) => {
  const definition = TOOLTIP_DEFINITIONS[term.toLowerCase()];

  if (!definition) {
    // If term not found, render children without tooltip
    return <>{children || <HelpCircle className={`h-4 w-4 ${className}`} />}</>;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center text-muted-foreground hover:text-foreground transition-colors ${className}`}
            aria-label={`Help: ${definition.term}`}
          >
            {children || <HelpCircle className="h-4 w-4" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs p-4">
          <div className="space-y-2">
            <div>
              <h4 className="font-semibold text-sm mb-1">{definition.term}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {definition.definition}
              </p>
            </div>
            {definition.example && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground italic">
                  <span className="font-medium">Example:</span> {definition.example}
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * Inline text with tooltip - for embedding help in labels
 *
 * Usage:
 * ```tsx
 * <TooltipText term="proprioceptive">
 *   Proprioceptive Input
 * </TooltipText>
 * ```
 */
interface TooltipTextProps {
  term: string;
  children: React.ReactNode;
  className?: string;
}

export const TooltipText: React.FC<TooltipTextProps> = ({
  term,
  children,
  className = ''
}) => {
  const definition = TOOLTIP_DEFINITIONS[term.toLowerCase()];

  if (!definition) {
    return <span className={className}>{children}</span>;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`underline decoration-dotted underline-offset-2 hover:text-primary transition-colors ${className}`}
            aria-label={`Help: ${definition.term}`}
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-4">
          <div className="space-y-2">
            <div>
              <h4 className="font-semibold text-sm mb-1">{definition.term}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {definition.definition}
              </p>
            </div>
            {definition.example && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground italic">
                  <span className="font-medium">Example:</span> {definition.example}
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * Get all terms by category
 */
export function getTermsByCategory(category: TermDefinition['category']): TermDefinition[] {
  return Object.values(TOOLTIP_DEFINITIONS).filter(def => def.category === category);
}

/**
 * Search for a term by partial match
 */
export function searchTerms(query: string): TermDefinition[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(TOOLTIP_DEFINITIONS).filter(
    def =>
      def.term.toLowerCase().includes(lowerQuery) ||
      def.definition.toLowerCase().includes(lowerQuery)
  );
}

export default HelpTooltip;
