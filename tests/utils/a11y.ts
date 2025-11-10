import type { Page } from '@playwright/test';
import AxeBuilder, { type Result } from '@axe-core/playwright';

export interface AxeRunOptions {
  hideSelectors?: string[]; // CSS selectors to hide during the scan
  tags?: string[]; // Axe tags to include
  disableRules?: string[]; // Axe rules to disable
}

export interface AxeLogOptions {
  /** Optional directory to write logs into; defaults to 'test-results' */
  outDir?: string;
  /** Optional filename; defaults to AXE_VIOLATIONS_<timestamp>_<name>.log */
  fileName?: string;
}

// Runs Axe while hiding common app chrome (e.g., toast containers) to avoid incidental violations.
// You can pass additional selectors to hide via options.hideSelectors.
export async function runAxeWithAppChromeHidden(
  page: Page,
  options: AxeRunOptions = {},
): Promise<Result> {
  const hideSelectors = [
    '[data-sonner-toaster]', // sonner toast container
    // add more chrome here if needed
    ...(options.hideSelectors || []),
  ];

  if (hideSelectors.length > 0) {
    const css = hideSelectors.map((sel) => `${sel}{display:none !important}`).join('\n');
    await page.addStyleTag({ content: css });
  }

  let builder = new AxeBuilder({ page });
  const tags = options.tags || ['wcag2a', 'wcag2aa'];
  const disableRules = options.disableRules || ['color-contrast', 'button-name'];

  builder = builder.withTags(tags).disableRules(disableRules);
  return await builder.analyze();
}

// Write Axe violations to disk for CI artifact collection
export async function writeAxeViolations(
  name: string,
  result: Result,
  opts: AxeLogOptions = {},
): Promise<string> {
  const outDir = opts.outDir || 'test-results';
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const safeName = name.replace(/[^a-z0-9-_]/gi, '_');
  const fileName = opts.fileName || `AXE_VIOLATIONS_${ts}_${safeName}.log`;
  const fs = await import('fs/promises');
  const path = await import('path');
  await fs.mkdir(outDir, { recursive: true });
  const full = path.join(outDir, fileName);
  await fs.writeFile(full, JSON.stringify(result.violations, null, 2), 'utf8');
  return full;
}
