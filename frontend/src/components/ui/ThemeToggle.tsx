import { useCallback } from 'react';
import { useThemeContext, type ThemeMode } from '../../contexts';
import './ThemeToggle.css';

export interface ThemeToggleProps {
  /** Show label text next to the toggle */
  showLabel?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

/**
 * ThemeToggle component for switching between light, dark, and system themes
 * Provides both a quick toggle button and a dropdown for mode selection
 */
export function ThemeToggle({ showLabel = false, size = 'md', className = '' }: ThemeToggleProps) {
  const { theme, effectiveTheme, setTheme, toggleTheme, isDark } = useThemeContext();

  const handleModeChange = useCallback((mode: ThemeMode) => {
    setTheme(mode);
  }, [setTheme]);

  const classes = [
    'theme-toggle',
    `theme-toggle-${size}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <button
        type="button"
        className="theme-toggle-button"
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        title={`Current: ${effectiveTheme} mode (${theme === 'system' ? 'following system' : 'manual'})`}
      >
        {isDark ? (
          <SunIcon />
        ) : (
          <MoonIcon />
        )}
        {showLabel && (
          <span className="theme-toggle-label">
            {isDark ? 'Light' : 'Dark'}
          </span>
        )}
      </button>

      <div className="theme-mode-selector">
        {(['light', 'dark', 'system'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={`theme-mode-option ${theme === mode ? 'active' : ''}`}
            onClick={() => handleModeChange(mode)}
            aria-pressed={theme === mode}
          >
            {mode === 'light' && <SunIcon />}
            {mode === 'dark' && <MoonIcon />}
            {mode === 'system' && <SystemIcon />}
            <span>{mode.charAt(0).toUpperCase() + mode.slice(1)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Compact version of ThemeToggle - just the toggle button
 */
export function ThemeToggleButton({ className = '' }: { className?: string }) {
  const { isDark, toggleTheme } = useThemeContext();

  return (
    <button
      type="button"
      className={`theme-toggle-icon-button ${className}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

// Icon components
function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
