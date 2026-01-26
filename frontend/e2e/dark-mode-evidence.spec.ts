import { test } from '@playwright/test';

test('capture dark mode evidence', async ({ page }) => {
  // Navigate to the settings page
  await page.goto('http://localhost:5173/settings');

  // Wait for network to be idle
  await page.waitForLoadState('networkidle');

  // Wait for the content to load
  await page.waitForTimeout(2000);

  // Dismiss onboarding overlay if present
  const overlay = page.locator('.onboarding-overlay');
  if (await overlay.isVisible()) {
    // Press Escape to close or click skip button
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // If still visible, try clicking skip
  if (await overlay.isVisible()) {
    const skipButton = page.locator('button:has-text("Skip")');
    if (await skipButton.isVisible()) {
      await skipButton.click();
      await page.waitForTimeout(500);
    }
  }

  // Click on Appearance section
  await page.click('button:has-text("Appearance")');

  // Wait for section to load
  await page.waitForTimeout(500);

  // Take screenshot in dark mode (current state)
  await page.screenshot({
    path: 'test-results/evidence/UI-011-dark.png',
    fullPage: false
  });

  // Click on Light theme option
  await page.click('.theme-option:has-text("Light")');

  // Wait for transition
  await page.waitForTimeout(300);

  // Take screenshot in light mode
  await page.screenshot({
    path: 'test-results/evidence/UI-011-light.png',
    fullPage: false
  });

  // Click on Dark theme option
  await page.click('.theme-option:has-text("Dark")');

  // Wait for transition
  await page.waitForTimeout(300);

  // Final screenshot showing dark mode selected
  await page.screenshot({
    path: 'test-results/evidence/UI-011-evidence.png',
    fullPage: false
  });
});
