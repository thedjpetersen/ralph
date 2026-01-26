import { test } from '@playwright/test';

test('capture dashboard recent activity evidence', async ({ page }) => {
  // Set up mock auth to simulate logged-in state
  await page.goto('http://localhost:5173/');
  await page.evaluate(() => {
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
            theme: 'dark',
            language: 'en',
            notifications: { email: true, push: false },
          },
        },
        version: 0,
      })
    );
    // Mock account state
    localStorage.setItem(
      'clockzen-account-storage',
      JSON.stringify({
        state: {
          accounts: [
            {
              id: 'test-account',
              name: 'Personal',
              type: 'personal',
              owner_id: 'test-user',
              created_at: new Date().toISOString(),
            },
          ],
          currentAccount: {
            id: 'test-account',
            name: 'Personal',
            type: 'personal',
            owner_id: 'test-user',
            created_at: new Date().toISOString(),
          },
        },
        version: 0,
      })
    );
    // Skip onboarding
    localStorage.setItem(
      'clockzen-onboarding-storage',
      JSON.stringify({
        state: {
          isComplete: true,
          currentStep: 5,
        },
        version: 0,
      })
    );
  });

  // Navigate to dashboard
  await page.goto('http://localhost:5173/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Take a screenshot of the dashboard showing Recent Transactions, Recent Receipts, and Quick Actions
  await page.screenshot({
    path: 'test-results/evidence/dash-002-evidence.png',
    fullPage: true,
  });
});
