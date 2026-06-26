import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { THEME_CONFIG } from '../config/theme.tokens';

const STANDARD_THEME = THEME_CONFIG.standardTheme;

const ThemeContext = createContext<any>(undefined);

function applyDomTheme() {
  document.documentElement.dataset.theme = STANDARD_THEME;
  document.documentElement.style.colorScheme = STANDARD_THEME;
}

export function ThemeProvider({ children }) {
  useEffect(() => {
    applyDomTheme();
  }, []);

  const setPreference = useCallback(() => {
    applyDomTheme();
  }, []);

  const value = useMemo(
    () => ({
      preference: STANDARD_THEME,
      resolvedTheme: STANDARD_THEME,
      setPreference,
    }),
    [setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}