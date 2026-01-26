import { test, expect } from '@playwright/test';

test('ONBOARD-003: Feature discovery tooltip evidence', async ({ page }) => {
  // Clear localStorage to reset feature discovery state
  await page.goto('http://localhost:5173/');
  await page.evaluate(() => {
    localStorage.removeItem('clockzen-feature-discovery');
  });

  // Navigate to the documents page where we can trigger tooltips
  await page.goto('http://localhost:5173/documents');
  await page.waitForLoadState('networkidle');

  // Wait for app to be fully loaded
  await page.waitForSelector('.app-shell', { timeout: 10000 });

  // Give the app time to settle
  await page.waitForTimeout(1000);

  // Open the command palette to trigger the slash command tooltip
  await page.keyboard.press('Meta+k');
  await page.waitForTimeout(500);

  // Take a screenshot - the tooltip should appear
  await page.screenshot({
    path: 'test-results/evidence/ONBOARD-003-evidence.png',
    fullPage: false,
  });

  // Verify the page loaded correctly
  await expect(page.locator('.app-shell')).toBeVisible();
});
