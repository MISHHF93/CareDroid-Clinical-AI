import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SelfCheckin from './SelfCheckin';

describe('SelfCheckin', () => {
  it('walks through kiosk steps and emits normalized patient on completion', () => {
    const onComplete = vi.fn();
    render(<SelfCheckin kioskMode onComplete={onComplete} />);

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

    expect(onComplete).toHaveBeenCalledTimes(1);
    const result = onComplete.mock.calls[0][0];
    expect(result.patient.arrival?.arrivalMode).toBe('self-check-in');
    expect(result.patient.arrival?.chiefComplaint).toBe('Chest pain');
    expect(screen.getByRole('status')).toHaveTextContent(/checked in/i);
  });
});