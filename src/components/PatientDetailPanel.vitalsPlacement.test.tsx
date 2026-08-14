import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PatientDetailPanel from './PatientDetailPanel';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientState, Priority, type Patient } from '../types/emergency';

const emergencyRoleMock = vi.hoisted(() => {
  const { withEmergencyRoleMock } = require('../test/permissiveEmergencyRoleMock.ts');
  return withEmergencyRoleMock({ switchDemoRole: vi.fn() });
});

vi.mock('../hooks/useEmergencyRolePermissions', () => ({
  useEmergencyRolePermissions: () => emergencyRoleMock,
  default: () => emergencyRoleMock,
}));

vi.mock('../hooks/usePatientTimelineContext', () => ({
  usePatientTimelineContext: () => ({ loading: false, error: '', context: {} }),
}));

vi.mock('../hooks/useEmergencyOs', () => ({
  useUpgradeHarnessPatientFlow: () => ({ data: { data: { signals: [] } } }),
}));

vi.mock('../services/emergencyOsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/emergencyOsApi')>();
  return {
    ...actual,
    createSmartIntakePatient: vi.fn(async (patient: Patient) => ({ data: { patient } })),
  };
});

const originalState = useEmergencyStore.getState();

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'vitals-placement-patient-1',
    mrn: 'ED-HEAL191-1',
    firstName: 'Riley',
    lastName: 'Chen',
    dob: '1990-01-01',
    age: 36,
    sex: 'F',
    arrivalTime: '2026-08-13T12:00:00.000Z',
    chiefComplaint: 'Chest pain',
    complaintCategory: 'Cardiac',
    state: PatientState.Triage,
    priority: Priority.P2,
    vitals: [
      { hr: 110, sbp: 98, dbp: 62, spo2: 94, temp: 37.6, rr: 22, gcs: 15, recordedAt: '2026-08-13T12:05:00.000Z' },
    ],
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

function renderWithPatient(patient: Patient) {
  useEmergencyStore.setState(
    {
      ...originalState,
      patients: [patient],
      selectedPatientId: patient.id,
      ui: { ...originalState.ui, selectedPatientId: patient.id },
    },
    true,
  );

  return render(
    <MemoryRouter>
      <PatientDetailPanel />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  useEmergencyStore.setState(originalState, true);
  vi.clearAllMocks();
});

describe('PatientDetailPanel vitals placement near triage decision (HEAL-191)', () => {
  it('renders Latest Vitals inside the header, before the (always-rendered) Journey Timeline section', () => {
    renderWithPatient(makePatient({ state: PatientState.Triage }));

    const vitalsHeading = screen.getByRole('heading', { name: 'Latest Vitals' });
    const journeyTimelineHeading = screen.getByRole('heading', { name: 'Journey Timeline' });

    const position = vitalsHeading.compareDocumentPosition(journeyTimelineHeading);
    // Node.DOCUMENT_POSITION_FOLLOWING (4): Journey Timeline comes AFTER Latest Vitals in the DOM --
    // i.e. vitals now render near the top (with the triage-assist tool), not down near the bottom.
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('still renders Latest Vitals for a non-Triage patient (no regression from the move)', () => {
    renderWithPatient(makePatient({ state: PatientState.Waiting }));

    expect(screen.getByRole('heading', { name: 'Latest Vitals' })).toBeTruthy();
    expect(screen.getByText('110')).toBeTruthy();
  });

  it('renders exactly one Latest Vitals section (no duplication from the relocation)', () => {
    renderWithPatient(makePatient({ state: PatientState.Triage }));

    expect(screen.getAllByRole('heading', { name: 'Latest Vitals' })).toHaveLength(1);
  });
});
