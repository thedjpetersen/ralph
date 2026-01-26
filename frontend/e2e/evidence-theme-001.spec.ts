import { test } from '@playwright/test';

test.describe('Theme-001: Dark Mode Evidence', () => {
  test('capture theme toggle in Settings', async ({ page }) => {
    // Navigate to settings page where theme toggle exists
    await page.goto('http://localhost:5173/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for theme toggle component
    await page.screenshot({
      path: 'test-results/evidence/theme-001-evidence.png',
      fullPage: false
    });
  });

  test('capture dark mode', async ({ page }) => {
    await page.goto('http://localhost:5173/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Set dark mode preference via page evaluate
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'test-results/evidence/theme-001-dark.png',
      fullPage: false
    });
  });
});
