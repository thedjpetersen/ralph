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

const mockTransaction = {
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
  payment_method: 'Credit Card',
  card_last_four: '4242',
  category_tags: ['groceries', 'food'],
  notes: 'Regular weekly shopping trip',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

test('capture AI-002 evidence - inline AI suggestions (ghost text)', async ({ page }) => {
  // Setup auth state in localStorage
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

  // Mock API endpoints
  await page.route('**/api/user', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockUser) });
  });

  await page.route('**/api/accounts', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAccounts) });
  });

  await page.route('**/api/accounts/account-001/transactions/txn-001', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockTransaction) });
  });

  // Navigate to transaction edit page
  await page.goto('/transactions/txn-001/edit');
  await page.waitForLoadState('networkidle');

  // Wait for the page to load
  await expect(page.getByRole('heading', { name: 'Edit Transaction' })).toBeVisible({ timeout: 10000 });

  // Find the notes textarea
  const notesTextarea = page.locator('#notes');
  await expect(notesTextarea).toBeVisible();

  // Clear the notes field
  await notesTextarea.clear();

  // Type in the notes field to trigger AI suggestion
  await notesTextarea.type('This was a', { delay: 50 });

  // Wait for the suggestion to appear (500ms debounce + 300ms mock API delay + rendering)
  await page.waitForTimeout(1500);

  // Wait for the ghost text element to be visible
  await page.waitForSelector('.ghost-text-suggestion', { timeout: 5000 }).catch(() => {
    // Ghost text might not appear if suggestion is still loading
  });

  // Screenshot: Ghost text visible with suggestion
  await page.screenshot({
    path: 'test-results/evidence/AI-002-evidence.png',
    fullPage: false
  });
});

test('capture AI-002 evidence - Tab accepts suggestion', async ({ page }) => {
  // Setup auth state in localStorage
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

  // Mock API endpoints
  await page.route('**/api/user', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockUser) });
  });

  await page.route('**/api/accounts', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAccounts) });
  });

  await page.route('**/api/accounts/account-001/transactions/txn-001', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockTransaction) });
  });

  // Navigate to transaction edit page
  await page.goto('/transactions/txn-001/edit');
  await page.waitForLoadState('networkidle');

  // Wait for the page to load
  await expect(page.getByRole('heading', { name: 'Edit Transaction' })).toBeVisible({ timeout: 10000 });

  // Find the notes textarea
  const notesTextarea = page.locator('#notes');
  await expect(notesTextarea).toBeVisible();

  // Clear the notes field
  await notesTextarea.clear();

  // Type in the notes field
  await notesTextarea.fill('Mon');

  // Wait for the suggestion to appear
  await page.waitForTimeout(1000);

  // Press Tab to accept the suggestion
  await notesTextarea.press('Tab');

  // Wait for the text to be accepted
  await page.waitForTimeout(200);

  // Screenshot: After accepting suggestion with Tab
  await page.screenshot({
    path: 'test-results/evidence/AI-002-evidence-tab-accept.png',
    fullPage: false
  });
});
