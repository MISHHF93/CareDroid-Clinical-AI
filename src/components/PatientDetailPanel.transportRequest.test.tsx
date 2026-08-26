import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PatientDetailPanel from './PatientDetailPanel';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientState, Priority, type Patient } from '../types/emergency';
import { EMERGENCY_ACTIONS } from '../config/emergencyRolePermissions';

/**
 * Physician-initiated "Request Emergency Transport" — a real user story (a
 * physician wanted to send an ambulance directly during a phone follow-up
 * call but had no way to). This MUST read as an honest SIMULATION: there is
 * NO real EMS/CAD/911 dispatch system connected anywhere in this codebase or
 * environment. Every assertion here checks either (a) the permission gate,
 * or (b) that explicit simulation language is present before AND after
 * submission — never anything that could read as "an ambulance is coming."
 */

const requestEmergencyTransportMock = vi.hoisted(() => vi.fn());

vi.mock('../services/emergencyOsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/emergencyOsApi')>();
  return {
    ...actual,
    requestEmergencyTransport: requestEmergencyTransportMock,
  };
});

vi.mock('../hooks/usePatientTimelineContext', () => ({
  usePatientTimelineContext: () => ({ loading: false, error: '', context: {} }),
}));

vi.mock('../hooks/useEmergencyOs', () => ({
  useUpgradeHarnessPatientFlow: () => ({ data: { data: { signals: [] } } }),
}));

// Physician-role, permissive-by-default mock, matching the established
// PatientDetailPanel.patientSwitchDraftReset.test.tsx pattern exactly. The
// permission-gate test below temporarily swaps `presentAction` to a
// restrictive implementation for just the transport-request permission,
// then restores it -- this avoids vi.resetModules()/dynamic re-import,
// which would decouple the re-imported component from this file's
// `useEmergencyStore` singleton.
const emergencyRoleMock = vi.hoisted(() => {
  const { withEmergencyRoleMock } = require('../test/permissiveEmergencyRoleMock.ts');
  return withEmergencyRoleMock({ role: 'physician', roleLabel: 'Physician', switchDemoRole: vi.fn() });
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
    mrn: 'ED-TRANSPORT-A',
    firstName: 'Alex',
    lastName: 'Rivera',
    dob: '1985-02-02',
    age: 41,
    sex: 'M',
    arrivalTime: '2026-08-15T10:00:00.000Z',
    chiefComplaint: 'Follow-up call: worsening symptoms',
    complaintCategory: 'Cardiac',
    state: PatientState.Disposition,
    priority: Priority.P3,
    vitals: [],
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
  emergencyRoleMock.presentAction = originalPresentAction;
  vi.clearAllMocks();
});

describe('PatientDetailPanel: Request Emergency Transport (simulated)', () => {
  it('hides the action entirely for a role without the requestEmergencyTransport grant (permission gate)', async () => {
    emergencyRoleMock.presentAction = (actionOrPermission: string) => {
      if (actionOrPermission === EMERGENCY_ACTIONS.requestEmergencyTransport) {
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
      screen.queryByRole('button', { name: /request emergency transport/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the simulation disclaimer before submission, and the confirmation + disclaimer after — never claims a real ambulance was dispatched', async () => {
    requestEmergencyTransportMock.mockResolvedValue({
      data: {
        ok: true,
        simulated: true,
        disclaimer:
          'Transport Request Recorded (Simulated) — not connected to a real ambulance, EMS unit, or 911/CAD dispatch system. No real transport has been dispatched.',
        arrivalId: 'ems-arrival-patient-a',
        reason: 'Worsening chest pain reported by phone',
        urgency: 'P1',
        location: '12 Maple St',
        requestedByName: 'Dr. Rivera',
        requestedAt: '2026-08-25T12:00:00.000Z',
      },
    });

    const patient = makePatient();
    renderWithPatient(patient);

    // Disclaimer visible before any submission.
    expect(await screen.findByText(/simulation only/i)).toBeInTheDocument();
    expect(screen.queryByText(/transport request recorded/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /request emergency transport/i }));
    fireEvent.change(screen.getByPlaceholderText(/clinical reason for transport/i), {
      target: { value: 'Worsening chest pain reported by phone' },
    });
    fireEvent.click(screen.getByRole('button', { name: /record simulated transport request/i }));

    await waitFor(() => expect(requestEmergencyTransportMock).toHaveBeenCalledTimes(1));
    expect(requestEmergencyTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: patient.id,
        reason: 'Worsening chest pain reported by phone',
      }),
    );

    // Confirmation state renders (both the heading and the repeated
    // disclaimer text contain this phrase -- redundant clarity is
    // deliberate here, so this asserts at least one match, not exactly one).
    const confirmationMatches = await screen.findAllByText(
      /transport request recorded \(simulated\)/i,
    );
    expect(confirmationMatches.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/simulat/i).length).toBeGreaterThan(0);

    // Never anything that could read as a real dispatch outcome.
    expect(screen.queryByText(/ambulance dispatched/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/unit assigned/i)).not.toBeInTheDocument();
  });
});
