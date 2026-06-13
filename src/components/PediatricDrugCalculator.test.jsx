import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PediatricDrugCalculator, {
  PEDIATRIC_DRUGS,
  calculatePediatricDrugRows,
  estimateWeightByLuscombe,
} from './PediatricDrugCalculator';
import { useEmergencyStore } from '../../store/emergencyStore';
import { PatientState, Priority } from '../types/emergency';

import './PediatricDrugCalculator.css';

const originalState = useEmergencyStore.getState();

const pediatricPatient = {
  id: 'peds-001',
  mrn: 'ED-PEDS-001',
  firstName: 'Riley',
  lastName: 'Ng',
  dob: '2022-01-01',
  age: 4,
  sex: 'Female',
  arrivalTime: '2026-06-11T20:00:00-04:00',
  triageTime: '2026-06-11T20:00:00-04:00',
  lastAssessedTime: null,
  chiefComplaint: 'Unresponsive',
  complaint: 'Unresponsive',
  complaintCategory: 'Pediatric',
  state: PatientState.Triage,
  priority: Priority.P1,
  vitals: {
    hr: null,
    bpSystolic: null,
    bpDiastolic: null,
    spo2: null,
    temp: null,
    rr: null,
    gcs: null,
    pain: null,
    weightKg: 14,
    recordedAt: '2026-06-11T20:00:00-04:00',
  },
  assignedStaffId: null,
  roomId: null,
  flags: [],
  timeline: [],
  notes: [],
};

afterEach(() => {
  useEmergencyStore.setState(originalState, true);
  vi.restoreAllMocks();
});

describe('PediatricDrugCalculator dosing', () => {
  it('calculates the full pediatric emergency drug table for 14 kg instantly', async () => {
    const user = userEvent.setup();

    render(<PediatricDrugCalculator open onClose={() => {}} />);

    await user.type(screen.getByLabelText(/weight in kg/i), '14');

    PEDIATRIC_DRUGS.forEach((drug) => {
      expect(screen.getByText(drug.drug)).toBeInTheDocument();
    });

    const bodyRows = screen
      .getAllByRole('row')
      .filter((row) => within(row).queryByText(/Epinephrine|Atropine|Levetiracetam|Ketamine/));
    expect(screen.getAllByRole('row')).toHaveLength(PEDIATRIC_DRUGS.length + 1);
    expect(bodyRows.length).toBeGreaterThan(0);
    expect(
      screen.getByRole('row', {
        name: /Epinephrine \(cardiac arrest\).*0\.14 mg.*1\.4 mL.*IV/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('row', {
        name: /Glucose 10%.*28 mL.*28 mL.*IV/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('row', {
        name: /Rocuronium.*16\.8 mg.*1\.68 mL.*IV/i,
      })
    ).toBeInTheDocument();
  });

  it('estimates weight from age with the Luscombe formula', async () => {
    const user = userEvent.setup();

    expect(estimateWeightByLuscombe(4)).toBe(19);

    render(<PediatricDrugCalculator open onClose={() => {}} />);
    await user.type(screen.getByLabelText(/age in years/i), '4');

    expect(screen.getByText('19 kg')).toBeInTheDocument();
  });

  it('saves pediatric drug reference notes to the linked patient', async () => {
    const user = userEvent.setup();
    useEmergencyStore.setState({ ...originalState, patients: [pediatricPatient] }, true);

    render(<PediatricDrugCalculator open patient={pediatricPatient} onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: /use patient weight/i }));
    await user.click(screen.getByRole('button', { name: /save to patient/i }));

    const savedPatient = useEmergencyStore.getState().patients.find((patient) => patient.id === 'peds-001');
    expect(savedPatient?.notes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: `Pediatric Drug Calculator: ${PEDIATRIC_DRUGS.length}/${PEDIATRIC_DRUGS.length} — Dosing reference generated`,
          authorId: 's3',
        }),
        expect.objectContaining({
          text: expect.stringContaining('"weightKg":14'),
        }),
      ])
    );
  });
});

describe('calculatePediatricDrugRows', () => {
  it('returns calculated rows for every configured drug', () => {
    const rows = calculatePediatricDrugRows(14);

    expect(rows).toHaveLength(PEDIATRIC_DRUGS.length);
    expect(rows.find((row) => row.id === 'atropine')).toEqual(
      expect.objectContaining({
        calculatedDose: '0.28 mg',
        volumeToDraw: '2.8 mL',
      })
    );
  });
});
