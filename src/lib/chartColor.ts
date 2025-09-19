/**
 * Resolves Tailwind CSS color variables to be used in charts.
 * This is necessary because chart libraries like ECharts expect final color strings,
 * not CSS variables.
 */

const hslToRgba = (hsl: string, alpha = 1) => {
  const hslValues = hsl.match(/(\d+(\.\d+)?)/g);
  if (!hslValues || hslValues.length < 3) {
    return `rgba(0,0,0,${alpha})`;
  }

  const [rawH, rawS, rawL] = hslValues.map(parseFloat);
  const h = rawH;
  const s = rawS / 100;
  const l = rawL / 100;

  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));

  const r = Math.round(255 * f(0));
  const g = Math.round(255 * f(8));
  const b = Math.round(255 * f(4));

  return `rgba(${r},${g},${b},${alpha})`;
};

const getCssVariableValue = (variableName: string) => {
  if (typeof window === 'undefined') {
    return null;
  }
  return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
};

export const chartColor = (variableName: string, alpha = 1, fallbackHsl: string) => {
  const hsl = getCssVariableValue(variableName);
  return hslToRgba(hsl || fallbackHsl, alpha);
};
