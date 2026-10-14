import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DensityProvider, useDensity } from './DensityContext';

function TestConsumer() {
  const { densityMode, resolvedDensity, setDensityMode, toggleDensity, isCompact } = useDensity();
  return (
    <div>
      <div data-testid="mode">{densityMode}</div>
      <div data-testid="resolved">{resolvedDensity}</div>
      <div data-testid="is-compact">{String(isCompact)}</div>
      <button onClick={toggleDensity}>Toggle</button>
      <button onClick={() => setDensityMode('compact')}>Set Compact</button>
      <button onClick={() => setDensityMode('comfortable')}>Set Comfortable</button>
    </div>
  );
}

describe('DensityContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-density');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-density');
  });

  it('provides density mode and sets data-density attribute on documentElement', () => {
    render(
      <DensityProvider>
        <TestConsumer />
      </DensityProvider>,
    );

    const resolved = screen.getByTestId('resolved').textContent;
    expect(resolved).toMatch(/^(compact|comfortable)$/);
    expect(document.documentElement.getAttribute('data-density')).toBe(resolved);
  });

  it('toggles density between compact and comfortable', async () => {
    const user = userEvent.setup();
    render(
      <DensityProvider>
        <TestConsumer />
      </DensityProvider>,
    );

    const initialResolved = screen.getByTestId('resolved').textContent;
    const toggleBtn = screen.getByRole('button', { name: 'Toggle' });

    await user.click(toggleBtn);
    const newResolved = screen.getByTestId('resolved').textContent;
    expect(newResolved).not.toBe(initialResolved);
    expect(document.documentElement.getAttribute('data-density')).toBe(newResolved);

    await user.click(toggleBtn);
    expect(screen.getByTestId('resolved').textContent).toBe(initialResolved);
  });

  it('allows explicit mode setting and persists to localStorage', async () => {
    const user = userEvent.setup();
    render(
      <DensityProvider>
        <TestConsumer />
      </DensityProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Set Comfortable' }));
    expect(screen.getByTestId('resolved').textContent).toBe('comfortable');
    expect(screen.getByTestId('is-compact').textContent).toBe('false');
    expect(localStorage.getItem('caredroid-density-mode')).toBe('comfortable');

    await user.click(screen.getByRole('button', { name: 'Set Compact' }));
    expect(screen.getByTestId('resolved').textContent).toBe('compact');
    expect(screen.getByTestId('is-compact').textContent).toBe('true');
    expect(localStorage.getItem('caredroid-density-mode')).toBe('compact');
  });

  it('provides safe fallback when used outside provider', () => {
    render(<TestConsumer />);
    expect(screen.getByTestId('mode').textContent).toBe('auto');
    expect(screen.getByTestId('resolved').textContent).toMatch(/^(compact|comfortable)$/);
  });
});
