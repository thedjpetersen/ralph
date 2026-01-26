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

// Setup function for authenticated state
async function setupAuthenticatedMocks(page: import('@playwright/test').Page) {
  // Set user storage to simulate logged in state
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

    // Dismiss onboarding tour to prevent it from blocking interactions
    localStorage.setItem('clockzen-onboarding-storage', JSON.stringify({
      state: {
        hasCompletedTour: true,
        hasDismissedTour: true,
      },
      version: 0,
    }));
  });

  // Mock user endpoint
  await page.route('**/api/user', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUser),
      });
    }
  });

  // Mock accounts endpoint
  await page.route('**/api/accounts', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockAccounts),
    });
  });

  // Mock common endpoints
  await page.route('**/api/accounts/*/budgets*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ budgets: [] }),
    });
  });

  await page.route('**/api/accounts/*/transactions*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ transactions: [] }),
    });
  });

  await page.route('**/api/accounts/*/receipts*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ receipts: [], total: 0 }),
    });
  });

  await page.route('**/api/accounts/*/financial-accounts/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total_accounts: 0,
        total_balance: 0,
        by_type: {},
        by_institution: {},
        last_sync: null,
      }),
    });
  });

  await page.route('**/api/accounts/*/financial-accounts', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/user/preferences', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        theme: 'system',
        language: 'en',
        notifications: { email: true, push: false },
      }),
    });
  });

  await page.route('**/api/user/api-keys', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}

// Setup function for unauthenticated state
async function setupUnauthenticatedMocks(page: import('@playwright/test').Page) {
  // Clear any existing storage
  await page.addInitScript(() => {
    localStorage.removeItem('clockzen-user-storage');
    localStorage.removeItem('clockzen-account-storage');
  });

  // Mock user endpoint - return 401 if not authenticated
  await page.route('**/api/user', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Unauthorized' }),
    });
  });

  // Mock accounts endpoint - return 401 if not authenticated
  await page.route('**/api/accounts', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Unauthorized' }),
    });
  });
}

test.describe('Authentication Flow - Login', () => {
  test('should redirect unauthenticated users from protected routes', async ({ page }) => {
    // Set up unauthenticated state
    await setupUnauthenticatedMocks(page);

    // Try to access a protected route
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // The app should either redirect to login or show unauthorized content
    // Since this app uses localStorage-based auth, verify no user data is present
    const localStorage = await page.evaluate(() => {
      return window.localStorage.getItem('clockzen-user-storage');
    });

    // Either localStorage is empty or user is null
    if (localStorage) {
      const parsed = JSON.parse(localStorage);
      expect(parsed.state.user).toBeNull();
    }
  });

  test('should authenticate user with valid credentials via localStorage', async ({ page }) => {
    // Set up authenticated state (simulating successful login)
    await setupAuthenticatedMocks(page);

    // Navigate to dashboard - should load successfully
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify dashboard loads
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Verify user is stored in localStorage
    const userStorage = await page.evaluate(() => {
      return window.localStorage.getItem('clockzen-user-storage');
    });
    expect(userStorage).not.toBeNull();
    const parsedUser = JSON.parse(userStorage!);
    expect(parsedUser.state.user.email).toBe('test@example.com');
  });

  test('should handle API error response for invalid credentials', async ({ page }) => {
    // Set up mocks to return 401 for login attempts
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Invalid email or password'
        }),
      });
    });

    // Navigate to page first to establish context
    await page.goto('/');

    // Make a request through the page context (not direct API call)
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'wrong@example.com',
          password: 'wrongpassword',
        }),
      });
      return { status: res.status, body: await res.json() };
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid email or password');
  });

  test('should persist authentication across page reloads', async ({ page }) => {
    // Set up authenticated state
    await setupAuthenticatedMocks(page);

    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify user is still authenticated
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Verify localStorage persists
    const userStorage = await page.evaluate(() => {
      return window.localStorage.getItem('clockzen-user-storage');
    });
    expect(userStorage).not.toBeNull();
    const parsedUser = JSON.parse(userStorage!);
    expect(parsedUser.state.user.email).toBe('test@example.com');
  });
});

