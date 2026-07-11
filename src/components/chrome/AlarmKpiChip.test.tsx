import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import AlarmKpiChip from './AlarmKpiChip';

describe('AlarmKpiChip', () => {
  it('renders critical KPI with CRIT badge and alarm attributes', () => {
    render(
      <ul>
        <AlarmKpiChip label="Breached" value={2} tone="critical" id="triage-breached" />
      </ul>,
    );

    const chip = screen.getByLabelText(/Breached, 2, Critical alarm/i);
    expect(chip).toHaveAttribute('data-alarm', 'critical');
    expect(chip.className).toContain('alarm-kpi--critical');
    expect(chip.className).toContain('alarm-kpi--pulse');
    expect(screen.getByText('CRIT')).toBeInTheDocument();
  });

  it('renders warning KPI with WARN badge', () => {
    render(
      <ul>
        <AlarmKpiChip label="Waiting" value={5} tone="warning" />
      </ul>,
    );

    expect(screen.getByText('WARN')).toBeInTheDocument();
    expect(screen.getByLabelText(/Waiting, 5, Warning/i)).toHaveAttribute('data-alarm', 'warning');
  });
});
