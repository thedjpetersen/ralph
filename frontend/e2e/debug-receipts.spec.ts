import { test } from '@playwright/test';

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
];

test('debug receipts page', async ({ page }) => {
  // Track all API calls
  const apiCalls: string[] = [];

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
  });

  // Log all API requests
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      apiCalls.push(request.url());
      console.log('API Request:', request.url());
    }
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
    console.log('Intercepted stores request:', route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ stores: [], total: 0 }),
    });
  });

  await page.route('**/api/accounts/account-001/receipts**', async (route) => {
    console.log('Intercepted receipts request:', route.request().url());
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
  });

  await page.goto('/receipts');
  await page.waitForLoadState('networkidle');

  // Wait a bit for any delayed API calls
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'test-results/evidence/debug-receipts.png', fullPage: true });

  const headings = await page.locator('h1, h2').allTextContents();
  console.log('Headings found:', headings);

  const allText = await page.locator('body').textContent();
  console.log('Body text (first 1000 chars):', allText?.substring(0, 1000));

  console.log('API calls made:', apiCalls);
});
