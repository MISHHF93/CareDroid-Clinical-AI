import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Alert, Note, Patient } from '../types/emergency';
import { PatientFlag, PatientState, Priority } from '../types/emergency';
import { useEmergencyStore } from '../store/emergencyStore';
import SepsisBundleTracker, {
  buildSep1CompletionNote,
  calculateAntibioticTiming,
  calculateBundleProgress,
  calculateSepsisShiftMetrics,
  deriveSepsisAlertTime,
  parseSep1CompletionNotes,
} from './SepsisBundleTracker';

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'sepsis-patient-1',
    mrn: 'ED-SEP-1',
    firstName: 'Drew',
    lastName: 'Walsh',
    dob: '1961-01-01',
    age: 65,
    sex: 'F',
    arrivalTime: '2026-06-13T12:00:00.000Z',
    chiefComplaint: 'Fever and hypotension',
    complaintCategory: 'Infection',
    state: PatientState.Assessment,
    priority: Priority.P2,
    vitals: [],
    flags: [PatientFlag.SepsisAlert],
    assignedStaffId: 'rn-1',
    notes: [],
    timeline: [],
    ...overrides,
  };
}

function note(text: string): Note {
  return {
    id: `note-${text}`,
    text,
    timestamp: '2026-06-13T12:30:00.000Z',
  };
}

describe('SepsisBundleTracker helpers', () => {
  it('parses SEP-1 completion notes and calculates required progress', () => {
    const completions = parseSep1CompletionNotes([
      note(buildSep1CompletionNote('cultures', '2026-06-13T12:10:00.000Z', 'rn-1')),
      note(buildSep1CompletionNote('lactate', '2026-06-13T12:14:00.000Z', 'rn-1')),
      note(buildSep1CompletionNote('fluids', '2026-06-13T12:25:00.000Z', 'rn-2')),
    ]);

    expect(completions.cultures).toMatchObject({
      completedAt: '2026-06-13T12:10:00.000Z',
      completedBy: 'rn-1',
    });
    expect(calculateBundleProgress(completions)).toEqual({
      completed: 2,
      total: 3,
      percentage: 67,
    });
  });

  it('classifies antibiotic timing thresholds from recognition time', () => {
    expect(calculateAntibioticTiming('2026-06-13T12:00:00.000Z', '2026-06-13T12:45:00.000Z')).toMatchObject({
      minutes: 45,
      status: 'compliant',
    });
    expect(calculateAntibioticTiming('2026-06-13T12:00:00.000Z', '2026-06-13T13:15:00.000Z')).toMatchObject({
      minutes: 75,
      status: 'borderline',
    });
    expect(calculateAntibioticTiming('2026-06-13T12:00:00.000Z', '2026-06-13T13:45:00.000Z')).toMatchObject({
      minutes: 105,
      status: 'non-compliant',
    });
  });

  it('uses exact alert records before arrival fallback for sepsis recognition time', () => {
    const patient = makePatient();
    const alerts: Alert[] = [
      {
        id: 'alert-sepsis',
        severity: 'Critical',
        title: 'Sepsis criteria met',
        message: 'qSOFA positive; initiate sepsis bundle.',
        patientId: patient.id,
        createdAt: '2026-06-13T12:18:00.000Z',
        dismissed: false,
      },
    ];

    expect(deriveSepsisAlertTime(patient, alerts)).toEqual({
      time: '2026-06-13T12:18:00.000Z',
      source: 'alert record',
      isFallback: false,
    });

    expect(deriveSepsisAlertTime(makePatient({ timeline: [], notes: [] }), [])).toEqual({
      time: '2026-06-13T12:00:00.000Z',
      source: 'arrival time fallback',
      isFallback: true,
    });
  });

  it('aggregates sepsis cases, required-element compliance, and average antibiotic time', () => {
    const alerts: Alert[] = [
      {
        id: 'alert-sepsis',
        severity: 'Critical',
        title: 'Sepsis criteria met',
        message: 'Bundle started.',
        patientId: 'sepsis-patient-1',
        createdAt: '2026-06-13T12:00:00.000Z',
        dismissed: false,
      },
    ];
    const patients = [
      makePatient({
        notes: [
          note(buildSep1CompletionNote('cultures', '2026-06-13T12:05:00.000Z', 'rn-1')),
          note(buildSep1CompletionNote('lactate', '2026-06-13T12:10:00.000Z', 'rn-1')),
          note(buildSep1CompletionNote('antibiotics', '2026-06-13T12:45:00.000Z', 'rn-1')),
        ],
      }),
      makePatient({
        id: 'non-sepsis',
        flags: [],
        notes: [note(buildSep1CompletionNote('antibiotics', '2026-06-13T12:30:00.000Z', 'rn-2'))],
      }),
    ];

    expect(calculateSepsisShiftMetrics(patients, alerts)).toEqual({
      sepsisCases: 1,
      sep1CompliancePercent: 100,
      averageAntibioticMinutes: 45,
      completedRequiredElements: 3,
      totalRequiredElements: 3,
    });
  });
});

describe('HEAL-347.87: SepsisBundleTracker respects canWriteNote', () => {
  const originalState = useEmergencyStore.getState();

  afterEach(() => {
    useEmergencyStore.setState(originalState, true);
  });

  it('disables every bundle-element button and never writes a note when canWriteNote is false', () => {
    const patient = makePatient();
    useEmergencyStore.setState({ ...originalState, patients: [patient] }, true);

    render(<SepsisBundleTracker patient={patient} canWriteNote={false} />);

    const cultureButton = screen.getByRole('button', { name: /Mark Blood cultures.*complete/i });
    expect(cultureButton).toBeDisabled();

    fireEvent.click(cultureButton);

    const savedPatient = useEmergencyStore.getState().patients.find((p) => p.id === patient.id);
    expect(savedPatient?.notes ?? []).toHaveLength(0);
    expect(screen.queryByText(/Mark .* as complete\?/i)).not.toBeInTheDocument();
  });

  it('allows completing a bundle element when canWriteNote is true (the default, matching prior behavior)', () => {
    const patient = makePatient();
    useEmergencyStore.setState({ ...originalState, patients: [patient] }, true);

    render(<SepsisBundleTracker patient={patient} />);

    const cultureButton = screen.getByRole('button', { name: /Mark Blood cultures.*complete/i });
    expect(cultureButton).not.toBeDisabled();

    fireEvent.click(cultureButton);
    fireEvent.click(screen.getByRole('button', { name: 'Complete' }));

    const savedPatient = useEmergencyStore.getState().patients.find((p) => p.id === patient.id);
    expect(savedPatient?.notes?.length).toBeGreaterThan(0);
  });
});
