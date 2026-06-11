import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClinicalScoreCalculator from './ClinicalScoreCalculator';

import './ClinicalScoreCalculator.css';

const patient = {
  id: 'pt-score',
  mrn: 'MRN-100',
  firstName: 'Sofia',
  lastName: 'Martinez',
  age: 67,
  vitals: {
    rr: 24,
    bpSystolic: 98,
  },
};

describe('ClinicalScoreCalculator Emergency OS modal', () => {
  it('pre-fills HEART age from linked patient and saves score payload', async () => {
    const user = userEvent.setup();
    const onSaveScore = vi.fn();

    render(
      <ClinicalScoreCalculator
        calculatorId="heart"
        patient={patient}
        onClose={() => {}}
        onSaveScore={onSaveScore}
      />
    );

    expect(screen.getByText('MRN-100')).toBeInTheDocument();
    expect(screen.getByText('Sofia Martinez')).toBeInTheDocument();
    expect(screen.getByLabelText(/Age/i)).toHaveValue('2');

    await user.click(screen.getByRole('button', { name: /save to patient/i }));

    expect(onSaveScore).toHaveBeenCalledWith(
      expect.objectContaining({
        calculatorId: 'heart',
        label: 'HEART Score',
        total: 2,
        interpretation: 'Low risk',
      })
    );
  });

  it('pre-fills qSOFA toggles from vitals and auto-totals high risk', () => {
    render(
      <ClinicalScoreCalculator
        calculatorId="qsofa"
        patient={patient}
        onClose={() => {}}
        onSaveScore={() => {}}
      />
    );

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/High risk for sepsis/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /RR ≥22: Yes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SBP ≤100: Yes/i })).toBeInTheDocument();
  });

  it('closes from Escape key', () => {
    const onClose = vi.fn();

    render(
      <ClinicalScoreCalculator
        calculatorId="nihss"
        patient={patient}
        onClose={onClose}
        onSaveScore={() => {}}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });
});
