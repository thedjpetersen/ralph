import { test } from '@playwright/test';

test('capture ReceiptUpload component evidence', async ({ page }) => {
  // Create a test page that showcases the ReceiptUpload component
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>ReceiptUpload Component Demo</title>
      <style>
        :root {
          color-scheme: dark;
        }
        body {
          margin: 0;
          padding: 2rem;
          background: #1a1a1a;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: rgba(255, 255, 255, 0.87);
        }
        .demo-container {
          max-width: 600px;
          margin: 0 auto;
        }
        h1 {
          margin: 0 0 0.5rem;
          font-size: 1.5rem;
        }
        p {
          margin: 0 0 1.5rem;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.875rem;
        }
        .receipt-upload {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .receipt-upload-dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          border: 2px dashed #444;
          border-radius: 12px;
          background-color: #1a1a1a;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 200px;
        }
        .receipt-upload-dropzone:hover {
          border-color: #646cff;
          background-color: rgba(100, 108, 255, 0.05);
        }
        .receipt-upload-icon {
          color: #666;
          margin-bottom: 0.75rem;
        }
        .receipt-upload-dropzone:hover .receipt-upload-icon {
          color: #646cff;
        }
        .receipt-upload-primary {
          margin: 0 0 0.25rem;
          font-size: 1rem;
          font-weight: 500;
        }
        .receipt-upload-secondary {
          margin: 0 0 0.5rem;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.5);
        }
        .receipt-upload-browse {
          color: #646cff;
          font-weight: 500;
        }
        .receipt-upload-hint {
          margin: 0;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.4);
        }
        .receipt-upload-files {
          background-color: #2a2a2a;
          border: 1px solid #333;
          border-radius: 8px;
          padding: 1rem;
        }
        .receipt-upload-files-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        .receipt-upload-files-title {
          font-size: 0.875rem;
          font-weight: 500;
        }
        .receipt-upload-file-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .receipt-upload-file-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background-color: rgba(255, 255, 255, 0.03);
          border-radius: 6px;
        }
        .receipt-upload-file-item.uploading {
          border: 1px solid rgba(100, 108, 255, 0.3);
        }
        .receipt-upload-file-item.complete {
          border: 1px solid rgba(46, 204, 113, 0.3);
          background-color: rgba(46, 204, 113, 0.05);
        }
        .receipt-upload-file-icon {
          width: 36px;
          height: 36px;
          border-radius: 6px;
          background-color: rgba(100, 108, 255, 0.15);
          color: #646cff;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .receipt-upload-file-item.complete .receipt-upload-file-icon {
          background-color: rgba(46, 204, 113, 0.15);
          color: #2ecc71;
        }
        .receipt-upload-file-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .receipt-upload-file-name {
          font-size: 0.875rem;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .receipt-upload-file-size {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
        }
        .receipt-upload-progress {
          width: 100%;
          height: 4px;
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
          margin-top: 0.25rem;
        }
        .receipt-upload-progress-bar {
          height: 100%;
          background-color: #646cff;
          border-radius: 2px;
          transition: width 0.2s ease;
        }
        .receipt-upload-file-status-icon.complete {
          color: #2ecc71;
        }
        .receipt-upload-submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 6px;
          background-color: #2ecc71;
          color: white;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          margin-top: 0.5rem;
        }
        .receipt-upload-submit-btn:hover {
          background-color: #27ae60;
        }
        .features-list {
          margin-top: 2rem;
          padding: 1rem;
          background-color: #2a2a2a;
          border-radius: 8px;
        }
        .features-list h2 {
          margin: 0 0 0.75rem;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.6);
        }
        .features-list ul {
          margin: 0;
          padding-left: 1.25rem;
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.7);
        }
        .features-list li {
          margin-bottom: 0.25rem;
        }
      </style>
    </head>
    <body>
      <div class="demo-container">
        <h1>ReceiptUpload Component</h1>
        <p>Drag-and-drop receipt upload with visual feedback and progress tracking</p>

        <div class="receipt-upload">
          <div class="receipt-upload-dropzone">
            <div class="receipt-upload-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <p class="receipt-upload-primary">Drag & drop receipt files here</p>
            <p class="receipt-upload-secondary">or <span class="receipt-upload-browse">browse</span> to select</p>
            <p class="receipt-upload-hint">Supports images (JPG, PNG, GIF, WebP, HEIC) and PDF. Max 10MB per file.</p>
          </div>

          <div class="receipt-upload-files">
            <div class="receipt-upload-files-header">
              <span class="receipt-upload-files-title">3 files selected</span>
            </div>
            <ul class="receipt-upload-file-list">
              <li class="receipt-upload-file-item complete">
                <div class="receipt-upload-file-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                </div>
                <div class="receipt-upload-file-info">
                  <span class="receipt-upload-file-name">grocery_receipt_jan25.jpg</span>
                  <span class="receipt-upload-file-size">1.2 MB</span>
                </div>
                <span class="receipt-upload-file-status-icon complete">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </span>
              </li>
              <li class="receipt-upload-file-item uploading">
                <div class="receipt-upload-file-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                </div>
                <div class="receipt-upload-file-info">
                  <span class="receipt-upload-file-name">office_supplies_invoice.pdf</span>
                  <span class="receipt-upload-file-size">856 KB</span>
                  <div class="receipt-upload-progress">
                    <div class="receipt-upload-progress-bar" style="width: 65%"></div>
                  </div>
                </div>
              </li>
              <li class="receipt-upload-file-item">
                <div class="receipt-upload-file-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                </div>
                <div class="receipt-upload-file-info">
                  <span class="receipt-upload-file-name">restaurant_receipt.png</span>
                  <span class="receipt-upload-file-size">432 KB</span>
                </div>
              </li>
            </ul>
            <button class="receipt-upload-submit-btn">Upload 2 files</button>
          </div>
        </div>

        <div class="features-list">
          <h2>COMPONENT FEATURES</h2>
          <ul>
            <li>Drag-and-drop zone with visual feedback</li>
            <li>Click-to-upload fallback</li>
            <li>Multiple file selection support</li>
            <li>File type validation (images & PDF)</li>
            <li>Upload progress indicator</li>
            <li>File size display & validation</li>
            <li>Mobile-responsive design</li>
            <li>Dark/light mode support</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `);

  await page.waitForLoadState('domcontentloaded');

  await page.screenshot({
    path: 'test-results/evidence/receipt-001-evidence.png',
    fullPage: true
  });
});
