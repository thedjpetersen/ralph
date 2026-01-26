import { test } from '@playwright/test';

test('capture comment search filter evidence', async ({ page }) => {
  // Go to the comments sort demo page
  await page.goto('http://localhost:5173/comments-sort-demo');

  // Wait for the page to load completely
  await page.waitForLoadState('networkidle');

  // Dismiss any tour modal if present
  const skipButton = page.locator('button:has-text("Skip")');
  if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skipButton.click();
    await page.waitForTimeout(500);
  }

  // Wait for the comments panel to be visible
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({
    path: 'test-results/evidence/COMMENT-007-evidence.png',
    fullPage: false
  });
});
