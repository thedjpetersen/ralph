import { createContext } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

export interface ThemeContextValue {
  /** Current theme setting: 'light', 'dark', or 'system' */
  theme: ThemeMode;
  /** The actual applied theme after resolving 'system' */
  effectiveTheme: EffectiveTheme;
  /** Set the theme preference */
  setTheme: (theme: ThemeMode) => void;
  /** Toggle between light and dark (ignores system preference) */
  toggleTheme: () => void;
  /** Convenience boolean for dark mode checks */
  isDark: boolean;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
