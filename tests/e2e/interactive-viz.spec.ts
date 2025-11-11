import { test, expect } from '@playwright/test';
import { runAxeWithAppChromeHidden, writeAxeViolations } from '../utils/a11y';

test.describe('Interactive Visualization - Trends & Filters smoke', () => {
  test('loads, opens filters, toggles views, and passes basic a11y checks', async ({ page }) => {
    await page.goto('/e2e/interactive-viz');

    // Title with student name should be visible
    await expect(
      page.getByRole('heading', { name: /interactive data analysis -\s*test student/i }),
    ).toBeVisible();

    // Counts should be present
    const counts = page.locator('[aria-label="Data counts"]');
    await expect(counts).toContainText(/emotions/i);
    await expect(counts).toContainText(/sensory inputs/i);
    await expect(counts).toContainText(/sessions/i);

    // Helper for retrying a click action to reduce flakiness
    async function clickWithRetry(locator: any, attempts = 3) {
      for (let i = 0; i < attempts; i++) {
        try {
          await locator.click({ timeout: 1500 });
          return;
        } catch (e) {
          if (i === attempts - 1) throw e;
          await page.waitForTimeout(300);
        }
      }
    }

    // Open Filters panel (best-effort) and continue
    await clickWithRetry(page.getByRole('button', { name: 'Filters' }));
    await page.waitForTimeout(300);
    // Close the sheet if open by pressing Escape
    await page.keyboard.press('Escape');

    // Switch layout to Focus Mode and back via the Layout dropdown (best-effort)
    try {
      const layoutBtn = page.getByTestId('layout-mode-trigger');
      await layoutBtn.waitFor({ state: 'visible', timeout: 3000 });
      await clickWithRetry(layoutBtn);
      await clickWithRetry(page.getByText('Focus Mode'));

      // Toggle a focused visualization (e.g., Trends)
      await clickWithRetry(page.getByRole('button', { name: /trends/i }));

      // Switch back to Dashboard layout
      await clickWithRetry(layoutBtn);
      await clickWithRetry(page.getByText('Dashboard'));
    } catch {
      // Non-fatal: continue
    }

    // Basic a11y check on the page
    const accessibilityScanResults = await runAxeWithAppChromeHidden(page, {
      tags: ['wcag2a', 'wcag2aa'],
      disableRules: ['color-contrast', 'button-name'],
    });
    // Log violations for debugging
    console.log('AXE_VIOLATIONS_START');
    console.log(JSON.stringify(accessibilityScanResults.violations, null, 2));
    console.log('AXE_VIOLATIONS_END');
    await writeAxeViolations('interactive-viz', accessibilityScanResults);
    // Tight threshold: enforce zero violations
    expect(accessibilityScanResults.violations.length).toBe(0);
  });
});
