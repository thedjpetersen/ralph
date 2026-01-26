import { test, expect } from '@playwright/test';

test('capture evidence of comment navigation shortcuts', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:5174');

  // Wait for the app to load
  await page.waitForLoadState('networkidle');

  // Press ? to open the keyboard shortcuts help dialog
  await page.keyboard.press('Shift+?');

  // Wait for the modal to appear
  await page.waitForSelector('.shortcuts-help', { timeout: 5000 });

  // Verify the Comments section exists with the navigation shortcuts
  await expect(page.locator('text=Comments')).toBeVisible();
  await expect(page.locator('text=Go to next comment')).toBeVisible();
  await expect(page.locator('text=Go to previous comment')).toBeVisible();

  // Take a screenshot of the keyboard shortcuts dialog
  await page.screenshot({
    path: 'test-results/evidence/COMMENT-003-evidence.png',
    fullPage: false,
  });
});
