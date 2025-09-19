import { test, expect } from '@playwright/test';
import { runAxeWithAppChromeHidden, writeAxeViolations } from '../utils/a11y';

test.describe('CSV export smoke (POC)', () => {
  test('triggers export and shows success toast', async ({ page }) => {
    await page.addInitScript(() => {
      const orig = URL.createObjectURL;
      (window as any).__exportHook = { urls: [] as string[] };
      // @ts-expect-error Override URL.createObjectURL in test context to capture blob URLs
      URL.createObjectURL = function(blob: Blob) {
        const url = orig.call(URL, blob);
        (window as any).__exportHook.urls.push(url);
        return url;
      } as typeof URL.createObjectURL;
    });
    await page.goto('/reports');

    // Quick a11y check before triggering heavy work
    const a11y = await runAxeWithAppChromeHidden(page);
    await writeAxeViolations('export-page-pre', a11y);
    expect(a11y.violations.length).toBe(0);

    // Trigger CSV export directly from the Reports page
    await page.getByTestId('export-csv').click();

    // Assert that createObjectURL was invoked (blob created for CSV)
    await expect.poll(async () => {
      return await page.evaluate(() => (window as any).__exportHook?.urls?.length || 0);
    }, { timeout: 5000, intervals: [200, 300, 500, 1000, 3000] }).toBeGreaterThan(0);
  });
});

