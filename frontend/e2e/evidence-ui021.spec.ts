import { test } from '@playwright/test';

test('capture UI-021 evidence - Document Thumbnail Preview', async ({ page }) => {
  // Navigate to the dashboard which shows documents sidebar
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');

  // Give time for any animations to complete
  await page.waitForTimeout(500);

  // Capture the full page showing the document sidebar with the new grid view toggle
  await page.screenshot({
    path: 'test-results/evidence/UI-021-evidence.png',
    fullPage: false
  });
});
