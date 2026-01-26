import { test } from '@playwright/test';

test('capture onboarding tour evidence', async ({ page }) => {
  // Navigate to login page first
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');

  // Set up mock auth to bypass login and trigger tour
  await page.evaluate(() => {
    // Mock user state to simulate logged-in state
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
    // Clear onboarding state to trigger tour
    localStorage.removeItem('clockzen-onboarding-storage');
  });

  // Navigate to dashboard to trigger AppShell
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Take a screenshot of the current state
  await page.screenshot({
    path: 'test-results/evidence/ONBOARD-001-evidence.png',
    fullPage: false,
  });
});
