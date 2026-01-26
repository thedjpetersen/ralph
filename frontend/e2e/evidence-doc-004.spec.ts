import { test } from '@playwright/test';

test('DOC-004: Document folders feature evidence', async ({ page }) => {
  await page.goto('http://localhost:5173/dashboard');
  await page.waitForLoadState('networkidle');

  // Wait for sidebar to be visible
  await page.waitForSelector('.sidebar');

  // Take full page screenshot showing the sidebar
  await page.screenshot({
    path: 'test-results/evidence/DOC-004-evidence.png',
    fullPage: false
  });
});
