import { test, expect } from '@playwright/test';

const routes = [
  '/modules/choose-right',
  '/modules/name-it',
  '/modules/calm-pause',
  '/modules/missions',
  '/session/flow',
  '/adult',
  '/adult/reports',
  '/achievements',
];

for (const path of routes) {
  test(`route ${path} loads`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/.+/);
  });
}






