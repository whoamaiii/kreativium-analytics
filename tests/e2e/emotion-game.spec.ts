import { test, expect } from '@playwright/test';

test.describe('Emotion Game', () => {
  test('loads and shows controls', async ({ page }) => {
    await page.goto('/emotion-game');
    await expect(page.getByRole('heading', { name: /Følelsesspill|Emotion Game/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /camera|kamera/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Hint/i })).toBeVisible();
  });

  test('XP bar is present with progress semantics', async ({ page }) => {
    await page.goto('/emotion-game');
    const bar = page.getByRole('progressbar');
    await expect(bar).toBeVisible();
    await expect(bar).toHaveAttribute('aria-valuemin', '0');
    // aria-valuemax may vary with level; ensure it is a number string
    const max = await bar.getAttribute('aria-valuemax');
    expect(Number.isFinite(Number(max))).toBeTruthy();
  });
});
