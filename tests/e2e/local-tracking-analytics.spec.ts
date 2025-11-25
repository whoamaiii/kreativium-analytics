import { test, expect } from '@playwright/test';

const STORAGE_KEYS = {
  version: 'kreativium.local::version',
  students: 'kreativium.local::students',
  sessions: 'kreativium.local::sessions',
  goals: 'kreativium.local::goals',
  alerts: 'kreativium.local::alerts',
  xp: 'kreativium.local::xp',
  settings: 'kreativium.local::settings',
};

test.describe('Local tracking flow into analytics', () => {
  test('creates a local session, saves data, and analytics reads from the local store', async ({ page }) => {
    const studentId = 'local-session-e2e';
    const studentName = 'Playwright Local Student';
    const now = new Date().toISOString();

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(
      ({ storageKeys, studentId, studentName, now }) => {
        localStorage.clear();
        localStorage.setItem(storageKeys.version, '1');
        localStorage.setItem(
          storageKeys.students,
          JSON.stringify([{ id: studentId, name: studentName, createdAt: now, updatedAt: now }]),
        );
        localStorage.setItem(storageKeys.sessions, JSON.stringify([]));
        localStorage.setItem(storageKeys.goals, JSON.stringify([]));
        localStorage.setItem(storageKeys.alerts, JSON.stringify([]));
        localStorage.setItem(storageKeys.xp, JSON.stringify({ total: 0, streakDays: 0, perModule: {} }));
        localStorage.setItem(storageKeys.settings, JSON.stringify({}));
        localStorage.setItem('VITE_USE_MOCK', '1');
      },
      { storageKeys: STORAGE_KEYS, studentId, studentName, now },
    );
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: 'e2e-user',
          name: 'E2E Tester',
          role: 'teacher',
          email: 'test@example.com',
        }),
      );
      localStorage.setItem('auth_token', 'mock-token');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.goto(`/track/${studentId}`);
    await page.waitForSelector('[data-testid="session-hub-start"]', { state: 'visible' });
    await page.click('[data-testid="emotion-button-happy"]');
    await page.getByTestId('track-general-notes').fill('Playwright session note');
    await page.getByTestId('track-save-button').click();
    await page.waitForURL(new RegExp(`/student/${studentId}`));

    await expect(page.getByTestId('session-hub')).toBeVisible();
    await expect(page.getByTestId('session-hub-card')).toBeVisible();
    await expect(page.getByTestId('local-sessions-panel')).toBeVisible();
    const totalLabel = await page.getByTestId('local-sessions-total').innerText();
    const totalCount = parseInt(totalLabel, 10);
    expect(totalCount).toBeGreaterThanOrEqual(1);

    await page.goto('/kreativium-ai');
    await page.waitForSelector('[data-testid="ai-analyze-button"]:not([disabled])', {
      timeout: 20_000,
    });
    await page.click('[data-testid="ai-analyze-button"]');
    await expect(page.getByTestId('ai-data-quality-total')).not.toHaveText('0');
  });
});
