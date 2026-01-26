/**
 * Keyboard shortcut utilities
 * Provides platform-aware shortcut formatting and display
 */

import { isMacOS, KEYBOARD_SHORTCUTS, type ShortcutDefinition } from '../stores/keyboardShortcuts';

/**
 * Get the current platform
 */
export function getPlatform(): 'mac' | 'windows' {
  return isMacOS() ? 'mac' : 'windows';
}

/**
 * Format a shortcut key array into a display string
 * e.g., ['⌘', 'K'] => '⌘K' or ['Ctrl', 'K'] => 'Ctrl+K'
 */
export function formatShortcutKeys(keys: string[], platform: 'mac' | 'windows' = getPlatform()): string {
  if (platform === 'mac') {
    // Mac: Join without separator for modifier symbols
    return keys.join('');
  } else {
    // Windows: Join with + for readability
    return keys.join('+');
  }
}

/**
 * Get a formatted shortcut string for a given shortcut ID
 */
export function getShortcutById(shortcutId: string, platform?: 'mac' | 'windows'): string | null {
  const currentPlatform = platform ?? getPlatform();

  for (const category of KEYBOARD_SHORTCUTS) {
    const shortcut = category.shortcuts.find(s => s.id === shortcutId);
    if (shortcut) {
      return formatShortcutKeys(shortcut.keys[currentPlatform], currentPlatform);
    }
  }
  return null;
}

/**
 * Get shortcut definition by ID
 */
export function getShortcutDefinitionById(shortcutId: string): ShortcutDefinition | null {
  for (const category of KEYBOARD_SHORTCUTS) {
    const shortcut = category.shortcuts.find(s => s.id === shortcutId);
    if (shortcut) {
      return shortcut;
    }
  }
  return null;
}

/**
 * Format a shortcut from a ShortcutDefinition object
 */
export function formatShortcut(shortcut: ShortcutDefinition, platform?: 'mac' | 'windows'): string {
  const currentPlatform = platform ?? getPlatform();
  return formatShortcutKeys(shortcut.keys[currentPlatform], currentPlatform);
}

/**
 * Convert a simple shortcut string like "⌘K" to platform-aware format
 * This is for legacy shortcuts that weren't defined with platform variants
 */
export function convertLegacyShortcut(shortcut: string): string {
  const platform = getPlatform();

  if (platform === 'mac') {
    // Already in Mac format, return as-is
    return shortcut;
  }

  // Convert Mac symbols to Windows equivalents
  return shortcut
    .replace(/⌘/g, 'Ctrl+')
    .replace(/⌥/g, 'Alt+')
    .replace(/⇧/g, 'Shift+')
    // Clean up any double + signs
    .replace(/\+\+/g, '+')
    // Remove trailing +
    .replace(/\+$/, '');
}

/**
 * Split a shortcut string into individual keys for rendering
 * Handles both Mac (⌘K) and Windows (Ctrl+K) formats
 */
export function splitShortcutKeys(shortcut: string): string[] {
  const platform = getPlatform();

  if (platform === 'mac') {
    // For Mac, split into individual characters, keeping multi-char keys together
    const keys: string[] = [];
    let i = 0;
    while (i < shortcut.length) {
      // Check for special keys
      if (shortcut.slice(i, i + 6).toLowerCase() === 'escape') {
        keys.push('Esc');
        i += 6;
      } else if (shortcut.slice(i, i + 5).toLowerCase() === 'shift') {
        keys.push('⇧');
        i += 5;
      } else if (shortcut.slice(i, i + 3).toLowerCase() === 'alt') {
        keys.push('⌥');
        i += 3;
      } else if (shortcut.slice(i, i + 4).toLowerCase() === 'ctrl') {
        keys.push('⌘');
        i += 4;
      } else {
        keys.push(shortcut[i]);
        i++;
      }
    }
    return keys.filter(k => k.trim() !== '');
  } else {
    // For Windows, split on +
    return shortcut.split('+').filter(k => k.trim() !== '');
  }
}

