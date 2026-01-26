import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useTextHighlightStore,
  useTextHighlight,
  HIGHLIGHT_COLORS,
  parseHighlight,
  type HighlightColorId,
} from '../stores/textHighlight';
import './HighlightColorPicker.css';

interface HighlightColorPickerProps {
  /** Reduce motion preference for accessibility */
  prefersReducedMotion?: boolean;
}

export function HighlightColorPicker({ prefersReducedMotion = false }: HighlightColorPickerProps) {
  const { isColorPickerOpen, colorPickerPosition, pendingSelection } = useTextHighlight();
  const { closeColorPicker, applyHighlight, removeHighlightFromSelection } = useTextHighlightStore();
  const pickerRef = useRef<HTMLDivElement>(null);

  // Check if current selection is already highlighted
  const currentHighlight = pendingSelection
    ? parseHighlight(pendingSelection.text)
    : { isHighlighted: false };

  // Handle click outside to close
  useEffect(() => {
    if (!isColorPickerOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        closeColorPicker();
      }
    };

    // Delay to prevent immediate dismissal
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isColorPickerOpen, closeColorPicker]);

  // Handle escape to close
  useEffect(() => {
    if (!isColorPickerOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeColorPicker();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isColorPickerOpen, closeColorPicker]);

  const handleColorClick = useCallback(
    (colorId: HighlightColorId) => {
      applyHighlight(colorId);
    },
    [applyHighlight]
  );

  const handleRemoveHighlight = useCallback(() => {
    removeHighlightFromSelection();
  }, [removeHighlightFromSelection]);

  if (!isColorPickerOpen || !colorPickerPosition) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={pickerRef}
        className="highlight-color-picker"
        style={{
          top: colorPickerPosition.top,
          left: colorPickerPosition.left,
        }}
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        role="toolbar"
        aria-label="Highlight color options"
      >
        <div className="highlight-color-picker-colors">
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              className={`highlight-color-swatch ${
                currentHighlight.isHighlighted && currentHighlight.colorId === color.id
                  ? 'highlight-color-swatch-active'
                  : ''
              }`}
              style={{ backgroundColor: color.hex }}
              onClick={() => handleColorClick(color.id)}
              title={color.name}
              aria-label={`Highlight with ${color.name}`}
              aria-pressed={
                currentHighlight.isHighlighted && currentHighlight.colorId === color.id
              }
            />
          ))}
        </div>
        {currentHighlight.isHighlighted && (
          <>
            <div className="highlight-color-picker-divider" aria-hidden="true" />
            <button
              type="button"
              className="highlight-color-remove"
              onClick={handleRemoveHighlight}
              title="Remove highlight"
              aria-label="Remove highlight"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="highlight-color-remove-icon">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

HighlightColorPicker.displayName = 'HighlightColorPicker';
