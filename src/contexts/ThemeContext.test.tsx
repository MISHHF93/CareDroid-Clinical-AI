import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeContext';

function ThemeHarness() {
  const { preference, resolvedTheme, toggleTheme, setPreference } = useTheme();
  return (
    <div>
      <p>Preference: {preference}</p>
      <p>Resolved: {resolvedTheme}</p>
      <button type="button" onClick={toggleTheme} aria-label="Toggle theme">
        Toggle
      </button>
      <button type="button" onClick={() => setPreference('dark')} aria-label="Set dark">
        Dark
      </button>
      <button type="button" onClick={() => setPreference('light')} aria-label="Set light">
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

  it('defaults to light medical theme', async () => {
    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    expect(screen.getByText(/Preference: light/i)).toBeInTheDocument();
    expect(screen.getByText(/Resolved: light/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('light');
    });
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('toggles to dark theme', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: /toggle/i }));

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark');
    });
    expect(screen.getByText(/Preference: dark/i)).toBeInTheDocument();
    expect(screen.getByText(/Resolved: dark/i)).toBeInTheDocument();
  });

  it('persists preference to localStorage', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: /set dark/i }));

    await waitFor(() => {
      expect(localStorage.getItem('caredroid-theme-preference')).toBe('dark');
    });
  });

  it('restores preference from localStorage on mount', async () => {
    localStorage.setItem('caredroid-theme-preference', 'dark');
    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark');
    });
    expect(screen.getByText(/Preference: dark/i)).toBeInTheDocument();
  });
});
