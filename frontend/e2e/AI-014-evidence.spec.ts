import { test } from '@playwright/test';

test('AI-014 Vocabulary Enhancer Evidence', async ({ page }) => {
  // Go to the dashboard
  await page.goto('http://localhost:5173/dashboard');
  await page.waitForLoadState('networkidle');

  // Use keyboard shortcut to open command palette
  await page.keyboard.press('Meta+k');
  await page.waitForTimeout(300);

  // Search for vocabulary enhancer
  await page.fill('input[placeholder="Search commands..."]', 'vocabulary');
  await page.waitForTimeout(300);

  // Take screenshot showing the command palette with vocabulary enhancer option
  await page.screenshot({
    path: 'test-results/evidence/AI-014-evidence.png',
    fullPage: false
  });

  // Click on Enhance Vocabulary
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);

  // Take screenshot of the vocabulary enhancer panel
  await page.screenshot({
    path: 'test-results/evidence/AI-014-evidence-panel.png',
    fullPage: false
  });
});
