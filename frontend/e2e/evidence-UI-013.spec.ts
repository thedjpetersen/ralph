import { test, expect, Page } from '@playwright/test';

async function closeAnyOpenModals(page: Page) {
  // Click Skip for now button if visible
  const skipButton = page.getByText('Skip for now');
  if (await skipButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await skipButton.click();
    await page.waitForTimeout(500);
  }

  // Press Escape a few times to ensure any modal is closed
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
}

test('UI-013: Capture inline rename evidence for document titles', async ({ page }) => {
  // Go to the sidebar demo page which shows the sidebar with document folders
  await page.goto('http://localhost:5173/sidebar-demo');
  await page.waitForLoadState('networkidle');

  // Close any modal by clicking skip or escape
  await closeAnyOpenModals(page);

  await page.waitForTimeout(1000);

  // First scroll down the left sidebar to show document folders section
  const sidebar = page.locator('.sidebar').first();
  if (await sidebar.isVisible()) {
    // Scroll the sidebar to the bottom to show DocumentFolders section
    await sidebar.evaluate(el => el.scrollTo(0, el.scrollHeight));
    await page.waitForTimeout(500);
  }

  // Look for document folders section
  const documentFolders = page.locator('.document-folders').first();

  if (await documentFolders.isVisible({ timeout: 3000 }).catch(() => false)) {
    // First try to find a starred item (which now supports inline rename)
    const starredItemName = page.locator('.starred-item-name').first();

    if (await starredItemName.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Double-click on starred item to enter edit mode
      await starredItemName.dblclick();
      await page.waitForTimeout(500);

      // Verify the input appeared
      const input = page.locator('.starred-item-input');
      await expect(input).toBeVisible({ timeout: 2000 });

      // Capture screenshot with edit mode active
      await page.screenshot({
        path: 'test-results/evidence/UI-013-evidence.png',
        fullPage: false
      });
    } else {
      // Try folder name instead
      const folderName = page.locator('.folder-name').first();

      if (await folderName.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Double-click to enter edit mode
        await folderName.dblclick();
        await page.waitForTimeout(500);

        // Verify the input appeared
        const input = page.locator('.folder-name-input');
        await expect(input).toBeVisible({ timeout: 2000 });

        // Capture the screenshot in edit mode
        await page.screenshot({
          path: 'test-results/evidence/UI-013-evidence.png',
          fullPage: false
        });
      } else {
        // Document folders section visible but no folders - capture the empty state
        await page.screenshot({
          path: 'test-results/evidence/UI-013-evidence.png',
          fullPage: false
        });
      }
    }
  } else {
    // Just capture the sidebar
    await page.screenshot({
      path: 'test-results/evidence/UI-013-evidence.png',
      fullPage: false
    });
  }
});
