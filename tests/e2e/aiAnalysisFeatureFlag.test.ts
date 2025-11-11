import { test, expect } from '@playwright/test';

test.describe('AI Analysis Feature Flag', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a deterministic analytics route instead of assuming '/'
    // Create or find a test student and navigate to their analytics tab
    await page.goto('/students');

    // Wait for students to load and find first student
    await page.waitForSelector('[data-testid="student-card"], [data-testid="student-list-item"]', {
      timeout: 10000,
    });
    const firstStudent = page
      .locator('[data-testid="student-card"], [data-testid="student-list-item"]')
      .first();
    await firstStudent.click();

    // Navigate to analytics tab
    await page.waitForSelector('[data-testid="analytics-tab"], button:has-text("Analytics")', {
      timeout: 5000,
    });
    await page.locator('[data-testid="analytics-tab"], button:has-text("Analytics")').click();

    // Wait for analytics content to load
    await page.waitForSelector('[data-testid="ai-toggle"]', { timeout: 10000 });
  });

  test('toggle AI analysis and verify mode badge updates', async ({ page }) => {
    // Find AI toggle and mode badge on analytics section
    const toggle = page.getByTestId('ai-toggle');
    const badge = page.getByTestId('ai-mode-badge');

    // Verify elements are present
    await expect(toggle).toBeVisible();
    await expect(badge).toBeVisible();

    const initialText = await badge.textContent();

    // Try toggling if enabled
    const disabled = await toggle.isDisabled();
    if (!disabled) {
      await toggle.click();

      // Wait for state change
      await page.waitForTimeout(500);

      const afterText = await badge.textContent();
      // Should change between AI and Heuristic labels
      expect(afterText?.trim()).not.toEqual(initialText?.trim());

      // Verify it toggles between expected values
      const validStates = ['AI', 'Heuristic'];
      expect(validStates).toContain(initialText?.trim());
      expect(validStates).toContain(afterText?.trim());
    }
  });

  test('AI metadata appears when AI mode is active', async ({ page }) => {
    const toggle = page.getByTestId('ai-toggle');
    const badge = page.getByTestId('ai-mode-badge');

    // If toggle is enabled, ensure AI mode is on
    const disabled = await toggle.isDisabled();
    if (!disabled) {
      // Make sure we're in AI mode
      const currentText = await badge.textContent();
      if (currentText?.trim() !== 'AI') {
        await toggle.click();
        await page.waitForTimeout(1000); // Wait for analysis to potentially complete
      }

      // Check if AI metadata is present when in AI mode
      const badgeTextAfter = await badge.textContent();
      if (badgeTextAfter?.trim() === 'AI') {
        // AI metadata should be present
        const aiMetadata = page.getByTestId('ai-metadata');
        await expect(aiMetadata).toBeVisible();

        // Verify specific AI metadata fields are present
        await expect(page.getByTestId('ai-provider')).toBeVisible();
        await expect(page.getByTestId('ai-model')).toBeVisible();
      }
    }
  });

  test('heuristic fallback works when AI fails', async ({ page }) => {
    // Mock OpenRouter to return 5xx error to simulate AI failure
    await page.route('**/openrouter.ai/**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    const toggle = page.getByTestId('ai-toggle');
    const badge = page.getByTestId('ai-mode-badge');

    const disabled = await toggle.isDisabled();
    if (!disabled) {
      // Try to enable AI mode
      const currentText = await badge.textContent();
      if (currentText?.trim() !== 'AI') {
        await toggle.click();
      }

      // Wait for fallback processing
      await page.waitForTimeout(2000);

      // Should fallback to heuristic badge and no AI metadata should be shown
      const finalBadgeText = await badge.textContent();
      expect(finalBadgeText?.trim()).toBe('Heuristic');

      // AI metadata should not be present
      const aiMetadata = page.getByTestId('ai-metadata');
      await expect(aiMetadata).not.toBeVisible();
    }
  });

  test('runtime toggle works even when config is disabled', async ({ page }) => {
    // Mock analytics config to disable AI
    await page.addInitScript(() => {
      window.__MOCK_ANALYTICS_CONFIG__ = {
        features: { aiAnalysisEnabled: false },
      };
    });

    // Reload to apply mocked config
    await page.reload();
    await page.waitForSelector('[data-testid="ai-toggle"]', { timeout: 10000 });

    const toggle = page.getByTestId('ai-toggle');
    const toggleStatus = page.getByTestId('ai-toggle-status');

    // Toggle should still be enabled (runtime override)
    await expect(toggle).toBeEnabled();

    // Try toggling to AI mode
    await toggle.click();
    await page.waitForTimeout(500);

    // Should show config warning but still allow AI mode
    const statusText = await toggleStatus.textContent();
    expect(statusText).toContain('runtime override');

    // Verify mode badge reflects AI mode
    const badge = page.getByTestId('ai-mode-badge');
    const badgeText = await badge.textContent();
    expect(badgeText?.trim()).toBe('AI');
  });
});
