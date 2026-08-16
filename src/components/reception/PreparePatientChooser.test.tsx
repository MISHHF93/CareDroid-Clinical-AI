import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PreparePatientChooser from './PreparePatientChooser';

// HEAL-270: this dialog's outer element is its own dimmed full-screen
// backdrop, but had no onClick and no Escape handler -- only the small X
// button could dismiss it.

function renderChooser(onClose = vi.fn()) {
  render(
    <PreparePatientChooser
      onClose={onClose}
      onManual={vi.fn()}
      onScan={vi.fn()}
      onSmartIntake={vi.fn()}
      onUnknown={vi.fn()}
    />,
  );
  return onClose;
}

describe('PreparePatientChooser dismissal (HEAL-270)', () => {
  it('closes on Escape', () => {
    const onClose = renderChooser();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on backdrop click but not on clicks inside the panel', () => {
    const onClose = renderChooser();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    fireEvent.click(screen.getByText('How is this patient arriving?'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
