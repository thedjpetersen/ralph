import { test } from '@playwright/test';

test('capture writing streak evidence', async ({ page }) => {
  // Navigate to dashboard
  await page.goto('http://localhost:5173/dashboard');
  await page.waitForLoadState('networkidle');

  // Close any modals by pressing escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Capture the sidebar showing streak card
  await page.screenshot({
    path: 'test-results/evidence/UX-001-sidebar.png',
    fullPage: false
  });

  // Click on the streak card to open the calendar modal
  const streakCard = page.locator('.streak-card').first();
  if (await streakCard.isVisible()) {
    await streakCard.click();
    await page.waitForTimeout(500);

    // Capture the calendar modal
    await page.screenshot({
      path: 'test-results/evidence/UX-001-calendar.png',
      fullPage: false
    });

    // Close the modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // Navigate to settings
  await page.goto('http://localhost:5173/settings');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Close any modals
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Click on Writing Goals tab
  const goalsTab = page.locator('button:has-text("Writing Goals")');
  if (await goalsTab.isVisible()) {
    await goalsTab.click();
    await page.waitForTimeout(500);
  }

  // Capture the settings page
  await page.screenshot({
    path: 'test-results/evidence/UX-001-settings.png',
    fullPage: false
  });
});
