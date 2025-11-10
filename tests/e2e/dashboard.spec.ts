import { test, expect } from '@playwright/test';
import { runAxeWithAppChromeHidden, writeAxeViolations } from '../utils/a11y';

test.describe('Dashboard smoke (POC)', () => {
  test('loads and shows POC badge and key controls', async ({ page }) => {
    await page.goto('/');

    // Header title renders
    await expect(page.locator('h1')).toContainText('Sensory');

    // POC badge visible in POC mode
    await expect(page.getByText('POC Mode')).toBeVisible();

    // Global menu present
    await expect(page.getByTestId('global-menu-trigger')).toBeVisible();

    // Basic a11y check on dashboard
    const a11yDashboard = await runAxeWithAppChromeHidden(page);
    await writeAxeViolations('dashboard', a11yDashboard);
    expect(a11yDashboard.violations.length).toBe(0);

    // New Export Data button should navigate to /reports
    await page.getByTestId('dashboard-export-link').click();
    await expect(page).toHaveURL(/\/reports$/);

    // Back to dashboard and verify new entry button is present
    await page.goto('/');
    await expect(
      page.getByRole('button', { name: /Ny Registrering|Add Your First Student/i }).first(),
    ).toBeVisible();
  });
});
