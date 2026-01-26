/**
 * FocusModeIndicator
 *
 * A status bar indicator that appears when paragraph focus mode is enabled.
 * Shows the current focus mode status and provides a quick way to disable it.
 */

import { useParagraphFocus, useParagraphFocusStore } from '../stores/paragraphFocus';
import './FocusModeIndicator.css';

const FocusIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className="focus-mode-indicator-icon"
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

export function FocusModeIndicator() {
  const { isEnabled, hideSidebarAndPanels } = useParagraphFocus();
  const { disable, toggleHideSidebarAndPanels } = useParagraphFocusStore();

  if (!isEnabled) {
    return null;
  }

  return (
    <div
      className="focus-mode-indicator"
      role="status"
      aria-live="polite"
      aria-label="Focus mode is active"
    >
      <div className="focus-mode-indicator-content">
        <FocusIcon />
        <span className="focus-mode-indicator-label">Focus Mode</span>
        <span className="focus-mode-indicator-shortcut">
          <kbd>⌘</kbd>
          <kbd>⇧</kbd>
          <kbd>F</kbd>
        </span>
      </div>

      <div className="focus-mode-indicator-actions">
        <button
          className={`focus-mode-indicator-toggle ${hideSidebarAndPanels ? 'active' : ''}`}
          onClick={toggleHideSidebarAndPanels}
          title={hideSidebarAndPanels ? 'Show sidebar & panels' : 'Hide sidebar & panels'}
          aria-pressed={hideSidebarAndPanels}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="2"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path d="M9 3v18" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>

        <button
          className="focus-mode-indicator-exit"
          onClick={disable}
          title="Exit focus mode"
          aria-label="Exit focus mode"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

FocusModeIndicator.displayName = 'FocusModeIndicator';

export default FocusModeIndicator;
