import { test } from '@playwright/test';

test('capture AI-009 evidence - Author Preview Feature', async ({ page }) => {
  // Go to the author preview demo page
  await page.goto('http://localhost:5173/author-preview-demo');

  // Wait for the page to fully load
  await page.waitForLoadState('networkidle');

  // Wait for the cards to be visible
  await page.waitForSelector('.author-demo-card', { timeout: 10000 });

  // Take a screenshot of the initial state
  await page.screenshot({
    path: 'test-results/evidence/AI-009-evidence.png',
    fullPage: false,
  });

  // Click the Preview button on the first author card
  const previewButton = page.locator('.author-demo-preview-btn').first();
  await previewButton.click();

  // Wait for the preview dialog to appear
  await page.waitForSelector('.author-preview-dialog', { timeout: 5000 });

  // Wait a moment for any animations
  await page.waitForTimeout(500);

  // Take a screenshot showing the preview dialog
  await page.screenshot({
    path: 'test-results/evidence/AI-009-preview-dialog.png',
    fullPage: false,
  });
});
