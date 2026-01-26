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

const mockLineItems = {
  line_items: [
    {
      id: 'li-001',
      transaction_id: 'txn-001',
      name: 'Organic Produce',
      quantity: 1,
      unit_price: 45.50,
      total_price: 45.50,
    },
    {
      id: 'li-002',
      transaction_id: 'txn-001',
      name: 'Dairy Products',
      quantity: 1,
      unit_price: 35.00,
      total_price: 35.00,
    },
  ],
};

// Simulated streaming AI response
const aiResponseText = 'This transaction at Whole Foods Market for $125.50 appears to be a regular grocery purchase. Based on your spending patterns, this is consistent with your typical weekly grocery budget. Consider using the store\'s loyalty program for additional savings.';

test('capture AI-001 evidence - AI comment streaming display', async ({ page }) => {
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

  await page.route('**/api/accounts/account-001/transactions/txn-001/line-items', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockLineItems) });
  });

  // Mock AI comment streaming endpoint with character-by-character streaming
  await page.route('**/api/ai/comment', async (route) => {
    // Create a streaming response that sends characters one by one
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];

    for (const char of aiResponseText) {
      chunks.push(encoder.encode(char));
    }

    // Return the full response (Playwright doesn't easily support true streaming)
    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: aiResponseText,
    });
  });

  // Navigate to transaction detail page
  await page.goto('/transactions/txn-001');
  await page.waitForLoadState('networkidle');

  // Wait for the page to load
  await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });

  // Screenshot 1: Initial state with "Get AI Insight" button
  await page.screenshot({
    path: 'test-results/evidence/AI-001-evidence-1-initial.png',
    fullPage: false
  });

  // Click the AI insight button
  const aiButton = page.getByRole('button', { name: 'Generate AI insight' });
  await expect(aiButton).toBeVisible();
  await aiButton.click();

  // Wait for the AI comment card to appear
  await expect(page.getByText('AI Insight')).toBeVisible({ timeout: 5000 });

  // Wait briefly for streaming animation
  await page.waitForTimeout(500);

  // Screenshot 2: Streaming state (card visible with content)
  await page.screenshot({
    path: 'test-results/evidence/AI-001-evidence-2-streaming.png',
    fullPage: false
  });

  // Wait for streaming to complete (response arrives)
  await expect(page.getByText(/This transaction at Whole Foods/)).toBeVisible({ timeout: 5000 });

  // Screenshot 3: Completed state with full response and action buttons
  await page.screenshot({
    path: 'test-results/evidence/AI-001-evidence.png',
    fullPage: false
  });
});

test('capture AI-001 evidence - AI comment cancel functionality', async ({ page }) => {
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

  await page.route('**/api/accounts/account-001/transactions/txn-001/line-items', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockLineItems) });
  });

  // Mock AI comment endpoint with a delayed response to allow cancel testing
  await page.route('**/api/ai/comment', async (route) => {
    // Delay the response to simulate streaming
    await new Promise(resolve => setTimeout(resolve, 2000));
    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: aiResponseText,
    });
  });

  // Navigate to transaction detail page
  await page.goto('/transactions/txn-001');
  await page.waitForLoadState('networkidle');

  // Wait for the page to load
  await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });

  // Click the AI insight button
  const aiButton = page.getByRole('button', { name: 'Generate AI insight' });
  await aiButton.click();

  // Wait for streaming state with cancel button
  await expect(page.getByRole('button', { name: 'Cancel generation' })).toBeVisible({ timeout: 3000 });

  // Screenshot: Cancel button visible during streaming
  await page.screenshot({
    path: 'test-results/evidence/AI-001-evidence-cancel.png',
    fullPage: false
  });
});
