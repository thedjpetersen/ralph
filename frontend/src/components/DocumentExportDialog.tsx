/**
 * Document Export Dialog
 *
 * Modal dialog for exporting documents to various formats (PDF, Markdown, HTML, Plain Text).
 */

import { useCallback } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useDocumentExportStore } from '../stores/documentExport';
import { EXPORT_FORMATS, type ExportFormat } from '../utils/exporters';
import './DocumentExportDialog.css';

// Icons for export formats
const PdfIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 2v6h6M8 13h2.5a1.5 1.5 0 000-3H8v6M12 13h1.5a1.5 1.5 0 110 3H12v-6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const MarkdownIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 2v6h6M7 13v4l2-2 2 2v-4M15 13v4M15 15h2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const HtmlIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 2v6h6M9 13l-2 2 2 2M15 13l2 2-2 2M11 18l2-6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TextIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 2v6h6M8 13h8M8 17h5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const FORMAT_ICONS: Record<ExportFormat, React.ComponentType> = {
  pdf: PdfIcon,
  markdown: MarkdownIcon,
  html: HtmlIcon,
  text: TextIcon,
};

export function DocumentExportDialog() {
  const {
    isOpen,
    documentData,
    selectedFormat,
    includeMetadata,
    includeTimestamp,
    isExporting,
    error,
    closeExportDialog,
    setSelectedFormat,
    setIncludeMetadata,
    setIncludeTimestamp,
    executeExport,
    clearError,
  } = useDocumentExportStore();

  const handleExport = useCallback(async () => {
    clearError();
    await executeExport();
  }, [clearError, executeExport]);

  const handleFormatSelect = useCallback(
    (format: ExportFormat) => {
      setSelectedFormat(format);
    },
    [setSelectedFormat]
  );

  if (!isOpen || !documentData) {
    return null;
  }

  const footer = (
    <>
      <Button variant="secondary" onClick={closeExportDialog} disabled={isExporting}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleExport} loading={isExporting}>
        Export
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeExportDialog}
      title="Export Document"
      size="md"
      footer={footer}
    >
      <div className="export-dialog">
        {/* Document Info */}
        <div className="export-document-info">
          <h3 className="export-document-title">{documentData.metadata.title}</h3>
          <p className="export-document-stats">
            {documentData.metadata.wordCount?.toLocaleString()} words
            {documentData.metadata.characterCount !== undefined && (
              <> &middot; {documentData.metadata.characterCount.toLocaleString()} characters</>
            )}
          </p>
        </div>

        {/* Format Selection */}
        <fieldset className="export-format-fieldset">
          <legend className="export-section-label">Export Format</legend>
          <div className="export-format-grid" role="radiogroup" aria-label="Select export format">
            {EXPORT_FORMATS.map((format) => {
              const Icon = FORMAT_ICONS[format.value];
              const isSelected = selectedFormat === format.value;

              return (
                <button
                  key={format.value}
                  type="button"
                  className={`export-format-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleFormatSelect(format.value)}
                  role="radio"
                  aria-checked={isSelected}
                  disabled={isExporting}
                >
                  <span className="export-format-icon">
                    <Icon />
                  </span>
                  <span className="export-format-label">{format.label}</span>
                  <span className="export-format-extension">.{format.extension}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Options */}
        <fieldset className="export-options-fieldset">
          <legend className="export-section-label">Options</legend>
          <div className="export-options">
            <label className="export-option">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                disabled={isExporting}
              />
              <span className="export-option-text">
                <span className="export-option-label">Include metadata</span>
                <span className="export-option-description">
                  Add author, date, and word count to export
                </span>
              </span>
            </label>

            <label className="export-option">
              <input
                type="checkbox"
                checked={includeTimestamp}
                onChange={(e) => setIncludeTimestamp(e.target.checked)}
                disabled={isExporting}
              />
              <span className="export-option-text">
                <span className="export-option-label">Add date to filename</span>
                <span className="export-option-description">
                  Append export date to the filename
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        {/* Error Display */}
        {error && (
          <div className="export-error" role="alert">
            <span className="export-error-icon" aria-hidden="true">!</span>
            <span>{error}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

DocumentExportDialog.displayName = 'DocumentExportDialog';
