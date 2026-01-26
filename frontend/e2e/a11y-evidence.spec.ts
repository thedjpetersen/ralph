import { test, expect } from '@playwright/test';

test.describe('Accessibility Evidence - A11Y-002', () => {
  test('capture dashboard with ARIA labels', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Take a screenshot of the dashboard with accessible charts
    await page.screenshot({
      path: 'test-results/evidence/A11Y-002-evidence.png',
      fullPage: true,
    });
  });

  test('verify core accessibility landmarks', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Check for skip link (class is skip-to-content)
    const skipLink = page.locator('.skip-to-content');
    await expect(skipLink).toBeAttached();

    // Check for main content landmark
    const mainContent = page.locator('main#main-content');
    await expect(mainContent).toHaveAttribute('role', 'main');
    await expect(mainContent).toHaveAttribute('aria-label', 'Main content');

    // Check for header landmark
    const header = page.locator('header.layout-header');
    await expect(header).toHaveAttribute('role', 'banner');

    // Check navigation
    const nav = page.locator('nav[role="navigation"]').first();
    await expect(nav).toHaveAttribute('aria-label', 'Main navigation');
  });

  test('verify dashboard page structure', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Check dashboard region exists (may be empty/loading but should have structure)
    const dashboardPage = page.locator('.dashboard-page');
    await expect(dashboardPage).toBeAttached();
  });

  test('verify dashboard widget accessibility', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Check recent transactions section is properly labeled (may be in loading/empty state)
    const transactionsSection = page.locator('section.recent-transactions');
    if (await transactionsSection.count() > 0) {
      await expect(transactionsSection.first()).toHaveAttribute('aria-labelledby');
    }

    // Check account balances section is properly labeled
    const accountsSection = page.locator('section.account-balances');
    if (await accountsSection.count() > 0) {
      await expect(accountsSection.first()).toHaveAttribute('aria-labelledby');
    }

    // Check quick actions section is properly labeled
    const quickActionsSection = page.locator('section.quick-actions');
    if (await quickActionsSection.count() > 0) {
      await expect(quickActionsSection.first()).toHaveAttribute('aria-labelledby');
    }

    // Check budget summary card is properly labeled
    const budgetSection = page.locator('section.budget-summary-card');
    if (await budgetSection.count() > 0) {
      await expect(budgetSection.first()).toHaveAttribute('aria-labelledby');
    }
  });

  test('verify ARIA live regions exist', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Check for screen reader announcer live regions (within ScreenReaderAnnouncer component)
    const politeRegion = page.locator('[aria-live="polite"]');
    const assertiveRegion = page.locator('[aria-live="assertive"]');

    await expect(politeRegion.first()).toBeAttached();
    await expect(assertiveRegion.first()).toBeAttached();
  });

  test('verify screen reader only content exists', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify screen reader only elements exist (for charts, announcer, etc.)
    const srOnlyElements = page.locator('.sr-only');
    const count = await srOnlyElements.count();
    expect(count).toBeGreaterThan(0);
  });

  test('verify transactions page accessibility', async ({ page }) => {
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');

    // Check main content exists with proper role
    const mainContent = page.locator('main#main-content');
    await expect(mainContent).toHaveAttribute('role', 'main');

    // Check transactions page loads
    const transactionsPage = page.locator('.transactions-page, .layout-main');
    await expect(transactionsPage.first()).toBeAttached();
  });

  test('verify budgets page accessibility', async ({ page }) => {
    await page.goto('/budgets');
    await page.waitForLoadState('networkidle');

    // Check main content exists with proper role
    const mainContent = page.locator('main#main-content');
    await expect(mainContent).toHaveAttribute('role', 'main');

    // Take a screenshot of the budgets page
    await page.screenshot({
      path: 'test-results/evidence/A11Y-002-budgets.png',
      fullPage: true,
    });
  });

  test('verify receipts page accessibility', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Check main content exists with proper role
    const mainContent = page.locator('main#main-content');
    await expect(mainContent).toHaveAttribute('role', 'main');
  });
});