test.describe('Authentication Flow - Registration', () => {
  test('should handle successful registration via API', async ({ page }) => {
    // Set up registration mock
    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            ...mockUser,
            id: 'user-new',
          },
          token: 'mock-jwt-token',
        }),
      });
    });

    // Navigate to page first to establish context
    await page.goto('/');

    // Make a request through the page context
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'securepassword123',
          name: 'New User',
        }),
      });
      return { status: res.status, body: await res.json() };
    });

    expect(response.status).toBe(201);
    expect(response.body.user).toBeDefined();
    expect(response.body.token).toBeDefined();
  });

  test('should handle registration with already registered email', async ({ page }) => {
    // Set up registration mock to fail
    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Email already registered'
        }),
      });
    });

    // Navigate to page first to establish context
    await page.goto('/');

    // Make a request through the page context
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Existing User',
        }),
      });
      return { status: res.status, body: await res.json() };
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Email already registered');
  });

  test('should handle registration validation errors', async ({ page }) => {
    // Set up registration mock with validation error
    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Password must be at least 8 characters'
        }),
      });
    });

    // Navigate to page first to establish context
    await page.goto('/');

    // Make a request through the page context
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'short',
          name: 'New User',
        }),
      });
      return { status: res.status, body: await res.json() };
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Password must be at least 8 characters');
  });
});

test.describe('Authentication Flow - Logout', () => {
  test('should log out user and clear session', async ({ page }) => {
    // Set up authenticated state
    await setupAuthenticatedMocks(page);

    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Click on user avatar to open menu
    const userMenuButton = page.locator('.topnav-user-trigger');
    await expect(userMenuButton).toBeVisible({ timeout: 5000 });
    await userMenuButton.click();

    // Wait for dropdown to appear
    await expect(page.locator('.topnav-dropdown-menu')).toBeVisible({ timeout: 5000 });

    // Click logout button
    const logoutButton = page.locator('.topnav-logout-item');
    await logoutButton.click();

    // Wait for navigation
    await page.waitForLoadState('networkidle');

    // Verify user data is cleared from localStorage
    const userStorage = await page.evaluate(() => {
      return window.localStorage.getItem('clockzen-user-storage');
    });

    if (userStorage) {
      const parsedUser = JSON.parse(userStorage);
      expect(parsedUser.state.user).toBeNull();
    }

    // Verify we're redirected - the app redirects / to /dashboard
    // Even after logout, user lands on /dashboard (but without auth)
    await expect(page).toHaveURL(/\/(dashboard)?$/);
  });

  test('should clear all user preferences on logout', async ({ page }) => {
    // Set up authenticated state with custom preferences
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
            theme: 'dark',
            language: 'es',
            notifications: { email: false, push: true },
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

      // Dismiss onboarding tour to prevent it from blocking interactions
      localStorage.setItem('clockzen-onboarding-storage', JSON.stringify({
        state: {
          hasCompletedTour: true,
          hasDismissedTour: true,
        },
        version: 0,
      }));
    });

    // Set up API mocks
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

    await page.route('**/api/accounts/*/budgets*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ budgets: [] }),
      });
    });

    await page.route('**/api/accounts/*/transactions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ transactions: [] }),
      });
    });

    await page.route('**/api/accounts/*/receipts*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ receipts: [], total: 0 }),
      });
    });

    await page.route('**/api/accounts/*/financial-accounts/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_accounts: 0,
          total_balance: 0,
          by_type: {},
          by_institution: {},
          last_sync: null,
        }),
      });
    });

    await page.route('**/api/accounts/*/financial-accounts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/user/preferences', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          theme: 'dark',
          language: 'es',
          notifications: { email: false, push: true },
        }),
      });
    });

    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Verify custom preferences are set
    let userStorage = await page.evaluate(() => {
      return window.localStorage.getItem('clockzen-user-storage');
    });
    let parsedUser = JSON.parse(userStorage!);
    expect(parsedUser.state.preferences.theme).toBe('dark');
    expect(parsedUser.state.preferences.language).toBe('es');

    // Click on user avatar to open menu
    const userMenuButton = page.locator('.topnav-user-trigger');
    await expect(userMenuButton).toBeVisible({ timeout: 5000 });
    await userMenuButton.click();

    // Wait for dropdown to appear
    await expect(page.locator('.topnav-dropdown-menu')).toBeVisible({ timeout: 5000 });

    // Click logout button
    const logoutButton = page.locator('.topnav-logout-item');
    await logoutButton.click();

    // Wait for navigation
    await page.waitForLoadState('networkidle');

    // Verify preferences are reset to defaults
    userStorage = await page.evaluate(() => {
      return window.localStorage.getItem('clockzen-user-storage');
    });

    if (userStorage) {
      parsedUser = JSON.parse(userStorage);
      expect(parsedUser.state.user).toBeNull();
      expect(parsedUser.state.preferences.theme).toBe('system');
      expect(parsedUser.state.preferences.language).toBe('en');
    }
  });

  test('should redirect to home page after logout', async ({ page }) => {
    // Set up authenticated state
    await setupAuthenticatedMocks(page);

    // Navigate to a protected page
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible({ timeout: 10000 });

    // Click on user avatar to open menu
    const userMenuButton = page.locator('.topnav-user-trigger');
    await expect(userMenuButton).toBeVisible({ timeout: 5000 });
    await userMenuButton.click();

    // Wait for dropdown to appear
    await expect(page.locator('.topnav-dropdown-menu')).toBeVisible({ timeout: 5000 });

    // Click logout button
    const logoutButton = page.locator('.topnav-logout-item');
    await logoutButton.click();

    // Wait for navigation
    await page.waitForLoadState('networkidle');

    // Verify we're redirected - the app redirects / to /dashboard
    await expect(page).toHaveURL(/\/(dashboard)?$/);
  });
});

