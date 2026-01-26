/**
 * AnnotationsPanel Component
 *
 * Displays private annotations for a document in a sidebar panel.
 * Supports adding, editing, deleting, and exporting annotations.
 */

import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useSyncExternalStore,
} from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  useBlockAnnotationsStore,
  useDocumentAnnotations,
  type AnnotationSortOrder,
  type AnnotationExportFormat,
  type BlockAnnotation,
} from '../stores/blockAnnotations';
import { toast } from '../stores/toast';
import { EmptyState, CommentIllustration } from './ui/EmptyState';
import './AnnotationsPanel.css';

// Icons
const NoteIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M16 13H8M16 17H8M10 9H8" />
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M10.5 1.5l2 2-7 7H3.5v-2l7-7z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DeleteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M3 4h8M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M11 4v7a1 1 0 01-1 1H4a1 1 0 01-1-1V4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ExportIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M7 2v7M4 6l3 3 3-3M2 12h10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CollapseIcon = ({ isCollapsed }: { isCollapsed: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    className={`annotations-collapse-icon ${isCollapsed ? 'collapsed' : ''}`}
    aria-hidden="true"
  >
    <path
      d={isCollapsed ? "M6 4l4 4-4 4" : "M10 4l-4 4 4 4"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function getReducedMotionSnapshot() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function subscribeToReducedMotion(callback: () => void) {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );
}

const SORT_OPTIONS: { value: AnnotationSortOrder; label: string; icon: string }[] = [
  { value: 'newest', label: 'Newest', icon: '↓' },
  { value: 'oldest', label: 'Oldest', icon: '↑' },
  { value: 'block-order', label: 'Position', icon: '#' },
];

const EXPORT_OPTIONS: { value: AnnotationExportFormat; label: string }[] = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'json', label: 'JSON' },
  { value: 'csv', label: 'CSV' },
];

interface AnnotationsPanelProps {
  /** ID of the document to show annotations for */
  documentId: string;
  /** Title of the document (used for export) */
  documentTitle?: string;
  /** Optional class name for styling */
  className?: string;
  /** Whether the panel is collapsed */
  isCollapsed?: boolean;
  /** Callback when collapse state changes */
  onToggleCollapse?: () => void;
  /** Blocks for sorting by position */
  blocks?: { id: string }[];
}

