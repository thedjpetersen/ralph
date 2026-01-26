import { test } from '@playwright/test';

test('capture focus mode evidence', async ({ page }) => {
  // Navigate to a demo page that has the GhostTextTextarea
  await page.goto('http://localhost:5173/ai-summary-demo');
  await page.waitForLoadState('networkidle');

  // Wait for the page to fully load
  await page.waitForTimeout(1000);

  // Dismiss onboarding dialog if present
  const skipButton = page.locator('button:has-text("Skip Tour"), button:has-text("Skip"), button:has-text("Close")').first();
  if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skipButton.click();
    await page.waitForTimeout(500);
  }

  // Press Escape to close any remaining dialogs
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Find and click on the textarea to focus it
  const textarea = page.locator('textarea').first();
  await textarea.click({ force: true });
  await textarea.fill(`This is the first paragraph. It contains some sample text for demonstrating the focus mode feature.

This is the second paragraph. When focus mode is active, this paragraph will be dimmed because it's not the active one.

This is the third paragraph. The focus mode helps writers concentrate on one paragraph at a time.

This is the fourth paragraph. You can toggle focus mode with Cmd+Shift+F keyboard shortcut.`);

  // Position cursor in the third paragraph
  await textarea.click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');

  // Toggle focus mode with Cmd+Shift+F
  await page.keyboard.press('Meta+Shift+KeyF');

  // Wait for the focus mode indicator to appear
  await page.waitForTimeout(500);

  // Take a screenshot showing focus mode active with the status bar indicator
  await page.screenshot({
    path: 'test-results/evidence/EDITOR-005-evidence.png',
    fullPage: false,
  });
});