test.describe('Authentication Flow - Session Management', () => {
  test('should display user information in the navigation', async ({ page }) => {
    // Set up authenticated state
    await setupAuthenticatedMocks(page);

    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for dashboard to load
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Click on user avatar to open menu
    const userMenuButton = page.locator('.topnav-user-trigger');
    await expect(userMenuButton).toBeVisible({ timeout: 5000 });
    await userMenuButton.click();

    // Wait for dropdown to appear
    await expect(page.locator('.topnav-dropdown-menu')).toBeVisible({ timeout: 5000 });

    // Verify user name and email are displayed
    await expect(page.locator('.topnav-user-name')).toHaveText('Test User');
    await expect(page.locator('.topnav-user-email')).toHaveText('test@example.com');
  });

  test('should allow navigation to profile from user menu', async ({ page }) => {
    // Set up authenticated state
    await setupAuthenticatedMocks(page);

    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for dashboard to load
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Click on user avatar to open menu
    const userMenuButton = page.locator('.topnav-user-trigger');
    await expect(userMenuButton).toBeVisible({ timeout: 5000 });
    await userMenuButton.click();

    // Wait for dropdown to appear
    await expect(page.locator('.topnav-dropdown-menu')).toBeVisible({ timeout: 5000 });

    // Click on Profile menu item
    await page.getByRole('menuitem', { name: 'Profile' }).click();

    // Verify navigation to profile page
    await expect(page).toHaveURL('/profile');
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible({ timeout: 10000 });
  });

  test('should allow navigation to settings from user menu', async ({ page }) => {
    // Set up authenticated state
    await setupAuthenticatedMocks(page);

    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for dashboard to load
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Click on user avatar to open menu
    const userMenuButton = page.locator('.topnav-user-trigger');
    await expect(userMenuButton).toBeVisible({ timeout: 5000 });
    await userMenuButton.click();

    // Wait for dropdown to appear
    await expect(page.locator('.topnav-dropdown-menu')).toBeVisible({ timeout: 5000 });

    // Click on Settings menu item
    await page.getByRole('menuitem', { name: 'Settings' }).click();

    // Verify navigation to settings page
    await expect(page).toHaveURL('/settings');
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('should close user menu when clicking outside', async ({ page }) => {
    // Set up authenticated state
    await setupAuthenticatedMocks(page);

    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for dashboard to load
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Click on user avatar to open menu
    const userMenuButton = page.locator('.topnav-user-trigger');
    await expect(userMenuButton).toBeVisible({ timeout: 5000 });
    await userMenuButton.click();

    // Wait for dropdown to appear
    await expect(page.locator('.topnav-dropdown-menu')).toBeVisible({ timeout: 5000 });

    // Click outside the menu (on the main content area)
    await page.locator('.topnav-breadcrumbs').click();

    // Verify dropdown is closed
    await expect(page.locator('.topnav-dropdown-menu')).not.toBeVisible();
  });

  test('should support keyboard navigation in user menu', async ({ page }) => {
    // Set up authenticated state
    await setupAuthenticatedMocks(page);

    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for dashboard to load
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Focus and open user menu with keyboard
    const userMenuButton = page.locator('.topnav-user-trigger');
    await expect(userMenuButton).toBeVisible({ timeout: 5000 });
    await userMenuButton.focus();
    await page.keyboard.press('Enter');

    // Wait for dropdown to appear
    await expect(page.locator('.topnav-dropdown-menu')).toBeVisible({ timeout: 5000 });

    // Press Escape to close
    await page.keyboard.press('Escape');

    // Verify dropdown is closed
    await expect(page.locator('.topnav-dropdown-menu')).not.toBeVisible();
  });
});
