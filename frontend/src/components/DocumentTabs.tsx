import { useCallback, useRef, useEffect, useState } from 'react';
import { useOpenDocumentsStore, type OpenDocument } from '../stores/openDocuments';
import { ContextMenu, type ContextMenuItem } from './ui/ContextMenu';
import './DocumentTabs.css';

// Icons
const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path
      d="M3 3l6 6M9 3l-6 6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M9 3L5 7l4 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M5 3l4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface DocumentTabProps {
  document: OpenDocument;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function DocumentTab({ document, isActive, onActivate, onClose, onContextMenu }: DocumentTabProps) {
  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  }, [onClose]);

  const handleMiddleClick = useCallback((e: React.MouseEvent) => {
    // Middle mouse button
    if (e.button === 1) {
      e.preventDefault();
      onClose();
    }
  }, [onClose]);

  return (
    <div
      className={`document-tab ${isActive ? 'document-tab-active' : ''} ${document.isModified ? 'document-tab-modified' : ''}`}
      onClick={onActivate}
      onMouseDown={handleMiddleClick}
      onContextMenu={onContextMenu}
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      title={document.path || document.title}
    >
      <span className="document-tab-title">
        {document.title}
      </span>
      {document.isModified && (
        <span className="document-tab-modified-indicator" aria-label="Unsaved changes" />
      )}
      <button
        className="document-tab-close"
        onClick={handleClose}
        aria-label={`Close ${document.title}`}
        tabIndex={-1}
      >
        <CloseIcon />
      </button>
    </div>
  );
}

export function DocumentTabs() {
  const {
    openDocuments,
    activeDocumentId,
    setActiveDocument,
    closeDocument,
    closeAllDocuments,
    closeOtherDocuments,
  } = useOpenDocumentsStore();

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const [contextMenuDoc, setContextMenuDoc] = useState<OpenDocument | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

  // Update scroll indicators
  const updateScrollIndicators = useCallback(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftScroll(scrollLeft > 0);
    setShowRightScroll(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  // Scroll to active tab
  useEffect(() => {
    if (!activeDocumentId || !tabsContainerRef.current) return;

    const activeTab = tabsContainerRef.current.querySelector('.document-tab-active');
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeDocumentId]);

  // Update scroll indicators on mount and resize
  useEffect(() => {
    updateScrollIndicators();

    const container = tabsContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollIndicators);
      window.addEventListener('resize', updateScrollIndicators);

      return () => {
        container.removeEventListener('scroll', updateScrollIndicators);
        window.removeEventListener('resize', updateScrollIndicators);
      };
    }
  }, [updateScrollIndicators, openDocuments.length]);

  const handleScrollLeft = useCallback(() => {
    const container = tabsContainerRef.current;
    if (container) {
      container.scrollBy({ left: -200, behavior: 'smooth' });
    }
  }, []);

  const handleScrollRight = useCallback(() => {
    const container = tabsContainerRef.current;
    if (container) {
      container.scrollBy({ left: 200, behavior: 'smooth' });
    }
  }, []);

  const handleContextMenu = useCallback((doc: OpenDocument) => (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuDoc(doc);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setIsContextMenuOpen(true);
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setIsContextMenuOpen(false);
    setContextMenuDoc(null);
  }, []);

  const contextMenuItems: ContextMenuItem[] = contextMenuDoc ? [
    {
      id: 'close',
      label: 'Close',
      shortcut: '⌘W',
      onClick: () => {
        closeDocument(contextMenuDoc.id);
        handleCloseContextMenu();
      },
    },
    {
      id: 'close-others',
      label: 'Close Others',
      onClick: () => {
        closeOtherDocuments(contextMenuDoc.id);
        handleCloseContextMenu();
      },
      disabled: openDocuments.length <= 1,
    },
    {
      id: 'close-all',
      label: 'Close All',
      onClick: () => {
        closeAllDocuments();
        handleCloseContextMenu();
      },
    },
  ] : [];

  // Don't render if no documents or only one document
  if (openDocuments.length <= 1) {
    return null;
  }

  return (
    <div className="document-tabs-wrapper" role="tablist" aria-label="Open documents">
      {showLeftScroll && (
        <button
          className="document-tabs-scroll document-tabs-scroll-left"
          onClick={handleScrollLeft}
          aria-label="Scroll tabs left"
        >
          <ChevronLeftIcon />
        </button>
      )}

      <div
        className="document-tabs-container"
        ref={tabsContainerRef}
      >
        {openDocuments.map((doc) => (
          <DocumentTab
            key={doc.id}
            document={doc}
            isActive={doc.id === activeDocumentId}
            onActivate={() => setActiveDocument(doc.id)}
            onClose={() => closeDocument(doc.id)}
            onContextMenu={handleContextMenu(doc)}
          />
        ))}
      </div>

      {showRightScroll && (
        <button
          className="document-tabs-scroll document-tabs-scroll-right"
          onClick={handleScrollRight}
          aria-label="Scroll tabs right"
        >
          <ChevronRightIcon />
        </button>
      )}

      <ContextMenu
        isOpen={isContextMenuOpen}
        position={contextMenuPosition}
        items={contextMenuItems}
        onClose={handleCloseContextMenu}
        header={contextMenuDoc?.title}
      />
    </div>
  );
}
