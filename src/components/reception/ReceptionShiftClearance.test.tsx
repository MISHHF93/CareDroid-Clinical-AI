import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ReceptionShiftClearance from './ReceptionShiftClearance';

// HEAL-270: same fake-backdrop bug as PreparePatientChooser -- no onClick,
// no Escape handler.

function renderClearance(onClose = vi.fn()) {
  render(
    <ReceptionShiftClearance
      open
      emsCount={0}
      verificationCount={0}
      pretriageCount={0}
      verificationPatients={[]}
      patientDisplayName={() => ''}
      onClose={onClose}
      onJumpTab={vi.fn()}
      onOpenPatient={vi.fn()}
      onRecordShiftNote={vi.fn()}
    />,
  );
  return onClose;
}

describe('ReceptionShiftClearance dismissal (HEAL-270)', () => {
  it('closes on Escape', () => {
    const onClose = renderClearance();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on backdrop click but not on clicks inside the panel', () => {
    const onClose = renderClearance();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    fireEvent.click(screen.getByText('Clear your lists'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
