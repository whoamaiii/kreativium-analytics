import { test, expect } from '@playwright/test';

test.describe('Patterns deep-link and explanation flow', () => {
  test('Overview pattern card deep-links to Explore > Patterns with explanation open', async ({ page }) => {
    // Go to a mock student that auto-seeds minimal data if needed
    await page.goto('/student/mock_emma_001?tab=overview');

    // Wait for overview to render and pattern cards to appear (best-effort selectors)
    const patternsSection = page.locator('section[aria-labelledby="overview-patterns-title"]');
    await patternsSection.waitFor({ state: 'visible', timeout: 15000 });

    const firstPatternCard = patternsSection.locator('.cursor-pointer').first();
    await firstPatternCard.waitFor({ state: 'visible', timeout: 10000 });

    // Click the first detected pattern – this should navigate using URL params
    await firstPatternCard.click();

    // Assert URL has the consolidated canonical params
    await expect(page).toHaveURL(/tab=explore/);
    await expect(page).toHaveURL(/preset=patterns/);
    await expect(page).toHaveURL(/patternId=/);
    await expect(page).toHaveURL(/explain=1/);

    // Reload directly on the deep-linked URL to verify it restores state
    await page.reload();

    // The explanation dock should be visible on large viewport
    const explanationHeading = page.getByRole('heading', { name: /forklaring/i });
    await explanationHeading.waitFor({ state: 'visible', timeout: 15000 });

    // Sanity: ensure Patterns preset tab content is mounted
    await expect(page.locator('[data-state="active"][value="patterns"], [data-state="active"][data-value="patterns"]')).toBeVisible({ timeout: 10000 });
  });

  test('Legacy tab query redirects to Explore with suggested preset', async ({ page }) => {
    await page.goto('/student/mock_emma_001?tab=patterns');

    // URL should be normalized to tab=explore & preset=patterns
    await expect(page).toHaveURL(/tab=explore/);
    await expect(page).toHaveURL(/preset=patterns/);
  });
});


