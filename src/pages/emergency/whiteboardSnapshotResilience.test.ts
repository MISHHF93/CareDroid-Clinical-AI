import { describe, expect, it } from 'vitest';
import { useEmergencyStore } from '../../store/emergencyStore';
import { PatientState, Priority, type Patient } from '../../types/emergency';
import { buildDepartmentStatusSnapshot } from '../../components/whiteboard/departmentStatusScreenModel';
import { buildPublicWaitingDisplaySnapshot } from '../../components/whiteboard/publicWaitingDisplayModel';
import { buildCommandCenterThroughputSnapshot } from '../../components/whiteboard/commandCenterThroughputModel';
import { buildOperationalCommandDashboardSnapshot } from '../../services/operationalCommandDashboardModel';
import { buildCommandCenterSurgeSnapshot } from '../../services/commandCenterSurgeModel';
import { buildDiagnosticSafetyDashboardSnapshot } from '../../services/diagnosticSafetyDashboardModel';
import { buildDepartmentStaffBarSnapshot } from '../../services/departmentStaffBarModel';
import { summarizeEmsAwareness } from '../../components/whiteboard/emsAwarenessModel';
import { normalizeWhiteboardPatient } from '../../services/patientArrivalBackendSync';

function malformedApiPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'api-malformed-1',
    mrn: 'MRN-API-1',
    firstName: 'Api',
    lastName: 'Patient',
    state: PatientState.Waiting,
    priority: Priority.P3,
    arrivalTime: '2026-06-24T12:00:00.000Z',
    chiefComplaint: 'Chest pain',
    arrival: {
      arrivalMode: 'walk-in',
      arrivalTimestamp: '2026-06-24T12:00:00.000Z',
      triageAcuity: { code: Priority.P3, status: 'unassigned' },
      waitingRoomStatus: 'waiting-for-clinician',
    },
    ...overrides,
  } as Patient;
}

describe('whiteboard snapshot resilience', () => {
  const state = useEmergencyStore.getState();

  const patientSets = [
    { label: 'store patients', patients: state.patients },
    {
      label: 'malformed API patients',
      patients: [normalizeWhiteboardPatient(malformedApiPatient())],
    },
    {
      label: 'merged store + malformed API',
      patients: [
        normalizeWhiteboardPatient(malformedApiPatient({ id: 'api-2', mrn: 'MRN-API-2' })),
        ...state.patients.slice(0, 3).map((patient) => normalizeWhiteboardPatient(patient)),
      ],
    },
  ];

  for (const { label, patients } of patientSets) {
    it(`buildDepartmentStatusSnapshot survives ${label}`, () => {
      expect(() =>
        buildDepartmentStatusSnapshot({
          patients,
          capacity: state.capacity,
          emsArrivals: state.emsArrivals,
          referrals: state.referrals,
          staff: state.staff,
          rooms: state.rooms,
          emergencySettings: state.emergencySettings,
        }),
      ).not.toThrow();
    });

    it(`buildPublicWaitingDisplaySnapshot survives ${label}`, () => {
      expect(() =>
        buildPublicWaitingDisplaySnapshot({
          patients,
          capacity: state.capacity,
          referrals: state.referrals,
          emsArrivals: state.emsArrivals,
        }),
      ).not.toThrow();
    });

    it(`buildCommandCenterThroughputSnapshot survives ${label}`, () => {
      expect(() =>
        buildCommandCenterThroughputSnapshot({
          patients,
          capacity: state.capacity,
          referrals: state.referrals,
          emsArrivals: state.emsArrivals,
          staff: state.staff,
          rooms: state.rooms,
          boardingMetrics: state.boardingMetrics,
          emergencySettings: state.emergencySettings,
          centralSnapshot: {
            operationalSummary: { metrics: [] },
            queueHealth: [],
          },
          intelligenceSnapshot: { recommendations: [] },
        }),
      ).not.toThrow();
    });

    it(`buildOperationalCommandDashboardSnapshot survives ${label}`, () => {
      expect(() =>
        buildOperationalCommandDashboardSnapshot({
          patients,
          rooms: state.rooms,
          capacity: state.capacity,
          boardingMetrics: state.boardingMetrics,
        }),
      ).not.toThrow();
    });

    it(`buildCommandCenterSurgeSnapshot survives ${label}`, () => {
      expect(() =>
        buildCommandCenterSurgeSnapshot({
          patients,
          rooms: state.rooms,
          capacity: state.capacity,
          emsArrivals: state.emsArrivals,
        }),
      ).not.toThrow();
    });

    it(`buildDiagnosticSafetyDashboardSnapshot survives ${label}`, () => {
      expect(() => buildDiagnosticSafetyDashboardSnapshot(patients)).not.toThrow();
    });

    it(`buildDepartmentStaffBarSnapshot survives ${label}`, () => {
      expect(() =>
        buildDepartmentStaffBarSnapshot({
          staff: state.staff,
          patients,
          rooms: state.rooms,
          activeShift: state.activeShift,
        }),
      ).not.toThrow();
    });

    it(`summarizeEmsAwareness survives ${label}`, () => {
      expect(() =>
        summarizeEmsAwareness(state.emsArrivals, Date.now(), {
          patients,
          staff: state.staff,
          rooms: state.rooms,
        }),
      ).not.toThrow();
    });
  }
});