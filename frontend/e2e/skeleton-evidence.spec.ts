import { test } from '@playwright/test';

test('capture skeleton loading states for UI-002', async ({ page }) => {
  // Mock the API to delay response so we can capture skeleton states
  await page.route('**/api/accounts', async (route) => {
    // Delay the response to show skeleton
    await new Promise(resolve => setTimeout(resolve, 3000));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/user', async (route) => {
    await new Promise(resolve => setTimeout(resolve, 3000));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

  // Navigate to accounts page to capture skeleton
  await page.goto('http://localhost:5173/accounts');

  // Wait a bit for the page to render the skeleton
  await page.waitForTimeout(500);

  // Capture the accounts list skeleton
  await page.screenshot({
    path: 'test-results/evidence/UI-002-evidence.png',
    fullPage: true,
  });
});
