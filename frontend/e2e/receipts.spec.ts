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

const mockReceipts = [
  {
    id: 'receipt-001',
    account_id: 'account-001',
    file_name: 'grocery-receipt.jpg',
    mime_type: 'image/jpeg',
    file_size: 245000,
    source_type: 'upload',
    status: 'processed',
    merchant_name: 'Whole Foods Market',
    merchant_address: '123 Main St, New York, NY',
    receipt_date: '2024-01-15',
    total_amount: 87.54,
    subtotal_amount: 78.50,
    tax_amount: 9.04,
    currency: 'USD',
    payment_method: 'Credit Card',
    receipt_number: 'WF-2024-00123',
    ocr_completed: true,
    ocr_confidence: 0.95,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'receipt-002',
    account_id: 'account-001',
    file_name: 'gas-station.png',
    mime_type: 'image/png',
    file_size: 125000,
    source_type: 'email',
    status: 'pending',
    merchant_name: 'Shell Gas Station',
    receipt_date: '2024-01-20',
    total_amount: 45.00,
    currency: 'USD',
    ocr_completed: false,
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

  await page.route('**/api/admin/stores**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ stores: [], total: 0 }),
    });
  });

  await page.route('**/api/admin/stores**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ stores: [], total: 0 }),
    });
  });

  await page.route('**/api/accounts/account-001/receipts**', async (route, request) => {
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          receipts: mockReceipts,
          total: mockReceipts.length,
          page: 1,
          pageSize: 10,
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/accounts/account-001/transactions*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ transactions: [] }),
    });
  });
}

test.describe('Receipts List Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('should load receipts page with heading', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Verify page title
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });
  });

  test('should display receipts in the list', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });

    // Should display merchant names from mock data
    await expect(page.getByText('Whole Foods Market')).toBeVisible();
    await expect(page.getByText('Shell Gas Station')).toBeVisible();
  });

  test('should handle empty receipts state', async ({ page }) => {
    // Override receipts mock to return empty array
    await page.route('**/api/admin/stores**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ stores: [], total: 0 }),
      });
    });

    await page.route('**/api/accounts/account-001/receipts**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          receipts: [],
          total: 0,
          page: 1,
          pageSize: 10,
        }),
      });
    });

    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Verify empty state message
    await expect(page.getByText(/don't have any receipts/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Receipt Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);

    await page.route('**/api/accounts/account-001/receipts/receipt-001', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockReceipts[0]),
      });
    });
  });

  test('should load receipt detail page', async ({ page }) => {
    await page.goto('/receipts/receipt-001');
    await page.waitForLoadState('networkidle');

    // Verify merchant name is displayed as heading
    await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });
  });

  test('should display receipt amount', async ({ page }) => {
    await page.goto('/receipts/receipt-001');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });

    // Verify amount is displayed
    await expect(page.getByText('$87.54')).toBeVisible();
  });

  test('should show back to receipts link', async ({ page }) => {
    await page.goto('/receipts/receipt-001');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });

    // Verify back link
    await expect(page.getByText('Back to Receipts')).toBeVisible();
  });
});
