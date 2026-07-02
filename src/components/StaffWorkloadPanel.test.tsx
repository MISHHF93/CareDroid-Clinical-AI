import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StaffWorkloadPanel, {
  detectWorkloadImbalance,
  getPatientCountForStaff,
  getWorkloadBand,
  isActiveStaff,
  parseStaffBalanceSuggestions,
} from './StaffWorkloadPanel';
import { PatientState, Priority, type Patient, type Staff } from '../types/emergency';

const mocks = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  storeState: {
    staff: [] as Staff[],
    patients: [] as Patient[],
    assignStaff: vi.fn(),
    addNote: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
  },
}));

vi.mock('../services/careDroidUnifiedAiNode', () => ({
  invokeUnifiedAiRequest: vi.fn(),
}));

vi.mock('../store/emergencyStore', () => ({
  useEmergencyStore: (selector: (state: typeof mocks.storeState) => unknown) => selector(mocks.storeState),
}));

function staffMember(overrides: Partial<Staff> = {}): Staff {
  return {
    id: 'staff-a',
    name: 'Dr. Singh',
    role: 'MD',
    active: true,
    ...overrides,
  };
}

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    mrn: 'ED-WORKLOAD-1',
    firstName: 'Marcus',
    lastName: 'Chen',
    dob: '1965-03-14',
    age: 61,
    sex: 'M',
    arrivalTime: '2026-06-13T16:00:00.000Z',
    chiefComplaint: 'Chest pain',
    complaintCategory: 'Cardiac',
    state: PatientState.Assessment,
    priority: Priority.P2,
    vitals: [],
    flags: [],
    assignedStaffId: 'staff-a',
    notes: [],
    timeline: [],
    ...overrides,
  };
}

afterEach(() => {
  setMockStoreState([], []);
  vi.restoreAllMocks();
  mocks.toastSuccess.mockClear();
});

describe('StaffWorkloadPanel helpers', () => {
  it('counts active non-discharge patients and assigns workload bands', () => {
    const drSingh = staffMember();
    const patients = [
      patient({ id: 'patient-1', assignedStaffId: drSingh.id }),
      patient({ id: 'patient-2', assignedStaffId: drSingh.id, state: PatientState.Discharge }),
      patient({ id: 'patient-3', assignedStaffId: 'staff-b' }),
    ];

    expect(getPatientCountForStaff(drSingh, patients)).toBe(1);
    expect(getWorkloadBand(0)).toBe('gray');
    expect(getWorkloadBand(3)).toBe('green');
    expect(getWorkloadBand(5)).toBe('yellow');
    expect(getWorkloadBand(6)).toBe('red');
  });

  it('uses active/status fields conservatively for imbalance detection', () => {
    const staff = [
      staffMember({ id: 'staff-a', name: 'Dr. Singh' }),
      staffMember({ id: 'staff-b', name: 'Dr. Park' }),
      staffMember({ id: 'staff-c', name: 'Dr. Rivera' }),
      staffMember({ id: 'staff-d', name: 'Off Shift MD', status: 'OffShift' }),
      staffMember({ id: 'staff-e', name: 'Inactive MD', active: false }),
    ];
    const patients = [
      ...Array.from({ length: 6 }, (_, index) => patient({ id: `a-${index}`, assignedStaffId: 'staff-a' })),
      ...Array.from({ length: 2 }, (_, index) => patient({ id: `b-${index}`, assignedStaffId: 'staff-b' })),
      patient({ id: 'c-1', assignedStaffId: 'staff-c' }),
      patient({ id: 'd-1', assignedStaffId: 'staff-d' }),
    ];

    expect(isActiveStaff(staff[3])).toBe(false);
    expect(isActiveStaff(staff[4])).toBe(false);
    expect(detectWorkloadImbalance(staff, patients)).toEqual({
      staffId: 'staff-a',
      name: 'Dr. Singh',
      count: 6,
      average: 3,
    });
  });

  it('parses JSON and text AI rebalance suggestions against local staff and patients', () => {
    const staff = [
      staffMember({ id: 'staff-a', name: 'Dr. Singh' }),
      staffMember({ id: 'staff-b', name: 'Dr. Park' }),
    ];
    const patients = [patient({ id: 'patient-1', name: 'Marcus Chen' })];

    expect(
      parseStaffBalanceSuggestions(
        '{"suggestions":[{"patientId":"patient-1","fromStaffId":"staff-a","toStaffId":"staff-b","reason":"Balance load"}]}',
        staff,
        patients,
      )[0],
    ).toMatchObject({
      patientId: 'patient-1',
      fromStaffId: 'staff-a',
      toStaffId: 'staff-b',
      reason: 'Balance load',
    });

    expect(parseStaffBalanceSuggestions('Move Marcus Chen from Dr. Singh to Dr. Park.', staff, patients)[0]).toMatchObject({
      patientId: 'patient-1',
      fromStaffId: 'staff-a',
      toStaffId: 'staff-b',
    });
  });
});

describe('StaffWorkloadPanel reassignment', () => {
  it('confirms, assigns staff, writes a system note, and shows a toast', () => {
    const drSingh = staffMember({ id: 'staff-a', name: 'Dr. Singh' });
    const drPark = staffMember({ id: 'staff-b', name: 'Dr. Park' });
    const marcus = patient({ id: 'patient-1', name: 'Marcus Chen', assignedStaffId: drSingh.id });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    setMockStoreState([drSingh, drPark], [marcus]);

    render(<StaffWorkloadPanel open onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Dr. Singh/i }));
    fireEvent.click(screen.getByRole('button', { name: /Reassign/i }));
    fireEvent.change(screen.getByLabelText(/Reassign Marcus Chen to staff/i), {
      target: { value: drPark.id },
    });

    const updatedPatient = mocks.storeState.patients.find((candidate) => candidate.id === marcus.id);
    expect(confirmSpy).toHaveBeenCalledWith('Reassign Marcus Chen from Dr. Singh to Dr. Park?');
    expect(updatedPatient?.assignedStaffId).toBe(drPark.id);
    expect(updatedPatient?.notes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: 'Reassigned from Dr. Singh to Dr. Park',
          authorId: 'system',
        }),
      ]),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Marcus Chen reassigned to Dr. Park');
  });
});

function setMockStoreState(staff: Staff[], patients: Patient[]) {
  mocks.storeState.staff = staff;
  mocks.storeState.patients = patients;
  mocks.storeState.assignStaff = vi.fn((patientId: string, staffId: string) => {
    mocks.storeState.patients = mocks.storeState.patients.map((candidate) =>
      candidate.id === patientId ? { ...candidate, assignedStaffId: staffId } : candidate,
    );
  });
  mocks.storeState.addNote = vi.fn((patientId: string, note: string, staffId?: string) => {
    mocks.storeState.patients = mocks.storeState.patients.map((candidate) =>
      candidate.id === patientId
        ? {
            ...candidate,
            notes: [
              ...candidate.notes,
              {
                id: `note-${candidate.notes.length + 1}`,
                patientId,
                text: note,
                authorId: staffId || 'system',
                timestamp: '2026-06-13T16:00:00.000Z',
              },
            ],
          }
        : candidate,
    );
  });
}
