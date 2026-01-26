import { useAIComparisonStore, useAIComparison } from '../stores/aiComparison';
import './ComparisonModeToggle.css';

interface ComparisonModeToggleProps {
  /** Optional class name for styling */
  className?: string;
  /** Whether to show in compact mode */
  compact?: boolean;
}

export function ComparisonModeToggle({
  className = '',
  compact = false,
}: ComparisonModeToggleProps) {
  const { isComparisonMode, selectedPersonas } = useAIComparison();
  const { toggleComparisonMode } = useAIComparisonStore();

  const authorCount = selectedPersonas.length;

  return (
    <button
      type="button"
      className={`comparison-mode-toggle ${isComparisonMode ? 'is-active' : ''} ${compact ? 'compact' : ''} ${className}`}
      onClick={toggleComparisonMode}
      aria-pressed={isComparisonMode}
      aria-label={isComparisonMode ? 'Disable author comparison mode' : 'Enable author comparison mode'}
      title={isComparisonMode ? 'Disable author comparison' : 'Compare multiple authors'}
    >
      <svg
        className="toggle-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <path d="M20 8v6M23 11h-6" />
      </svg>
      {!compact && (
        <>
          <span className="toggle-label">
            {isComparisonMode ? 'Comparing' : 'Compare'}
          </span>
          {isComparisonMode && authorCount > 0 && (
            <span className="toggle-count">{authorCount}</span>
          )}
        </>
      )}
    </button>
  );
}

ComparisonModeToggle.displayName = 'ComparisonModeToggle';
