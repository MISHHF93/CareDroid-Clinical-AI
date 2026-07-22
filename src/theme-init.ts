/**
 * Runs before React/CSS paint.
 * Resolves light | dark | system from the same storage key as ThemeContext.
 * Default remains medical light; dark is first-class when preferred.
 */
const STORAGE_KEY = 'caredroid-theme-preference';
const DEFAULT_THEME: 'light' | 'dark' = 'light';

type ThemePreference = 'light' | 'dark' | 'system';

function loadPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    /* privacy mode / SSR */
  }
  return DEFAULT_THEME;
}

function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference !== 'system') return preference;
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return DEFAULT_THEME;
  }
}

const preference = loadPreference();
const resolved = resolveTheme(preference);

document.documentElement.dataset.theme = resolved;
document.documentElement.style.colorScheme = resolved;
