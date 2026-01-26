import { test } from '@playwright/test';

test('capture AI feedback scheduling evidence', async ({ page }) => {
  // Go to dashboard first
  await page.goto('http://localhost:5173/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Login using the quick login button if we see the sign in page
  const quickLoginButton = page.getByRole('button', { name: /Quick Login as Test User/i });
  if (await quickLoginButton.isVisible()) {
    await quickLoginButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  }

  // Navigate to settings
  await page.goto('http://localhost:5173/settings');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Take evidence screenshot
  await page.screenshot({
    path: 'test-results/evidence/AI-010-evidence.png',
    fullPage: true
  });
});
