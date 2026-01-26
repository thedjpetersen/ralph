/**
 * E2E test to capture evidence of Table of Contents sidebar feature
 */

import { test, expect } from '@playwright/test';

test.describe('Table of Contents Sidebar', () => {
  test('capture evidence of TOC sidebar', async ({ page }) => {
    // Navigate to the AI Outline demo page which has markdown content
    await page.goto('http://localhost:5173/ai-outline-demo');
    await page.waitForLoadState('networkidle');

    // Open the TOC sidebar using the keyboard shortcut (Alt+I)
    await page.keyboard.press('Alt+i');

    // Wait for the sidebar animation to complete
    await page.waitForTimeout(500);

    // Verify the TOC sidebar is visible
    const tocSidebar = page.locator('.toc-sidebar');
    await expect(tocSidebar).toBeVisible();

    // Take a full screenshot
    await page.screenshot({
      path: 'test-results/evidence/EDITOR-007-evidence.png',
      fullPage: false,
    });

    // Also take a screenshot of just the TOC sidebar
    await tocSidebar.screenshot({
      path: 'test-results/evidence/EDITOR-007-toc-sidebar.png',
    });
  });

  test('TOC shows empty state when no headings', async ({ page }) => {
    // Navigate to a page that might not have headings
    await page.goto('http://localhost:5173/dashboard');
    await page.waitForLoadState('networkidle');

    // Open the TOC sidebar
    await page.keyboard.press('Alt+i');
    await page.waitForTimeout(500);

    // Verify empty state message
    const emptyState = page.locator('.toc-empty-state');
    await expect(emptyState).toBeVisible();

    await page.screenshot({
      path: 'test-results/evidence/EDITOR-007-empty-state.png',
      fullPage: false,
    });
  });
});
