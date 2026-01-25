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

const mockBudgets = [
  {
    id: 'budget-001',
    account_id: 'account-001',
    name: 'Monthly Expenses',
    description: 'Track all monthly household expenses',
    period_type: 'monthly',
    total_amount: 3000.00,
    currency: 'USD',
    status: 'active',
    start_date: '2024-01-01',
    end_date: null,
    rollover_enabled: true,
    alert_threshold: 80,
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'budget-002',
    account_id: 'account-001',
    name: 'Grocery Budget',
    description: 'Weekly grocery spending limit',
    period_type: 'weekly',
    total_amount: 200.00,
    currency: 'USD',
    status: 'active',
    start_date: '2024-01-01',
    end_date: null,
    rollover_enabled: false,
    alert_threshold: 75,
    is_default: false,
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

  await page.route('**/api/accounts/account-001/budgets', async (route, request) => {
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ budgets: mockBudgets }),
      });
    } else if (request.method() === 'POST') {
      const body = request.postDataJSON();
      const newBudget = {
        id: 'budget-new',
        account_id: 'account-001',
        ...body,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newBudget),
      });
    } else {
      await route.continue();
    }
  });
}

test.describe('Budgets List Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('should load budgets page with heading', async ({ page }) => {
    await page.goto('/budgets');
    await page.waitForLoadState('networkidle');

    // Verify page title
    await expect(page.getByRole('heading', { name: 'Budgets' })).toBeVisible({ timeout: 10000 });
  });

  test('should display budgets in the list', async ({ page }) => {
    await page.goto('/budgets');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Budgets' })).toBeVisible({ timeout: 10000 });

    // Should display budget names from mock data
    await expect(page.getByText('Monthly Expenses')).toBeVisible();
    await expect(page.getByText('Grocery Budget')).toBeVisible();
  });

  test('should display Create Budget button', async ({ page }) => {
    await page.goto('/budgets');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Create Budget')).toBeVisible({ timeout: 10000 });
  });

  test('should handle empty budgets state', async ({ page }) => {
    // Override to return empty budgets
    await page.route('**/api/accounts/account-001/budgets', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ budgets: [] }),
      });
    });

    await page.goto('/budgets');
    await page.waitForLoadState('networkidle');

    // Verify empty state
    await expect(page.getByText(/don't have any budgets/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Budget Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);

    // Mock the budget detail endpoint
    await page.route('**/api/accounts/account-001/budgets/budget-001/detail', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...mockBudgets[0],
          total_spent: 1500.00,
          total_remaining: 1500.00,
          allocations: [],
        }),
      });
    });

    await page.route('**/api/accounts/account-001/budgets/budget-001/periods*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ periods: [] }),
      });
    });
  });

  test('should load budget detail page', async ({ page }) => {
    await page.goto('/budgets/budget-001');
    await page.waitForLoadState('networkidle');

    // Verify budget name is displayed as heading
    await expect(page.getByRole('heading', { name: 'Monthly Expenses' })).toBeVisible({ timeout: 10000 });
  });

  test('should display budget amount', async ({ page }) => {
    await page.goto('/budgets/budget-001');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Monthly Expenses' })).toBeVisible({ timeout: 10000 });

    // Verify amount is displayed
    await expect(page.getByText('$3,000.00').first()).toBeVisible();
  });

  test('should show back to budgets link', async ({ page }) => {
    await page.goto('/budgets/budget-001');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Monthly Expenses' })).toBeVisible({ timeout: 10000 });

    // Verify back link
    await expect(page.getByText('Back to Budgets')).toBeVisible();
  });

  test('should show edit button', async ({ page }) => {
    await page.goto('/budgets/budget-001');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Monthly Expenses' })).toBeVisible({ timeout: 10000 });

    // Verify edit button
    await expect(page.getByText('Edit Budget')).toBeVisible();
  });
});

test.describe('Budget Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('should navigate to create budget page', async ({ page }) => {
    await page.goto('/budgets');
    await page.waitForLoadState('networkidle');

    // Wait for content to load
    await expect(page.getByText('Create Budget')).toBeVisible({ timeout: 10000 });

    // Click create budget button
    await page.getByRole('link', { name: 'Create Budget' }).click();

    // Verify navigation
    await expect(page).toHaveURL('/budgets/new');
  });

  test('should display budget form', async ({ page }) => {
    await page.goto('/budgets/new');
    await page.waitForLoadState('networkidle');

    // Wait for form to load
    await expect(page.getByRole('heading', { name: 'Create Budget' })).toBeVisible({ timeout: 10000 });

    // Verify form exists
    await expect(page.locator('#name')).toBeVisible();
  });
});
