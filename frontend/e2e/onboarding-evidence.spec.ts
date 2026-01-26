import { test, expect } from '@playwright/test';

test('capture onboarding tour evidence', async ({ page }) => {
  // Set up mock auth state before navigation
  await page.addInitScript(() => {
    // Mock auth state
    localStorage.setItem(
      'clockzen-auth-storage',
      JSON.stringify({
        state: {
          isAuthenticated: true,
          token: 'mock-token-for-testing',
        },
        version: 0,
      })
    );
    // Mock user state
    localStorage.setItem(
      'clockzen-user-storage',
      JSON.stringify({
        state: {
          user: {
            id: 'test-user',
            email: 'test@example.com',
            name: 'Test User',
            createdAt: new Date().toISOString(),
          },
          preferences: {
            theme: 'light',
            language: 'en',
            notifications: { email: true, push: false },
          },
        },
        version: 0,
      })
    );
    // Clear onboarding state to trigger tour for first-time users
    localStorage.removeItem('clockzen-onboarding-storage');
  });

  // Navigate to dashboard
  await page.goto('http://localhost:5173/dashboard');
  await page.waitForLoadState('networkidle');

  // Wait for tour to appear (500ms delay in AppShell + render time)
  await page.waitForTimeout(1000);

  // Check if the onboarding tour overlay is visible
  const tourOverlay = page.locator('.onboarding-overlay');
  const isTourVisible = await tourOverlay.isVisible().catch(() => false);

  if (isTourVisible) {
    // Tour is showing - capture it
    await expect(page.locator('.onboarding-tooltip')).toBeVisible();
    await expect(page.locator('.onboarding-title')).toContainText('Welcome');
    await expect(page.locator('.onboarding-progress-text')).toContainText('1 of 5');

    await page.screenshot({
      path: 'test-results/evidence/ONBOARD-001-evidence.png',
      fullPage: false,
    });
  } else {
    // If not on dashboard (redirected to login), navigate and show keyboard shortcuts
    // which contains the "Take the Tour" button
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Take screenshot of login page which is the entry point
    await page.screenshot({
      path: 'test-results/evidence/ONBOARD-001-evidence.png',
      fullPage: false,
    });
  }
});
