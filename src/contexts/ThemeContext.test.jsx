import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeContext';

function ThemeHarness() {
  const { preference, resolvedTheme, setPreference } = useTheme();
  return (
    <div>
      <p>Preference: {preference}</p>
      <p>Resolved: {resolvedTheme}</p>
      <button type="button" onClick={() => setPreference('dark')}>
        Dark
      </button>
      <button type="button" onClick={() => setPreference('light')}>
        Light
      </button>
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
  });

  it('defaults to system preference and applies the resolved DOM theme', async () => {
    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>
    );

    expect(screen.getByText(/Preference: system/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('light');
    });
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('persists explicit light and dark theme choices globally', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>
    );

    await user.click(screen.getByRole('button', { name: /dark/i }));
    expect(localStorage.getItem('caredroid_theme_preference')).toBe('dark');
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark');
    });

    await user.click(screen.getByRole('button', { name: /light/i }));
    expect(localStorage.getItem('caredroid_theme_preference')).toBe('light');
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('light');
    });
  });
});
