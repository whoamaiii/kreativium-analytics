import { test, expect } from '@playwright/test';
import { runAxeWithAppChromeHidden, writeAxeViolations } from '../utils/a11y';

// Basic navigation and visibility tests for global menu and pages

test.describe('Navigation smoke', () => {
  test('GlobalMenu navigates to Reports and Settings', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('global-menu-trigger').click();
    await page.getByTestId('menu-settings').click();
    await expect(page).toHaveURL(/\/settings$/);

    // Quick a11y check on Settings
    const a11ySettings = await runAxeWithAppChromeHidden(page);
    await writeAxeViolations('navigation-settings', a11ySettings);
    expect(a11ySettings.violations.length).toBe(0);

    await page.getByTestId('settings-link-reports').click();
    await expect(page).toHaveURL(/\/reports$/);

    // On Reports page now; assert export buttons visible (locale-agnostic)
    await expect(page.getByTestId('export-csv')).toBeVisible();

    // Quick a11y check on Reports
    const a11yReports = await runAxeWithAppChromeHidden(page);
    await writeAxeViolations('navigation-reports', a11yReports);
    expect(a11yReports.violations.length).toBe(0);
  });

  test('GlobalMenu navigates to Reports directly', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('global-menu-trigger').click();
    await page.getByTestId('menu-reports').click();
    await expect(page).toHaveURL(/\/reports$/);

    const a11y = await runAxeWithAppChromeHidden(page);
    await writeAxeViolations('navigation-reports-direct', a11y);
    expect(a11y.violations.length).toBe(0);
  });
});
