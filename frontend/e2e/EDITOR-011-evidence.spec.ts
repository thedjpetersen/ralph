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

test('capture EDITOR-011 evidence - block drag handles', async ({ page }) => {
  // Set up user and account storage
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
        preferences: { theme: 'light', language: 'en', notifications: { email: true, push: false } },
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

    // Dismiss onboarding tour
    localStorage.setItem('clockzen-onboarding-storage', JSON.stringify({
      state: {
        hasCompletedTour: true,
        hasDismissedTour: true,
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

  await page.goto('/block-drag-demo');
  await page.waitForLoadState('networkidle');

  // Wait for page to load
  await expect(page.getByRole('heading', { name: 'Block-Level Drag & Drop' })).toBeVisible({ timeout: 10000 });

  // Wait a bit for any animations
  await page.waitForTimeout(500);

  // Scroll so the block editor is in view
  await page.evaluate(() => {
    const blockEditor = document.querySelector('.block-editor-container');
    if (blockEditor) {
      blockEditor.scrollIntoView({ behavior: 'instant', block: 'center' });
    }
  });

  await page.waitForTimeout(300);

  // Hover over a heading block wrapper to reveal the drag handle
  const headingBlock = page.locator('.block-wrapper-heading').first();
  if (await headingBlock.isVisible()) {
    await headingBlock.hover();
    await page.waitForTimeout(500);
  }

  await page.screenshot({
    path: 'test-results/evidence/EDITOR-011-evidence.png',
    fullPage: false
  });
});
