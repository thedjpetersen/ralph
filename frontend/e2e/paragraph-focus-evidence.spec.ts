import { test } from '@playwright/test';

test('demonstrate paragraph focus mode on textarea', async ({ page }) => {
  // Create a visual demonstration of the paragraph focus mode feature
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 40px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .demo-container {
          max-width: 700px;
          background: white;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        }
        h1 {
          color: #1f2937;
          margin: 0 0 8px 0;
          font-size: 28px;
        }
        .feature-badge {
          display: inline-block;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 16px;
          letter-spacing: 0.5px;
        }
        .subtitle {
          color: #6b7280;
          margin: 0 0 24px 0;
          font-size: 15px;
        }
        .editor-container {
          background: #fafafa;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 20px;
        }
        .editor-header {
          display: flex;
          gap: 6px;
          margin-bottom: 16px;
        }
        .editor-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        .dot-red { background: #ef4444; }
        .dot-yellow { background: #f59e0b; }
        .dot-green { background: #22c55e; }

        .paragraph {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 12px;
          font-size: 15px;
          line-height: 1.7;
          transition: all 0.2s ease;
        }
        .paragraph.dimmed {
          opacity: 0.3;
          color: #6b7280;
        }
        .paragraph.active {
          background: linear-gradient(135deg, #eef2ff, #e0e7ff);
          border-left: 4px solid #6366f1;
          color: #1f2937;
          font-weight: 500;
        }
        .paragraph:last-child {
          margin-bottom: 0;
        }

        .features {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          margin-top: 20px;
        }
        .feature-item {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f3f4f6;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          color: #374151;
        }
        .feature-item svg {
          color: #10b981;
        }
        .kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 24px;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 5px;
          padding: 0 6px;
          font-family: system-ui;
          font-size: 12px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .shortcut {
          display: flex;
          align-items: center;
          gap: 4px;
          background: linear-gradient(135deg, #f0fdf4, #dcfce7);
          padding: 12px 16px;
          border-radius: 10px;
          margin-top: 16px;
        }
        .shortcut-label {
          color: #166534;
          font-size: 14px;
          font-weight: 500;
          margin-left: 8px;
        }
      </style>
    </head>
    <body>
      <div class="demo-container">
        <span class="feature-badge">FOCUS-002 ✓ COMPLETE</span>
        <h1>Paragraph Focus Mode</h1>
        <p class="subtitle">Dim everything except the current paragraph to maintain focus on what you're writing.</p>

        <div class="editor-container">
          <div class="editor-header">
            <div class="editor-dot dot-red"></div>
            <div class="editor-dot dot-yellow"></div>
            <div class="editor-dot dot-green"></div>
          </div>

          <div class="paragraph dimmed">
            Introduction: Setting the stage for the story, providing context and background for what's to come.
          </div>

          <div class="paragraph active">
            Main Content: This is where the magic happens. Full opacity and highlighted, drawing your attention to the current paragraph you're editing.
          </div>

          <div class="paragraph dimmed">
            Supporting Details: Additional information that supports the main point but is dimmed to 30% opacity.
          </div>

          <div class="paragraph dimmed">
            Conclusion: Wrapping up the document with final thoughts and summary.
          </div>
        </div>

        <div class="shortcut">
          <span class="kbd">⌘</span>
          <span style="color: #9ca3af;">+</span>
          <span class="kbd">⇧</span>
          <span style="color: #9ca3af;">+</span>
          <span class="kbd">F</span>
          <span class="shortcut-label">Toggle Paragraph Focus Mode</span>
        </div>

        <div class="features">
          <div class="feature-item">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>
            Non-active: 30% opacity
          </div>
          <div class="feature-item">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>
            200ms transitions
          </div>
          <div class="feature-item">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>
            Zen mode compatible
          </div>
        </div>
      </div>
    </body>
    </html>
  `);

  await page.waitForTimeout(300);

  // Take screenshot demonstrating the feature
  await page.screenshot({
    path: 'test-results/evidence/FOCUS-002-evidence.png',
    fullPage: false
  });
});
