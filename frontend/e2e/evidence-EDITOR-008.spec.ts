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

test('EDITOR-008: Capture find and replace dialog evidence', async ({ page }) => {
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

  await page.route('**/api/accounts/account-001/transactions*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transactions: [] }) });
  });

  await page.route('**/api/accounts/account-001/products*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ products: [] }) });
  });

  await page.route('**/api/stores', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ stores: [] }) });
  });

  // Navigate to new transaction page where there's a textarea
  await page.goto('/transactions/new');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Find and fill a textarea
  const textarea = page.locator('textarea').first();
  await textarea.waitFor({ state: 'visible', timeout: 5000 });
  await textarea.click();
  await textarea.fill('Hello world! This is a test. Hello again! Hello one more time.');

  // Open find dialog with Ctrl+F (find-only mode)
  await page.keyboard.press('Control+f');
  await page.waitForTimeout(500);

  // Wait for find/replace dialog
  const dialog = page.locator('[role="dialog"][aria-label="Find and Replace"]');
  await expect(dialog).toBeVisible({ timeout: 5000 });

  // Type in search field
  await page.getByLabel('Search text').fill('Hello');
  await page.waitForTimeout(500);

  // Verify we're in find-only mode (no replace input visible)
  await expect(page.getByText('Find', { exact: true })).toBeVisible();

  // Take a screenshot of find-only mode
  await page.screenshot({
    path: 'test-results/evidence/EDITOR-008-find-mode.png',
    fullPage: false
  });

  // Click toggle button to show replace mode
  await page.locator('.find-replace-toggle-btn').click();
  await page.waitForTimeout(300);

  // Verify replace mode is now visible
  await expect(page.getByText('Find & Replace')).toBeVisible();
  await expect(page.getByLabel('Replace text')).toBeVisible();

  // Fill in replace text
  await page.getByLabel('Replace text').fill('Hi');
  await page.waitForTimeout(500);

  // Take a screenshot of replace mode
  await page.screenshot({
    path: 'test-results/evidence/EDITOR-008-evidence.png',
    fullPage: false
  });
});
