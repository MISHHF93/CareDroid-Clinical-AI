import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SelfCheckin from './SelfCheckin';

async function completeKioskSteps() {
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Alex' } });
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Kim' } });
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));

  fireEvent.change(screen.getByLabelText(/reason for visit/i), {
    target: { value: 'Chest pain' },
  });
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));

  fireEvent.click(screen.getByRole('button', { name: /no known allergies/i }));
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));

  fireEvent.click(screen.getByRole('button', { name: /complete check-in/i }));
}

describe('SelfCheckin', () => {
  it('walks through kiosk steps and emits normalized patient on completion', async () => {
    const onComplete = vi.fn();
    render(<SelfCheckin kioskMode onComplete={onComplete} />);

    await completeKioskSteps();

    expect(onComplete).toHaveBeenCalledTimes(1);
    const result = onComplete.mock.calls[0][0];
    expect(result.patient.arrival?.arrivalMode).toBe('self-check-in');
    expect(result.patient.arrival?.chiefComplaint).toBe('Chest pain');
    expect(await screen.findByRole('heading', { name: /you are checked in/i })).toBeInTheDocument();
  });

  it('shows a "see the front desk" failure state instead of a false success message when the backend write fails', async () => {
    // Reproduces the real bug this covers: a kiosk has no staff device present
    // at submission, so it must not claim success until the record actually
    // reached the shared backend other devices read from.
    const onComplete = vi.fn().mockResolvedValue({ ok: false });
    render(<SelfCheckin kioskMode onComplete={onComplete} />);

    await completeKioskSteps();

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t finish your check-in/i);
    expect(screen.getByText(/see the front desk/i)).toBeInTheDocument();
    expect(screen.queryByText(/you are checked in/i)).not.toBeInTheDocument();
  });
});
