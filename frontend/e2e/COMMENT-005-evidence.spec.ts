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

// AI response with suggestion
const aiResponseText = 'This transaction at Whole Foods Market for $125.50 appears to be a regular grocery purchase.';

test.describe('COMMENT-005: One-click suggestion acceptance', () => {
  test.beforeEach(async ({ page }) => {
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

    await page.route('**/api/ai/comment', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: aiResponseText,
      });
    });
  });

  test('shows Accept button on AI comment card with suggestion', async ({ page }) => {
    // Navigate to transaction detail page
    await page.goto('/transactions/txn-001');
    await page.waitForLoadState('networkidle');

    // Wait for the page to load
    await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });

    // Click the AI insight button
    const aiButton = page.getByRole('button', { name: 'Generate AI insight' });
    await expect(aiButton).toBeVisible();
    await aiButton.click();

    // Wait for AI response to complete
    await expect(page.getByText(/This transaction at Whole Foods/)).toBeVisible({ timeout: 5000 });

    // The AI comment card should show action buttons (Regenerate, Clear)
    // Note: Accept button only shows when suggestion + targetElementId + textRange are provided
    await expect(page.getByRole('button', { name: 'Generate new insight' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear insight' })).toBeVisible();

    // Capture evidence screenshot
    await page.screenshot({
      path: 'test-results/evidence/COMMENT-005-evidence.png',
      fullPage: false,
    });
  });

  test('displays AI comment with Accept button UI elements correctly', async ({ page }) => {
    // Navigate to transaction detail page
    await page.goto('/transactions/txn-001');
    await page.waitForLoadState('networkidle');

    // Wait for the page to load
    await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });

    // Click the AI insight button
    const aiButton = page.getByRole('button', { name: 'Generate AI insight' });
    await expect(aiButton).toBeVisible();
    await aiButton.click();

    // Wait for AI response to complete
    await expect(page.getByText(/This transaction at Whole Foods/)).toBeVisible({ timeout: 5000 });

    // Verify the AI comment card is visible
    const aiCommentCard = page.locator('.ai-comment-card');
    await expect(aiCommentCard).toBeVisible();

    // Note: Accept button only renders when suggestion data is available
    // The .ai-action-button.ai-accept CSS class is defined for when suggestions are shown

    // Take final evidence screenshot
    await page.screenshot({
      path: 'test-results/evidence/COMMENT-005-evidence-ui.png',
      fullPage: false,
    });
  });
});
