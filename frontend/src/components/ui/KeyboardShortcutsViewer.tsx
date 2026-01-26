import { useState, useCallback, useRef, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import {
  useKeyboardShortcutsStore,
  KEYBOARD_SHORTCUTS,
  filterShortcuts,
  type ShortcutCategory,
} from '../../stores/keyboardShortcuts';
import './KeyboardShortcutsViewer.css';

// Platform indicator icons - defined outside component to avoid recreation
function MacIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function WindowsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M3 12V6.75l6-1.32v6.48L3 12zm17-9v8.75l-10 .15V5.21L20 3zM3 13l6 .09v6.81l-6-1.15V13zm17 .25V22l-10-1.91V13.1l10 .15z" />
    </svg>
  );
}

export interface KeyboardShortcutsViewerProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function KeyboardShortcutsViewer({
  isOpen: externalIsOpen,
  onClose: externalOnClose,
}: KeyboardShortcutsViewerProps = {}) {
  const {
    isOpen: storeIsOpen,
    closeModal: storeCloseModal,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    platform,
    togglePlatform,
  } = useKeyboardShortcutsStore();

  // Use external props if provided, otherwise use store state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : storeIsOpen;
  const onClose = externalOnClose ?? storeCloseModal;

  const [isPrintMode, setIsPrintMode] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const printContentRef = useRef<HTMLDivElement>(null);

  // Filter shortcuts based on search query
  const filteredCategories = filterShortcuts(KEYBOARD_SHORTCUTS, searchQuery, platform);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle print
  const handlePrint = useCallback(() => {
    setIsPrintMode(true);
    // Wait for print mode styles to apply
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 100);
  }, []);

  // Render shortcut keys
  const renderKeys = (keys: string[]) => {
    return keys.map((key, index) => (
      <span key={index}>
        <kbd className="shortcut-key">{key}</kbd>
        {index < keys.length - 1 && <span className="shortcut-separator">+</span>}
      </span>
    ));
  };

  // Render a category section
  const renderCategory = (category: ShortcutCategory) => {
    const isActive = activeCategory === null || activeCategory === category.id;

    if (!isActive && activeCategory !== null) return null;

    return (
      <div key={category.id} className="shortcuts-category">
        <button
          type="button"
          className={`category-header ${activeCategory === category.id ? 'active' : ''}`}
          onClick={() => setActiveCategory(activeCategory === category.id ? null : category.id)}
        >
          <h3 className="category-title">{category.title}</h3>
          <span className="category-count">{category.shortcuts.length} shortcuts</span>
        </button>
        <dl className="shortcuts-list">
          {category.shortcuts.map((shortcut) => (
            <div key={shortcut.id} className="shortcut-item">
              <dt className="shortcut-keys">{renderKeys(shortcut.keys[platform])}</dt>
              <dd className="shortcut-description">{shortcut.description}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  };

  const modalContent = (
    <div className={`shortcuts-viewer ${isPrintMode ? 'print-mode' : ''}`} ref={printContentRef}>
      {/* Header with search and platform toggle */}
      <div className="shortcuts-header">
        <div className="search-container">
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="sm"
            leftIcon={
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            }
            className="search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="header-actions">
          {/* Platform toggle */}
          <button
            type="button"
            className="platform-toggle"
            onClick={togglePlatform}
            aria-label={`Show ${platform === 'mac' ? 'Windows' : 'Mac'} shortcuts`}
            title={`Currently showing ${platform === 'mac' ? 'Mac' : 'Windows'} shortcuts. Click to switch.`}
          >
            <span className={`platform-option ${platform === 'mac' ? 'active' : ''}`}>
              <MacIcon />
              <span>Mac</span>
            </span>
            <span className={`platform-option ${platform === 'windows' ? 'active' : ''}`}>
              <WindowsIcon />
              <span>Win</span>
            </span>
          </button>

          {/* Print button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrint}
            leftIcon={
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
            }
          >
            Print
          </Button>
        </div>
      </div>

      {/* Category filters */}
      <div className="category-filters">
        <button
          type="button"
          className={`category-filter ${activeCategory === null ? 'active' : ''}`}
          onClick={() => setActiveCategory(null)}
        >
          All
        </button>
        {KEYBOARD_SHORTCUTS.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`category-filter ${activeCategory === category.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(activeCategory === category.id ? null : category.id)}
          >
            {category.title}
          </button>
        ))}
      </div>

      {/* Shortcuts content */}
      <div className="shortcuts-content">
        {filteredCategories.length > 0 ? (
          filteredCategories.map(renderCategory)
        ) : (
          <div className="no-results">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
              <path d="M8 8l6 6M14 8l-6 6" />
            </svg>
            <p>No shortcuts found for "{searchQuery}"</p>
            <button type="button" className="clear-search-link" onClick={() => setSearchQuery('')}>
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="shortcuts-footer">
        <div className="footer-hint">
          <kbd className="shortcut-key">⌘</kbd>
          <span>+</span>
          <kbd className="shortcut-key">/</kbd>
          <span className="hint-text">to open this dialog</span>
        </div>
        <div className="footer-stats">
          {filteredCategories.reduce((acc, cat) => acc + cat.shortcuts.length, 0)} shortcuts
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      size="lg"
    >
      {modalContent}
    </Modal>
  );
}

KeyboardShortcutsViewer.displayName = 'KeyboardShortcutsViewer';
