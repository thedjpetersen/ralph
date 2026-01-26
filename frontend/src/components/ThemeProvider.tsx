import { useEffect, useCallback } from 'react';
import { useAppSettingsStore } from '../stores/appSettings';

type ThemeMode = 'light' | 'dark';

/**
 * ThemeProvider component that manages dark mode functionality
 * - Respects system preference by default
 * - Allows manual override via settings
 * - Applies theme class to document root
 * - Handles smooth transitions between modes
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppSettingsStore((state) => state.settings.appearance.theme);

  // Get the effective theme based on user preference and system setting
  const getEffectiveTheme = useCallback((): ThemeMode => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }, [theme]);

  // Apply theme to document
  const applyTheme = useCallback((mode: ThemeMode) => {
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

  return <>{children}</>;
}

/**
 * Hook to get current effective theme
 */
export function useTheme() {
  const theme = useAppSettingsStore((state) => state.settings.appearance.theme);
  const updateAppearanceSettings = useAppSettingsStore((state) => state.updateAppearanceSettings);

  const getEffectiveTheme = useCallback((): ThemeMode => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }, [theme]);

  const setTheme = useCallback((newTheme: 'light' | 'dark' | 'system') => {
    updateAppearanceSettings({ theme: newTheme });
  }, [updateAppearanceSettings]);

  const toggleTheme = useCallback(() => {
    const currentEffective = getEffectiveTheme();
    setTheme(currentEffective === 'dark' ? 'light' : 'dark');
  }, [getEffectiveTheme, setTheme]);

  return {
    theme,
    effectiveTheme: getEffectiveTheme(),
    setTheme,
    toggleTheme,
    isDark: getEffectiveTheme() === 'dark',
  };
}
