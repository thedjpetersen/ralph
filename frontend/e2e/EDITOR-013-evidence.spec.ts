/**
 * Evidence capture for EDITOR-013: Link editing popover
 */
import { test, expect } from '@playwright/test';

test('capture link popover evidence', async ({ page }) => {
  // Navigate to the block drag demo page which has links in the content
  await page.goto('http://localhost:5173/block-drag-demo');

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Dismiss any onboarding overlay if present
  const onboardingOverlay = page.locator('.onboarding-overlay');
  if (await onboardingOverlay.isVisible({ timeout: 2000 }).catch(() => false)) {
    // Press Escape or click skip button to dismiss
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // Wait for the block editor to be visible
  await page.waitForSelector('.block-editor', { timeout: 10000 });

  // Find a link in the markdown preview and click it to open the popover
  const link = page.locator('.markdown-preview-link').first();
  await expect(link).toBeVisible({ timeout: 5000 });

  // Click the link to open the popover
  await link.click();

  // Wait for the popover to appear
  const popover = page.locator('.link-popover');
  await expect(popover).toBeVisible({ timeout: 5000 });

  // Take screenshot with the popover visible
  await page.screenshot({
    path: 'test-results/evidence/EDITOR-013-evidence.png',
    fullPage: false,
  });
});

test('capture link popover edit mode evidence', async ({ page }) => {
  // Navigate to the block drag demo page
  await page.goto('http://localhost:5173/block-drag-demo');

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Dismiss any onboarding overlay if present
  const onboardingOverlay = page.locator('.onboarding-overlay');
  if (await onboardingOverlay.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // Wait for the block editor to be visible
  await page.waitForSelector('.block-editor', { timeout: 10000 });

  // Find a link and click it
  const link = page.locator('.markdown-preview-link').first();
  await expect(link).toBeVisible({ timeout: 5000 });
  await link.click();

  // Wait for the popover
  const popover = page.locator('.link-popover');
  await expect(popover).toBeVisible({ timeout: 5000 });

  // Click the edit button
  const editButton = popover.locator('button', { hasText: 'Edit' });
  await editButton.click();

  // Wait for edit mode (input should appear)
  const input = popover.locator('input[type="url"]');
  await expect(input).toBeVisible({ timeout: 3000 });

  // Take screenshot with edit mode visible
  await page.screenshot({
    path: 'test-results/evidence/EDITOR-013-edit-mode.png',
    fullPage: false,
  });
});
