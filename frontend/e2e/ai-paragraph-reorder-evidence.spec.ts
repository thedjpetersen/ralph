/**
 * Evidence capture for AI-019: AI-powered paragraph reordering
 */
import { test, expect } from '@playwright/test';

test('capture AI paragraph reorder evidence', async ({ page }) => {
  // Navigate to the BlockDragDemo page which has the BlockEditor
  await page.goto('http://localhost:5173/block-drag-demo');

  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.block-editor-container', { timeout: 10000 });

  // Use keyboard shortcut to open the AI Paragraph Reorder panel
  await page.keyboard.press('Meta+Shift+R');

  // Wait for the panel to appear with analysis
  await page.waitForSelector('.ai-reorder-panel', { timeout: 10000 });

  // Wait for analysis to complete (spinner disappears)
  await page.waitForFunction(() => {
    const spinner = document.querySelector('.reorder-spinner');
    return !spinner;
  }, { timeout: 15000 });

  // Give some time for animations
  await page.waitForTimeout(500);

  // Capture full page screenshot showing the reorder panel
  await page.screenshot({
    path: 'test-results/evidence/AI-019-evidence.png',
    fullPage: false,
  });

  // Verify the panel elements are present
  await expect(page.locator('.reorder-title')).toContainText('Paragraph Reorder');
  await expect(page.locator('.reorder-stats')).toBeVisible();
  await expect(page.locator('.reorder-preview-section')).toBeVisible();
});
