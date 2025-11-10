import { useEffect, useState } from 'react';

/**
 * Hook to detect if the user prefers reduced motion
 * Checks both the CSS media query and the data-reduce-motion attribute
 * @returns true if reduced motion is preferred, false otherwise
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    // Check CSS media query
    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    return mediaQuery?.matches ?? false;
  });

  useEffect(() => {
    // Check CSS media query
    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');

    const handleMediaQueryChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Also check for data-reduce-motion attribute on document element
    const checkDataAttribute = () => {
      const hasDataAttribute =
        document.documentElement.getAttribute('data-reduce-motion') === 'true';
      if (hasDataAttribute) {
        setPrefersReducedMotion(true);
      }
    };

    // Initial check
    checkDataAttribute();

    // Set up listeners
    mediaQuery?.addEventListener?.('change', handleMediaQueryChange);

    // Watch for changes to the data attribute
    const observer = new MutationObserver(() => {
      checkDataAttribute();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-reduce-motion'],
    });

    return () => {
      mediaQuery?.removeEventListener?.('change', handleMediaQueryChange);
      observer.disconnect();
    };
  }, []);

  return prefersReducedMotion;
}