export function AnnotationsPanel({
  documentId,
  documentTitle = 'Document',
  className = '',
  isCollapsed = false,
  onToggleCollapse,
  blocks,
}: AnnotationsPanelProps) {
  const prefersReducedMotion = useReducedMotion();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const {
    count,
    _annotations,
    _sortOrder,
  } = useDocumentAnnotations(documentId);

  const {
    focusAnnotation,
    highlightBlock,
    updateAnnotation,
    deleteAnnotation,
    exportAnnotations,
    setSortOrder,
    getSortedAnnotations,
    focusedAnnotationId,
    sortOrder,
  } = useBlockAnnotationsStore();

  // Get sorted annotations
  const sortedAnnotations = useMemo(() => {
    return getSortedAnnotations(documentId, blocks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, getSortedAnnotations, blocks, _annotations, _sortOrder]);

  // Handle sort change
  const handleSortChange = useCallback((newSort: AnnotationSortOrder) => {
    setSortOrder(newSort);
  }, [setSortOrder]);

  // Handle annotation click - focus and highlight
  const handleAnnotationClick = useCallback((annotation: BlockAnnotation) => {
    focusAnnotation(annotation.id);
    highlightBlock(annotation.blockId);

    // Scroll the block into view
    const blockElement = document.querySelector(`[data-block-id="${annotation.blockId}"]`);
    if (blockElement) {
      blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusAnnotation, highlightBlock]);

  // Handle annotation hover
  const handleAnnotationMouseEnter = useCallback((annotation: BlockAnnotation) => {
    highlightBlock(annotation.blockId);
  }, [highlightBlock]);

  const handleAnnotationMouseLeave = useCallback(() => {
    // Only clear if not focused
    const state = useBlockAnnotationsStore.getState();
    if (!state.focusedAnnotationId) {
      highlightBlock(null);
    }
  }, [highlightBlock]);

  // Handle edit
  const handleEditStart = useCallback((annotation: BlockAnnotation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(annotation.id);
    setEditText(annotation.text);
  }, []);

  const handleEditSave = useCallback(() => {
    if (editingId && editText.trim()) {
      updateAnnotation(editingId, editText.trim());
      toast.success('Note updated');
    }
    setEditingId(null);
    setEditText('');
  }, [editingId, editText, updateAnnotation]);

  const handleEditCancel = useCallback(() => {
    setEditingId(null);
    setEditText('');
  }, []);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  }, [handleEditSave, handleEditCancel]);

  // Handle delete
  const handleDelete = useCallback((annotationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteAnnotation(annotationId);
    toast.success('Note deleted');
  }, [deleteAnnotation]);

  // Handle export
  const handleExport = useCallback((format: AnnotationExportFormat) => {
    const content = exportAnnotations(documentId, format, documentTitle);

    // Create and download file
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const extension = format === 'markdown' ? 'md' : format;
    link.download = `${documentTitle.replace(/[^a-z0-9]/gi, '-')}-notes.${extension}`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Notes exported as ${format.toUpperCase()}`);
    setShowExportMenu(false);
  }, [documentId, documentTitle, exportAnnotations]);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Close export menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu]);

  // Get current sort option
  const currentSortOption = SORT_OPTIONS.find(opt => opt.value === sortOrder);

  // Collapsed state
  if (isCollapsed) {
    return (
      <div className={`annotations-panel annotations-panel-collapsed ${className}`}>
        {onToggleCollapse && (
          <button
            className="annotations-collapse-toggle annotations-collapse-toggle-collapsed"
            onClick={onToggleCollapse}
            aria-label="Expand notes panel"
            title="Expand notes panel"
          >
            <CollapseIcon isCollapsed={isCollapsed} />
          </button>
        )}
        <div className="annotations-panel-collapsed-content">
          <NoteIcon />
          {count > 0 && (
            <span className="annotations-badge-collapsed">{count}</span>
          )}
        </div>
      </div>
    );
  }

  // Empty state
  if (count === 0) {
    return (
      <div className={`annotations-panel annotations-panel-empty ${className}`}>
        {onToggleCollapse && (
          <button
            className="annotations-collapse-toggle"
            onClick={onToggleCollapse}
            aria-label="Collapse notes panel"
            title="Collapse notes panel"
          >
            <CollapseIcon isCollapsed={isCollapsed} />
          </button>
        )}
        <div className="annotations-panel-header">
          <div className="annotations-panel-title">
            <NoteIcon />
            <span>Notes</span>
          </div>
        </div>
        <EmptyState
          illustration={<CommentIllustration />}
          title="No notes yet"
          description="Hover over a paragraph and click the note icon to add private annotations."
          size="small"
          className="annotations-empty-state-enhanced"
        />
      </div>
    );
  }

  return (
    <motion.div
      className={`annotations-panel ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Collapse toggle button */}
      {onToggleCollapse && (
        <button
          className="annotations-collapse-toggle"
          onClick={onToggleCollapse}
          aria-label="Collapse notes panel"
          title="Collapse notes panel"
        >
          <CollapseIcon isCollapsed={isCollapsed} />
        </button>
      )}

      {/* Header */}
      <div className="annotations-panel-header">
        <div className="annotations-panel-title">
          <NoteIcon />
          <span>Notes</span>
          <span className="annotations-badge">{count}</span>
        </div>
        <div className="annotations-actions">
          {/* Sort dropdown */}
          <div className="annotations-sort-dropdown">
            <button
              type="button"
              className="annotations-sort-trigger"
              aria-haspopup="listbox"
              aria-label={`Sort by ${currentSortOption?.label}`}
            >
              <span className="sort-icon">{currentSortOption?.icon}</span>
              <span className="sort-value">{currentSortOption?.label}</span>
              <svg className="sort-chevron" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <select
              className="annotations-sort-select"
              value={sortOrder}
              onChange={(e) => handleSortChange(e.target.value as AnnotationSortOrder)}
              aria-label="Sort notes by"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Export button */}
          <div className="annotations-export-wrapper" ref={exportMenuRef}>
            <button
              type="button"
              className="annotations-export-button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              aria-label="Export notes"
              title="Export notes"
            >
              <ExportIcon />
            </button>
            {showExportMenu && (
              <div className="annotations-export-menu">
                {EXPORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="annotations-export-option"
                    onClick={() => handleExport(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Annotations list */}
      <div className="annotations-list">
        <LayoutGroup>
          <AnimatePresence mode="popLayout">
            {sortedAnnotations.map((annotation, index) => {
              const isFocused = focusedAnnotationId === annotation.id;
              const isEditing = editingId === annotation.id;

              return (
                <motion.div
                  key={annotation.id}
                  layoutId={annotation.id}
                  className={`annotation-item ${isFocused ? 'annotation-focused' : ''}`}
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.95 }}
                  transition={{
                    layout: { duration: 0.3, type: 'spring', stiffness: 500, damping: 30 },
                    opacity: { duration: 0.2 },
                    y: { duration: 0.2 },
                    scale: { duration: 0.2 },
                    delay: prefersReducedMotion ? 0 : index * 0.03,
                  }}
                  style={{
                    '--annotation-color': annotation.color,
                  } as React.CSSProperties}
                  onClick={() => !isEditing && handleAnnotationClick(annotation)}
                  onMouseEnter={() => handleAnnotationMouseEnter(annotation)}
                  onMouseLeave={handleAnnotationMouseLeave}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
                      handleAnnotationClick(annotation);
                    }
                  }}
                >
                  <div className="annotation-indicator" />
                  <div className="annotation-content">
                    <div className="annotation-meta">
                      <span className="annotation-time">
                        {new Date(annotation.createdAt).toLocaleDateString()}
                      </span>
                      {annotation.updatedAt !== annotation.createdAt && (
                        <span className="annotation-edited">(edited)</span>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="annotation-edit-container">
                        <textarea
                          ref={editInputRef}
                          className="annotation-edit-input"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          onClick={(e) => e.stopPropagation()}
                          rows={3}
                        />
                        <div className="annotation-edit-actions">
                          <button
                            type="button"
                            className="annotation-edit-save"
                            onClick={handleEditSave}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="annotation-edit-cancel"
                            onClick={handleEditCancel}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="annotation-text">{annotation.text}</p>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="annotation-actions">
                      <button
                        type="button"
                        className="annotation-action-button"
                        onClick={(e) => handleEditStart(annotation, e)}
                        aria-label="Edit note"
                        title="Edit"
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        className="annotation-action-button annotation-action-delete"
                        onClick={(e) => handleDelete(annotation.id, e)}
                        aria-label="Delete note"
                        title="Delete"
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </LayoutGroup>
      </div>
    </motion.div>
  );
}

AnnotationsPanel.displayName = 'AnnotationsPanel';
