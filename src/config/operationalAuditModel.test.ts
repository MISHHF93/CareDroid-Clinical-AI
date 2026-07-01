import { describe, expect, it } from 'vitest';
import {
  OPERATIONAL_AUDIT_DOMAIN,
  auditOperationalHistoryExposure,
  classifyWorkflowLog,
  filterOperationalHistory,
  isQueueWorkflowLog,
} from './operationalAuditModel';

describe('operationalAuditModel', () => {
  it('classifies patient, queue, reassessment, and referral logs', () => {
    expect(classifyWorkflowLog({ type: 'patient_created' })).toBe(OPERATIONAL_AUDIT_DOMAIN.PATIENT);
    expect(classifyWorkflowLog({ type: 'journey_state_changed', metadata: { queue: 'pretriage' } })).toBe(
      OPERATIONAL_AUDIT_DOMAIN.QUEUE,
    );
    expect(classifyWorkflowLog({ type: 'reassessment_completed' })).toBe(
      OPERATIONAL_AUDIT_DOMAIN.REASSESSMENT,
    );
    expect(classifyWorkflowLog({ type: 'referral_status_changed' })).toBe(OPERATIONAL_AUDIT_DOMAIN.REFERRAL);
  });

  it('detects queue workflow logs from source and metadata', () => {
    expect(isQueueWorkflowLog({ type: 'integration_event_received', source: 'reception.handoff' })).toBe(
      true,
    );
    expect(isQueueWorkflowLog({ type: 'clinician_assigned' })).toBe(false);
  });

  it('filters by domain and patient', () => {
    const logs = [
      {
        id: '1',
        type: 'referral_created',
        patientId: 'p1',
        timestamp: '2026-06-17T12:00:00.000Z',
      },
      {
        id: '2',
        type: 'journey_state_changed',
        patientId: 'p2',
        timestamp: '2026-06-17T13:00:00.000Z',
        metadata: { queue: 'pretriage' },
      },
      {
        id: '3',
        type: 'reassessment_completed',
        patientId: 'p1',
        timestamp: '2026-06-17T14:00:00.000Z',
      },
    ];

    expect(filterOperationalHistory(logs, { domain: OPERATIONAL_AUDIT_DOMAIN.REFERRAL })).toHaveLength(1);
    expect(filterOperationalHistory(logs, { patientId: 'p1' })).toHaveLength(2);
    expect(filterOperationalHistory(logs, { domain: OPERATIONAL_AUDIT_DOMAIN.QUEUE })[0].id).toBe('2');
  });

  it('passes exposure audit for required surfaces', () => {
    const audit = auditOperationalHistoryExposure();
    expect(audit.passesAudit).toBe(true);
    expect(audit.surfaceCount).toBeGreaterThanOrEqual(5);
  });
});
