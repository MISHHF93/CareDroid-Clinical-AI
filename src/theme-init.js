/**
 * Runs before React/CSS paint. Keeps `data-theme` in sync with stored preference + OS.
 * ThemeContext updates the same attributes after hydration.
 */
const STORAGE_KEY = 'caredroid_theme_preference';

function resolveTheme() {
  try {
    const pref = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? true;
    if (pref === 'light') return 'light';
    if (pref === 'dark') return 'dark';
    return prefersDark ? 'dark' : 'light';
  } catch {
    return 'dark';
  }
}

const resolved = resolveTheme();
document.documentElement.dataset.theme = resolved;
document.documentElement.style.colorScheme = resolved;
