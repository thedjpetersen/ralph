import { test } from '@playwright/test';

test('capture toast demo evidence', async ({ page }) => {
  // Set up localStorage before navigation to prevent onboarding overlay
  await page.addInitScript(() => {
    localStorage.setItem(
      'clockzen-onboarding-storage',
      JSON.stringify({
        state: { hasCompletedTour: true, hasDismissedTour: true },
        version: 0
      })
    );
  });

  await page.goto('http://localhost:5173/toast-demo');

  // Wait for the page to fully render
  await page.waitForSelector('.toast-demo-page', { timeout: 10000 });
  await page.waitForLoadState('networkidle');

  // Click a few toast buttons to show them in action
  await page.click('.demo-button-success');
  await page.waitForTimeout(500);
  await page.click('.demo-button-error');
  await page.waitForTimeout(500);
  await page.click('.demo-button-warning');
  await page.waitForTimeout(500);

  // Capture screenshot with toasts visible
  await page.screenshot({
    path: 'test-results/evidence/UI-003-evidence.png',
    fullPage: false
  });
});
