/**
 * ShortcutBadge Component
 *
 * A reusable component for displaying keyboard shortcuts with consistent styling.
 * Automatically detects Mac vs Windows and displays the appropriate key symbols.
 */

import { useMemo, type HTMLAttributes } from 'react';
import { getPlatform, formatShortcutKeys } from '../../utils/keyboardShortcuts';
import './ShortcutBadge.css';

export interface ShortcutKeys {
  /** Keys for Mac platform, e.g., ['⌘', 'K'] */
  mac: string[];
  /** Keys for Windows platform, e.g., ['Ctrl', 'K'] */
  windows: string[];
}

export type ShortcutBadgeSize = 'small' | 'medium' | 'large';
export type ShortcutBadgeVariant = 'default' | 'light' | 'ghost';

export interface ShortcutBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Platform-aware shortcut keys */
  shortcut: ShortcutKeys;
  /** Size of the badge */
  size?: ShortcutBadgeSize;
  /** Visual variant */
  variant?: ShortcutBadgeVariant;
  /** Force a specific platform display (for testing/demos) */
  forcePlatform?: 'mac' | 'windows';
}

export function ShortcutBadge({
  shortcut,
  size = 'medium',
  variant = 'default',
  forcePlatform,
  className = '',
  ...props
}: ShortcutBadgeProps) {
  const { keys, platform } = useMemo(() => {
    const p = forcePlatform ?? getPlatform();
    return {
      keys: shortcut[p],
      platform: p,
    };
  }, [shortcut, forcePlatform]);

  const classNames = [
    'shortcut-badge',
    `shortcut-badge--${size}`,
    `shortcut-badge--${variant}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <span
      className={classNames}
      aria-label={`Keyboard shortcut: ${formatShortcutKeys(keys, platform)}`}
      {...props}
    >
      {keys.map((key, index) => (
        <kbd key={index} className="shortcut-badge-key">{key}</kbd>
      ))}
    </span>
  );
}

ShortcutBadge.displayName = 'ShortcutBadge';
