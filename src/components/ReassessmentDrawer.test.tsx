import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReassessmentDrawer from './ReassessmentDrawer';

vi.mock('../store/emergencyStore', () => ({
  useEmergencyStore: (selector) =>
    selector({
      patients: [],
      rooms: [],
      workflowLogs: [],
      selectPatient: vi.fn(),
    }),
}));

describe('ReassessmentDrawer focus management (HEAL-221)', () => {
  it('moves focus into the dialog when it opens', async () => {
    render(<ReassessmentDrawer open count={0} onClose={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveFocus();
  });

  it('restores focus to the previously-focused element when it closes', async () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Open reassessment drawer';
    document.body.appendChild(trigger);
    trigger.focus();
    expect(trigger).toHaveFocus();

    const { rerender } = render(<ReassessmentDrawer open count={0} onClose={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveFocus();
    expect(trigger).not.toHaveFocus();

    rerender(<ReassessmentDrawer open={false} count={0} onClose={vi.fn()} />);

    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});
