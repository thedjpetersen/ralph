/**
 * Table of Contents Item Component
 *
 * Renders a single heading in the TOC tree with expand/collapse functionality.
 * Supports H1-H3 levels with appropriate visual styling and active state.
 */

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TOCHeading } from '../stores/tableOfContents';
import './TableOfContentsItem.css';

// Icons
const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M6 4l4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const HeadingIcon = ({ level }: { level: number }) => {
  return (
    <span className={`toc-item-heading-icon level-${level}`} aria-hidden="true">
      H{level}
    </span>
  );
};

interface TableOfContentsItemProps {
  heading: TOCHeading;
  activeHeadingId: string | null;
  onToggleExpanded: (headingId: string) => void;
  onNavigate: (heading: TOCHeading) => void;
  depth?: number;
}

export function TableOfContentsItem({
  heading,
  activeHeadingId,
  onToggleExpanded,
  onNavigate,
  depth = 0,
}: TableOfContentsItemProps) {
  const hasChildren = heading.children.length > 0;
  const isActive = heading.id === activeHeadingId;

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasChildren) {
        onToggleExpanded(heading.id);
      }
    },
    [hasChildren, onToggleExpanded, heading.id]
  );

  const handleNavigate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onNavigate(heading);
    },
    [onNavigate, heading]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onNavigate(heading);
      } else if (e.key === ' ' && hasChildren) {
        e.preventDefault();
        onToggleExpanded(heading.id);
      }
    },
    [hasChildren, onToggleExpanded, heading, onNavigate]
  );

  return (
    <div className="toc-item" data-level={heading.level}>
      <div
        className={`toc-item-header ${hasChildren ? 'expandable' : ''} ${heading.expanded ? 'expanded' : ''} ${isActive ? 'active' : ''}`}
        onClick={handleNavigate}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={hasChildren ? heading.expanded : undefined}
        aria-current={isActive ? 'location' : undefined}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <div className="toc-item-toggle">
          {hasChildren ? (
            <motion.button
              type="button"
              className="toc-item-chevron-btn"
              onClick={handleToggle}
              animate={{ rotate: heading.expanded ? 90 : 0 }}
              transition={{ duration: 0.15 }}
              aria-label={heading.expanded ? 'Collapse section' : 'Expand section'}
            >
              <ChevronRightIcon />
            </motion.button>
          ) : (
            <span className="toc-item-spacer" />
          )}
        </div>

        <HeadingIcon level={heading.level} />

        <span className="toc-item-title" title={heading.title}>
          {heading.title}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {hasChildren && heading.expanded && (
          <motion.div
            className="toc-item-children"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {heading.children.map((child) => (
              <TableOfContentsItem
                key={child.id}
                heading={child}
                activeHeadingId={activeHeadingId}
                onToggleExpanded={onToggleExpanded}
                onNavigate={onNavigate}
                depth={depth + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

TableOfContentsItem.displayName = 'TableOfContentsItem';
