import { test, expect } from '@playwright/test';

async function closeAnyOpenModals(page) {
  // Close welcome modal if it appears - close ALL modals with Escape
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
}

test('capture keyboard shortcuts viewer evidence', async ({ page }) => {
  // Go to settings page
  await page.goto('http://localhost:5173/settings');
  await page.waitForLoadState('networkidle');

  // Close any open modals (like welcome modal)
  await closeAnyOpenModals(page);

  // Wait for the page to fully load
  await page.waitForSelector('h1:has-text("Settings")');

  // Click on the "View Shortcuts" button in the General section
  const viewShortcutsButton = page.getByRole('button', { name: 'View Shortcuts' });
  await expect(viewShortcutsButton).toBeVisible();
  await viewShortcutsButton.click();

  // Wait for the modal to appear with title "Keyboard Shortcuts"
  await page.waitForSelector('.shortcuts-viewer');
  await page.waitForTimeout(500); // Allow for animations

  // Capture the keyboard shortcuts viewer
  await page.screenshot({
    path: 'test-results/evidence/SETTINGS-004-evidence.png',
    fullPage: false,
  });

  // Verify key elements are visible using more specific selectors (use first() to avoid strict mode violation)
  const modal = page.locator('[role="dialog"]').filter({ has: page.locator('.shortcuts-viewer') }).first();
  await expect(modal.locator('.modal-title')).toHaveText('Keyboard Shortcuts');
  await expect(modal.locator('input[placeholder="Search shortcuts..."]')).toBeVisible();
  await expect(modal.locator('.category-filter:has-text("All")')).toBeVisible();
  await expect(modal.locator('.category-filter:has-text("General")')).toBeVisible();
  await expect(modal.locator('.category-filter:has-text("Editor")')).toBeVisible();
  await expect(modal.locator('.category-filter:has-text("AI")')).toBeVisible();
  await expect(modal.locator('.category-filter:has-text("Navigation")')).toBeVisible();
});

test('test search functionality', async ({ page }) => {
  // Go to settings page
  await page.goto('http://localhost:5173/settings');
  await page.waitForLoadState('networkidle');

  // Close any open modals
  await closeAnyOpenModals(page);

  // Open keyboard shortcuts viewer
  await page.getByRole('button', { name: 'View Shortcuts' }).click();
  await page.waitForSelector('.shortcuts-viewer');

  // Get the modal (use first() to avoid strict mode violation)
  const modal = page.locator('[role="dialog"]').filter({ has: page.locator('.shortcuts-viewer') }).first();

  // Search for a shortcut
  const searchInput = modal.locator('input[placeholder="Search shortcuts..."]');
  await searchInput.fill('save');

  // Wait for filtering
  await page.waitForTimeout(300);

  // Should show filtered results
  await expect(modal.getByText('Save document')).toBeVisible();

  // Capture search results
  await page.screenshot({
    path: 'test-results/evidence/SETTINGS-004-search.png',
    fullPage: false,
  });
});

test('test platform toggle', async ({ page }) => {
  // Go to settings page
  await page.goto('http://localhost:5173/settings');
  await page.waitForLoadState('networkidle');

  // Close any open modals
  await closeAnyOpenModals(page);

  // Open keyboard shortcuts viewer
  await page.getByRole('button', { name: 'View Shortcuts' }).click();
  await page.waitForSelector('.shortcuts-viewer');

  // Get the modal (use first() to avoid strict mode violation)
  const modal = page.locator('[role="dialog"]').filter({ has: page.locator('.shortcuts-viewer') }).first();

  // Click on the inactive platform option to switch (not the button itself)
  // Find the inactive option (the one without 'active' class)
  const inactiveOption = modal.locator('.platform-option:not(.active)');
  await inactiveOption.click({ force: true });

  await page.waitForTimeout(300);

  // Capture with different platform
  await page.screenshot({
    path: 'test-results/evidence/SETTINGS-004-platform.png',
    fullPage: false,
  });
});
