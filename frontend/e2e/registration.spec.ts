import { test, expect } from '@playwright/test';

// Mock data for tests
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

// Setup function to initialize both user and account context
async function setupMocks(page: import('@playwright/test').Page) {
  // Set user storage to simulate logged in state
  await page.addInitScript(() => {
    // User storage - this is key for authentication
    localStorage.setItem('clockzen-user-storage', JSON.stringify({
      state: {
        user: {
          id: 'user-001',
          email: 'test@example.com',
          name: 'Test User',
          avatar: null,
          createdAt: new Date().toISOString(),
        },
        preferences: {
          theme: 'system',
          language: 'en',
          notifications: { email: true, push: false },
        },
      },
      version: 0,
    }));

    // Account storage
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

  // Mock user endpoint
  await page.route('**/api/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUser),
    });
  });

  // Mock accounts endpoint
  await page.route('**/api/accounts', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockAccounts),
    });
  });

  // Mock other common endpoints
  await page.route('**/api/accounts/*/budgets*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ budgets: [] }),
    });
  });

  await page.route('**/api/accounts/*/transactions*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ transactions: [] }),
    });
  });

  await page.route('**/api/accounts/*/receipts*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ receipts: [], total: 0 }),
    });
  });

  await page.route('**/api/accounts/*/financial-accounts/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total_accounts: 0,
        total_balance: 0,
        by_type: {},
        by_institution: {},
        last_sync: null,
      }),
    });
  });

  await page.route('**/api/accounts/*/financial-accounts', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/user/preferences', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        theme: 'system',
        language: 'en',
        notifications: { email: true, push: false },
      }),
    });
  });

  await page.route('**/api/user/api-keys', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}

test.describe('Registration and Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('should load dashboard page successfully', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify the dashboard loads with heading
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
  });

  test('should load accounts page and display accounts', async ({ page }) => {
    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');

    // Verify accounts page title
    await expect(page.getByRole('heading', { name: 'Accounts' })).toBeVisible({ timeout: 10000 });
  });

  test('should load profile page', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Verify profile page loads
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible({ timeout: 10000 });
  });

  test('should load settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // The settings page header is "User Preferences"
    await expect(page.getByRole('heading', { name: 'User Preferences' })).toBeVisible({ timeout: 10000 });
  });

  test('should load API keys page', async ({ page }) => {
    await page.goto('/api-keys');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'API Keys' })).toBeVisible({ timeout: 10000 });
  });

  test('should redirect from root to dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
