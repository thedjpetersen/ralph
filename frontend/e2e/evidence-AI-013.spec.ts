import { test } from '@playwright/test';

test('capture AI-013 evidence', async ({ page }) => {
  // Go to the main page
  await page.goto('http://localhost:5173/dashboard');
  await page.waitForLoadState('networkidle');

  // Open the command palette with keyboard shortcut
  await page.keyboard.press('Meta+k');
  await page.waitForTimeout(500);

  // Search for the contradiction checker
  await page.keyboard.type('consistency');
  await page.waitForTimeout(300);

  // Capture screenshot showing the command in the palette
  await page.screenshot({
    path: 'test-results/evidence/AI-013-evidence.png',
    fullPage: false
  });
});
