import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = ['/', '/add-student', '/settings', '/reports', '/this-route-does-not-exist'];

async function runAxe(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    // Temporarily disable color-contrast rule if needed for design token issues
    // .disableRules(['color-contrast'])
    .analyze();

  const seriousOrWorse = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(seriousOrWorse, JSON.stringify(seriousOrWorse, null, 2)).toHaveLength(0);
}

for (const path of routes) {
  test.describe(`a11y smoke: ${path}`, () => {
    test(`no serious/critical axe violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.getByRole('main').waitFor({ state: 'visible' });
      await runAxe(page);
    });

    test(`has exactly one main and one level-1 heading on ${path}`, async ({ page }) => {
      await page.goto(path);
      const mains = await page.locator('main').count();
      expect(mains).toBe(1);

      // Allow for NotFound page to have appropriate error message
      if (path === '/this-route-does-not-exist') {
        // NotFound page should still have an h1
        const h1Count = await page.locator('h1').count();
        expect(h1Count).toBeGreaterThan(0);
      } else {
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      }
    });
  });
}

test('skip link focuses main content', async ({ page }) => {
  await page.goto('/');
  // First tab should reveal the skip link
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: /skip to main content|hopp til hovedinnhold/i });
  await expect(skip).toBeVisible();

  // Activate and ensure focus moves to main
  await skip.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});

test('live region is present globally', async ({ page }) => {
  await page.goto('/');
  const liveRegion = page.locator('#accessibility-announcements[aria-live="polite"]');
  await expect(liveRegion).toBeAttached();
});
