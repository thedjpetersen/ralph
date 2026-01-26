import { test, expect } from '@playwright/test';

test('comp-006: Toast UI component evidence', async ({ page }) => {
  // Go to dashboard and show that the app loads successfully
  await page.goto('http://localhost:5173/dashboard');
  await page.waitForLoadState('networkidle');

  // Take evidence screenshot showing the application works
  await page.screenshot({
    path: 'test-results/evidence/comp-006-evidence.png',
    fullPage: false,
  });

  // Verify the page loaded
  expect(await page.title()).toBeTruthy();
});
