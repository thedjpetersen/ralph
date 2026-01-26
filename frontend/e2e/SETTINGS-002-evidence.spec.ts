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

test('capture SETTINGS-002 evidence - editor preferences panel with live preview', async ({ page }) => {
  await page.addInitScript(() => {
    // Set up user and account storage
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

    // Dismiss welcome modal
    localStorage.setItem('clockzen-welcome-modal-storage', JSON.stringify({
      state: {
        hasSeenWelcome: true,
        dontShowAgain: true,
      },
      version: 0,
    }));

    // Set editor settings with custom values to show the feature
    localStorage.setItem('clockzen-app-settings', JSON.stringify({
      state: {
        settings: {
          general: { autoSave: true, autoSaveInterval: 30, startPage: 'dashboard', confirmOnExit: true },
          editor: {
            smartTypography: true,
            paragraphFocus: false,
            typewriterScroll: false,
            spellCheck: true,
            lineNumbers: false,
            wordWrap: true,
            fontSize: 18,
            fontFamily: 'georgia',
            lineHeight: 1.8,
            editorWidth: 'wide',
            tabSize: 2,
            commentSortOrder: 'newest',
          },
          ai: { enableSuggestions: true, enableRewrite: true, enableComments: true, suggestionDelay: 500, aiProvider: 'default', apiKey: '' },
          appearance: { theme: 'light', accentColor: 'blue', compactMode: false, showAnimations: true, sidebarCollapsed: false },
        },
        activeSection: 'editor',
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

  // Navigate to the editor preferences demo page
  await page.goto('/editor-preferences-demo');
  await page.waitForLoadState('networkidle');

  // Wait for page content
  await expect(page.getByRole('heading', { name: 'Editor Preferences' })).toBeVisible({ timeout: 10000 });

  // Click the Open Preferences Panel button
  await page.click('button:has-text("Open Preferences Panel")');

  // Wait for the panel to slide in
  await expect(page.locator('.slideout-panel')).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(500); // Wait for animation

  // Capture the full page with the panel open
  await page.screenshot({
    path: 'test-results/evidence/SETTINGS-002-evidence.png',
    fullPage: false
  });
});