/**
 * Create platform-aware shortcut keys object for a common shortcut
 */
export function createPlatformShortcut(
  macKeys: string[],
  windowsKeys?: string[]
): { mac: string[]; windows: string[] } {
  return {
    mac: macKeys,
    windows: windowsKeys ?? macKeys.map(key =>
      key === '⌘' ? 'Ctrl' :
      key === '⌥' ? 'Alt' :
      key === '⇧' ? 'Shift' :
      key
    ),
  };
}

/**
 * Common keyboard shortcuts mapping for quick access
 * These can be used with getCommonShortcut() for consistent formatting
 */
export const COMMON_SHORTCUTS = {
  // General
  save: createPlatformShortcut(['⌘', 'S'], ['Ctrl', 'S']),
  undo: createPlatformShortcut(['⌘', 'Z'], ['Ctrl', 'Z']),
  redo: createPlatformShortcut(['⌘', '⇧', 'Z'], ['Ctrl', 'Y']),
  copy: createPlatformShortcut(['⌘', 'C'], ['Ctrl', 'C']),
  cut: createPlatformShortcut(['⌘', 'X'], ['Ctrl', 'X']),
  paste: createPlatformShortcut(['⌘', 'V'], ['Ctrl', 'V']),
  selectAll: createPlatformShortcut(['⌘', 'A'], ['Ctrl', 'A']),
  find: createPlatformShortcut(['⌘', 'F'], ['Ctrl', 'F']),
  findReplace: createPlatformShortcut(['⌘', 'H'], ['Ctrl', 'H']),

  // Navigation
  commandPalette: createPlatformShortcut(['⌘', 'K'], ['Ctrl', 'K']),
  settings: createPlatformShortcut(['⌘', ','], ['Ctrl', ',']),
  close: createPlatformShortcut(['Esc'], ['Esc']),
  toggleSidebar: createPlatformShortcut(['⌘', '\\'], ['Ctrl', '\\']),

  // Text formatting
  bold: createPlatformShortcut(['⌘', 'B'], ['Ctrl', 'B']),
  italic: createPlatformShortcut(['⌘', 'I'], ['Ctrl', 'I']),
  underline: createPlatformShortcut(['⌘', 'U'], ['Ctrl', 'U']),
  strikethrough: createPlatformShortcut(['⌘', '⇧', 'X'], ['Ctrl', 'Shift', 'X']),

  // AI features
  aiSuggest: createPlatformShortcut(['⌘', 'J'], ['Ctrl', 'J']),
  aiRewrite: createPlatformShortcut(['⌘', '⇧', 'R'], ['Ctrl', 'Shift', 'R']),
  toneAnalyzer: createPlatformShortcut(['⌥', 'T'], ['Alt', 'T']),
  vocabulary: createPlatformShortcut(['⌥', 'V'], ['Alt', 'V']),
  readability: createPlatformShortcut(['⌥', 'R'], ['Alt', 'R']),
} as const;

/**
 * Get a formatted common shortcut
 */
export function getCommonShortcut(
  name: keyof typeof COMMON_SHORTCUTS,
  platform?: 'mac' | 'windows'
): string {
  const currentPlatform = platform ?? getPlatform();
  const shortcut = COMMON_SHORTCUTS[name];
  return formatShortcutKeys(shortcut[currentPlatform], currentPlatform);
}

/**
 * Hook-friendly shortcut display data
 */
export interface ShortcutDisplayData {
  keys: string[];
  formatted: string;
  platform: 'mac' | 'windows';
}

/**
 * Get shortcut display data for rendering
 */
export function getShortcutDisplayData(
  shortcutKeys: { mac: string[]; windows: string[] }
): ShortcutDisplayData {
  const platform = getPlatform();
  const keys = shortcutKeys[platform];
  return {
    keys,
    formatted: formatShortcutKeys(keys, platform),
    platform,
  };
}
