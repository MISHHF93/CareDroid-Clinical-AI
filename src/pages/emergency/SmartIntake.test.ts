import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { formatAuditLogEntry, buildBlankRequiredIdentityFields } from './SmartIntake';
import {
  buildAutoApprovedFieldDecisions,
  REQUIRED_IDENTITY_FIELDS,
} from '../../config/smartIntakeFlowModel';
import { isVerificationComplete } from '../../utils/verificationWorkflow';
import { BACKEND_API_CAPABILITY_STATUS, BACKEND_CAPABILITY_STATUS } from '../../config/backendApiCapabilities';

const __dirname = dirname(fileURLToPath(import.meta.url));
const smartIntakeSource = readFileSync(join(__dirname, 'SmartIntake.tsx'), 'utf8');

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

describe('startBackendSession demo-identity clearing (2026-08-08 regression)', () => {
  // The 2026-08-07 fix above (buildBlankRequiredIdentityFields) was only ever
  // invoked from the `isBackendCapabilityEnabled('emergencySmartIntakeIdentitySession')`
  // branch of startBackendSession. But that capability is DISABLED by default
  // (asserted below, matching backendApiCapabilities.test.ts) — so every real
  // session in the actual running app takes the `else` (fetchSmartIntake)
  // branch instead, which never called the clearing logic at all. The fix was
  // real code, wired to a branch that never executes: the fabricated "Mei Li"
  // identity and demo audit log were still live for every real staff session.
  // These are source-wiring checks (this codebase's own established pattern —
  // see ReceptionWorkspace.test.tsx, platformWiring.contract.test.ts) because
  // startBackendSession is a component-internal closure, not an exported unit.

  it('emergencySmartIntakeIdentitySession is disabled by default, so the fallback branch is the one real sessions actually take', () => {
    expect(BACKEND_API_CAPABILITY_STATUS.emergencySmartIntakeIdentitySession).toBe(
      BACKEND_CAPABILITY_STATUS.DISABLED,
    );
  });

  it('the fallback (else) branch that runs when the identity-session capability is disabled clears the demo identity seed', () => {
    const elseBranchStart = smartIntakeSource.indexOf('const result = await fetchSmartIntake();');
    const elseBranchEnd = smartIntakeSource.indexOf(
      "setActiveStepTracked(resolveSessionStartStep(), 'session-start');",
    );
    expect(elseBranchStart).toBeGreaterThan(-1);
    expect(elseBranchEnd).toBeGreaterThan(elseBranchStart);
    const elseBranch = smartIntakeSource.slice(elseBranchStart, elseBranchEnd);
    expect(elseBranch).toContain('clearDemoIdentitySeed(resolvedSessionId, { fetchAuditLog: false })');
  });

  it('the catch (safeguarded review mode) branch also clears the demo identity seed, since sessionReady is still set true on error', () => {
    const catchStart = smartIntakeSource.indexOf('} catch (error: any) {');
    const catchEnd = smartIntakeSource.indexOf('} finally {');
    expect(catchStart).toBeGreaterThan(-1);
    expect(catchEnd).toBeGreaterThan(catchStart);
    const catchBranch = smartIntakeSource.slice(catchStart, catchEnd);
    expect(catchBranch).toContain('clearDemoIdentitySeed(null, { fetchAuditLog: false })');
  });

  it('the fallback branch does not fetch /audit-log with a non-identity session id (would 404 and silently reintroduce the demo audit log via the API client\'s own fallback)', () => {
    const elseBranchStart = smartIntakeSource.indexOf('const result = await fetchSmartIntake();');
    const elseBranchEnd = smartIntakeSource.indexOf(
      "setActiveStepTracked(resolveSessionStartStep(), 'session-start');",
    );
    const elseBranch = smartIntakeSource.slice(elseBranchStart, elseBranchEnd);
    expect(elseBranch).not.toContain('fetchAuditLog(resolvedSessionId)');
  });
});

describe('updateDecision field-review audit tracking (2026-08-08)', () => {
  // Found while confirming Domain 1's own "fetchAuditLog not shown as a
  // standalone audit view" scorecard claim: the view genuinely exists
  // (PatientVerificationExperience.tsx's "Identity audit log" section,
  // visible by default via practitionerSurfaceVisibility.ts's
  // showVerificationAuditLog: true) and IS fed locally for document
  // uploads -- but the actual per-field verify/reject/edit decisions, the
  // core of what "identity verification" means, were never appended
  // anywhere. SmartIntakeApi.verifyField() only fires when
  // emergencySmartIntakeIdentitySession is enabled (disabled by default,
  // so real sessions never reach it — see the describe block above), and
  // nothing recorded the decision locally either. Source-wiring check
  // (updateDecision is a component-internal closure, not an exported
  // unit) matching this file's own established pattern.

  it('updateDecision appends a local audit entry unconditionally, not gated behind the disabled-by-default backend capability', () => {
    const fnStart = smartIntakeSource.indexOf('const updateDecision = (field, decision) => {');
    const fnEnd = smartIntakeSource.indexOf(
      "if (ocrJobId && isBackendCapabilityEnabled('emergencyOcrIntake')) {",
    );
    expect(fnStart).toBeGreaterThan(-1);
    expect(fnEnd).toBeGreaterThan(fnStart);
    const fnBody = smartIntakeSource.slice(fnStart, fnEnd);

    const auditAppendIndex = fnBody.indexOf('setIdentityAuditLog((current) => [...current,');
    const capabilityGateIndex = fnBody.indexOf(
      "if (isBackendCapabilityEnabled('emergencySmartIntakeIdentitySession') && sessionReady) {",
    );
    expect(auditAppendIndex).toBeGreaterThan(-1);
    expect(capabilityGateIndex).toBeGreaterThan(-1);
    // Must run BEFORE the capability check, i.e. unconditionally on every
    // real decision -- not nested inside the branch that's dead by default.
    expect(auditAppendIndex).toBeLessThan(capabilityGateIndex);
    expect(fnBody).toContain('`${field} ${nextStatus} by ${emergencyRole.roleLabel}`');
  });
});

describe('SmartIntake local-only-fallback unsynced marking (2026-08-27)', () => {
  // Real behavioral coverage for the markUnsynced flag lives in
  // emergencyStore.unsyncedPatientProtection.test.ts; this is a
  // source-wiring guard confirming the catch block actually opts in, same
  // pattern this file already uses elsewhere.
  it('marks the local-only-fallback patient unsynced after routeSmartIntakeThroughOrchestrator fails', () => {
    expect(smartIntakeSource).toContain(
      "addPatient(patientRecord as any, { syncToBackend: false, markUnsynced: true });",
    );
  });
});
