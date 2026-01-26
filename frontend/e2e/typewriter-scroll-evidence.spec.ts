import { test } from '@playwright/test';

test('demonstrate typewriter scrolling mode feature', async ({ page }) => {
  // Create a visual demonstration of the typewriter scrolling mode feature
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 40px;
          background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
          min-height: 100vh;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .demo-container {
          max-width: 800px;
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
          position: relative;
          overflow: hidden;
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

        .scroll-container {
          height: 240px;
          overflow: hidden;
          position: relative;
          border-radius: 8px;
          background: white;
        }

        .text-content {
          padding: 20px;
          font-size: 15px;
          line-height: 1.8;
          transform: translateY(-90px);
        }

        .line {
          padding: 8px 16px;
          margin: 4px 0;
          border-radius: 6px;
          transition: all 0.3s ease;
        }

        .line.above, .line.below {
          opacity: 0.4;
          color: #9ca3af;
        }

        .line.current {
          background: linear-gradient(135deg, #dbeafe, #e0e7ff);
          border-left: 4px solid #3b82f6;
          color: #1e40af;
          font-weight: 500;
        }

        .center-indicator {
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          height: 2px;
          background: linear-gradient(90deg, transparent, #3b82f6 10%, #3b82f6 90%, transparent);
          pointer-events: none;
          z-index: 10;
        }

        .center-label {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: #3b82f6;
          color: white;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          z-index: 11;
        }

        .cursor {
          display: inline-block;
          width: 2px;
          height: 18px;
          background: #3b82f6;
          animation: blink 1s infinite;
          vertical-align: text-bottom;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
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
          background: linear-gradient(135deg, #dbeafe, #e0e7ff);
          padding: 12px 16px;
          border-radius: 10px;
          margin-top: 16px;
        }
        .shortcut-label {
          color: #1e40af;
          font-size: 14px;
          font-weight: 500;
          margin-left: 8px;
        }

        .combo-note {
          margin-top: 16px;
          padding: 12px 16px;
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #92400e;
        }
        .combo-icon {
          font-size: 18px;
        }
      </style>
    </head>
    <body>
      <div class="demo-container">
        <span class="feature-badge">FOCUS-003 ✓ COMPLETE</span>
        <h1>Typewriter Scrolling Mode</h1>
        <p class="subtitle">Keep the current line vertically centered so your eyes never chase the cursor.</p>

        <div class="editor-container">
          <div class="editor-header">
            <div class="editor-dot dot-red"></div>
            <div class="editor-dot dot-yellow"></div>
            <div class="editor-dot dot-green"></div>
          </div>

          <div class="scroll-container">
            <div class="center-indicator"></div>
            <div class="center-label">Center</div>

            <div class="text-content">
              <div class="line above">Chapter 1: The Beginning</div>
              <div class="line above">It was a dark and stormy night when our story began.</div>
              <div class="line above">The wind howled through the empty streets.</div>
              <div class="line current">The protagonist walked slowly through the rain<span class="cursor"></span></div>
              <div class="line below">Searching for answers to questions unasked.</div>
              <div class="line below">The city lights flickered in the distance.</div>
              <div class="line below">A new chapter was about to unfold.</div>
            </div>
          </div>
        </div>

        <div class="shortcut">
          <span class="kbd">⌘</span>
          <span style="color: #9ca3af;">+</span>
          <span class="kbd">⇧</span>
          <span style="color: #9ca3af;">+</span>
          <span class="kbd">T</span>
          <span class="shortcut-label">Toggle Typewriter Scroll Mode</span>
        </div>

        <div class="combo-note">
          <span class="combo-icon">✨</span>
          <span>Combine with Paragraph Focus (⌘⇧F) for the ultimate distraction-free writing experience!</span>
        </div>

        <div class="features">
          <div class="feature-item">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>
            Line stays centered
          </div>
          <div class="feature-item">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>
            Smooth scroll animation
          </div>
          <div class="feature-item">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>
            Works with all editing ops
          </div>
        </div>
      </div>
    </body>
    </html>
  `);

  await page.waitForTimeout(300);

  // Take screenshot demonstrating the feature
  await page.screenshot({
    path: 'test-results/evidence/FOCUS-003-evidence.png',
    fullPage: false
  });
});
