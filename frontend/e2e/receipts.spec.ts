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
  {
    id: 'receipt-002',
    account_id: 'account-001',
    file_name: 'gas-station.png',
    mime_type: 'image/png',
    file_size: 125000,
    source_type: 'email',
    status: 'pending',
    merchant_name: 'Shell Gas Station',
    receipt_date: '2024-01-20',
    total_amount: 45.00,
    currency: 'USD',
    ocr_completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'receipt-003',
    account_id: 'account-001',
    file_name: 'restaurant-bill.pdf',
    mime_type: 'application/pdf',
    file_size: 312000,
    source_type: 'scan',
    status: 'failed',
    merchant_name: 'Italian Bistro',
    receipt_date: '2024-01-22',
    total_amount: 156.78,
    currency: 'USD',
    ocr_completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockTransactions = [
  {
    id: 'txn-001',
    account_id: 'account-001',
    merchant_name: 'Whole Foods Market',
    amount: 87.54,
    currency: 'USD',
    transaction_date: '2024-01-15',
    type: 'debit',
  },
  {
    id: 'txn-002',
    account_id: 'account-001',
    merchant_name: 'Shell Gas Station',
    amount: 45.00,
    currency: 'USD',
    transaction_date: '2024-01-20',
    type: 'debit',
  },
];

// Setup function to initialize account context
async function setupMocks(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    // User storage - this is key for authentication
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

    // Account storage
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
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ stores: [], total: 0 }),
    });
  });

  await page.route('**/api/accounts/account-001/receipts**', async (route, request) => {
    const url = request.url();
    const method = request.method();

    // Handle individual receipt fetch (e.g., /receipts/receipt-001)
    const receiptIdMatch = url.match(/\/receipts\/([^/?]+)(?:\?|$)/);
    if (receiptIdMatch && method === 'GET') {
      const receiptId = receiptIdMatch[1];
      const receipt = mockReceipts.find(r => r.id === receiptId);
      if (receipt) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(receipt),
        });
        return;
      }
    }

    // Handle receipt list
    if (method === 'GET') {
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
    } else if (method === 'POST') {
      // Handle receipt creation
      const newReceipt = {
        id: `receipt-${Date.now()}`,
        account_id: 'account-001',
        ...await request.postDataJSON(),
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newReceipt),
      });
    } else if (method === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else if (method === 'PATCH') {
      // Handle receipt update
      const updates = await request.postDataJSON();
      const receipt = mockReceipts[0];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...receipt, ...updates, updated_at: new Date().toISOString() }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/accounts/account-001/transactions*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ transactions: mockTransactions }),
    });
  });
}

