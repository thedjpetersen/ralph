import { Page } from '@playwright/test';

// Common mock data
export const mockUser = {
  id: 'user-001',
  email: 'test@example.com',
  name: 'Test User',
  avatar: null,
  createdAt: new Date().toISOString(),
};

export const mockAccounts = [
  {
    id: 'account-001',
    name: 'Personal Finance',
    email: 'test@example.com',
    currency: 'USD',
    timezone: 'America/New_York',
    createdAt: new Date().toISOString(),
  },
];

// Setup basic mocks for user and accounts
export async function setupBasicMocks(page: Page) {
  // Mock the user API endpoint
  await page.route('**/api/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUser),
    });
  });

  // Mock the accounts API endpoint
  await page.route('**/api/accounts', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAccounts),
      });
    } else {
      await route.continue();
    }
  });

  // Set localStorage to simulate logged in state with account selected
  await page.addInitScript(() => {
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
  });
}

// Wait for page to be fully loaded with account context
export async function waitForAppReady(page: Page) {
  await page.waitForLoadState('networkidle');
  // Give a small buffer for React state to settle
  await page.waitForTimeout(100);
}
