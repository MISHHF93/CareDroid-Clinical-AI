import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PediatricDoseSafetyChecker } from './pediatricsObgynCalculators';

describe('PediatricDoseSafetyChecker cross-check warning', () => {
  it('warns that Rocuronium and Glucose (D10W) conflict with the other in-app pediatric drug reference', async () => {
    const user = userEvent.setup();
    render(<PediatricDoseSafetyChecker onResultChange={() => {}} />);

    await user.type(screen.getByLabelText('Weight (kg)'), '20');
    await user.click(screen.getByRole('button', { name: /calculate/i }));

    const rocuroniumRow = screen.getByText('Rocuronium').closest('[role="row"]');
    expect(rocuroniumRow).toHaveTextContent('Conflicts with other in-app reference (1.2 mg/kg)');

    const glucoseRow = screen.getByText('Glucose').closest('[role="row"]');
    expect(glucoseRow).toHaveTextContent('Conflicts with other in-app reference (2 mL/kg)');
  });

  it('does not warn on drugs that agree across both in-app references', async () => {
    const user = userEvent.setup();
    render(<PediatricDoseSafetyChecker onResultChange={() => {}} />);

    await user.type(screen.getByLabelText('Weight (kg)'), '20');
    await user.click(screen.getByRole('button', { name: /calculate/i }));

    const amiodaroneRow = screen.getByText('Amiodarone').closest('[role="row"]');
    expect(amiodaroneRow).not.toHaveTextContent('Conflicts with other in-app reference');
  });
});
