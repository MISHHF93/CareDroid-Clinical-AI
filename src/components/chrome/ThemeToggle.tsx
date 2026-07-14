import { IconSun, IconMoon } from '@tabler/icons-react';
import { useTheme } from '../../contexts/ThemeContext';
import './ThemeToggle.css';

/**
 * Toggle between light and dark medical theme.
 * Placed in the shell header action bar next to the account menu.
 * Respects prefers-color-scheme when set to 'system'.
 */
export default function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <IconSun size={18} stroke={2} /> : <IconMoon size={18} stroke={2} />}
    </button>
  );
}
