import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QueueList } from './QueueList';
import { PatientState, Priority, type Patient } from '../../types/emergency';

const patients: Patient[] = [
  {
    id: 'p1',
    mrn: 'ED-1',
    firstName: 'Mina',
    lastName: 'Patel',
    dob: '1980-01-01',
    age: 46,
    sex: 'F',
    arrivalTime: '2026-06-27T09:00:00.000Z',
    chiefComplaint: 'Shortness of breath',
    complaintCategory: 'Respiratory',
    state: PatientState.Triage,
    priority: Priority.P2,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
  },
];

describe('QueueList', () => {
  it('renders patient queue as an accessible table with headers', () => {
    render(<QueueList patients={patients} />);

    expect(screen.getByRole('table', { name: /patient queue/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /patient/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /journey/i })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /mina patel/i })).toBeInTheDocument();
  });

  it('preserves click and keyboard selection behavior', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<QueueList patients={patients} onSelect={onSelect} />);

    const row = screen.getByRole('row', { name: /mina patel/i });
    await user.click(row);
    row.focus();
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
  });
});
