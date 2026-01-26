import { test } from '@playwright/test';

test.describe('Focus Management System - UI-007', () => {
  test('capture evidence: modal focus trap', async ({ page }) => {
    // Navigate to accounts page which has modals
    await page.goto('http://localhost:5173/accounts');
    await page.waitForLoadState('networkidle');

    // Look for any button that might open a modal
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();

    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);
    }

    // Take screenshot showing modal if present
    await page.screenshot({
      path: 'test-results/evidence/UI-007-evidence.png',
      fullPage: false,
    });
  });

  test('capture evidence: skip link and focus visible', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');

    // Tab to show skip link
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);

    // Take screenshot showing skip link
    await page.screenshot({
      path: 'test-results/evidence/UI-007-skip-link.png',
      fullPage: false,
    });
  });

  test('capture evidence: keyboard shortcuts help modal', async ({ page }) => {
    // Navigate to any page
    await page.goto('http://localhost:5173/accounts');
    await page.waitForLoadState('networkidle');

    // Press ? to open keyboard shortcuts help
    await page.keyboard.press('Shift+/');
    await page.waitForTimeout(500);

    // Take screenshot of keyboard shortcuts modal
    await page.screenshot({
      path: 'test-results/evidence/UI-007-keyboard-help.png',
      fullPage: false,
    });
  });
});
