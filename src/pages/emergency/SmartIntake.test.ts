import { describe, expect, it } from 'vitest';
import { formatAuditLogEntry } from './SmartIntake';

describe('formatAuditLogEntry (2026-08-07)', () => {
  // Regression guard for a real bug: identityAuditLog was seeded from
  // SMART_INTAKE_DEMO.auditLog (4 fabricated entries — "Document uploaded",
  // "OCR extracted", etc.) and never replaced or reconciled with the real
  // backend audit log even when a genuine live session started, so staff
  // reviewing a real identity-verification session saw 4 events that never
  // happened. The fix fetches the real backend audit log (real entries are
  // objects: { id, action, actor, timestamp, details }) and formats each
  // into the plain-string shape the rendering component (
  // PatientVerificationExperience.tsx, `key={entry}` / `{entry}`) expects.

  it('passes through an already-formatted string entry unchanged (the local-append/demo-fallback shape)', () => {
    expect(formatAuditLogEntry('Document uploaded')).toBe('Document uploaded');
  });

  it('formats a real backend audit entry into "action — actor", with underscores turned into spaces', () => {
    expect(
      formatAuditLogEntry({
        id: 'audit-1',
        action: 'patient_linked',
        actor: 'Dr. Rao',
        timestamp: '2026-08-07T00:00:00.000Z',
        details: { patientId: 'p1' },
      }),
    ).toBe('patient linked — Dr. Rao');
  });

  it('falls back to a generic label when the entry is missing an action or actor', () => {
    expect(formatAuditLogEntry({})).toBe('event');
    expect(formatAuditLogEntry(null)).toBe('event');
    expect(formatAuditLogEntry(undefined)).toBe('event');
  });
});
