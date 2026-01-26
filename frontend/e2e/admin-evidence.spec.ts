import { test } from '@playwright/test';

test('capture admin dashboard evidence', async ({ page }) => {
  await page.goto('http://localhost:5173/admin');
  // Wait for the loading state to complete
  await page.waitForTimeout(1000);
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: 'test-results/evidence/admin-001-evidence.png',
    fullPage: false
  });
});
