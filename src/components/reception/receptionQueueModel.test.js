import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState } from '../../types/emergency';
import {
  filterPatientsByQuery,
  isEmsRegistrationPatient,
  RECEPTION_STRIP_TO_OPERATIONAL_KEY,
  selectArrivalDashboardMetrics,
  selectReceptionOperationalStripMetrics,
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
    expect(queues.counts.queueTotal).toBe(3);
  });

  it('normalizes arrival dashboard metrics from store patients and EMS inbound', () => {
    const { metrics } = selectArrivalDashboardMetrics(patients, 2);
    const byId = Object.fromEntries(metrics.map((metric) => [metric.id, metric]));

    expect(byId['recent-arrivals'].value).toBe(3);
    expect(byId['awaiting-verification'].value).toBe(2);
    expect(byId['awaiting-triage'].value).toBe(1);
    expect(byId['ems-arrivals'].value).toBe(3);
    expect(byId['queue-total'].value).toBe(3);
  });

  it('builds compact reception operational strip metrics', () => {
    const metrics = selectReceptionOperationalStripMetrics(patients, 2);
    const byId = Object.fromEntries(metrics.map((metric) => [metric.id, metric]));

    expect(byId['arrivals-today'].value).toBe(3);
    expect(byId['awaiting-verification'].value).toBe(2);
    expect(byId['awaiting-triage'].value).toBe(1);
    expect(byId['ems-inbound'].value).toBe(2);
    expect(byId['queue-size'].value).toBe(3);
    expect(byId['awaiting-verification'].queueTab).toBe('verification');
    expect(byId['awaiting-triage'].queueTab).toBe('pretriage');
  });

  it('maps reception strip ids to operational metric keys', () => {
    expect(RECEPTION_STRIP_TO_OPERATIONAL_KEY['arrivals-today']).toBe('patientsToday');
    expect(RECEPTION_STRIP_TO_OPERATIONAL_KEY['ems-inbound']).toBe('emsInbound');
    expect(RECEPTION_STRIP_TO_OPERATIONAL_KEY['awaiting-triage']).toBe('waiting');
  });
});
