/**
 * Interactive Body Map Component
 *
 * Visual body diagram for selecting sensory input locations.
 * Features:
 * - Tap/click body parts to select
 * - Visual feedback on selection
 * - Accessible labels
 * - Responsive sizing
 * - Multi-select support
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

export type BodyLocation =
  | 'head'
  | 'eyes'
  | 'ears'
  | 'mouth'
  | 'neck'
  | 'shoulders'
  | 'arms'
  | 'hands'
  | 'chest'
  | 'back'
  | 'stomach'
  | 'legs'
  | 'feet';

interface BodyMapProps {
  selectedLocations?: BodyLocation[];
  onLocationSelect: (location: BodyLocation) => void;
  multiSelect?: boolean;
  className?: string;
}

const BODY_PART_LABELS: Record<BodyLocation, string> = {
  head: 'Head',
  eyes: 'Eyes',
  ears: 'Ears',
  mouth: 'Mouth',
  neck: 'Neck',
  shoulders: 'Shoulders',
  arms: 'Arms',
  hands: 'Hands',
  chest: 'Chest',
  back: 'Back',
  stomach: 'Stomach',
  legs: 'Legs',
  feet: 'Feet'
};

/**
 * Interactive body map for selecting sensory locations
 */
export const BodyMap: React.FC<BodyMapProps> = ({
  selectedLocations = [],
  onLocationSelect,
  multiSelect = true,
  className = ''
}) => {
  const [hoveredPart, setHoveredPart] = useState<BodyLocation | null>(null);

  const isSelected = (location: BodyLocation) => selectedLocations.includes(location);

  const handlePartClick = (location: BodyLocation) => {
    onLocationSelect(location);
  };

  const getPartColor = (location: BodyLocation) => {
    if (isSelected(location)) {
      return 'fill-primary/80 stroke-primary';
    }
    if (hoveredPart === location) {
      return 'fill-primary/30 stroke-primary/50';
    }
    return 'fill-muted/50 stroke-muted-foreground/30';
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* SVG Body Diagram */}
      <svg
        viewBox="0 0 200 400"
        className="w-full max-w-xs touch-manipulation"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Interactive body map for selecting sensory locations"
      >
        {/* Head */}
        <motion.ellipse
          cx="100"
          cy="40"
          rx="30"
          ry="35"
          className={`${getPartColor('head')} cursor-pointer transition-colors`}
          strokeWidth="2"
          onClick={() => handlePartClick('head')}
          onMouseEnter={() => setHoveredPart('head')}
          onMouseLeave={() => setHoveredPart(null)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          role="button"
          aria-label="Select head"
        />

        {/* Eyes */}
        <motion.circle
          cx="90"
          cy="35"
          r="4"
          className={`${getPartColor('eyes')} cursor-pointer transition-colors`}
          strokeWidth="1"
          onClick={() => handlePartClick('eyes')}
          onMouseEnter={() => setHoveredPart('eyes')}
          onMouseLeave={() => setHoveredPart(null)}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          role="button"
          aria-label="Select eyes"
        />
        <motion.circle
          cx="110"
          cy="35"
          r="4"
          className={`${getPartColor('eyes')} cursor-pointer transition-colors`}
          strokeWidth="1"
          onClick={() => handlePartClick('eyes')}
          onMouseEnter={() => setHoveredPart('eyes')}
          onMouseLeave={() => setHoveredPart(null)}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          role="button"
          aria-label="Select eyes"
        />

        {/* Ears */}
        <motion.ellipse
          cx="70"
          cy="40"
          rx="6"
          ry="10"
          className={`${getPartColor('ears')} cursor-pointer transition-colors`}
          strokeWidth="1"
          onClick={() => handlePartClick('ears')}
          onMouseEnter={() => setHoveredPart('ears')}
          onMouseLeave={() => setHoveredPart(null)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          role="button"
          aria-label="Select ears"
        />
        <motion.ellipse
          cx="130"
          cy="40"
          rx="6"
          ry="10"
          className={`${getPartColor('ears')} cursor-pointer transition-colors`}
          strokeWidth="1"
          onClick={() => handlePartClick('ears')}
          onMouseEnter={() => setHoveredPart('ears')}
          onMouseLeave={() => setHoveredPart(null)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          role="button"
          aria-label="Select ears"
        />

        {/* Mouth */}
        <motion.ellipse
          cx="100"
          cy="50"
          rx="8"
          ry="4"
          className={`${getPartColor('mouth')} cursor-pointer transition-colors`}
          strokeWidth="1"
          onClick={() => handlePartClick('mouth')}
          onMouseEnter={() => setHoveredPart('mouth')}
          onMouseLeave={() => setHoveredPart(null)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          role="button"
          aria-label="Select mouth"
        />

        {/* Neck */}
        <motion.rect
          x="90"
          y="75"
          width="20"
          height="15"
          rx="5"
          className={`${getPartColor('neck')} cursor-pointer transition-colors`}
          strokeWidth="2"
          onClick={() => handlePartClick('neck')}
          onMouseEnter={() => setHoveredPart('neck')}
          onMouseLeave={() => setHoveredPart(null)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          role="button"
          aria-label="Select neck"
        />

        {/* Shoulders */}
        <motion.path
          d="M 70 100 Q 60 95 50 100 L 50 110 L 70 110 Z"
          className={`${getPartColor('shoulders')} cursor-pointer transition-colors`}
          strokeWidth="2"
          onClick={() => handlePartClick('shoulders')}
          onMouseEnter={() => setHoveredPart('shoulders')}
          onMouseLeave={() => setHoveredPart(null)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          role="button"
          aria-label="Select shoulders"
        />
        <motion.path
          d="M 130 100 Q 140 95 150 100 L 150 110 L 130 110 Z"
          className={`${getPartColor('shoulders')} cursor-pointer transition-colors`}
          strokeWidth="2"
          onClick={() => handlePartClick('shoulders')}
          onMouseEnter={() => setHoveredPart('shoulders')}
          onMouseLeave={() => setHoveredPart(null)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          role="button"
          aria-label="Select shoulders"
        />

        {/* Chest */}
        <motion.rect
          x="75"
          y="100"
          width="50"
          height="60"
          rx="8"
          className={`${getPartColor('chest')} cursor-pointer transition-colors`}
          strokeWidth="2"
          onClick={() => handlePartClick('chest')}
          onMouseEnter={() => setHoveredPart('chest')}
          onMouseLeave={() => setHoveredPart(null)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          role="button"
          aria-label="Select chest"
        />

        {/* Stomach */}
        <motion.rect
          x="80"
          y="160"
          width="40"
          height="40"
          rx="6"
          className={`${getPartColor('stomach')} cursor-pointer transition-colors`}
          strokeWidth="2"
          onClick={() => handlePartClick('stomach')}
          onMouseEnter={() => setHoveredPart('stomach')}
          onMouseLeave={() => setHoveredPart(null)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          role="button"
          aria-label="Select stomach"
        />

        {/* Arms */}
        <motion.rect
          x="40"
          y="110"
          width="15"
          height="80"
          rx="7"
          className={`${getPartColor('arms')} cursor-pointer transition-colors`}
          strokeWidth="2"
          onClick={() => handlePartClick('arms')}
          onMouseEnter={() => setHoveredPart('arms')}
          onMouseLeave={() => setHoveredPart(null)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          role="button"
          aria-label="Select arms"
        />
        <motion.rect
          x="145"
          y="110"
          width="15"
          height="80"
          rx="7"
          className={`${getPartColor('arms')} cursor-pointer transition-colors`}
          strokeWidth="2"
          onClick={() => handlePartClick('arms')}
          onMouseEnter={() => setHoveredPart('arms')}
          onMouseLeave={() => setHoveredPart(null)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          role="button"
          aria-label="Select arms"
        />

        {/* Hands */}
        <motion.ellipse
          cx="47"
          cy="200"
          rx="10"
          ry="12"
          className={`${getPartColor('hands')} cursor-pointer transition-colors`}
          strokeWidth="2"
          onClick={() => handlePartClick('hands')}
          onMouseEnter={() => setHoveredPart('hands')}
          onMouseLeave={() => setHoveredPart(null)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          role="button"
          aria-label="Select hands"
        />
        <motion.ellipse
          cx="153"
          cy="200"
          rx="10"
          ry="12"
          className={`${getPartColor('hands')} cursor-pointer transition-colors`}
          strokeWidth="2"
          onClick={() => handlePartClick('hands')}
          onMouseEnter={() => setHoveredPart('hands')}
          onMouseLeave={() => setHoveredPart(null)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          role="button"
          aria-label="Select hands"
        />

        {/* Legs */}
        <motion.rect
          x="80"
          y="210"
          width="16"
          height="120"
          rx="8"
          className={`${getPartColor('legs')} cursor-pointer transition-colors`}
          strokeWidth="2"
          onClick={() => handlePartClick('legs')}
          onMouseEnter={() => setHoveredPart('legs')}
          onMouseLeave={() => setHoveredPart(null)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          role="button"
          aria-label="Select legs"
        />
        <motion.rect
          x="104"
          y="210"
          width="16"
          height="120"
          rx="8"
          className={`${getPartColor('legs')} cursor-pointer transition-colors`}
          strokeWidth="2"
          onClick={() => handlePartClick('legs')}
          onMouseEnter={() => setHoveredPart('legs')}
          onMouseLeave={() => setHoveredPart(null)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          role="button"
          aria-label="Select legs"
        />

        {/* Feet */}
        <motion.ellipse
          cx="88"
          cy="345"
          rx="12"
          ry="18"
          className={`${getPartColor('feet')} cursor-pointer transition-colors`}
          strokeWidth="2"
          onClick={() => handlePartClick('feet')}
          onMouseEnter={() => setHoveredPart('feet')}
          onMouseLeave={() => setHoveredPart(null)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          role="button"
          aria-label="Select feet"
        />
        <motion.ellipse
          cx="112"
          cy="345"
          rx="12"
          ry="18"
          className={`${getPartColor('feet')} cursor-pointer transition-colors`}
          strokeWidth="2"
          onClick={() => handlePartClick('feet')}
          onMouseEnter={() => setHoveredPart('feet')}
          onMouseLeave={() => setHoveredPart(null)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          role="button"
          aria-label="Select feet"
        />
      </svg>

      {/* Selected locations display */}
      {selectedLocations.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {selectedLocations.map((location) => (
            <Badge
              key={location}
              variant="secondary"
              className="text-sm"
            >
              {BODY_PART_LABELS[location]}
            </Badge>
          ))}
        </div>
      )}

      {/* Instructions */}
      <p className="text-xs text-muted-foreground text-center max-w-xs">
        {multiSelect
          ? 'Tap body parts to select where the student feels the sensory input. You can select multiple areas.'
          : 'Tap a body part to select where the student feels the sensory input.'}
      </p>
    </div>
  );
};

export default BodyMap;
