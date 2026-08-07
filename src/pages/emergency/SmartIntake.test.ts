import { describe, expect, it } from 'vitest';
import { formatAuditLogEntry, buildBlankRequiredIdentityFields } from './SmartIntake';
import {
  buildAutoApprovedFieldDecisions,
  REQUIRED_IDENTITY_FIELDS,
} from '../../config/smartIntakeFlowModel';
import { isVerificationComplete } from '../../utils/verificationWorkflow';

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

describe('buildBlankRequiredIdentityFields (2026-08-07)', () => {
  // Regression guard for a more severe bug found while tracing the audit-log
  // fix: extractedFields/fieldDecisions were ALSO seeded from
  // SMART_INTAKE_DEMO.extractedFields — a full fabricated patient ("Mei Li",
  // DOB 1991-06-18, fake allergy "Penicillin - rash", fake medication
  // "Metformin 500mg BID") with firstName/lastName/dateOfBirth/sex all
  // pre-marked status: 'verified'. canContinueSmartIntakeStep allows
  // `sessionReady` alone (set true unconditionally once a session starts) to
  // satisfy the capture step, so staff can reach Verify Fields and Create
  // Patient without ever uploading a document — meaning this fake identity
  // could flow into a real new patient's record with the 4 core identity
  // fields never surfaced for review (only the fixture's already-conflicting
  // fields would visibly need attention).

  it('returns one blank row per required identity field, matching REQUIRED_IDENTITY_FIELDS exactly', () => {
    const fields = buildBlankRequiredIdentityFields();
    expect(fields.map((field) => field.field)).toEqual(REQUIRED_IDENTITY_FIELDS);
    fields.forEach((field) => {
      expect(field.extracted).toBe('');
      expect(field.existing).toBe('');
      expect(field.status).toBe('unverified');
    });
  });

  it('contains no trace of the demo fixture identity ("Mei Li", 1991-06-18, etc.)', () => {
    const fields = buildBlankRequiredIdentityFields();
    const serialized = JSON.stringify(fields);
    expect(serialized).not.toMatch(/Mei|1991-06-18/);
  });

  it('is NOT auto-verified — isVerificationComplete requires staff to explicitly resolve every required field before Create Patient is reachable', () => {
    const fields = buildBlankRequiredIdentityFields();
    const decisions = buildAutoApprovedFieldDecisions(fields);
    expect(Object.keys(decisions)).toHaveLength(REQUIRED_IDENTITY_FIELDS.length);
    expect(isVerificationComplete(decisions)).toBe(false);
  });
});
