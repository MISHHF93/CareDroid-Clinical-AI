import { EmergencyPatientService, WorkflowActionLogService } from './emergency-os.services';
import {
  ensurePatientArrivalBlock,
  normalizePatientArrival,
  patientArrivalContractViolations,
} from './patient-arrival.sync';

describe('patient-arrival.sync', () => {
  it('normalizes legacy create payloads onto the arrival contract', () => {
    const normalized = ensurePatientArrivalBlock({
      firstName: 'Alex',
      lastName: 'Kim',
      chiefComplaint: 'Chest pain',
      arrivalTime: '2026-06-20T10:00:00.000Z',
      arrivalMode: 'walk-in',
      priority: 'P3',
      state: 'Triage',
    });

    expect(normalized.arrival?.arrivalMode).toBe('walk-in');
    expect(normalized.arrival?.chiefComplaint).toBe('Chest pain');
    expect(normalized.arrivalTime).toBe('2026-06-20T10:00:00.000Z');
    expect(patientArrivalContractViolations(normalized)).toEqual([]);
  });

  it('preserves self-check-in arrival mode from frontend payloads', () => {
    const arrival = normalizePatientArrival({
      arrival: {
        arrivalMode: 'self-check-in',
        arrivalTimestamp: '2026-06-20T11:00:00.000Z',
        chiefComplaint: 'Sore throat',
        triageAcuity: {
          code: 'P4',
          system: 'PRIORITY',
          level: 4,
          status: 'suggested',
          suggestionSource: 'self-arrival',
        },
        waitingRoomStatus: 'waiting-for-triage',
        registrationStatus: 'in-progress',
        queueDestination: 'verification',
        triagePending: true,
      },
    });

    expect(arrival.arrivalMode).toBe('self-check-in');
    expect(arrival.triageAcuity.level).toBe(4);
  });

  it('persists arrival block through EmergencyPatientService.createPatient', () => {
    const workflowLogService = new WorkflowActionLogService();
    const patientService = new EmergencyPatientService(workflowLogService);

    const created = patientService.createPatient({
      firstName: 'Sam',
      lastName: 'Lee',
      chiefComplaint: 'Abdominal pain',
      arrivalTime: '2026-06-20T12:00:00.000Z',
      arrival: {
        arrivalMode: 'EMS',
        arrivalTimestamp: '2026-06-20T12:00:00.000Z',
        chiefComplaint: 'Abdominal pain',
        triageAcuity: {
          code: 'P2',
          system: 'PRIORITY',
          level: 2,
          status: 'suggested',
        },
        waitingRoomStatus: 'registered',
        registrationStatus: 'in-progress',
        queueDestination: 'ems-registration',
        triagePending: true,
      },
      priority: 'P2',
      state: 'Registration',
    });

    expect(created.arrival?.arrivalMode).toBe('EMS');
    expect(created.priority).toBe('P2');
    expect(created.queueDestination).toBe('ems-registration');
    expect(patientArrivalContractViolations(created)).toEqual([]);
  });
});