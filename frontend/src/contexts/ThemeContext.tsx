import { useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useAppSettingsStore } from '../stores/appSettings';
import { ThemeContext, type EffectiveTheme, type ThemeMode } from './themeContextValue';

/**
 * ThemeProvider component that manages dark mode functionality
 * - Respects system preference when set to 'system'
 * - Allows manual override via settings
 * - Applies theme class to document root
 * - Handles smooth transitions between modes
 * - Persists preference to localStorage via Zustand
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useAppSettingsStore((state) => state.settings.appearance.theme);
  const updateAppearanceSettings = useAppSettingsStore((state) => state.updateAppearanceSettings);

  // Get the effective theme based on user preference and system setting
  const getEffectiveTheme = useCallback((): EffectiveTheme => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }, [theme]);

  // Apply theme to document
  const applyTheme = useCallback((mode: EffectiveTheme) => {
    const root = document.documentElement;

    // Remove existing theme classes
    root.classList.remove('light', 'dark');

    // Add new theme class
    root.classList.add(mode);

    // Also set data attribute for CSS selectors
    root.setAttribute('data-theme', mode);

    // Update color-scheme for browser UI elements
    root.style.colorScheme = mode;
  }, []);

  // Set theme preference
  const setTheme = useCallback((newTheme: ThemeMode) => {
    updateAppearanceSettings({ theme: newTheme });
  }, [updateAppearanceSettings]);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const currentEffective = getEffectiveTheme();
    setTheme(currentEffective === 'dark' ? 'light' : 'dark');
  }, [getEffectiveTheme, setTheme]);

  // Initial theme application and system preference listener
  useEffect(() => {
    // Apply initial theme
    applyTheme(getEffectiveTheme());

    // Listen for system preference changes (only relevant when theme is 'system')
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange);
    };
  }, [theme, getEffectiveTheme, applyTheme]);

  const value = useMemo(() => ({
    theme,
    effectiveTheme: getEffectiveTheme(),
    setTheme,
    toggleTheme,
    isDark: getEffectiveTheme() === 'dark',
  }), [theme, getEffectiveTheme, setTheme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
