import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority } from '../types/emergency';
import {
  auditOperationalSearchCoverage,
  groupOperationalSearchHits,
  searchOperationalEntities,
} from './unifiedOperationalSearch';

const patient = {
  id: 'patient-1',
  mrn: 'ED-100',
  firstName: 'Ava',
  lastName: 'Stone',
  dob: '1991-06-18',
  age: 34,
  sex: 'F' as const,
  arrivalTime: new Date().toISOString(),
  chiefComplaint: 'Chest pain',
  complaintCategory: 'Chest pain',
  state: PatientState.Waiting,
  priority: Priority.P3,
  vitals: [],
  flags: [],
  notes: [],
  timeline: [
    {
      id: 'evt-1',
      patientId: 'patient-1',
      type: 'EncounterCreated',
      timestamp: new Date().toISOString(),
      summary: 'Encounter created',
      metadata: { encounterId: 'encounter-patient-1' },
    },
  ],
};

describe('unifiedOperationalSearch', () => {
  const dataset = {
    patients: [patient],
    referrals: [
      {
        id: 'referral-1',
        patientId: 'patient-1',
        targetDepartment: 'Cardiology',
        status: 'Pending',
        urgency: 'Urgent',
        reason: 'Chest pain consult',
        requestedAt: new Date().toISOString(),
      },
    ],
    emsArrivals: [
      {
        id: 'ems-1',
        unitId: 'MEDIC-12',
        unitName: 'Medic 12',
        crewNames: ['A. Paramedic'],
        patientAge: 54,
        patientSex: 'M',
        chiefComplaint: 'STEMI',
        eta: 8,
        severity: 'Critical',
        dispatchTime: new Date().toISOString(),
        estimatedArrivalTime: new Date(Date.now() + 8 * 60000).toISOString(),
        notes: '',
        status: 'Inbound',
        prearrivalComplaint: 'Chest pain',
        priority: Priority.P1,
      },
    ],
    queues: [
      {
        id: 'queue-waiting',
        label: 'Waiting',
        type: 'Waiting',
        count: 3,
        longestWaitMinutes: 42,
      },
    ],
  };

  it('finds all five entity types from one query surface', () => {
    const hits = searchOperationalEntities({ ...dataset, query: 'ava' });
    const grouped = groupOperationalSearchHits(hits);
    expect(grouped.patient.length).toBeGreaterThan(0);
    expect(grouped.queue.length).toBeGreaterThan(0);

    const encounterHits = searchOperationalEntities({ ...dataset, query: 'encounter-patient-1' });
    expect(encounterHits.some((hit) => hit.entityType === 'encounter')).toBe(true);

    const referralHits = searchOperationalEntities({ ...dataset, query: 'cardiology' });
    expect(referralHits.some((hit) => hit.entityType === 'referral')).toBe(true);

    const emsHits = searchOperationalEntities({ ...dataset, query: 'medic-12' });
    expect(emsHits.some((hit) => hit.entityType === 'ems')).toBe(true);

    const queueHits = searchOperationalEntities({ ...dataset, query: 'waiting queue' });
    expect(queueHits.some((hit) => hit.entityType === 'queue')).toBe(true);
  });

  it('passes the single-search audit when all entities are represented', () => {
    const hits = searchOperationalEntities({ ...dataset, query: 'ava' })
      .concat(searchOperationalEntities({ ...dataset, query: 'encounter-patient-1' }))
      .concat(searchOperationalEntities({ ...dataset, query: 'cardiology' }))
      .concat(searchOperationalEntities({ ...dataset, query: 'medic-12' }))
      .concat(searchOperationalEntities({ ...dataset, query: 'waiting' }));

    const audit = auditOperationalSearchCoverage(hits);
    expect(audit.passesSingleSearchTest).toBe(true);
    expect(audit.missing).toEqual([]);
  });
});
