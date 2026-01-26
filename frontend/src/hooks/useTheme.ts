import { useCallback } from 'react';
import { useAppSettingsStore } from '../stores/appSettings';

type ThemeMode = 'light' | 'dark';

/**
 * Hook to get current effective theme and manage theme settings
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
