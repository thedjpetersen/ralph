import { test, expect } from '@playwright/test';

test('AI-015: AI Readability Scorer - capture evidence', async ({ page }) => {
  // Navigate to the app (dashboard)
  await page.goto('http://localhost:5173/dashboard');
  await page.waitForLoadState('networkidle');

  // Close onboarding overlay if present
  const onboardingClose = page.locator('.onboarding-close, .onboarding-skip, [aria-label="Skip tour"]');
  if (await onboardingClose.isVisible({ timeout: 2000 }).catch(() => false)) {
    await onboardingClose.click();
    await page.waitForTimeout(500);
  }

  // Press Escape to close any overlays
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Use Alt+R keyboard shortcut to open readability panel
  await page.keyboard.press('Alt+r');

  // Wait for panel to appear
  await page.waitForSelector('.ai-readability-panel', { state: 'visible', timeout: 5000 });

  // Capture screenshot of the empty state with audience selector
  await page.screenshot({
    path: 'test-results/evidence/AI-015-evidence-panel.png',
    fullPage: false,
  });

  // Open the audience selector to show all options
  await page.click('.readability-audience-toggle');
  await page.waitForSelector('.readability-audience-options', { state: 'visible' });

  // Take another screenshot showing the full panel with audience selector
  await page.screenshot({
    path: 'test-results/evidence/AI-015-evidence.png',
    fullPage: false,
  });

  // Verify key elements exist
  await expect(page.locator('.readability-title')).toContainText('Readability');
  await expect(page.locator('.readability-audience-section')).toBeVisible();
  await expect(page.locator('.readability-empty')).toContainText('Select text to analyze');
});
