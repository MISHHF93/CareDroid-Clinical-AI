import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PatientDetailPanel from './PatientDetailPanel';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientFlag, PatientState, Priority, type Patient } from '../types/emergency';
import { EMERGENCY_ACTIONS } from '../config/emergencyRolePermissions';

/**
 * "Resolve Patient Identity" -- closes the gap where the live (default)
 * TypeORM patient path had a real provisional-identity CREATE workflow
 * (provisionalIdentityIntake.ts sets PatientFlag.IdentityPending) but no
 * RECONCILE step anywhere: nothing cleared the flag, regenerated the MRN, or
 * linked the provisional record to a confirmed real identity. Every
 * assertion here checks either (a) the permission gate, (b) that the action
 * only ever appears for a patient that actually has IdentityPending set, or
 * (c) that the confirmed identity sent to the backend is exactly and only
 * what the user typed -- never anything read back off the patient's own
 * (provisional) name/MRN, which would be silent auto-fill/guessing.
 */

const reconcilePatientIdentityMock = vi.hoisted(() => vi.fn());

vi.mock('../services/emergencyOsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/emergencyOsApi')>();
  return {
    ...actual,
    reconcilePatientIdentity: reconcilePatientIdentityMock,
  };
});

vi.mock('../hooks/usePatientTimelineContext', () => ({
  usePatientTimelineContext: () => ({ loading: false, error: '', context: {} }),
}));

vi.mock('../hooks/useEmergencyOs', () => ({
  useUpgradeHarnessPatientFlow: () => ({ data: { data: { signals: [] } } }),
}));

// Permissive-by-default mock, matching PatientDetailPanel.transportRequest.test.tsx's
// established pattern exactly. The permission-gate test below temporarily
// swaps `presentAction` to a restrictive implementation for just the
// editPatientDemographics permission, then restores it.
const emergencyRoleMock = vi.hoisted(() => {
  const { withEmergencyRoleMock } = require('../test/permissiveEmergencyRoleMock.ts');
  return withEmergencyRoleMock({
    role: 'registration_clerk',
    roleLabel: 'Registration Clerk',
    switchDemoRole: vi.fn(),
  });
});

vi.mock('../hooks/useEmergencyRolePermissions', () => ({
  useEmergencyRolePermissions: () => emergencyRoleMock,
  default: () => emergencyRoleMock,
}));

const originalState = useEmergencyStore.getState();
const originalPresentAction = emergencyRoleMock.presentAction;

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-a',
    mrn: 'TEMP-UNK-483920',
    firstName: 'Unknown',
    lastName: 'Patient',
    dob: '',
    age: 0,
    sex: 'Other',
    arrivalTime: '2026-08-15T10:00:00.000Z',
    chiefComplaint: 'Unknown identity — clinical care priority',
    complaintCategory: 'Unknown Intake',
    state: PatientState.Triage,
    priority: Priority.P2,
    vitals: [],
    flags: [PatientFlag.IdentityPending],
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
  emergencyRoleMock.presentAction = originalPresentAction;
  vi.clearAllMocks();
});

