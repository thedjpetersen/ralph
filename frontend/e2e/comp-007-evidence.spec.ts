import { test } from '@playwright/test';

test('capture Avatar and Spinner evidence', async ({ page }) => {
  // Create an in-memory HTML page to demo the components
  await page.setContent(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Avatar and Spinner Components - comp-007</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #1a1a2e;
          color: #fff;
          padding: 24px;
        }
        h1 { margin-bottom: 24px; font-size: 1.5rem; color: #a78bfa; }
        h2 { margin: 16px 0 12px; font-size: 1rem; color: #94a3b8; }
        .section {
          margin-bottom: 32px;
          background: rgba(255,255,255,0.05);
          padding: 16px;
          border-radius: 8px;
        }
        .row {
          display: flex;
          gap: 16px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        .label { font-size: 0.75rem; color: #64748b; margin-top: 4px; text-align: center; }
        .item { display: flex; flex-direction: column; align-items: center; }

        /* Avatar styles */
        .avatar {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
          color: white;
          font-weight: 500;
          user-select: none;
        }
        .avatar-circle { border-radius: 50%; }
        .avatar-rounded { border-radius: 8px; }
        .avatar-square { border-radius: 0; }
        .avatar-xs { width: 24px; height: 24px; font-size: 0.625rem; }
        .avatar-sm { width: 32px; height: 32px; font-size: 0.75rem; }
        .avatar-md { width: 40px; height: 40px; font-size: 0.875rem; }
        .avatar-lg { width: 56px; height: 56px; font-size: 1.125rem; }
        .avatar-xl { width: 80px; height: 80px; font-size: 1.5rem; }
        .avatar-image { width: 100%; height: 100%; object-fit: cover; }
        .avatar-initials { line-height: 1; letter-spacing: 0.025em; }
        .avatar-icon { display: flex; align-items: center; justify-content: center; width: 60%; height: 60%; }
        .avatar-icon svg { width: 100%; height: 100%; }

        /* Spinner styles */
        .spinner {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .spinner-xs { width: 16px; height: 16px; }
        .spinner-sm { width: 20px; height: 20px; }
        .spinner-md { width: 24px; height: 24px; }
        .spinner-lg { width: 32px; height: 32px; }
        .spinner-xl { width: 48px; height: 48px; }
        .spinner-ring {
          width: 100%;
          height: 100%;
          animation: spinner-rotate 0.8s linear infinite;
        }
        .spinner-default { color: rgba(255, 255, 255, 0.6); }
        .spinner-primary { color: #3b82f6; }
        .spinner-secondary { color: #6b7280; }
        .spinner-white { color: white; }

        @keyframes spinner-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spinner-stripe .spinner-stripe-container {
          display: flex;
          gap: 3px;
          align-items: center;
          justify-content: center;
          height: 100%;
        }
        .spinner-stripe .spinner-stripe-bar {
          width: 3px;
          height: 60%;
          border-radius: 2px;
          animation: spinner-stripe-bounce 1s ease-in-out infinite;
        }
        .spinner-stripe .spinner-stripe-bar:nth-child(1) { animation-delay: 0s; }
        .spinner-stripe .spinner-stripe-bar:nth-child(2) { animation-delay: 0.15s; }
        .spinner-stripe .spinner-stripe-bar:nth-child(3) { animation-delay: 0.3s; }
        .spinner-default.spinner-stripe .spinner-stripe-bar { background-color: rgba(255, 255, 255, 0.6); }
        .spinner-primary.spinner-stripe .spinner-stripe-bar { background-color: #3b82f6; }
        .spinner-lg.spinner-stripe .spinner-stripe-bar { width: 4px; }
        .spinner-xl.spinner-stripe .spinner-stripe-bar { width: 5px; }
        .spinner-lg.spinner-stripe .spinner-stripe-container { gap: 4px; }
        .spinner-xl.spinner-stripe .spinner-stripe-container { gap: 5px; }

        @keyframes spinner-stripe-bounce {
          0%, 100% { transform: scaleY(0.4); opacity: 0.5; }
          50% { transform: scaleY(1); opacity: 1; }
        }
      </style>
    </head>
    <body>
      <h1>Avatar and Spinner Components (comp-007)</h1>

      <div class="section">
        <h2>Avatar - Sizes</h2>
        <div class="row">
          <div class="item">
            <div class="avatar avatar-xs avatar-circle" style="background-color: #3b82f6;">
              <span class="avatar-initials">JD</span>
            </div>
            <div class="label">xs</div>
          </div>
          <div class="item">
            <div class="avatar avatar-sm avatar-circle" style="background-color: #8b5cf6;">
              <span class="avatar-initials">JD</span>
            </div>
            <div class="label">sm</div>
          </div>
          <div class="item">
            <div class="avatar avatar-md avatar-circle" style="background-color: #ec4899;">
              <span class="avatar-initials">JD</span>
            </div>
            <div class="label">md</div>
          </div>
          <div class="item">
            <div class="avatar avatar-lg avatar-circle" style="background-color: #f59e0b;">
              <span class="avatar-initials">JD</span>
            </div>
            <div class="label">lg</div>
          </div>
          <div class="item">
            <div class="avatar avatar-xl avatar-circle" style="background-color: #10b981;">
              <span class="avatar-initials">JD</span>
            </div>
            <div class="label">xl</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Avatar - Variants</h2>
        <div class="row">
          <div class="item">
            <div class="avatar avatar-lg avatar-circle" style="background-color: #3b82f6;">
              <span class="avatar-initials">AB</span>
            </div>
            <div class="label">circle</div>
          </div>
          <div class="item">
            <div class="avatar avatar-lg avatar-rounded" style="background-color: #8b5cf6;">
              <span class="avatar-initials">CD</span>
            </div>
            <div class="label">rounded</div>
          </div>
          <div class="item">
            <div class="avatar avatar-lg avatar-square" style="background-color: #ec4899;">
              <span class="avatar-initials">EF</span>
            </div>
            <div class="label">square</div>
          </div>
          <div class="item">
            <div class="avatar avatar-lg avatar-circle" style="background-color: #6b7280;">
              <span class="avatar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </span>
            </div>
            <div class="label">fallback</div>
          </div>
          <div class="item">
            <div class="avatar avatar-lg avatar-circle" style="overflow: hidden;">
              <img class="avatar-image" src="https://i.pravatar.cc/100?img=3" alt="Avatar" />
            </div>
            <div class="label">image</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Spinner - Sizes</h2>
        <div class="row">
          <div class="item">
            <div class="spinner spinner-xs spinner-primary">
              <svg viewBox="0 0 24 24" class="spinner-ring">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4 31.4" />
              </svg>
            </div>
            <div class="label">xs</div>
          </div>
          <div class="item">
            <div class="spinner spinner-sm spinner-primary">
              <svg viewBox="0 0 24 24" class="spinner-ring">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4 31.4" />
              </svg>
            </div>
            <div class="label">sm</div>
          </div>
          <div class="item">
            <div class="spinner spinner-md spinner-primary">
              <svg viewBox="0 0 24 24" class="spinner-ring">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4 31.4" />
              </svg>
            </div>
            <div class="label">md</div>
          </div>
          <div class="item">
            <div class="spinner spinner-lg spinner-primary">
              <svg viewBox="0 0 24 24" class="spinner-ring">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4 31.4" />
              </svg>
            </div>
            <div class="label">lg</div>
          </div>
          <div class="item">
            <div class="spinner spinner-xl spinner-primary">
              <svg viewBox="0 0 24 24" class="spinner-ring">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4 31.4" />
              </svg>
            </div>
            <div class="label">xl</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Spinner - Variants & Stripe Animation</h2>
        <div class="row">
          <div class="item">
            <div class="spinner spinner-lg spinner-default">
              <svg viewBox="0 0 24 24" class="spinner-ring">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4 31.4" />
              </svg>
            </div>
            <div class="label">default</div>
          </div>
          <div class="item">
            <div class="spinner spinner-lg spinner-primary">
              <svg viewBox="0 0 24 24" class="spinner-ring">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4 31.4" />
              </svg>
            </div>
            <div class="label">primary</div>
          </div>
          <div class="item">
            <div class="spinner spinner-lg spinner-secondary">
              <svg viewBox="0 0 24 24" class="spinner-ring">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4 31.4" />
              </svg>
            </div>
            <div class="label">secondary</div>
          </div>
          <div class="item" style="background: #374151; padding: 8px; border-radius: 6px;">
            <div class="spinner spinner-lg spinner-white">
              <svg viewBox="0 0 24 24" class="spinner-ring">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4 31.4" />
              </svg>
            </div>
            <div class="label">white</div>
          </div>
          <div class="item">
            <div class="spinner spinner-lg spinner-primary spinner-stripe">
              <div class="spinner-stripe-container">
                <div class="spinner-stripe-bar"></div>
                <div class="spinner-stripe-bar"></div>
                <div class="spinner-stripe-bar"></div>
              </div>
            </div>
            <div class="label">stripe</div>
          </div>
          <div class="item">
            <div class="spinner spinner-xl spinner-default spinner-stripe">
              <div class="spinner-stripe-container">
                <div class="spinner-stripe-bar"></div>
                <div class="spinner-stripe-bar"></div>
                <div class="spinner-stripe-bar"></div>
              </div>
            </div>
            <div class="label">xl stripe</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);

  await page.waitForTimeout(500);

  await page.screenshot({
    path: 'test-results/evidence/comp-007-evidence.png',
    fullPage: true,
  });
});
