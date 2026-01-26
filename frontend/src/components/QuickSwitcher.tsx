import { useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuickSwitcherStore, type RecentDocument } from '../stores/quickSwitcher';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { fuzzySearch, highlightMatch } from '../utils/fuzzySearch';
import './QuickSwitcher.css';

// Document type icons
const typeIcons: Record<RecentDocument['type'], React.ReactNode> = {
  receipt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z" />
      <path d="M8 6h8M8 10h8M8 14h4" />
    </svg>
  ),
  transaction: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  budget: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  ),
  paycheck: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <path d="M1 10h22" />
    </svg>
  ),
  document: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  ),
};

// Type labels for display
const typeLabels: Record<RecentDocument['type'], string> = {
  receipt: 'Receipt',
  transaction: 'Transaction',
  budget: 'Budget',
  paycheck: 'Paycheck',
  document: 'Document',
};

// Format relative time
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return days === 1 ? 'Yesterday' : `${days} days ago`;
  }
  if (hours > 0) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  if (minutes > 0) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  }
  return 'Just now';
}

// Highlight text component
function HighlightedText({ text, query }: { text: string; query: string }) {
  const parts = highlightMatch(query, text);

  return (
    <>
      {parts.map((part, i) =>
        part.matched ? (
          <span key={i} className="match">{part.text}</span>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}

// Document item component
function DocumentItem({
  document,
  isSelected,
  query,
  onSelect,
  onMouseEnter,
}: {
  document: RecentDocument;
  isSelected: boolean;
  query: string;
  onSelect: () => void;
  onMouseEnter: () => void;
}) {
  const itemRef = useRef<HTMLDivElement>(null);

  // Scroll into view when selected
  useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [isSelected]);

  return (
    <div
      ref={itemRef}
      className={`quick-switcher-item ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      role="option"
      aria-selected={isSelected}
    >
      <div className="quick-switcher-item-icon">
        {typeIcons[document.type]}
      </div>
      <div className="quick-switcher-item-content">
        <div className="quick-switcher-item-title">
          <HighlightedText text={document.title} query={query} />
        </div>
        <div className="quick-switcher-item-meta">
          <span className="quick-switcher-item-type">{typeLabels[document.type]}</span>
          <span className="quick-switcher-item-separator">·</span>
          <span className="quick-switcher-item-time">{formatRelativeTime(document.lastEditedAt)}</span>
        </div>
      </div>
    </div>
  );
}

export function QuickSwitcher() {
  const {
    isOpen,
    searchQuery,
    selectedIndex,
    recentDocuments,
    closeSwitcher,
    setSearchQuery,
    setSelectedIndex,
  } = useQuickSwitcherStore();

  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use focus trap for proper focus management
  useFocusTrap(containerRef, {
    isActive: isOpen,
    onEscape: closeSwitcher,
    initialFocusRef: inputRef,
    autoFocus: true,
  });

  // Filter documents based on search query
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) {
      return recentDocuments;
    }

    const searchableItems = recentDocuments.map(doc => ({
      item: doc,
      searchText: doc.title,
      keywords: [typeLabels[doc.type]],
    }));

    const results = fuzzySearch(searchQuery, searchableItems);
    return results.map(r => r.item);
  }, [recentDocuments, searchQuery]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Navigate to document
  const navigateToDocument = useCallback(
    (doc: RecentDocument) => {
      closeSwitcher();

      // Navigate based on document type
      switch (doc.type) {
        case 'receipt':
          navigate(`/receipts/${doc.id}`);
          break;
        case 'transaction':
          navigate(`/transactions/${doc.id}`);
          break;
        case 'budget':
          navigate(`/budgets/${doc.id}`);
          break;
        case 'paycheck':
          navigate(`/paychecks/${doc.id}`);
          break;
        case 'document':
        default:
          if (doc.path) {
            navigate(doc.path);
          }
          break;
      }
    },
    [navigate, closeSwitcher]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(Math.min(selectedIndex + 1, filteredDocuments.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(Math.max(selectedIndex - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredDocuments[selectedIndex]) {
            navigateToDocument(filteredDocuments[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          closeSwitcher();
          break;
      }
    },
    [selectedIndex, filteredDocuments, setSelectedIndex, closeSwitcher, navigateToDocument]
  );

  // Handle overlay click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        closeSwitcher();
      }
    },
    [closeSwitcher]
  );

  if (!isOpen) return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="quick-switcher-overlay"
          onClick={handleOverlayClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            ref={containerRef}
            className="quick-switcher"
            role="dialog"
            aria-modal="true"
            aria-label="Quick switcher"
            onKeyDown={handleKeyDown}
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {/* Search Header */}
            <div className="quick-switcher-header">
              <svg
                className="quick-switcher-search-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                className="quick-switcher-input"
                placeholder="Search recent documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search recent documents"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
              <div className="quick-switcher-shortcut-hint">
                <kbd>Esc</kbd>
                <span>to close</span>
              </div>
            </div>

            {/* Results */}
            <div
              className="quick-switcher-results"
              role="listbox"
              aria-label="Recent documents"
            >
              {filteredDocuments.length === 0 ? (
                <div className="quick-switcher-empty">
                  <svg
                    className="quick-switcher-empty-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                  </svg>
                  <p className="quick-switcher-empty-text">
                    {searchQuery ? 'No documents found' : 'No recent documents'}
                  </p>
                  <p className="quick-switcher-empty-hint">
                    {searchQuery ? 'Try a different search term' : 'Documents you open will appear here'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="quick-switcher-group-header">
                    <svg
                      className="quick-switcher-recent-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    Recent
                  </div>
                  {filteredDocuments.map((doc, index) => (
                    <DocumentItem
                      key={doc.id}
                      document={doc}
                      isSelected={index === selectedIndex}
                      query={searchQuery}
                      onSelect={() => navigateToDocument(doc)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    />
                  ))}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="quick-switcher-footer">
              <div className="quick-switcher-footer-hint">
                <kbd>↑</kbd>
                <kbd>↓</kbd>
                <span>to navigate</span>
              </div>
              <div className="quick-switcher-footer-hint">
                <kbd>↵</kbd>
                <span>to open</span>
              </div>
              <div className="quick-switcher-footer-hint">
                <kbd>esc</kbd>
                <span>to close</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}

QuickSwitcher.displayName = 'QuickSwitcher';
