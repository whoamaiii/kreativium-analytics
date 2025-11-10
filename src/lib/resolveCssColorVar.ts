/* Utility to resolve CSS variable tokens (e.g., "var(--foreground)" or "hsl(var(--foreground))")
   into actual CSS color strings usable by three.js. We preserve HSL from index.css.
*/

export function resolveCssColorVar(token: string, defaultColor: string = '#ffffff'): string {
  try {
    if (typeof window === 'undefined' || !token) return defaultColor;

    // If already a valid color not using var(), return as is
    if (!token.includes('var(')) return token;

    const root = document.documentElement;
    const styles = getComputedStyle(root);

    // Extract --var-name from token
    const match = token.match(/var\((--[a-zA-Z0-9-_]+)\)/);
    const varName = match?.[1];
    if (!varName) return defaultColor;

    // Our design tokens store HSL triplets (e.g., 240 12% 94%). Compose with hsl() if needed.
    const hslTriplet = styles.getPropertyValue(varName).trim();
    if (!hslTriplet) return defaultColor;

    // If token already wrapped like hsl(var(--foreground)), produce hsl(hslTriplet)
    if (/^hsl\(/.test(token)) {
      return `hsl(${hslTriplet})`;
    }

    // Otherwise return hsl(hslTriplet) as a safe default representation
    return `hsl(${hslTriplet})`;
  } catch {
    return defaultColor;
  }
}

// Convenience helpers for common tokens
export function colorForeground(): string {
  return resolveCssColorVar('hsl(var(--foreground))', '#ffffff');
}

export function colorMutedForeground(): string {
  return resolveCssColorVar('hsl(var(--muted-foreground))', '#cccccc');
}
