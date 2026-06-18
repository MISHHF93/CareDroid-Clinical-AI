import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState } from '../../types/emergency';
import {
  filterPatientsByQuery,
  isEmsRegistrationPatient,
  selectReceptionQueues,
} from './receptionQueueModel';

describe('receptionQueueModel', () => {
  const patients = [
    {
      id: 'p1',
      firstName: 'Ava',
      lastName: 'Stone',
      mrn: 'ED-100',
      dob: '1991-06-18',
      state: PatientState.Triage,
      arrivalTime: new Date().toISOString(),
      flags: [],
    },
    {
      id: 'p2',
      firstName: 'Ben',
      lastName: 'Lee',
      mrn: 'ED-200',
      state: PatientState.Registration,
      arrivalTime: new Date().toISOString(),
      flags: [],
    },
    {
      id: 'p3',
      firstName: 'EMS',
      lastName: 'Patient',
      mrn: 'EMS-1',
      state: PatientState.Registration,
      arrivalTime: new Date().toISOString(),
      flags: [PatientFlag.EMSArrival],
    },
  ];

  it('filters patients by query without a duplicate search system', () => {
    expect(filterPatientsByQuery(patients, 'ava')).toHaveLength(1);
    expect(filterPatientsByQuery(patients, 'ED-200')).toHaveLength(1);
    expect(filterPatientsByQuery(patients, '06/18/1991')).toHaveLength(1);
  });

  it('builds verification, triage, and EMS queues from one model', () => {
    const queues = selectReceptionQueues(patients);

    expect(isEmsRegistrationPatient(patients[2])).toBe(true);
    expect(queues.verification).toHaveLength(1);
    expect(queues.pretriage).toHaveLength(1);
    expect(queues.ems).toHaveLength(1);
    expect(queues.counts.awaitingVerification).toBe(2);
    expect(queues.counts.awaitingTriage).toBe(1);
  });
});
