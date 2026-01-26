/**
 * Table of Contents Sidebar Component
 *
 * A sidebar panel that displays a document outline based on headings.
 * Features:
 * - Lists all H1, H2, H3 headings
 * - Click to scroll to heading
 * - Current section highlighted
 * - Collapsible nested structure
 * - Empty state when no headings
 */

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTableOfContentsStore } from '../stores/tableOfContents';
import { TableOfContentsItem } from './TableOfContentsItem';
import './TableOfContentsSidebar.css';

// Icons
const ListTreeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M3 5h18M3 12h12M3 19h8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="19" cy="12" r="2" stroke="currentColor" strokeWidth="2" />
    <circle cx="15" cy="19" r="2" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M18 6L6 18M6 6l12 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ExpandIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 4h16v16H4zM4 8h16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CollapseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 4h16v4H4zM4 12h16v8H4z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DocumentIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 2v6h6M8 13h8M8 17h4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function TableOfContentsSidebar() {
  const {
    isOpen,
    headings,
    activeHeadingId,
    closePanel,
    toggleHeadingExpanded,
    expandAllHeadings,
    collapseAllHeadings,
    navigateToHeading,
  } = useTableOfContentsStore();

  const handleToggleExpanded = useCallback(
    (headingId: string) => {
      toggleHeadingExpanded(headingId);
    },
    [toggleHeadingExpanded]
  );

  const hasHeadings = headings.length > 0;
  const hasMultipleLevels = headings.some((h) => h.children.length > 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          className="toc-sidebar"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          role="complementary"
          aria-label="Table of Contents"
        >
          {/* Header */}
          <div className="toc-sidebar-header">
            <div className="toc-sidebar-title">
              <ListTreeIcon />
              <h2>Table of Contents</h2>
            </div>
            <div className="toc-sidebar-actions">
              {hasMultipleLevels && (
                <>
                  <button
                    type="button"
                    className="toc-action-btn"
                    onClick={expandAllHeadings}
                    title="Expand all sections"
                    aria-label="Expand all sections"
                  >
                    <ExpandIcon />
                  </button>
                  <button
                    type="button"
                    className="toc-action-btn"
                    onClick={collapseAllHeadings}
                    title="Collapse all sections"
                    aria-label="Collapse all sections"
                  >
                    <CollapseIcon />
                  </button>
                </>
              )}
              <button
                type="button"
                className="toc-close-btn"
                onClick={closePanel}
                title="Close table of contents"
                aria-label="Close table of contents"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          {/* Content */}
          <nav className="toc-sidebar-content" aria-label="Document sections">
            {hasHeadings ? (
              <div className="toc-list" role="tree">
                {headings.map((heading) => (
                  <TableOfContentsItem
                    key={heading.id}
                    heading={heading}
                    activeHeadingId={activeHeadingId}
                    onToggleExpanded={handleToggleExpanded}
                    onNavigate={navigateToHeading}
                  />
                ))}
              </div>
            ) : (
              <div className="toc-empty-state">
                <DocumentIcon />
                <h3>No headings found</h3>
                <p>
                  Add headings to your document using markdown syntax:
                </p>
                <div className="toc-empty-examples">
                  <code># Heading 1</code>
                  <code>## Heading 2</code>
                  <code>### Heading 3</code>
                </div>
              </div>
            )}
          </nav>

          {/* Footer with count */}
          {hasHeadings && (
            <div className="toc-sidebar-footer">
              <span className="toc-count">
                {headings.length} section{headings.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

TableOfContentsSidebar.displayName = 'TableOfContentsSidebar';