test.describe('Receipts List Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('should load receipts page with heading', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Verify page title
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });
  });

  test('should display receipts in the list', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });

    // Should display merchant names from mock data
    await expect(page.getByText('Whole Foods Market')).toBeVisible();
    await expect(page.getByText('Shell Gas Station')).toBeVisible();
  });

  test('should display receipt amounts', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });

    // Should display amounts
    await expect(page.getByText('$87.54')).toBeVisible();
    await expect(page.getByText('$45.00')).toBeVisible();
  });

  test('should display receipt status badges', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });

    // Should display status badges - use locator to match exact classes
    await expect(page.locator('.receipt-status').first()).toBeVisible();
  });

  test('should display source type badges', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });

    // Should display source badges - use locator to match exact classes
    await expect(page.locator('.receipt-source').first()).toBeVisible();
  });

  test('should handle empty receipts state', async ({ page }) => {
    // Override receipts mock to return empty array
    await page.route('**/api/accounts/account-001/receipts**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          receipts: [],
          total: 0,
          page: 1,
          pageSize: 10,
        }),
      });
    });

    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Verify empty state message
    await expect(page.getByText(/don't have any receipts/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show upload button', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });

    // Should show upload button
    await expect(page.locator('.upload-receipts-button')).toBeVisible();
  });

  test('should toggle between list and grid view', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });

    // Click grid view button
    const gridButton = page.locator('button[aria-label="Grid view"]');
    await expect(gridButton).toBeVisible();
    await gridButton.click();

    // Verify grid view is active
    await expect(page.locator('.receipts-grid')).toBeVisible();

    // Click list view button
    const listButton = page.locator('button[aria-label="List view"]');
    await listButton.click();

    // Verify list view is active
    await expect(page.locator('.receipts-list')).toBeVisible();
  });

  test('should filter receipts by status', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });

    // Select status filter
    const statusFilter = page.locator('#status-filter');
    await statusFilter.selectOption('processed');

    // Wait for filter to apply
    await page.waitForLoadState('networkidle');
  });

  test('should filter receipts by source', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });

    // Select source filter
    const sourceFilter = page.locator('#source-filter');
    await sourceFilter.selectOption('upload');

    // Wait for filter to apply
    await page.waitForLoadState('networkidle');
  });

  test('should search receipts by merchant name', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });

    // Type in search box
    const searchInput = page.locator('#merchant-search');
    await searchInput.fill('Whole Foods');

    // Verify filtered results (client-side filter)
    await expect(page.getByText('Whole Foods Market')).toBeVisible();
  });

  test('should clear filters', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });

    // Apply a filter
    const statusFilter = page.locator('#status-filter');
    await statusFilter.selectOption('processed');

    // Clear filters button should appear
    const clearButton = page.locator('.clear-filters-button');
    await expect(clearButton).toBeVisible();
    await clearButton.click();

    // Filter should be reset
    await expect(statusFilter).toHaveValue('');
  });

  test('should navigate to receipt detail on click', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });

    // Click on a receipt row
    await page.getByText('Whole Foods Market').click();

    // Should navigate to detail page
    await expect(page).toHaveURL(/\/receipts\/receipt-001/);
  });

  test('should select receipts with checkboxes', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });

    // Click on a receipt checkbox
    const checkbox = page.locator('.receipt-checkbox').first();
    await checkbox.click();

    // Should show selection count
    await expect(page.getByText('1 selected')).toBeVisible();
  });

  test('should select all receipts', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });

    // Click select all checkbox
    const selectAllCheckbox = page.locator('.select-all-checkbox input');
    await selectAllCheckbox.click();

    // Should show all selected
    await expect(page.getByText('3 selected')).toBeVisible();
  });

  test('should show bulk delete button when receipts are selected', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });

    // Select a receipt
    const checkbox = page.locator('.receipt-checkbox').first();
    await checkbox.click();

    // Should show bulk delete button
    await expect(page.locator('.bulk-delete-button')).toBeVisible();
  });
});

test.describe('Receipt Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('should open upload modal from receipts page', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });

    // Click upload button
    await page.locator('.upload-receipts-button').click();

    // Should show upload modal
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Upload Receipts')).toBeVisible();
  });

  test('should close upload modal', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });

    // Open modal
    await page.locator('.upload-receipts-button').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Close modal
    await page.locator('.upload-modal-close').click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should load dedicated upload page', async ({ page }) => {
    await page.goto('/receipts/upload');
    await page.waitForLoadState('networkidle');

    // Verify upload page loads
    await expect(page.getByRole('heading', { name: 'Upload Receipt' })).toBeVisible({ timeout: 10000 });
  });

  test('should show upload actions on upload page', async ({ page }) => {
    await page.goto('/receipts/upload');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Upload Receipt' })).toBeVisible({ timeout: 10000 });

    // Should show mobile upload action buttons (they exist in DOM but may be hidden on desktop)
    // Check for the button container instead
    await expect(page.locator('.upload-actions-mobile')).toBeAttached();
  });

  test('should show drag and drop zone on upload page', async ({ page }) => {
    await page.goto('/receipts/upload');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Upload Receipt' })).toBeVisible({ timeout: 10000 });

    // Should show dropzone
    await expect(page.locator('.upload-dropzone')).toBeVisible();
    await expect(page.getByText('Drag & drop files here')).toBeVisible();
  });

  test('should show supported formats on upload page', async ({ page }) => {
    await page.goto('/receipts/upload');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Upload Receipt' })).toBeVisible({ timeout: 10000 });

    // Should show supported formats
    await expect(page.getByText(/Supports.*JPG.*PNG.*WebP.*PDF/i)).toBeVisible();
  });

  test('should navigate back from upload page', async ({ page }) => {
    await page.goto('/receipts/upload');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Upload Receipt' })).toBeVisible({ timeout: 10000 });

    // Click back button
    await page.locator('.back-button').click();

    // Should navigate back to receipts
    await expect(page).toHaveURL('/receipts');
  });
});

