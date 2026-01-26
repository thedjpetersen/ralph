import { test } from '@playwright/test';

test('capture EDITOR-012 evidence - undo/redo history panel', async ({ page }) => {
  // Navigate to the Block Drag Demo page which now has the history feature
  await page.goto('http://localhost:5173/block-drag-demo');
  await page.waitForLoadState('networkidle');

  // Close any modal overlays that might be present
  try {
    const closeBtn = page.locator('.modal-close, [aria-label="Close"], .welcome-modal-close');
    if (await closeBtn.isVisible({ timeout: 2000 })) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }
  } catch {
    // No modal to close
  }

  // Press Escape to close any remaining modals
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Wait for the page content to load
  await page.waitForSelector('.block-drag-demo', { timeout: 10000 });

  // Click the History button to open the panel
  await page.click('.history-btn');
  await page.waitForTimeout(500);

  // Capture the screenshot showing the history panel
  await page.screenshot({
    path: 'test-results/evidence/EDITOR-012-evidence.png',
    fullPage: false
  });
});
