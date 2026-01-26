import { test, expect } from '@playwright/test';

const mockUser = {
  id: 'user-001',
  email: 'test@example.com',
  name: 'Test User',
  avatar: null,
  createdAt: new Date().toISOString(),
};

const mockAccounts = [
  {
    id: 'account-001',
    name: 'Personal Finance',
    email: 'test@example.com',
    currency: 'USD',
    timezone: 'America/New_York',
    createdAt: new Date().toISOString(),
  },
];

test('capture AI-007 evidence - AI Summary Demo page', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('clockzen-user-storage', JSON.stringify({
      state: {
        user: {
          id: 'user-001',
          email: 'test@example.com',
          name: 'Test User',
          avatar: null,
          createdAt: new Date().toISOString(),
        },
        preferences: { theme: 'light', language: 'en', notifications: { email: true, push: false } },
      },
      version: 0,
    }));

    localStorage.setItem('clockzen-account-storage', JSON.stringify({
      state: {
        currentAccount: {
          id: 'account-001',
          name: 'Personal Finance',
          email: 'test@example.com',
          currency: 'USD',
          timezone: 'America/New_York',
          createdAt: new Date().toISOString(),
        },
      },
      version: 0,
    }));

    // Dismiss onboarding tour
    localStorage.setItem('clockzen-onboarding-storage', JSON.stringify({
      state: {
        hasCompletedTour: true,
        hasDismissedTour: true,
      },
      version: 0,
    }));
  });

  await page.route('**/api/user', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockUser) });
  });

  await page.route('**/api/accounts', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAccounts) });
  });

  await page.goto('/ai-summary-demo');
  await page.waitForLoadState('networkidle');

  // Wait for page to be fully loaded
  await expect(page.getByRole('heading', { name: 'AI Summary Generation' })).toBeVisible({ timeout: 10000 });

  await page.screenshot({
    path: 'test-results/evidence/AI-007-evidence.png',
    fullPage: true,
  });
});

test('capture AI-007 evidence - AI Summary Dialog open', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('clockzen-user-storage', JSON.stringify({
      state: {
        user: {
          id: 'user-001',
          email: 'test@example.com',
          name: 'Test User',
          avatar: null,
          createdAt: new Date().toISOString(),
        },
        preferences: { theme: 'light', language: 'en', notifications: { email: true, push: false } },
      },
      version: 0,
    }));

    localStorage.setItem('clockzen-account-storage', JSON.stringify({
      state: {
        currentAccount: {
          id: 'account-001',
          name: 'Personal Finance',
          email: 'test@example.com',
          currency: 'USD',
          timezone: 'America/New_York',
          createdAt: new Date().toISOString(),
        },
      },
      version: 0,
    }));

    // Dismiss onboarding tour
    localStorage.setItem('clockzen-onboarding-storage', JSON.stringify({
      state: {
        hasCompletedTour: true,
        hasDismissedTour: true,
      },
      version: 0,
    }));
  });

  await page.route('**/api/user', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockUser) });
  });

  await page.route('**/api/accounts', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAccounts) });
  });

  await page.goto('/ai-summary-demo');
  await page.waitForLoadState('networkidle');

  // Wait for page and click Generate Summary button
  await expect(page.getByRole('heading', { name: 'AI Summary Generation' })).toBeVisible({ timeout: 10000 });

  // Click the Generate Summary button
  await page.click('button:has-text("Generate Summary")');

  // Wait for the dialog to appear and summary to generate
  await expect(page.getByRole('dialog', { name: 'Generate Summary' })).toBeVisible({ timeout: 5000 });

  // Wait for summary to be generated (loading indicator disappears)
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: 'test-results/evidence/AI-007-dialog-evidence.png',
    fullPage: false,
  });
});
