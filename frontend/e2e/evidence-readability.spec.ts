import { test } from '@playwright/test';

test('capture AI readability panel evidence', async ({ page }) => {
  // Go to the dashboard
  await page.goto('http://localhost:5173/dashboard');
  await page.waitForLoadState('networkidle');

  // Wait for the page to fully render
  await page.waitForTimeout(1000);

  // Open the command palette with keyboard shortcut
  await page.keyboard.press('Meta+k');
  await page.waitForTimeout(500);

  // Search for readability command
  await page.fill('input[placeholder="Search commands..."]', 'readability');
  await page.waitForTimeout(500);

  // Take a screenshot showing the command in the palette
  await page.screenshot({
    path: 'test-results/evidence/AI-015-command-palette.png',
    fullPage: false
  });

  // Press Enter to open the readability panel
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);

  // Take a screenshot of the readability panel
  await page.screenshot({
    path: 'test-results/evidence/AI-015-evidence.png',
    fullPage: false
  });
});
