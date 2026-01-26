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

const mockStore = {
  id: 'store-001',
  name: 'Whole Foods Market',
  normalized_name: 'whole_foods_market',
  display_name: 'Whole Foods Market',
  type: 'grocery',
  status: 'active',
  description: 'Premium natural and organic foods retailer.',
  website: 'https://www.wholefoodsmarket.com',
  email: 'contact@wholefoodsmarket.com',
  phone: '1-800-123-4567',
  address: {
    street1: '123 Main Street',
    city: 'Austin',
    state: 'TX',
    postal_code: '78701',
    country: 'USA',
    latitude: 30.2672,
    longitude: -97.7431,
  },
  category_id: 'cat-grocery',
  tags: ['organic', 'grocery', 'premium'],
  aliases: ['Whole Foods', 'WFM'],
  receipt_patterns: ['WHOLE FOODS.*', 'WFM\\s*#\\d+'],
  match_count: 47,
  merge_count: 3,
  transaction_count: 52,
  total_spent: 4567.89,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T12:30:00Z',
};

const mockStores = {
  stores: [mockStore],
  total: 1,
};

const mockReceipts = [
  {
    id: 'receipt-001',
    user_id: 'user-001',
    source_type: 'upload',
    status: 'processed',
    file_name: 'receipt-2024-01-15.pdf',
    merchant_name: 'Whole Foods Market',
    total_amount: 125.50,
    currency: 'USD',
    receipt_date: '2024-01-15',
    store_id: 'store-001',
    store_name: 'Whole Foods Market',
    extracted_data: {
      extracted_fields: {
        line_items: [
          { description: 'Organic Bananas', quantity: 2, unit_price: 1.99, total_price: 3.98 },
          { description: 'Almond Milk', quantity: 1, unit_price: 4.99, total_price: 4.99 },
          { description: 'Organic Spinach', quantity: 1, unit_price: 5.99, total_price: 5.99 },
        ],
      },
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'receipt-002',
    user_id: 'user-001',
    source_type: 'email',
    status: 'processed',
    file_name: 'wf-receipt-jan10.pdf',
    merchant_name: 'Whole Foods Market',
    total_amount: 89.99,
    currency: 'USD',
    receipt_date: '2024-01-10',
    store_id: 'store-001',
    store_name: 'Whole Foods Market',
    extracted_data: {
      extracted_fields: {
        line_items: [
          { description: 'Organic Bananas', quantity: 3, unit_price: 1.99, total_price: 5.97 },
          { description: 'Greek Yogurt', quantity: 2, unit_price: 6.99, total_price: 13.98 },
        ],
      },
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'receipt-003',
    user_id: 'user-001',
    source_type: 'scan',
    status: 'processed',
    file_name: 'wf-dec28.jpg',
    merchant_name: 'Whole Foods Market',
    total_amount: 156.23,
    currency: 'USD',
    receipt_date: '2023-12-28',
    store_id: 'store-001',
    store_name: 'Whole Foods Market',
    extracted_data: {
      extracted_fields: {
        line_items: [
          { description: 'Almond Milk', quantity: 2, unit_price: 4.99, total_price: 9.98 },
          { description: 'Organic Chicken', quantity: 1, unit_price: 24.99, total_price: 24.99 },
        ],
      },
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

test('capture store-002 evidence - StoreDetail page', async ({ page }) => {
  // Set up authentication in localStorage
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

  // Mock API routes
  await page.route('**/api/user', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockUser) });
  });

  await page.route('**/api/accounts', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAccounts) });
  });

  await page.route('**/api/admin/stores', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockStores) });
  });

  await page.route('**/api/admin/stores/store-001', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockStore) });
  });

  await page.route('**/api/accounts/account-001/receipts*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ receipts: mockReceipts, total: mockReceipts.length }),
    });
  });

  // Navigate to the store detail page
  await page.goto('/stores/store-001');
  await page.waitForLoadState('networkidle');

  // Wait for the store detail page to load
  await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });

  // Close onboarding dialog if present
  const skipButton = page.getByRole('button', { name: 'Skip' });
  if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skipButton.click();
    await page.waitForTimeout(300);
  }

  // Wait for spending summary section to be visible
  await expect(page.getByText('Spending Summary')).toBeVisible({ timeout: 5000 });

  // Wait for recent transactions section
  await expect(page.getByText('Recent Transactions')).toBeVisible({ timeout: 5000 });

  // Wait a moment for any animations
  await page.waitForTimeout(500);

  // Capture the full-page screenshot
  await page.screenshot({
    path: 'test-results/evidence/store-002-evidence.png',
    fullPage: true,
  });
});
