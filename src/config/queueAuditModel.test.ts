import { describe, expect, it } from 'vitest';
import {
  QUEUE_AUDIT_DOMAIN,
  auditAllQueues,
  auditQueueExposure,
  auditReceptionQueues,
  formatQueueWaitMinutes,
  summarizeQueueAudit,
} from './queueAuditModel';

describe('queueAuditModel', () => {
  const now = Date.now();
  const oldArrival = new Date(now - 45 * 60 * 1000).toISOString();
  const recentArrival = new Date(now - 5 * 60 * 1000).toISOString();

  const patients = [
    {
      id: 'p1',
      firstName: 'Ava',
      lastName: 'Stone',
      mrn: 'ED-100',
      state: 'Triage',
      arrivalTime: oldArrival,
      flags: [],
    },
    {
      id: 'p2',
      firstName: 'Ben',
      lastName: 'Lee',
      mrn: 'ED-200',
      state: 'Registration',
      arrivalTime: oldArrival,
      flags: [],
    },
    {
      id: 'p3',
      firstName: 'EMS',
      lastName: 'Patient',
      mrn: 'EMS-1',
      state: 'Registration',
      arrivalTime: recentArrival,
      flags: ['EMSArrival'],
    },
    {
      id: 'p4',
      firstName: 'Waiting',
      lastName: 'Patient',
      mrn: 'ED-300',
      state: 'Waiting',
      arrivalTime: oldArrival,
      flags: ['ReassessmentDue'],
    },
  ];

  it('audits reception queues with length and longest wait', () => {
    const rows = auditReceptionQueues(patients, { emsInbound: 1 });
    const pretriage = rows.find((row) => row.id === 'pretriage');
    expect(pretriage?.length).toBe(1);
    expect(pretriage?.longestWaitMinutes).toBeGreaterThanOrEqual(45);
    expect(pretriage?.overdueCount).toBe(1);
  });

  it('summarizes bottlenecks and overdue counts across all queues', () => {
    const rows = auditAllQueues({ patients, emsInbound: 1, referrals: [] });
    const summary = summarizeQueueAudit(rows);
    expect(summary.totalLength).toBeGreaterThan(0);
    expect(summary.totalOverdue).toBeGreaterThan(0);
    expect(summary.primaryBottleneck).toBeTruthy();
    expect(summary.longestWaitLabel).toBe(formatQueueWaitMinutes(summary.longestWaitMinutes));
  });

  it('includes both reception and ED domains', () => {
    const rows = auditAllQueues({ patients });
    expect(rows.some((row) => row.domain === QUEUE_AUDIT_DOMAIN.RECEPTION)).toBe(true);
    expect(rows.some((row) => row.domain === QUEUE_AUDIT_DOMAIN.ED)).toBe(true);
  });

  it('passes queue exposure audit', () => {
    const audit = auditQueueExposure();
    expect(audit.passesAudit).toBe(true);
    expect(audit.surfaceCount).toBeGreaterThanOrEqual(5);
  });
});