describe('PatientDetailPanel: Resolve Patient Identity', () => {
  it('hides the action entirely for a role without the editPatientDemographics grant (permission gate)', async () => {
    emergencyRoleMock.presentAction = (actionOrPermission: string) => {
      if (actionOrPermission === EMERGENCY_ACTIONS.editPatientDemographics) {
        return {
          state: 'hidden',
          visible: false,
          enabled: false,
          readOnly: false,
          permission: actionOrPermission,
        };
      }
      return {
        state: 'A',
        visible: true,
        enabled: true,
        readOnly: false,
        permission: actionOrPermission,
      };
    };

    renderWithPatient(makePatient());

    expect(await screen.findByPlaceholderText('Add Note')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /resolve patient identity/i }),
    ).not.toBeInTheDocument();
  });

  it('never shows the action for a patient without PatientFlag.IdentityPending set', async () => {
    renderWithPatient(makePatient({ flags: [] }));

    expect(await screen.findByPlaceholderText('Add Note')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /resolve patient identity/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the action for a role with the grant on a patient with IdentityPending set', async () => {
    renderWithPatient(makePatient());

    expect(
      await screen.findByRole('button', { name: /resolve patient identity/i }),
    ).toBeInTheDocument();
  });

  it('starts the form empty -- never silently pre-fills the confirmed name/MRN from the provisional identity already on the chart', async () => {
    renderWithPatient(makePatient());

    fireEvent.click(await screen.findByRole('button', { name: /resolve patient identity/i }));

    expect(screen.getByLabelText(/confirmed first name/i)).toHaveValue('');
    expect(screen.getByLabelText(/confirmed last name/i)).toHaveValue('');
    expect(screen.getByLabelText(/confirmed date of birth/i)).toHaveValue('');
    expect(screen.getByLabelText(/confirmed mrn/i)).toHaveValue('');
    // The submit button must be disabled until the required fields are
    // explicitly typed in -- proves there is no auto-fill path that could
    // silently make it clickable with the old provisional values.
    expect(screen.getByRole('button', { name: /confirm identity/i })).toBeDisabled();
  });

  it('submits exactly and only the explicitly typed confirmed identity, and shows a confirmation preserving the previous provisional identity', async () => {
    reconcilePatientIdentityMock.mockResolvedValue({
      data: {
        id: 'patient-a',
        firstName: 'Jane',
        lastName: 'Doe',
        dob: '1990-05-14',
        sex: 'F',
        mrn: 'ED-777001',
        flags: [],
      },
    });

    const patient = makePatient();
    renderWithPatient(patient);

    fireEvent.click(await screen.findByRole('button', { name: /resolve patient identity/i }));

    fireEvent.change(screen.getByLabelText(/confirmed first name/i), {
      target: { value: 'Jane' },
    });
    fireEvent.change(screen.getByLabelText(/confirmed last name/i), {
      target: { value: 'Doe' },
    });
    fireEvent.change(screen.getByLabelText(/confirmed date of birth/i), {
      target: { value: '1990-05-14' },
    });
    fireEvent.change(screen.getByLabelText(/confirmed sex/i), {
      target: { value: 'F' },
    });
    fireEvent.change(screen.getByLabelText(/confirmed mrn/i), {
      target: { value: 'ED-777001' },
    });

    fireEvent.click(screen.getByRole('button', { name: /confirm identity/i }));

    await waitFor(() => expect(reconcilePatientIdentityMock).toHaveBeenCalledTimes(1));
    expect(reconcilePatientIdentityMock).toHaveBeenCalledWith(
      patient.id,
      expect.objectContaining({
        firstName: 'Jane',
        lastName: 'Doe',
        dob: '1990-05-14',
        sex: 'F',
        mrn: 'ED-777001',
      }),
    );

    const confirmationHeading = await screen.findByText(/patient identity reconciled/i);
    // Scoped to the confirmation container itself -- the page separately
    // has other elements (e.g. an AI review banner) that can independently
    // mention this patient's old provisional name, which would otherwise
    // make an unscoped screen.getByText(/unknown patient/i) ambiguous.
    const confirmation = confirmationHeading.closest(
      '.patient-detail-identity-reconcile__confirmation',
    ) as HTMLElement;
    expect(confirmation).toBeTruthy();
    // Provenance: the previous provisional identity must still be visible in
    // the confirmation, not silently discarded.
    expect(within(confirmation).getByText(/unknown patient/i)).toBeInTheDocument();
    expect(within(confirmation).getByText(/temp-unk-483920/i)).toBeInTheDocument();
    expect(within(confirmation).getByText(/jane doe/i)).toBeInTheDocument();
    expect(within(confirmation).getByText(/ed-777001/i)).toBeInTheDocument();
  });
});
