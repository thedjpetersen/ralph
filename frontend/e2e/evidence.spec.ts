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

const mockTransactions = [
  {
    id: 'txn-001',
    account_id: 'account-001',
    type: 'purchase',
    status: 'completed',
    amount: 125.50,
    currency: 'USD',
    transaction_date: '2024-01-15',
    description: 'Weekly groceries',
    merchant_name: 'Whole Foods Market',
    merchant_category: 'Groceries',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

test('capture fe-test-003 evidence - transactions page', async ({ page }) => {
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
        preferences: { theme: 'system', language: 'en', notifications: { email: true, push: false } },
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
  });

  await page.route('**/api/user', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockUser) });
  });

  await page.route('**/api/accounts', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAccounts) });
  });

  await page.route('**/api/accounts/account-001/transactions', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transactions: mockTransactions }) });
  });

  await page.goto('/transactions');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: 'test-results/evidence/fe-test-003-evidence.png', fullPage: true });
});
