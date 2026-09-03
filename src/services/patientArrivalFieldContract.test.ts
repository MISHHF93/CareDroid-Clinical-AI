import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import { buildSmartIntakeVerticalSlicePatient } from '../data/smartIntakeVerticalSlice';
import { buildReceptionQuickIntakePatient } from './receptionQuickIntakeService';
import { buildProvisionalPatient } from './provisionalIdentityIntake';
import { buildPreArrivalPlaceholderPatient } from './preArrivalWorkflow';
import { buildPatientArrivalRecord, mergePatientWithArrival } from './patientArrivalModel';
import {
  assertPatientArrivalContract,
  patientArrivalContractViolations,
} from './patientArrivalBackendSync';

describe('patientArrivalFieldContract', () => {
  const intakeBuilders = [
    {
      label: 'reception-quick-intake',
      build: () =>
        buildReceptionQuickIntakePatient(
          {
            firstName: 'Alex',
            lastName: 'Kim',
            complaint: 'Chest pain',
            arrivalMode: 'walk-in',
          },
          { now: '2026-06-20T12:00:00.000Z' },
        ),
    },
    {
      label: 'self-check-in',
      build: () =>
        mergePatientWithArrival(
          {
            id: 'self-1',
            mrn: 'SA-1',
            firstName: 'Self',
            lastName: 'Arrival',
            dob: '1990-01-01',
            age: 35,
            sex: 'Unspecified',
            complaintCategory: 'Self-arrival',
            vitals: [],
            flags: [],
            notes: [],
            timeline: [],
          },
          {
            arrivalMode: 'self-check-in',
            arrivalTimestamp: '2026-06-20T12:00:00.000Z',
            chiefComplaint: 'Sore throat',
            state: PatientState.Triage,
            triagePending: true,
            waitingRoomStatus: 'waiting-for-triage',
            triageAcuity: {
              code: Priority.P4,
              status: 'suggested',
              suggestionSource: 'self-arrival',
            },
          },
        ) as ReturnType<typeof buildReceptionQuickIntakePatient>,
    },
    {
      label: 'smart-intake-vertical-slice',
      build: () =>
        buildSmartIntakeVerticalSlicePatient({
          complaintText: 'Abdominal pain',
          selectedPriority: Priority.P3,
          timestamp: '2026-06-20T12:00:00.000Z',
        }),
    },
    {
      label: 'provisional-intake',
      build: () => buildProvisionalPatient('unknown'),
    },
    {
      label: 'ems-prearrival',
      build: () =>
        buildPreArrivalPlaceholderPatient({
          id: 'ems-1',
          unitId: 'unit-1',
          unitName: 'Medic 12',
          crewNames: ['A'],
          patientAge: 54,
          patientSex: 'Male',
          chiefComplaint: 'Chest pain',
          eta: 8,
          severity: 'High',
          dispatchTime: '2026-06-20T12:00:00.000Z',
          estimatedArrivalTime: '2026-06-20T12:08:00.000Z',
          notes: '',
          status: 'Inbound',
          prearrivalComplaint: 'Chest pain',
          priority: Priority.P2,
        }),
    },
    {
      label: 'express-walk-in',
      build: () =>
        mergePatientWithArrival(
          {
            id: 'express-1',
            mrn: 'ED-EXPRESS',
            firstName: 'Pat',
            lastName: 'Walker',
            dob: '1985-05-05',
            age: 41,
            sex: 'Other',
            complaintCategory: 'Other',
            vitals: [],
            flags: [],
            notes: [],
            timeline: [],
          },
          {
            arrivalMode: 'walk-in',
            arrivalTimestamp: '2026-06-20T12:00:00.000Z',
            chiefComplaint: 'Headache',
            state: PatientState.Registration,
            triageAcuity: { code: Priority.P3, status: 'unassigned' },
            waitingRoomStatus: 'registered',
          },
        ) as ReturnType<typeof buildReceptionQuickIntakePatient>,
    },
  ] as const;

  it.each(intakeBuilders)('sets required arrival fields for $label', ({ build }) => {
    const patient = build();
    expect(() => assertPatientArrivalContract(patient as Patient)).not.toThrow();
    expect(patient.arrival).toBeTruthy();
    expect(patient.arrival?.chiefComplaint.length).toBeGreaterThan(0);
    expect(patient.arrival?.triageAcuity.level).toBeGreaterThanOrEqual(1);
  });

  it('flags incomplete arrival records', () => {
    const incomplete = mergePatientWithArrival(
      {
        id: 'bad-1',
        mrn: 'BAD',
        firstName: 'Bad',
        lastName: 'Record',
        dob: '',
        age: 0,
        sex: 'Other',
        complaintCategory: 'Other',
        vitals: [],
        flags: [],
        notes: [],
        timeline: [],
      },
      buildPatientArrivalRecord({
        arrivalMode: 'walk-in',
        chiefComplaint: '',
        waitingRoomStatus: 'registered',
      }),
    );

    expect(patientArrivalContractViolations(incomplete as never)).toContain('chiefComplaint');
  });
});