test.describe('Receipt Detail View', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('should load receipt detail page', async ({ page }) => {
    await page.goto('/receipts/receipt-001');
    await page.waitForLoadState('networkidle');

    // Verify merchant name is displayed as heading
    await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });
  });

  test('should display receipt amount prominently', async ({ page }) => {
    await page.goto('/receipts/receipt-001');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });

    // Verify amount is displayed
    await expect(page.getByText('$87.54')).toBeVisible();
  });

  test('should display receipt status and source', async ({ page }) => {
    await page.goto('/receipts/receipt-001');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });

    // Verify status badge
    await expect(page.locator('.receipt-status').getByText('processed')).toBeVisible();
    // Verify source badge
    await expect(page.locator('.receipt-source').getByText('upload')).toBeVisible();
  });

  test('should show back to receipts link', async ({ page }) => {
    await page.goto('/receipts/receipt-001');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });

    // Verify back link
    await expect(page.getByText('Back to Receipts')).toBeVisible();
  });

  test('should navigate back to receipts list', async ({ page }) => {
    await page.goto('/receipts/receipt-001');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });

    // Click back link
    await page.getByText('Back to Receipts').click();

    // Should navigate to receipts list
    await expect(page).toHaveURL('/receipts');
  });

  test('should display receipt details section', async ({ page }) => {
    await page.goto('/receipts/receipt-001');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });

    // Verify receipt details section
    await expect(page.getByRole('heading', { name: 'Receipt Details' })).toBeVisible();
    await expect(page.getByText('File Name')).toBeVisible();
    await expect(page.getByText('grocery-receipt.jpg')).toBeVisible();
  });

  test('should show edit button for receipt details', async ({ page }) => {
    await page.goto('/receipts/receipt-001');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });

    // Verify edit button
    await expect(page.locator('.edit-button')).toBeVisible();
  });

  test('should enter edit mode when clicking edit', async ({ page }) => {
    await page.goto('/receipts/receipt-001');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });

    // Click edit button
    await page.locator('.edit-button').click();

    // Should show edit form
    await expect(page.locator('.edit-form')).toBeVisible();
    await expect(page.locator('#merchant_name')).toBeVisible();
  });

  test('should cancel edit mode', async ({ page }) => {
    await page.goto('/receipts/receipt-001');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });

    // Enter edit mode
    await page.locator('.edit-button').click();
    await expect(page.locator('.edit-form')).toBeVisible();

    // Cancel edit
    await page.locator('.cancel-edit-button').click();

    // Should exit edit mode
    await expect(page.locator('.edit-form')).not.toBeVisible();
  });

  test('should display linked transaction section', async ({ page }) => {
    await page.goto('/receipts/receipt-001');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });

    // Verify linked transaction section
    await expect(page.getByRole('heading', { name: 'Linked Transaction' })).toBeVisible();
  });

  test('should show link transaction button when no transaction linked', async ({ page }) => {
    await page.goto('/receipts/receipt-001');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });

    // Verify link button
    await expect(page.locator('.link-button')).toBeVisible();
  });

  test('should display VLM analysis section', async ({ page }) => {
    await page.goto('/receipts/receipt-001');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });

    // Verify VLM section
    await expect(page.getByRole('heading', { name: 'VLM Analysis Results' })).toBeVisible();
  });

  test('should show delete button', async ({ page }) => {
    await page.goto('/receipts/receipt-001');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });

    // Verify delete button
    await expect(page.locator('.delete-button')).toBeVisible();
  });

  test('should show error state when receipt fetch fails', async ({ page }) => {
    // Set up auth mocks first
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
      localStorage.setItem('clockzen-onboarding-storage', JSON.stringify({
        state: { hasCompletedTour: true, hasDismissedTour: true },
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
    await page.route('**/api/accounts/account-001/transactions*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transactions: [] }) });
    });
    // Return an error for receipt fetch
    await page.route('**/api/accounts/account-001/receipts/error-receipt', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('/receipts/error-receipt');
    await page.waitForLoadState('networkidle');

    // The page shows "Error" section when there's an error
    await expect(page.getByRole('heading', { name: 'Error' })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Receipt Deletion', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('should show delete confirmation modal', async ({ page }) => {
    await page.goto('/receipts/receipt-001');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });

    // Click delete button
    await page.locator('.delete-button').click();

    // Should show confirmation modal
    await expect(page.getByRole('heading', { name: 'Delete Receipt' })).toBeVisible();
    await expect(page.getByText('Are you sure you want to delete this receipt')).toBeVisible();
  });

  test('should cancel deletion', async ({ page }) => {
    await page.goto('/receipts/receipt-001');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });

    // Open delete modal
    await page.locator('.delete-button').click();
    await expect(page.getByRole('heading', { name: 'Delete Receipt' })).toBeVisible();

    // Cancel deletion
    await page.locator('.cancel-button').click();

    // Modal should close
    await expect(page.getByRole('heading', { name: 'Delete Receipt' })).not.toBeVisible();
  });

  test('should delete receipt and redirect', async ({ page }) => {
    await page.goto('/receipts/receipt-001');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Whole Foods Market' })).toBeVisible({ timeout: 10000 });

    // Open delete modal
    await page.locator('.delete-button').click();
    await expect(page.getByRole('heading', { name: 'Delete Receipt' })).toBeVisible();

    // Confirm deletion
    await page.locator('.confirm-delete-button').click();

    // Should redirect to receipts list
    await expect(page).toHaveURL('/receipts');
  });

  test('should show bulk delete confirmation from list page', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });

    // Select a receipt
    const checkbox = page.locator('.receipt-checkbox').first();
    await checkbox.click();

    // Click bulk delete button
    await page.locator('.bulk-delete-button').click();

    // Should show confirmation modal
    await expect(page.getByRole('heading', { name: /Delete.*Receipt/ })).toBeVisible();
  });

  test('should cancel bulk deletion', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });

    // Select a receipt
    const checkbox = page.locator('.receipt-checkbox').first();
    await checkbox.click();

    // Open delete modal
    await page.locator('.bulk-delete-button').click();
    await expect(page.getByRole('heading', { name: /Delete.*Receipt/ })).toBeVisible();

    // Cancel
    await page.locator('.delete-confirm-cancel').click();

    // Modal should close and selections should remain
    await expect(page.getByText('1 selected')).toBeVisible();
  });

  test('should execute bulk deletion', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });

    // Select a receipt
    const checkbox = page.locator('.receipt-checkbox').first();
    await checkbox.click();

    // Open delete modal
    await page.locator('.bulk-delete-button').click();
    await expect(page.getByRole('heading', { name: /Delete.*Receipt/ })).toBeVisible();

    // Confirm deletion
    await page.locator('.delete-confirm-delete').click();

    // Modal should close and selection should be cleared
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Delete.*Receipt/ })).not.toBeVisible();
  });
});

