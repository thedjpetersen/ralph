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

const mockTransactions = [
  {
    id: 'txn-001',
    account_id: 'account-001',
    receipt_id: 'receipt-001',
    type: 'purchase',
    status: 'completed',
    amount: 125.50,
    currency: 'USD',
    transaction_date: '2024-01-15',
    description: 'Weekly groceries',
    merchant_name: 'Whole Foods Market',
    merchant_category: 'Groceries',
    payment_method: 'Credit Card',
    card_last_four: '4242',
    is_recurring: false,
    category_tags: ['groceries', 'food'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'txn-002',
    account_id: 'account-001',
    receipt_id: null,
    type: 'deposit',
    status: 'completed',
    amount: 3500.00,
    currency: 'USD',
    transaction_date: '2024-01-10',
    description: 'Monthly salary',
    merchant_name: 'Employer Inc',
    merchant_category: 'Income',
    payment_method: 'Bank Transfer',
    is_recurring: true,
    recurrence_pattern: 'Monthly',
    category_tags: ['income', 'salary'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Setup function to initialize account context
async function setupMocks(page: import('@playwright/test').Page) {
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

  await page.route('**/api/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUser),
    });
  });

  await page.route('**/api/accounts', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockAccounts),
    });
  });

  await page.route('**/api/accounts/account-001/transactions', async (route, request) => {
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ transactions: mockTransactions }),
      });
    } else if (request.method() === 'POST') {
      const body = request.postDataJSON();
      const newTransaction = {
        id: 'txn-new',
        account_id: 'account-001',
        ...body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newTransaction),
      });
    } else {
      await route.continue();
    }
  });
}

test.describe('Transactions List Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('should load transactions page with heading', async ({ page }) => {
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');

    // Verify page title
    await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible({ timeout: 10000 });
  });

  test('should display transactions in the list', async ({ page }) => {
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible({ timeout: 10000 });

    // Should display merchant names from mock data
    await expect(page.getByText('Whole Foods Market')).toBeVisible();
    await expect(page.getByText('Employer Inc')).toBeVisible();
  });

  test('should display Add Transaction button', async ({ page }) => {
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Add Transaction')).toBeVisible({ timeout: 10000 });
  });

  test('should handle empty transactions state', async ({ page }) => {
    // Override to return empty transactions
    await page.route('**/api/accounts/account-001/transactions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ transactions: [] }),
      });
    });

    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');

    // Verify empty state
    await expect(page.getByText(/don't have any transactions/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Transaction Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);

    await page.route('**/api/accounts/account-001/transactions/txn-001', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTransactions[0]),
      });
    });

    await page.route('**/api/accounts/account-001/transactions/txn-001/line-items', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ line_items: [] }),
      });
    });
  });

  test('should load transaction detail page', async ({ page }) => {
    await page.goto('/transactions/txn-001');
    await page.waitForLoadState('networkidle');

    // Verify merchant name is displayed as heading
    await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });
  });

  test('should display transaction amount', async ({ page }) => {
    await page.goto('/transactions/txn-001');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });

    // Verify amount is displayed
    await expect(page.getByText('$125.50')).toBeVisible();
  });

  test('should show back to transactions link', async ({ page }) => {
    await page.goto('/transactions/txn-001');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });

    // Verify back link
    await expect(page.getByText('Back to Transactions')).toBeVisible();
  });

  test('should show edit button', async ({ page }) => {
    await page.goto('/transactions/txn-001');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });

    // Verify edit button
    await expect(page.getByText('Edit Transaction')).toBeVisible();
  });
});

test.describe('Transaction Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('should navigate to create transaction page', async ({ page }) => {
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');

    // Wait for content to load
    await expect(page.getByText('Add Transaction')).toBeVisible({ timeout: 10000 });

    // Click add transaction button
    await page.getByRole('link', { name: 'Add Transaction' }).click();

    // Verify navigation
    await expect(page).toHaveURL('/transactions/new');
  });

  test('should display transaction form', async ({ page }) => {
    await page.goto('/transactions/new');
    await page.waitForLoadState('networkidle');

    // Wait for form to load
    await expect(page.getByRole('heading', { name: 'Create Transaction' })).toBeVisible({ timeout: 10000 });

    // Verify form exists
    await expect(page.locator('#amount')).toBeVisible();
  });
});
