import { test } from '@playwright/test';

test('capture AI sentence combiner demo', async ({ page }) => {
  await page.goto('http://localhost:5173/ai-sentence-combiner-demo');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: 'test-results/evidence/AI-016-evidence.png',
    fullPage: true
  });
});
