import { test } from '@playwright/test';

test('capture sidebar navigation evidence', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');

  // Login with demo account
  const sarahButton = page.getByRole('button', { name: /Sarah.*Writer/i });
  if (await sarahButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await sarahButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  }

  // Navigate to sidebar demo
  await page.goto('http://localhost:5173/sidebar-demo');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Capture whatever is on the page
  await page.screenshot({
    path: 'test-results/evidence/nav-001-evidence.png',
    fullPage: false
  });
});
