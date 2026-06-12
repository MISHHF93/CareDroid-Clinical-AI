import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClinicalScoreCalculator from './ClinicalScoreCalculator';
import { getAutoScorePrefill } from '../utils/autoScorePopulator';

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

  it('uses AutoScorePopulator values and focuses HEART fields requiring physician judgment', async () => {
    const autoScorePrefill = getAutoScorePrefill(
      {
        ...patient,
        age: 58,
        complaintCategory: 'Chest Pain',
        chiefComplaint: 'Chest pain',
        notes: [{ body: 'Known diabetes, hypertension, and smoker.' }],
      },
      {
        labs: [
          {
            name: 'Troponin I',
            value: '42',
            unit: 'ng/L',
            referenceRange: '0-14',
          },
        ],
      }
    );

    render(
      <ClinicalScoreCalculator
        calculatorId="heart"
        patient={patient}
        autoScorePrefill={autoScorePrefill}
        onClose={() => {}}
        onSaveScore={() => {}}
      />
    );

    expect(screen.getByLabelText(/Age/i)).toHaveValue('1');
    expect(screen.getByLabelText(/Risk factors/i)).toHaveValue('2');
    expect(screen.getByLabelText(/Troponin/i)).toHaveValue('1');
    expect(screen.getByText(/Troponin I 42 ng\/L, ref 0-14/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/History/i)).toHaveFocus());
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
