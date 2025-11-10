/**
 * Chart Colors Constants
 *
 * Centralized color definitions for all chart visualizations.
 * All emotion and sensory colors are defined in the CSS design system
 * (see src/index.css) and referenced here using CSS variables.
 *
 * This ensures consistency across all charts and makes it easy to update
 * colors globally without touching individual components.
 */

/**
 * Emotion-specific colors for autism-friendly visualization
 * Maps emotion names to their HSL values defined in CSS variables
 */
export const EMOTION_COLORS = {
  happy: "hsl(var(--emotion-happy))",      // Soft green: 90 70% 65%
  calm: "hsl(var(--emotion-calm))",        // Soft blue: 180 45% 75%
  anxious: "hsl(var(--emotion-anxious))",  // Soft yellow/orange: 40 65% 70%
  sad: "hsl(var(--emotion-sad))",          // Muted blue: 220 45% 65%
  angry: "hsl(var(--emotion-angry))",      // Soft red: 10 70% 65%
  excited: "hsl(var(--emotion-excited))",  // Soft purple: 280 55% 70%
  overwhelmed: "hsl(var(--emotion-overwhelmed))", // Muted magenta: 300 40% 60%
  neutral: "hsl(var(--emotion-neutral))"   // Gray: 240 8% 63%
} as const;

/**
 * Sensory-specific colors for sensory input tracking visualizations
 * Maps sensory input types to their HSL values defined in CSS variables
 */
export const SENSORY_COLORS = {
  visual: "hsl(var(--sensory-visual))",           // 240 60% 70%
  auditory: "hsl(var(--sensory-auditory))",       // 300 50% 70%
  tactile: "hsl(var(--sensory-tactile))",         // 120 50% 70%
  vestibular: "hsl(var(--sensory-vestibular))",   // 60 60% 70%
  proprioceptive: "hsl(var(--sensory-proprioceptive))" // 180 55% 70%
} as const;

/**
 * Primary color palette for charts
 * Used as the default color series for multi-series charts
 * Ordered: Primary → Emotions (calm, happy, anxious, sad, excited, overwhelmed) → Neutral
 */
export const CHART_COLOR_PALETTE = [
  "hsl(var(--primary))",           // Primary purple
  EMOTION_COLORS.calm,              // Calm blue
  EMOTION_COLORS.happy,             // Happy green
  EMOTION_COLORS.anxious,           // Anxious yellow
  EMOTION_COLORS.sad,               // Sad blue
  EMOTION_COLORS.excited,           // Excited purple
  EMOTION_COLORS.overwhelmed,       // Overwhelmed magenta
  EMOTION_COLORS.neutral            // Neutral gray
] as const;

/**
 * Get emotion color by name
 * @param emotionName - The emotion identifier
 * @returns The CSS variable reference or undefined if emotion not found
 */
export function getEmotionColor(emotionName: string): string | undefined {
  const name = emotionName.toLowerCase() as keyof typeof EMOTION_COLORS;
  return EMOTION_COLORS[name];
}

/**
 * Get sensory color by name
 * @param sensoryName - The sensory input identifier
 * @returns The CSS variable reference or undefined if sensory type not found
 */
export function getSensoryColor(sensoryName: string): string | undefined {
  const name = sensoryName.toLowerCase() as keyof typeof SENSORY_COLORS;
  return SENSORY_COLORS[name];
}

/**
 * Get emotion icon emoji for tooltip display
 * @param emotionName - The emotion identifier
 * @returns The emoji representation of the emotion
 */
export function getEmotionIcon(emotionName: string | undefined): string {
  const icons: Record<string, string> = {
    happy: '😊',
    sad: '😢',
    anxious: '😰',
    calm: '😌',
    excited: '🤗',
    angry: '😤',
    overwhelmed: '😵',
    neutral: '🔵'
  };
  return typeof emotionName === 'string'
    ? (icons[emotionName.toLowerCase()] || icons.neutral)
    : icons.neutral;
}
