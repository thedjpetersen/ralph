import { test } from '@playwright/test';

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
  {
    id: 'receipt-003',
    account_id: 'account-001',
    file_name: 'restaurant-bill.pdf',
    mime_type: 'application/pdf',
    file_size: 312000,
    source_type: 'scan',
    status: 'failed',
    merchant_name: 'Italian Bistro',
    receipt_date: '2024-01-22',
    total_amount: 156.78,
    currency: 'USD',
    ocr_completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

async function setupMocks(page: import('@playwright/test').Page) {
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
        preferences: {
          theme: 'system',
          language: 'en',
          notifications: { email: true, push: false },
        },
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

    localStorage.setItem('clockzen-onboarding-storage', JSON.stringify({
      state: {
        hasCompletedTour: true,
        hasDismissedTour: true,
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

test('capture receipts page evidence', async ({ page }) => {
  await setupMocks(page);

  await page.goto('/receipts');
  await page.waitForLoadState('networkidle');

  // Wait for page content to load
  await page.waitForSelector('.receipts-page', { timeout: 10000 });

  await page.screenshot({
    path: './test-results/evidence/test-002-evidence.png',
    fullPage: false,
  });
});
