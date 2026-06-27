import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AlertRail } from './AlertRail';
import type { Alert } from '../../types/emergency';

const alerts: Alert[] = [
  {
    id: 'info-1',
    severity: 'Info',
    title: 'Lab interface restored',
    message: 'Results are flowing normally.',
    createdAt: '2026-06-27T14:00:00.000Z',
    dismissed: false,
    type: 'System',
    source: 'Integration Hub',
  },
  {
    id: 'critical-1',
    severity: 'Critical',
    title: 'Sepsis screen positive',
    message: 'Patient needs immediate nurse review.',
    createdAt: '2026-06-27T13:00:00.000Z',
    dismissed: false,
    actionLabel: 'Open patient',
    type: 'Clinical',
    source: 'Triage Assist',
  },
  {
    id: 'warning-1',
    severity: 'Warning',
    title: 'Triage wait approaching breach',
    message: 'One patient is close to target threshold.',
    createdAt: '2026-06-27T15:00:00.000Z',
    dismissed: false,
    type: 'Queue',
  },
];

describe('AlertRail', () => {
  it('sorts active alerts by clinical urgency before recency', () => {
    render(<AlertRail alerts={alerts} />);

    const critical = screen.getByLabelText(/critical alert: sepsis screen positive/i);
    const warning = screen.getByLabelText(/warning alert: triage wait approaching breach/i);
    const info = screen.getByLabelText(/info alert: lab interface restored/i);

    expect(Boolean(critical.compareDocumentPosition(warning) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(warning.compareDocumentPosition(info) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(screen.getByText(/3 open/i)).toBeInTheDocument();
  });

  it('exposes action and dismiss callbacks with explicit labels', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const onDismiss = vi.fn();

    render(<AlertRail alerts={alerts} onAction={onAction} onDismiss={onDismiss} />);

    await user.click(screen.getByRole('button', { name: /open patient: sepsis screen positive/i }));
    await user.click(screen.getByRole('button', { name: /dismiss alert: sepsis screen positive/i }));

    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ id: 'critical-1' }));
    expect(onDismiss).toHaveBeenCalledWith(expect.objectContaining({ id: 'critical-1' }));
  });

  it('renders an empty state when no active alerts remain', () => {
    render(<AlertRail alerts={alerts.map((alert) => ({ ...alert, dismissed: true }))} />);

    expect(screen.getByText('No active alerts')).toBeInTheDocument();
  });
});
