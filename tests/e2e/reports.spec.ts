import { test, expect } from '@playwright/test';

// Basic smoke test for Reports page
// Verifies presence of controls and simple validation behavior for custom range

test.describe('Reports export page', () => {
  test('shows export controls and validates custom range', async ({ page }) => {
    await page.goto('/reports');

    // Wait for headline
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Buttons present
    await expect(page.getByTestId('export-csv')).toBeVisible();
    await expect(page.getByTestId('export-json')).toBeVisible();
    await expect(page.getByTestId('create-backup')).toBeVisible();

    // Select custom preset
    await page.getByText(/date range/i).isVisible();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: /custom/i }).click();

    const inputs = page.locator('input[type="date"]');
    await expect(inputs).toHaveCount(2);

    // Enter invalid range (end before start)
    await inputs.nth(0).fill('2025-01-10');
    await inputs.nth(1).fill('2025-01-05');

    // CSV and JSON buttons should be disabled when invalid custom range
    await expect(page.getByTestId('export-csv')).toBeDisabled();
    await expect(page.getByTestId('export-json')).toBeDisabled();

    // Fix to valid range
    await inputs.nth(1).fill('2025-01-15');

    // Buttons should be enabled
    await expect(page.getByTestId('export-csv')).toBeEnabled();
    await expect(page.getByTestId('export-json')).toBeEnabled();
  });
});

test.describe('Reports exports', () => {
  test('Export buttons present and clickable', async ({ page }) => {
    await page.goto('/reports/export');

    const csv = page.getByTestId('export-csv');
    const json = page.getByTestId('export-json');
    const backup = page.getByTestId('create-backup');

    await expect(csv).toBeVisible();
    await expect(json).toBeVisible();
    await expect(backup).toBeVisible();

    // Baseline a11y
    const a11y = await runAxeWithAppChromeHidden(page);
    await writeAxeViolations('reports-baseline', a11y);
    expect(a11y.violations.length).toBe(0);

    await csv.click();
    await expect(page.getByTestId('toast-export-success-csv')).toHaveCount(1);

    await json.click();
    await expect(page.getByTestId('toast-export-success-json')).toHaveCount(1);

    await backup.click();
    await expect(page.getByTestId('toast-export-success-backup')).toHaveCount(1);
  });
  test('Filters: custom invalid disables, summary updates, backup toggle visible', async ({
    page,
  }) => {
    await page.goto('/reports/export');

    // Open preset select and choose custom
    await page.getByText('Date range').click();
    await page.getByRole('option', { name: /Custom|Egendefinert/ }).click();

    const start = page.locator('input[type="date"]').first();
    const end = page.locator('input[type="date"]').nth(1);

    await start.fill('2025-02-01');
    await end.fill('2025-01-01'); // invalid

    // Export buttons disabled
    await expect(page.getByTestId('export-csv')).toBeDisabled();
    await expect(page.getByTestId('export-json')).toBeDisabled();

    // Fix dates
    await start.fill('2025-01-01');
    await end.fill('2025-02-01');
    await expect(page.getByTestId('export-csv')).toBeEnabled();

    // Summary shows range
    const status = page.getByRole('status');
    await expect(status).toContainText(/2025-01-01/);

    // Backup toggle visible
    await expect(page.getByLabel(/backup|sikkerhetskopi/i)).toBeVisible();
  });
});
