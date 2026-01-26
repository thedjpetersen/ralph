/**
 * Editor History Panel
 *
 * Displays edit timeline with ability to:
 * - See full history of changes
 * - Click any point to restore
 * - Preview changes on hover
 * - Visual indication of current position
 */

import { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useEditorHistory,
  type HistoryEntry,
  type EditType,
  getEditTypeLabel,
} from '../stores/editorHistory';
import { MarkdownPreview } from './MarkdownPreview';
import './EditorHistoryPanel.css';

/**
 * Format a timestamp as a relative time string
 */
function formatTimeAgo(timestamp: number, now: number): string {
  const seconds = Math.floor((now - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

// Icons for different edit types
function EditTypeIcon({ type }: { type: EditType }) {
  switch (type) {
    case 'text':
      return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M3 12h10M3 8h10M3 4h6" strokeLinecap="round" />
        </svg>
      );
    case 'format':
      return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M4 3v10M4 3h5a2 2 0 110 4H4m0 0h6a2 2 0 110 4H4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'block-reorder':
      return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M3 4h10M3 8h10M3 12h10" strokeLinecap="round" />
          <path d="M12 2l2 2-2 2M4 10l-2 2 2 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'ai-rewrite':
    case 'ai-suggestion':
      return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M8 2v2M8 12v2M2 8h2M12 8h2" strokeLinecap="round" />
          <circle cx="8" cy="8" r="3" />
        </svg>
      );
    case 'paste':
      return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="5" y="5" width="8" height="9" rx="1" />
          <path d="M3 10V3a1 1 0 011-1h6" strokeLinecap="round" />
        </svg>
      );
    case 'cut':
      return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="4" cy="11" r="2" />
          <circle cx="12" cy="11" r="2" />
          <path d="M5.5 9.5L12 3M10.5 9.5L4 3" strokeLinecap="round" />
        </svg>
      );
    case 'delete':
      return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'insert':
      return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M8 3v10M3 8h10" strokeLinecap="round" />
        </svg>
      );
    case 'initial':
      return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="3" y="2" width="10" height="12" rx="1" />
          <path d="M6 5h4M6 8h4M6 11h2" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="8" cy="8" r="6" />
        </svg>
      );
  }
}

interface HistoryEntryItemProps {
  entry: HistoryEntry;
  index: number;
  isCurrent: boolean;
  isInUndo: boolean;
  isInRedo: boolean;
  isPreviewActive: boolean;
  onSelect: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}

function HistoryEntryItem({
  entry,
  index,
  isCurrent,
  isInUndo,
  isInRedo,
  isPreviewActive,
  onSelect,
  onHoverStart,
  onHoverEnd,
}: HistoryEntryItemProps) {
  // Track current time for relative time display
  const [now, setNow] = useState(() => Date.now());

  // Update time every minute to refresh relative times
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const timeAgo = formatTimeAgo(entry.timestamp, now);

  const formattedTime = useMemo(() => {
    return new Date(entry.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [entry.timestamp]);

  return (
    <div
      className={`history-entry ${isCurrent ? 'current' : ''} ${isInUndo ? 'in-undo' : ''} ${isInRedo ? 'in-redo' : ''} ${isPreviewActive ? 'previewing' : ''}`}
      onClick={onSelect}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      aria-label={`${entry.description} - ${timeAgo}${isCurrent ? ' (current)' : ''}`}
    >
      <div className="history-entry-timeline">
        <div className="history-entry-line history-entry-line-top" />
        <div className={`history-entry-dot ${entry.type}`}>
          <EditTypeIcon type={entry.type} />
        </div>
        <div className="history-entry-line history-entry-line-bottom" />
      </div>

      <div className="history-entry-content">
        <div className="history-entry-header">
          <span className={`history-entry-type ${entry.type}`}>
            {getEditTypeLabel(entry.type)}
          </span>
          <span className="history-entry-time" title={formattedTime}>
            {timeAgo}
          </span>
        </div>
        <p className="history-entry-description">{entry.description}</p>
        {isCurrent && (
          <span className="history-entry-current-badge">Current</span>
        )}
      </div>

      <div className="history-entry-index">#{index + 1}</div>
    </div>
  );
}

interface PreviewPanelProps {
  entry: HistoryEntry;
}

function PreviewPanel({ entry }: PreviewPanelProps) {
  return (
    <motion.div
      className="history-preview-panel"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.15 }}
    >
      <div className="history-preview-header">
        <span className="history-preview-title">Preview</span>
        <span className={`history-preview-type ${entry.type}`}>
          {getEditTypeLabel(entry.type)}
        </span>
      </div>
      <div className="history-preview-content">
        <MarkdownPreview content={entry.content.substring(0, 500) + (entry.content.length > 500 ? '...' : '')} />
      </div>
      <div className="history-preview-footer">
        <span className="history-preview-hint">Click to restore this version</span>
      </div>
    </motion.div>
  );
}

interface EditorHistoryPanelProps {
  onRestore?: (content: string) => void;
}

