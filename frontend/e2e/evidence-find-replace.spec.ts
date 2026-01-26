import { test } from '@playwright/test';

test('capture find replace evidence', async ({ page }) => {
  // Navigate to dashboard
  await page.goto('http://localhost:5173/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Open the Find dialog with Ctrl+F (Cmd+F on Mac, but Playwright uses Control)
  await page.keyboard.press('Control+f');

  // Wait for dialog to appear
  await page.waitForSelector('.find-replace-dialog', { state: 'visible', timeout: 5000 });

  // Type in the search input to show the search UI
  const searchInput = page.locator('.find-replace-input').first();
  await searchInput.fill('hello');

  // Wait for the UI to update
  await page.waitForTimeout(300);

  // Now open replace mode with Ctrl+Shift+F
  await page.keyboard.press('Control+Shift+f');

  // Wait a moment for mode change
  await page.waitForTimeout(300);

  // Capture screenshot
  await page.screenshot({
    path: 'test-results/evidence/EDITOR-008-evidence.png',
    fullPage: false
  });
});
