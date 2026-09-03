import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolPreferencesProvider, useToolPreferences } from './ToolPreferencesContext';

function Probe() {
  const {
    pinned,
    hiddenTools,
    profileSettings,
    togglePinned,
    toggleHidden,
    updateProfileSettings,
  } = useToolPreferences();

  return (
    <div>
      <span data-testid="pinned">{pinned.join(',')}</span>
      <span data-testid="hidden">{hiddenTools.join(',')}</span>
      <span data-testid="specialty">{profileSettings.specialty || ''}</span>
      <button type="button" onClick={() => togglePinned('heart-score')}>
        pin
      </button>
      <button type="button" onClick={() => toggleHidden('fleet-command')}>
        hide
      </button>
      <button type="button" onClick={() => updateProfileSettings({ specialty: 'cardiology' })}>
        specialty
      </button>
    </div>
  );
}

describe('ToolPreferencesContext profile segmentation settings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists pinned tools, hidden tools, and profile settings', () => {
    const { unmount } = render(
      <ToolPreferencesProvider>
        <Probe />
      </ToolPreferencesProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'pin' }));
    fireEvent.click(screen.getByRole('button', { name: 'hide' }));
    fireEvent.click(screen.getByRole('button', { name: 'specialty' }));

    expect(screen.getByTestId('pinned')).toHaveTextContent('heart-score');
    expect(screen.getByTestId('hidden')).toHaveTextContent('fleet-command');
    expect(screen.getByTestId('specialty')).toHaveTextContent('cardiology');

    unmount();
    render(
      <ToolPreferencesProvider>
        <Probe />
      </ToolPreferencesProvider>,
    );

    expect(screen.getByTestId('pinned')).toHaveTextContent('heart-score');
    expect(screen.getByTestId('hidden')).toHaveTextContent('fleet-command');
    expect(screen.getByTestId('specialty')).toHaveTextContent('cardiology');
  });

  it('restores hidden tools when toggled again', () => {
    render(
      <ToolPreferencesProvider>
        <Probe />
      </ToolPreferencesProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'hide' }));
    expect(screen.getByTestId('hidden')).toHaveTextContent('fleet-command');

    fireEvent.click(screen.getByRole('button', { name: 'hide' }));
    expect(screen.getByTestId('hidden')).toHaveTextContent('');
  });
});
