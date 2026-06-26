import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

function ThemeHarness() {
  const { preference, resolvedTheme } = useTheme();
  return (
    <div>
      <p>Preference: {preference}</p>
      <p>Resolved: {resolvedTheme}</p>
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
  });

  it('always applies the standard light medical theme', async () => {
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
});