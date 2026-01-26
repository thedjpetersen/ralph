/**
 * Outline Item Component
 *
 * Renders a single section in the outline tree with expand/collapse functionality.
 * Supports H1-H4 levels with appropriate visual styling.
 */

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OutlineSection } from '../stores/aiOutline';
import './OutlineItem.css';

// Icons
const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
    <span className={`outline-item-heading-icon level-${level}`} aria-hidden="true">
      H{level}
    </span>
  );
};

interface OutlineItemProps {
  section: OutlineSection;
  onToggleExpanded: (sectionId: string) => void;
  onNavigate?: (section: OutlineSection) => void;
  depth?: number;
}

export function OutlineItem({
  section,
  onToggleExpanded,
  onNavigate,
  depth = 0,
}: OutlineItemProps) {
  const hasChildren = section.children.length > 0;

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasChildren) {
        onToggleExpanded(section.id);
      }
    },
    [hasChildren, onToggleExpanded, section.id]
  );

  const handleNavigate = useCallback(() => {
    if (onNavigate) {
      onNavigate(section);
    }
  }, [onNavigate, section]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (hasChildren) {
          onToggleExpanded(section.id);
        }
      }
    },
    [hasChildren, onToggleExpanded, section.id]
  );

  return (
    <div className="outline-item" data-level={section.level}>
      <div
        className={`outline-item-header ${hasChildren ? 'expandable' : ''} ${section.expanded ? 'expanded' : ''}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        role={hasChildren ? 'button' : undefined}
        tabIndex={hasChildren ? 0 : -1}
        aria-expanded={hasChildren ? section.expanded : undefined}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <div className="outline-item-toggle">
          {hasChildren ? (
            <motion.span
              className="outline-item-chevron"
              animate={{ rotate: section.expanded ? 90 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronRightIcon />
            </motion.span>
          ) : (
            <span className="outline-item-spacer" />
          )}
        </div>

        <HeadingIcon level={section.level} />

        <div className="outline-item-content">
          <button
            type="button"
            className="outline-item-title"
            onClick={(e) => {
              e.stopPropagation();
              handleNavigate();
            }}
            title="Click to navigate to this section"
          >
            {section.title}
          </button>
          {section.description && (
            <span className="outline-item-description">{section.description}</span>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {hasChildren && section.expanded && (
          <motion.div
            className="outline-item-children"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {section.children.map((child) => (
              <OutlineItem
                key={child.id}
                section={child}
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

OutlineItem.displayName = 'OutlineItem';
