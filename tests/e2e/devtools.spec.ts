import { test, expect } from '@playwright/test';
import { runAxeWithAppChromeHidden, writeAxeViolations } from '../utils/a11y';

// Dev Tools visibility: should be accessible in non-prod/POC environments

const NON_PROD = process.env.NON_PROD !== 'false';

test.describe('Developer Tools access', () => {
  test('Dev Tools menu item and page (non-prod only)', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('global-menu-trigger').click();

    if (NON_PROD) {
      await page.getByTestId('menu-devtools').click();
      await expect(page).toHaveURL(/\/dev-tools$/);
      await expect(page.getByRole('heading', { name: 'Developer Tools' })).toBeVisible();

      const a11y = await runAxeWithAppChromeHidden(page);
      await writeAxeViolations('devtools', a11y);
      expect(a11y.violations.length).toBe(0);
    } else {
      await expect(page.getByTestId('menu-devtools')).toHaveCount(0);
    }
  });
});
