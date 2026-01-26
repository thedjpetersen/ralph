import { test } from '@playwright/test';

test('capture settings page evidence', async ({ page }) => {
  // Navigate to the settings page
  await page.goto('http://localhost:5173/settings');

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Wait a bit more for any dynamic content
  await page.waitForTimeout(2000);

  // Take a full page screenshot
  await page.screenshot({
    path: 'test-results/evidence/SETTINGS-001-evidence.png',
    fullPage: true,
  });
});
