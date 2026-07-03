import { describe, expect, it } from 'vitest';
import {
  getPendingSecurityAuditCount,
  ingestEmergencyAuditEntries,
  recordSecurityAuditEvent,
} from './securityAuditService';

describe('securityAuditService', () => {
  it('queues ingested emergency store audit entries for backend sync', () => {
    const before = getPendingSecurityAuditCount();
    const entry = {
      id: `audit-ingest-${Date.now()}`,
      action: 'addPatient',
      patientId: 'patient-1',
      staffId: 'intake',
      timestamp: new Date().toISOString(),
      details: { mrn: 'MRN-1' },
    };

    ingestEmergencyAuditEntries([entry]);

    expect(getPendingSecurityAuditCount()).toBe(before + 1);
  });

  it('deduplicates ingested emergency audit entries by id', () => {
    const entry = recordSecurityAuditEvent({
      action: 'phi.read',
      patientId: 'patient-2',
      staffId: 'nurse-1',
    });
    const afterRecord = getPendingSecurityAuditCount();

    ingestEmergencyAuditEntries([entry]);

    expect(getPendingSecurityAuditCount()).toBe(afterRecord);
  });
});