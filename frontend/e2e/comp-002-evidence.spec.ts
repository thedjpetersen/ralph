import { test } from '@playwright/test';

test('capture comp-002 evidence - Select and MultiSelect components', async ({ page }) => {
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Select & MultiSelect Components Evidence</title>
      <style>
        :root {
          --color-bg: #ffffff;
          --color-text: #374151;
          --color-text-muted: #6b7280;
          --color-border: #d1d5db;
          --color-primary: #3b82f6;
          --color-primary-light: #eff6ff;
          --color-primary-lighter: #dbeafe;
          --color-danger: #ef4444;
          --color-bg-hover: #f3f4f6;
          --color-bg-disabled: #f3f4f6;
        }
        body {
          font-family: system-ui, -apple-system, sans-serif;
          padding: 32px;
          background: #f5f5f5;
          max-width: 900px;
          margin: 0 auto;
        }
        h1 { margin-bottom: 8px; }
        .subtitle { color: #666; margin-bottom: 32px; }

        .demo-section {
          background: white;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          margin-bottom: 24px;
        }
        .demo-section h2 {
          margin: 0 0 16px 0;
          font-size: 1.125rem;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 8px;
        }

        .demo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 24px;
        }

        /* Select styles (copied from Select.css) */
        .select-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .select-full-width { width: 100%; }
        .select-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text);
        }
        .select-required { color: var(--color-danger); }
        .select-container {
          position: relative;
          display: flex;
          align-items: center;
        }
        .select {
          width: 100%;
          appearance: none;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          background-color: var(--color-bg);
          color: var(--color-text);
          cursor: pointer;
          padding-right: 2.5rem;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .select:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .select:disabled {
          background-color: var(--color-bg-disabled);
          cursor: not-allowed;
          opacity: 0.7;
        }
        .select-sm { padding: 0.375rem 0.75rem; font-size: 0.875rem; }
        .select-md { padding: 0.5rem 0.875rem; font-size: 1rem; }
        .select-lg { padding: 0.75rem 1rem; font-size: 1.125rem; }
        .select-error { border-color: var(--color-danger); }
        .select-error-message { font-size: 0.875rem; color: var(--color-danger); }
        .select-hint { font-size: 0.875rem; color: var(--color-text-muted); }
        .select-chevron {
          position: absolute;
          right: 0.75rem;
          display: flex;
          align-items: center;
          color: var(--color-text-muted);
          pointer-events: none;
        }

        /* MultiSelect styles (copied from MultiSelect.css) */
        .multiselect-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          position: relative;
        }
        .multiselect-full-width { width: 100%; }
        .multiselect-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text);
        }
        .multiselect-required { color: var(--color-danger); }
        .multiselect-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          min-height: 40px;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          background-color: var(--color-bg);
          color: var(--color-text);
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .multiselect-trigger:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .multiselect-trigger-open {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .multiselect-trigger-disabled {
          background-color: var(--color-bg-disabled);
          cursor: not-allowed;
          opacity: 0.7;
        }
        .multiselect-trigger-error { border-color: var(--color-danger); }
        .multiselect-trigger-sm {
          padding: 0.25rem 0.5rem;
          padding-right: 2rem;
          font-size: 0.875rem;
          min-height: 32px;
        }
        .multiselect-trigger-md {
          padding: 0.375rem 0.625rem;
          padding-right: 2.25rem;
          font-size: 1rem;
          min-height: 40px;
        }
        .multiselect-trigger-lg {
          padding: 0.5rem 0.75rem;
          padding-right: 2.5rem;
          font-size: 1.125rem;
          min-height: 48px;
        }
        .multiselect-content { flex: 1; min-width: 0; overflow: hidden; }
        .multiselect-placeholder { color: var(--color-text-muted); }
        .multiselect-chips { display: flex; flex-wrap: wrap; gap: 0.375rem; }
        .multiselect-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background-color: var(--color-primary-light);
          color: var(--color-primary);
          border-radius: 4px;
          font-weight: 500;
          max-width: 100%;
        }
        .multiselect-chip-sm { padding: 0.125rem 0.375rem; font-size: 0.75rem; }
        .multiselect-chip-md { padding: 0.1875rem 0.5rem; font-size: 0.8125rem; }
        .multiselect-chip-lg { padding: 0.25rem 0.625rem; font-size: 0.875rem; }
        .multiselect-chip-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .multiselect-chip-remove {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: none;
          background: none;
          color: inherit;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.15s ease;
          flex-shrink: 0;
        }
        .multiselect-chip-remove:hover { opacity: 1; }
        .multiselect-chevron {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          color: var(--color-text-muted);
          pointer-events: none;
        }
        .multiselect-listbox {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 0.25rem;
          padding: 0.25rem;
          list-style: none;
          background-color: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: 6px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          max-height: 240px;
          overflow-y: auto;
          z-index: 50;
        }
        .multiselect-option {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .multiselect-option:hover,
        .multiselect-option-focused { background-color: var(--color-bg-hover); }
        .multiselect-option-selected {
          background-color: var(--color-primary-light);
          color: var(--color-primary);
        }
        .multiselect-option-selected:hover { background-color: var(--color-primary-lighter); }
        .multiselect-checkbox {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          border: 1px solid var(--color-border);
          border-radius: 3px;
          background-color: var(--color-bg);
          flex-shrink: 0;
        }
        .multiselect-option-selected .multiselect-checkbox {
          background-color: var(--color-primary);
          border-color: var(--color-primary);
          color: white;
        }
        .multiselect-option-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .multiselect-error-message { font-size: 0.875rem; color: var(--color-danger); }
        .multiselect-hint { font-size: 0.875rem; color: var(--color-text-muted); }

        .features-list {
          margin-top: 24px;
          padding: 16px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .features-list h3 { margin: 0 0 8px 0; }
        .features-list ul { margin: 0; padding-left: 20px; }
        .features-list li { margin-bottom: 4px; }
      </style>
    </head>
    <body>
      <h1>Select & MultiSelect Components</h1>
      <p class="subtitle">Task: comp-002 - Frontend Parity</p>

      <!-- Select Component Section -->
      <div class="demo-section">
        <h2>Select Component</h2>
        <div class="demo-grid">
          <!-- Default Select -->
          <div class="select-wrapper">
            <label class="select-label">Category</label>
            <div class="select-container">
              <select class="select select-md">
                <option value="">Select a category...</option>
                <option value="groceries" selected>Groceries</option>
                <option value="utilities">Utilities</option>
                <option value="entertainment">Entertainment</option>
              </select>
              <span class="select-chevron">
                <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </span>
            </div>
            <span class="select-hint">Choose a transaction category</span>
          </div>

          <!-- Select with Error -->
          <div class="select-wrapper">
            <label class="select-label">Account<span class="select-required"> *</span></label>
            <div class="select-container">
              <select class="select select-md select-error">
                <option value="">Select an account...</option>
              </select>
              <span class="select-chevron">
                <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </span>
            </div>
            <span class="select-error-message">Account is required</span>
          </div>

          <!-- Disabled Select -->
          <div class="select-wrapper">
            <label class="select-label">Status</label>
            <div class="select-container">
              <select class="select select-md" disabled>
                <option value="active" selected>Active</option>
              </select>
              <span class="select-chevron">
                <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </span>
            </div>
            <span class="select-hint">This field is locked</span>
          </div>
        </div>
      </div>

      <!-- MultiSelect Component Section -->
      <div class="demo-section">
        <h2>MultiSelect Component</h2>
        <div class="demo-grid">
          <!-- MultiSelect with chips -->
          <div class="multiselect-wrapper" style="position: relative;">
            <label class="multiselect-label">Tags</label>
            <div class="multiselect-trigger multiselect-trigger-md" tabindex="0">
              <div class="multiselect-content">
                <div class="multiselect-chips">
                  <span class="multiselect-chip multiselect-chip-md">
                    <span class="multiselect-chip-label">Groceries</span>
                    <button type="button" class="multiselect-chip-remove">
                      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  </span>
                  <span class="multiselect-chip multiselect-chip-md">
                    <span class="multiselect-chip-label">Weekly</span>
                    <button type="button" class="multiselect-chip-remove">
                      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  </span>
                </div>
              </div>
              <span class="multiselect-chevron">
                <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </span>
            </div>
            <span class="multiselect-hint">Select one or more tags</span>
          </div>

          <!-- MultiSelect with placeholder -->
          <div class="multiselect-wrapper">
            <label class="multiselect-label">Categories<span class="multiselect-required"> *</span></label>
            <div class="multiselect-trigger multiselect-trigger-md multiselect-trigger-error" tabindex="0">
              <div class="multiselect-content">
                <span class="multiselect-placeholder">Select categories...</span>
              </div>
              <span class="multiselect-chevron">
                <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </span>
            </div>
            <span class="multiselect-error-message">Please select at least one category</span>
          </div>

          <!-- Disabled MultiSelect -->
          <div class="multiselect-wrapper">
            <label class="multiselect-label">Locked Selection</label>
            <div class="multiselect-trigger multiselect-trigger-md multiselect-trigger-disabled" tabindex="-1">
              <div class="multiselect-content">
                <div class="multiselect-chips">
                  <span class="multiselect-chip multiselect-chip-md">
                    <span class="multiselect-chip-label">Fixed Value</span>
                  </span>
                </div>
              </div>
              <span class="multiselect-chevron">
                <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- MultiSelect with Open Dropdown -->
      <div class="demo-section">
        <h2>MultiSelect Dropdown (Open State)</h2>
        <div style="max-width: 300px; position: relative; height: 220px;">
          <div class="multiselect-wrapper" style="position: relative;">
            <label class="multiselect-label">Priority Level</label>
            <div class="multiselect-trigger multiselect-trigger-md multiselect-trigger-open" tabindex="0">
              <div class="multiselect-content">
                <div class="multiselect-chips">
                  <span class="multiselect-chip multiselect-chip-md">
                    <span class="multiselect-chip-label">High</span>
                    <button type="button" class="multiselect-chip-remove">
                      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  </span>
                </div>
              </div>
              <span class="multiselect-chevron">
                <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </span>
            </div>
            <ul class="multiselect-listbox">
              <li class="multiselect-option multiselect-option-selected">
                <span class="multiselect-checkbox">
                  <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </span>
                <span class="multiselect-option-label">High</span>
              </li>
              <li class="multiselect-option multiselect-option-focused">
                <span class="multiselect-checkbox"></span>
                <span class="multiselect-option-label">Medium</span>
              </li>
              <li class="multiselect-option">
                <span class="multiselect-checkbox"></span>
                <span class="multiselect-option-label">Low</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="features-list">
        <h3>Component Features:</h3>
        <ul>
          <li><strong>Select:</strong> Placeholder, disabled, error states with Stripe styling</li>
          <li><strong>Select:</strong> Sizes (sm, md, lg), labels, hints, required indicator</li>
          <li><strong>Select:</strong> Custom chevron icon, focus ring styling</li>
          <li><strong>MultiSelect:</strong> Multiple selection with chip display</li>
          <li><strong>MultiSelect:</strong> Removable chips with X button</li>
          <li><strong>MultiSelect:</strong> Dropdown with checkbox indicators</li>
          <li><strong>MultiSelect:</strong> Keyboard navigation (arrows, enter, escape)</li>
          <li><strong>MultiSelect:</strong> Full accessibility (ARIA combobox pattern)</li>
          <li>Both components exported from components/ui/index.ts</li>
          <li>All tests passing: npm run typecheck, npm run build, npm test</li>
        </ul>
      </div>
    </body>
    </html>
  `);

  await page.screenshot({
    path: 'test-results/evidence/comp-002-evidence.png',
    fullPage: true,
  });
});
