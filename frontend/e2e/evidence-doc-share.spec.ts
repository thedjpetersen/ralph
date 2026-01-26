import { test } from '@playwright/test';

test('capture document share evidence', async ({ page }) => {
  // Go to the app
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');

  // Wait a moment for any lazy loading
  await page.waitForTimeout(1000);

  // Take a full page screenshot to capture the folder area
  await page.screenshot({
    path: 'test-results/evidence/DOC-006-evidence.png',
    fullPage: true
  });
});