export function EditorHistoryPanel({ onRestore }: EditorHistoryPanelProps) {
  const {
    history,
    currentIndex,
    isPanelOpen,
    previewEntryId,
    canUndo,
    canRedo,
    closePanel,
    jumpToEntry,
    setPreviewEntry,
    undo,
    redo,
  } = useEditorHistory();

  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Get preview entry
  const previewEntry = useMemo(() => {
    if (!previewEntryId) return null;
    return history.find((e) => e.id === previewEntryId) || null;
  }, [history, previewEntryId]);

  // Handle selecting an entry
  const handleSelectEntry = useCallback(
    (entryId: string) => {
      const entry = jumpToEntry(entryId);
      if (entry && onRestore) {
        onRestore(entry.content);
      }
    },
    [jumpToEntry, onRestore]
  );

  // Handle undo with callback
  const handleUndo = useCallback(() => {
    const entry = undo();
    if (entry && onRestore) {
      onRestore(entry.content);
    }
  }, [undo, onRestore]);

  // Handle redo with callback
  const handleRedo = useCallback(() => {
    const entry = redo();
    if (entry && onRestore) {
      onRestore(entry.content);
    }
  }, [redo, onRestore]);

  // Keyboard shortcuts within panel
  useEffect(() => {
    if (!isPanelOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePanel();
      }

      // Cmd/Ctrl + Z for undo within panel
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      // Cmd/Ctrl + Shift + Z for redo within panel
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPanelOpen, closePanel, handleUndo, handleRedo]);

  // Click outside to close
  useEffect(() => {
    if (!isPanelOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePanel();
      }
    };

    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPanelOpen, closePanel]);

  // Scroll current entry into view when panel opens
  useEffect(() => {
    if (isPanelOpen && listRef.current && currentIndex >= 0) {
      const currentElement = listRef.current.querySelector('.history-entry.current');
      if (currentElement) {
        currentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [isPanelOpen, currentIndex]);

  if (!isPanelOpen) return null;

  // Reverse history so newest is at top
  const reversedHistory = [...history].reverse();

  return (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        className="editor-history-panel"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2 }}
        role="complementary"
        aria-label="Edit History"
      >
        {/* Header */}
        <div className="history-panel-header">
          <div className="history-panel-title-row">
            <svg
              className="history-panel-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" strokeLinecap="round" />
            </svg>
            <h3 className="history-panel-title">Edit History</h3>
          </div>
          <button
            type="button"
            className="history-panel-close"
            onClick={closePanel}
            aria-label="Close panel"
          >
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Quick actions */}
        <div className="history-panel-actions">
          <button
            type="button"
            className="history-action-btn"
            onClick={handleUndo}
            disabled={!canUndo}
            aria-label="Undo"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M3 6h7a4 4 0 110 8H6M3 6l3-3M3 6l3 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Undo
          </button>
          <button
            type="button"
            className="history-action-btn"
            onClick={handleRedo}
            disabled={!canRedo}
            aria-label="Redo"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M13 6H6a4 4 0 100 8h4M13 6l-3-3M13 6l-3 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Redo
          </button>
        </div>

        {/* Stats */}
        <div className="history-panel-stats">
          <div className="history-stat">
            <span className="history-stat-value">{history.length}</span>
            <span className="history-stat-label">Changes</span>
          </div>
          <div className="history-stat">
            <span className="history-stat-value">{currentIndex}</span>
            <span className="history-stat-label">Undos left</span>
          </div>
          <div className="history-stat">
            <span className="history-stat-value">{history.length - 1 - currentIndex}</span>
            <span className="history-stat-label">Redos left</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="history-panel-timeline" ref={listRef}>
          {reversedHistory.length === 0 ? (
            <div className="history-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" strokeLinecap="round" />
              </svg>
              <p>No history yet</p>
              <span>Start editing to build your history</span>
            </div>
          ) : (
            reversedHistory.map((entry, reversedIdx) => {
              const originalIndex = history.length - 1 - reversedIdx;
              const isCurrent = originalIndex === currentIndex;
              const isInUndo = originalIndex < currentIndex;
              const isInRedo = originalIndex > currentIndex;
              const isPreviewActive = previewEntryId === entry.id;

              return (
                <HistoryEntryItem
                  key={entry.id}
                  entry={entry}
                  index={originalIndex}
                  isCurrent={isCurrent}
                  isInUndo={isInUndo}
                  isInRedo={isInRedo}
                  isPreviewActive={isPreviewActive}
                  onSelect={() => handleSelectEntry(entry.id)}
                  onHoverStart={() => setPreviewEntry(entry.id)}
                  onHoverEnd={() => setPreviewEntry(null)}
                />
              );
            })
          )}
        </div>

        {/* Preview panel */}
        <AnimatePresence>
          {previewEntry && (
            <PreviewPanel entry={previewEntry} />
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="history-panel-footer">
          <kbd>⌘Z</kbd> undo
          <span className="history-footer-divider">|</span>
          <kbd>⌘⇧Z</kbd> redo
          <span className="history-footer-divider">|</span>
          <kbd>Esc</kbd> close
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

EditorHistoryPanel.displayName = 'EditorHistoryPanel';
