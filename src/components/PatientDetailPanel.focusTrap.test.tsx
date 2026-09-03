import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    id: 'focus-trap-patient-1',
    mrn: 'ED-HEAL318-1',
    firstName: 'Casey',
    lastName: 'Nguyen',
    dob: '1988-05-01',
    age: 38,
    sex: 'F',
    arrivalTime: '2026-08-17T12:00:00.000Z',
    chiefComplaint: 'Migraine',
    complaintCategory: 'General',
    state: PatientState.Waiting,
    priority: Priority.P3,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

function renderPanel(patient: Patient, selected: boolean) {
  useEmergencyStore.setState(
    {
      ...originalState,
      patients: [patient],
      selectedPatientId: selected ? patient.id : null,
      ui: { ...originalState.ui, selectedPatientId: selected ? patient.id : null },
    },
    true,
  );

  return render(
    <MemoryRouter>
      <button type="button">Outside trigger</button>
      <PatientDetailPanel />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  useEmergencyStore.setState(originalState, true);
  vi.clearAllMocks();
});

describe('PatientDetailPanel focus trap (HEAL-318)', () => {
  it('moves focus to the close button when the panel opens', async () => {
    renderPanel(makePatient(), true);

    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: /close patient detail/i }),
      );
    });
  });

  it('Shift+Tab from the first focusable element wraps to the last one instead of escaping the panel', async () => {
    const user = userEvent.setup();
    renderPanel(makePatient(), true);

    const closeButton = screen.getByRole('button', { name: /close patient detail/i });
    await waitFor(() => expect(document.activeElement).toBe(closeButton));

    // Before HEAL-318, Shift+Tab from here moved focus to whatever the browser's
    // natural DOM tab order put before this panel -- confirmed live to land on a
    // patient card behind the (visually covering) panel, not inside it.
    await user.tab({ shift: true });

    const panel = document.querySelector('.patient-detail-panel');
    expect(panel).not.toBeNull();
    expect(panel!.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(document.body);
  });

  it('restores focus to the element that was focused before the panel opened', async () => {
    const patient = makePatient();
    renderPanel(patient, false);

    const outsideTrigger = screen.getByRole('button', { name: 'Outside trigger' });
    outsideTrigger.focus();
    expect(document.activeElement).toBe(outsideTrigger);

    act(() => {
      useEmergencyStore.setState({ selectedPatientId: patient.id });
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: /close patient detail/i }),
      );
    });

    act(() => {
      useEmergencyStore.setState({ selectedPatientId: null });
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(outsideTrigger);
    });
  });
});
