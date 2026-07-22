import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReceptionAttentionStrip from './ReceptionAttentionStrip';
import type { ReceptionAttentionRow, ReceptionAttentionSnapshot } from './receptionAttentionModel';

function row(partial: Partial<ReceptionAttentionRow> & Pick<ReceptionAttentionRow, 'id' | 'title'>): ReceptionAttentionRow {
  return {
    detail: 'Detail text',
    tone: 'warning',
    primaryAction: 'open_patient',
    timerLabel: null,
    breached: false,
    source: 'critical-intake',
    ...partial,
  };
}

describe('ReceptionAttentionStrip', () => {
  it('renders an empty-state message when the snapshot has no rows', () => {
    const snapshot: ReceptionAttentionSnapshot = { count: 0, criticalCount: 0, rows: [] };
    render(<ReceptionAttentionStrip snapshot={snapshot} onSelectRow={vi.fn()} />);

    expect(screen.getByText('No active critical items')).toBeInTheDocument();
    expect(screen.queryByText('Needs attention')).not.toBeInTheDocument();
  });

  it('renders the count badge and every row title/detail', () => {
    const snapshot: ReceptionAttentionSnapshot = {
      count: 2,
      criticalCount: 1,
      rows: [
        row({ id: 'r1', title: 'Critical response', detail: '3-minute response active', tone: 'critical', timerLabel: '1:45' }),
        row({ id: 'r2', title: 'Escalation raised', detail: 'Nurse notified', tone: 'warning' }),
      ],
    };
    render(<ReceptionAttentionStrip snapshot={snapshot} onSelectRow={vi.fn()} />);

    expect(screen.getByText('Needs attention')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Critical response')).toBeInTheDocument();
    expect(screen.getByText('3-minute response active')).toBeInTheDocument();
    expect(screen.getByText('Escalation raised')).toBeInTheDocument();
  });

  it('shows a timer label when present and an "Open" CTA otherwise', () => {
    const snapshot: ReceptionAttentionSnapshot = {
      count: 2,
      criticalCount: 0,
      rows: [
        row({ id: 'r1', title: 'Timed row', timerLabel: '2:14' }),
        row({ id: 'r2', title: 'No timer row', timerLabel: null }),
      ],
    };
    render(<ReceptionAttentionStrip snapshot={snapshot} onSelectRow={vi.fn()} />);

    expect(screen.getByText('2:14')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('calls onSelectRow with the clicked row', async () => {
    const user = userEvent.setup();
    const onSelectRow = vi.fn();
    const targetRow = row({ id: 'r1', title: 'Critical response' });
    const snapshot: ReceptionAttentionSnapshot = { count: 1, criticalCount: 1, rows: [targetRow] };
    render(<ReceptionAttentionStrip snapshot={snapshot} onSelectRow={onSelectRow} />);

    await user.click(screen.getByText('Critical response'));
    expect(onSelectRow).toHaveBeenCalledWith(targetRow);
  });

  it('marks breached rows with the breached modifier class', () => {
    const snapshot: ReceptionAttentionSnapshot = {
      count: 1,
      criticalCount: 1,
      rows: [row({ id: 'r1', title: 'Breached timer', tone: 'critical', breached: true, timerLabel: '0:00' })],
    };
    render(<ReceptionAttentionStrip snapshot={snapshot} onSelectRow={vi.fn()} />);

    const button = screen.getByText('Breached timer').closest('button');
    expect(button).toHaveClass('reception-attention__row--breached');
  });
});
