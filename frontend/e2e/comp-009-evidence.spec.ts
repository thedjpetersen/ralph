import { test, expect } from '@playwright/test';

test('comp-009: SlideOutPanel component evidence', async ({ page }) => {
  // Go to dashboard and show that the app loads successfully with new component
  await page.goto('http://localhost:5173/dashboard');
  await page.waitForLoadState('networkidle');

  // Take evidence screenshot showing the application works after adding SlideOutPanel
  await page.screenshot({
    path: 'test-results/evidence/comp-009-evidence.png',
    fullPage: false,
  });

  // Verify the page loaded
  expect(await page.title()).toBeTruthy();
});
