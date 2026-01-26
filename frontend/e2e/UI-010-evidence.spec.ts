import { test, expect } from '@playwright/test';

async function closeAnyOpenModals(page) {
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
}

test('UI-010: Capture command palette with keyboard shortcuts', async ({ page }) => {
  // Go to the touch demo page
  await page.goto('http://localhost:5173/touch-demo');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Close any open modals
  await closeAnyOpenModals(page);
  await page.waitForTimeout(500);

  // Open command palette with Cmd+K (Meta+K on Mac)
  await page.keyboard.press('Meta+k');
  await page.waitForTimeout(800);

  // Check that command palette is visible
  const commandPalette = page.locator('.command-palette');
  await expect(commandPalette).toBeVisible({ timeout: 5000 });

  // Type to filter to AI commands which have shortcuts
  await page.keyboard.type('find');
  await page.waitForTimeout(500);

  // Capture the command palette showing keyboard shortcuts
  await page.screenshot({
    path: 'test-results/evidence/UI-010-evidence.png',
    fullPage: false,
  });
});

test('UI-010: Capture context menu with keyboard shortcuts', async ({ page }) => {
  // Go to the touch demo page
  await page.goto('http://localhost:5173/touch-demo');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Close any open modals
  await closeAnyOpenModals(page);

  // Right-click on one of the demo items to open context menu
  const demoItem = page.locator('.demo-item').first();
  await demoItem.click({ button: 'right' });
  await page.waitForTimeout(500);

  // Capture the context menu showing keyboard shortcuts
  await page.screenshot({
    path: 'test-results/evidence/UI-010-context-menu.png',
    fullPage: false,
  });
});

test('UI-010: Capture keyboard shortcuts viewer modal', async ({ page }) => {
  // Go to settings page
  await page.goto('http://localhost:5173/settings');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Close any open modals
  await closeAnyOpenModals(page);

  // Click on the "View Shortcuts" button
  const viewShortcutsButton = page.getByRole('button', { name: 'View Shortcuts' });
  await expect(viewShortcutsButton).toBeVisible({ timeout: 5000 });
  await viewShortcutsButton.click();

  // Wait for the modal to appear
  await page.waitForSelector('.shortcuts-viewer');
  await page.waitForTimeout(500);

  // Capture the keyboard shortcuts viewer
  await page.screenshot({
    path: 'test-results/evidence/UI-010-shortcuts-viewer.png',
    fullPage: false,
  });
});
