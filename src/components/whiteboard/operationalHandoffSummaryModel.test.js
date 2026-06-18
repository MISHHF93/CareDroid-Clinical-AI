import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority } from '../../types/emergency';
import {
  buildOperationalHandoffDomains,
  evaluateOperationalHandoffHunting,
  flattenOperationalHandoffMetrics,
} from './operationalHandoffSummaryModel';

const patient = {
  id: 'p-1',
  state: PatientState.Waiting,
  priority: Priority.P3,
  flags: [],
};

describe('operationalHandoffSummaryModel', () => {
  it('builds four concise domain summaries', () => {
    const domains = buildOperationalHandoffDomains({
      patients: [
        patient,
        { ...patient, id: 'p-2', priority: Priority.P1 },
        { ...patient, id: 'p-3', state: PatientState.Admission },
        { ...patient, id: 'p-4', flags: [PatientFlag.ReassessmentDue] },
      ],
      emsArrivals: [
        {
          id: 'ems-1',
          status: 'EnRoute',
          estimatedArrivalTime: new Date(Date.now() + 8 * 60000).toISOString(),
          severity: 'Critical',
        },
      ],
      referrals: [
        { id: 'r-1', status: 'Pending', patientId: 'p-1' },
        { id: 'r-2', status: 'Delayed', patientId: 'p-2' },
      ],
    });

    expect(domains).toHaveLength(4);
    expect(domains.map((domain) => domain.label)).toEqual(['Patient', 'EMS', 'Referral', 'Admission']);
    expect(domains[0].headline).toContain('waiting');
    expect(domains[0].headline).toContain('high risk');
    expect(domains[1].hasAttention).toBe(true);
    expect(domains[2].metrics.some((metric) => metric.label === 'Delayed')).toBe(true);
    expect(domains[3].metrics[0].label).toBe('Boarders');
  });

  it('flattens domain metrics for one-click drill-down', () => {
    const domains = buildOperationalHandoffDomains({ patients: [patient] });
    const metrics = flattenOperationalHandoffMetrics(domains);
    expect(metrics.length).toBeGreaterThan(8);
    expect(metrics.every((metric) => metric.whiteboardAction)).toBe(true);
  });

  it('passes the single-surface hunting test', () => {
    const domains = buildOperationalHandoffDomains({ patients: [patient] });
    const hunting = evaluateOperationalHandoffHunting(domains);
    expect(hunting.passesSingleSurfaceTest).toBe(true);
    expect(hunting.domainCount).toBe(4);
  });
});