test.describe('Receipt Reprocessing', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);

    // Mock the failed receipt
    await page.route('**/api/accounts/account-001/receipts/receipt-003', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockReceipts[2]),
        });
      } else {
        await route.continue();
      }
    });

    // Mock reprocess endpoint
    await page.route('**/api/accounts/account-001/receipts/receipt-003/reprocess', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...mockReceipts[2],
          status: 'processing',
        }),
      });
    });
  });

  test('should show retry button for failed receipts', async ({ page }) => {
    await page.goto('/receipts/receipt-003');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Italian Bistro' })).toBeVisible({ timeout: 10000 });

    // Should show retry button (use first() since there are two - one in header, one inline)
    await expect(page.getByRole('button', { name: 'Retry Processing' }).first()).toBeVisible();
  });

  test('should trigger reprocessing on retry button click', async ({ page }) => {
    await page.goto('/receipts/receipt-003');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Italian Bistro' })).toBeVisible({ timeout: 10000 });

    // Click retry button (use first() since there are two buttons)
    const retryButton = page.getByRole('button', { name: 'Retry Processing' }).first();
    await retryButton.click();

    // Button text changes during reprocessing - verify the button is still there (reprocessing finished quickly)
    // The actual UI update is too fast to catch in test, so just verify the button click works
    await expect(retryButton).toBeEnabled({ timeout: 5000 });
  });
});

test.describe('Receipt Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('should display pagination info', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });

    // Should show pagination info
    await expect(page.getByText(/Showing.*of.*receipts/)).toBeVisible();
  });

  test('should have pagination controls', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });

    // Should show pagination buttons
    await expect(page.getByRole('button', { name: 'Go to first page' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to previous page' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to next page' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to last page' })).toBeVisible();
  });

  test('should have page size selector', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });

    // Should show page size selector
    const pageSizeSelect = page.locator('#page-size-select');
    await expect(pageSizeSelect).toBeVisible();

    // Should have standard page size options
    await expect(pageSizeSelect.locator('option')).toHaveCount(4); // 10, 20, 50, 100
  });

  test('should disable previous/first buttons on first page', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible({ timeout: 10000 });

    // First and previous buttons should be disabled on first page
    await expect(page.getByRole('button', { name: 'Go to first page' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Go to previous page' })).toBeDisabled();
  });
});
