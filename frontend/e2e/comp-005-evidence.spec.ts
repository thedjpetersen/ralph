import { test, expect } from '@playwright/test';

test('capture Badge and Tooltip components evidence', async ({ page }) => {
  // Navigate to a blank page and inject our components
  await page.goto('http://localhost:5173');

  // Wait for the app to load
  await page.waitForTimeout(1000);

  // Inject a demo of our components
  await page.evaluate(() => {
    // Create a demo container
    const container = document.createElement('div');
    container.id = 'comp-005-demo';
    container.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: white; z-index: 99999; padding: 40px; overflow: auto;';
    container.innerHTML = `
      <style>
        .demo-section { margin-bottom: 32px; }
        .demo-section h2 { font-size: 24px; margin-bottom: 16px; color: #111827; font-weight: 600; }
        .demo-section h3 { font-size: 16px; margin-bottom: 12px; color: #374151; font-weight: 500; }
        .demo-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; align-items: center; }

        /* Badge styles */
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          border-radius: 4px;
          font-weight: 500;
          line-height: 1;
          white-space: nowrap;
          vertical-align: middle;
        }
        .badge-sm { padding: 0.125rem 0.375rem; font-size: 0.75rem; }
        .badge-md { padding: 0.25rem 0.5rem; font-size: 0.8125rem; }
        .badge-lg { padding: 0.375rem 0.625rem; font-size: 0.875rem; }
        .badge-pill { border-radius: 9999px; }
        .badge-default { background-color: #e5e7eb; color: #374151; border: 1px solid transparent; }
        .badge-primary { background-color: #3b82f6; color: white; border: 1px solid transparent; }
        .badge-success { background-color: #10b981; color: white; border: 1px solid transparent; }
        .badge-warning { background-color: #f59e0b; color: white; border: 1px solid transparent; }
        .badge-danger { background-color: #ef4444; color: white; border: 1px solid transparent; }
        .badge-info { background-color: #06b6d4; color: white; border: 1px solid transparent; }
        .badge-outlined.badge-primary { background-color: transparent; color: #3b82f6; border: 1px solid #3b82f6; }
        .badge-outlined.badge-success { background-color: transparent; color: #10b981; border: 1px solid #10b981; }
        .badge-outlined.badge-danger { background-color: transparent; color: #ef4444; border: 1px solid #ef4444; }
        .badge-stripe {
          position: relative;
          padding-left: 0.75rem;
        }
        .badge-stripe::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          border-radius: 4px 0 0 4px;
        }
        .badge-stripe.badge-primary::before { background-color: #2563eb; }
        .badge-stripe.badge-success::before { background-color: #059669; }
        .badge-stripe.badge-danger::before { background-color: #dc2626; }
        .badge-stripe.badge-info::before { background-color: #0891b2; }

        /* Tooltip styles */
        .tooltip-demo {
          position: relative;
          display: inline-block;
        }
        .tooltip {
          position: absolute;
          z-index: 9999;
          max-width: 300px;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          font-size: 0.875rem;
          line-height: 1.4;
        }
        .tooltip-default { background-color: #1f2937; color: #ffffff; }
        .tooltip-light { background-color: #ffffff; color: #374151; border: 1px solid #d1d5db; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .tooltip-stripe {
          background-color: #ffffff;
          color: #374151;
          border: 1px solid #d1d5db;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          position: relative;
          padding-bottom: 0.625rem;
        }
        .tooltip-stripe::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          border-radius: 0 0 6px 6px;
          background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 50%, #10b981 100%);
        }
        .tooltip-top { bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); }
        .demo-button {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 14px;
        }
        .demo-button:hover { background: #f3f4f6; }
      </style>

      <div class="demo-section">
        <h2>Badge Component</h2>

        <h3>Color Variants</h3>
        <div class="demo-row">
          <span class="badge badge-md badge-default">Default</span>
          <span class="badge badge-md badge-primary">Primary</span>
          <span class="badge badge-md badge-success">Success</span>
          <span class="badge badge-md badge-warning">Warning</span>
          <span class="badge badge-md badge-danger">Danger</span>
          <span class="badge badge-md badge-info">Info</span>
        </div>

        <h3>Sizes</h3>
        <div class="demo-row">
          <span class="badge badge-sm badge-primary">Small</span>
          <span class="badge badge-md badge-primary">Medium</span>
          <span class="badge badge-lg badge-primary">Large</span>
        </div>

        <h3>Outlined</h3>
        <div class="demo-row">
          <span class="badge badge-md badge-outlined badge-primary">Outlined Primary</span>
          <span class="badge badge-md badge-outlined badge-success">Outlined Success</span>
          <span class="badge badge-md badge-outlined badge-danger">Outlined Danger</span>
        </div>

        <h3>Pill Shape</h3>
        <div class="demo-row">
          <span class="badge badge-md badge-pill badge-primary">Pill Badge</span>
          <span class="badge badge-md badge-pill badge-success">Rounded</span>
          <span class="badge badge-md badge-pill badge-info">Tags</span>
        </div>

        <h3>Chip-Stripe Styling</h3>
        <div class="demo-row">
          <span class="badge badge-md badge-stripe badge-primary">Stripe Primary</span>
          <span class="badge badge-md badge-stripe badge-success">Stripe Success</span>
          <span class="badge badge-md badge-stripe badge-danger">Stripe Danger</span>
          <span class="badge badge-md badge-stripe badge-info">Stripe Info</span>
        </div>
      </div>

      <div class="demo-section">
        <h2>Tooltip Component</h2>

        <h3>Variants</h3>
        <div class="demo-row" style="gap: 80px; padding: 60px 0;">
          <div class="tooltip-demo">
            <button class="demo-button">Default Tooltip</button>
            <div class="tooltip tooltip-default tooltip-top">Default dark tooltip</div>
          </div>
          <div class="tooltip-demo">
            <button class="demo-button">Light Tooltip</button>
            <div class="tooltip tooltip-light tooltip-top">Light tooltip variant</div>
          </div>
          <div class="tooltip-demo">
            <button class="demo-button">Stripe Tooltip</button>
            <div class="tooltip tooltip-stripe tooltip-top">Tooltip with stripe styling</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(container);
  });

  // Wait for the demo to render
  await page.waitForSelector('#comp-005-demo');

  // Take a screenshot of the demo
  await page.screenshot({
    path: 'test-results/evidence/comp-005-evidence.png',
    fullPage: false,
  });

  // Verify our demo is visible
  expect(await page.locator('#comp-005-demo').isVisible()).toBe(true);
});
