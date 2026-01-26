import { test } from '@playwright/test';

test('capture fact-checking highlights evidence', async ({ page }) => {
  // Navigate to the AI summary demo page which has a working editor
  await page.goto('http://localhost:5173/demo/ai-summary');
  await page.waitForLoadState('networkidle');

  // Wait a bit for page to fully render
  await page.waitForTimeout(2000);

  // Open the command palette with Cmd+K
  await page.keyboard.press('Meta+k');
  await page.waitForTimeout(500);

  // Type "fact" to search for the fact-checking command
  await page.keyboard.type('fact');
  await page.waitForTimeout(500);

  // Capture screenshot showing the command palette with fact-check option
  await page.screenshot({
    path: 'test-results/evidence/AI-018-evidence.png',
    fullPage: false
  });
});
