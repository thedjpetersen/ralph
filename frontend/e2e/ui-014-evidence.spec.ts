import { test, expect } from '@playwright/test';

test.describe('UI-014: Collapsible panels with memory', () => {
  test('capture sidebar collapse functionality', async ({ page }) => {
    // Navigate to the dashboard to see the sidebar
    await page.goto('http://localhost:5173/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for sidebar to be visible
    await page.waitForSelector('.sidebar', { timeout: 5000 });

    // Close any modal that might be open (welcome modal, etc.)
    const modalClose = page.locator('.modal-close-btn, [aria-label="Close"], .welcome-modal-close');
    if (await modalClose.first().isVisible({ timeout: 1000 }).catch(() => false)) {
      await modalClose.first().click();
      await page.waitForTimeout(500);
    }

    // Press Escape to close any modals
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Take a screenshot of the dashboard with sidebar expanded
    await page.screenshot({
      path: 'test-results/evidence/UI-014-dashboard.png',
      fullPage: false
    });

    // Hover over the sidebar to reveal collapse button
    await page.hover('.sidebar');
    await page.waitForTimeout(300);

    // Take screenshot showing collapse button on hover
    await page.screenshot({
      path: 'test-results/evidence/UI-014-sidebar-evidence.png',
      fullPage: false
    });

    // Click the collapse button
    const collapseBtn = page.locator('.sidebar-collapse-toggle');
    if (await collapseBtn.isVisible()) {
      await collapseBtn.click();
      await page.waitForTimeout(300); // Wait for animation

      // Take screenshot of collapsed sidebar
      await page.screenshot({
        path: 'test-results/evidence/UI-014-evidence.png',
        fullPage: false
      });
    }
  });

  test('verify localStorage persistence', async ({ page }) => {
    // Navigate and collapse sidebar
    await page.goto('http://localhost:5173/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.sidebar', { timeout: 5000 });

    // Close any modal that might be open
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Hover and click collapse button
    await page.hover('.sidebar');
    await page.waitForTimeout(300);

    const collapseBtn = page.locator('.sidebar-collapse-toggle');
    if (await collapseBtn.isVisible()) {
      await collapseBtn.click();
      await page.waitForTimeout(500);
    }

    // Verify sidebar is collapsed
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toHaveClass(/sidebar-collapsed/);

    // Check localStorage
    const stored = await page.evaluate(() => {
      const data = localStorage.getItem('clockzen-app-settings');
      return data ? JSON.parse(data) : null;
    });

    expect(stored?.state?.settings?.appearance?.sidebarCollapsed).toBe(true);

    // Reload page to verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.sidebar', { timeout: 5000 });

    // Verify sidebar is still collapsed after reload
    const sidebarAfterReload = page.locator('.sidebar');
    await expect(sidebarAfterReload).toHaveClass(/sidebar-collapsed/);
  });

  test('verify keyboard shortcut Cmd+\\', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.sidebar', { timeout: 5000 });

    // Clear any existing collapsed state
    await page.evaluate(() => {
      const data = localStorage.getItem('clockzen-app-settings');
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.state?.settings?.appearance) {
          parsed.state.settings.appearance.sidebarCollapsed = false;
          parsed.state.settings.appearance.commentsPanelCollapsed = false;
          localStorage.setItem('clockzen-app-settings', JSON.stringify(parsed));
        }
      }
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.sidebar', { timeout: 5000 });

    // Verify sidebar is expanded
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).not.toHaveClass(/sidebar-collapsed/);

    // Press Cmd+\ to toggle
    await page.keyboard.press('Meta+Backslash');
    await page.waitForTimeout(500);

    // Verify sidebar is now collapsed
    await expect(sidebar).toHaveClass(/sidebar-collapsed/);

    // Press again to expand
    await page.keyboard.press('Meta+Backslash');
    await page.waitForTimeout(500);

    // Verify sidebar is expanded again
    await expect(sidebar).not.toHaveClass(/sidebar-collapsed/);
  });
});
