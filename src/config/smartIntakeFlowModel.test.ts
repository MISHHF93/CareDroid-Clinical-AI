import { describe, expect, it } from 'vitest';
import {
  auditSmartIntakeFlow,
  buildAutoApprovedFieldDecisions,
  canContinueSmartIntakeStep,
  countBulkApprovableFields,
  measureSmartIntakePath,
  resolveSmartIntakeContinueStep,
  resolveSmartIntakeStartStep,
} from './smartIntakeFlowModel';

describe('smartIntakeFlowModel', () => {
  it('starts verify flow on existing board patient', () => {
    expect(
      resolveSmartIntakeStartStep({
        intakeStep: 'verify',
        contextPatientId: 'p1',
        hasBoardPatient: true,
      }),
    ).toBe(4);
  });

  it('skips intro when autostart is enabled', () => {
    expect(resolveSmartIntakeStartStep({ autostart: true })).toBe(1);
  });

  it('continues from capture directly to match', () => {
    expect(resolveSmartIntakeContinueStep(1)).toBe(3);
  });

  it('requires verification before finalize', () => {
    expect(resolveSmartIntakeContinueStep(4, { verificationComplete: false })).toBe(4);
    expect(resolveSmartIntakeContinueStep(4, { verificationComplete: true })).toBe(5);
  });

  it('auto-approves only exact matching fields', () => {
    const decisions = buildAutoApprovedFieldDecisions(
      [
        { field: 'firstName', extracted: 'Mei', existing: 'Mei', status: 'verified' },
        { field: 'phone', extracted: '416-555-0134', existing: '416-555-0177', status: 'conflicting' },
      ],
      null,
    );
    expect(decisions.firstName).toBe('verified');
    expect(decisions.phone).toBe('conflicting');
  });

  it('counts bulk approvable matching fields', () => {
    const count = countBulkApprovableFields(
      [
        { field: 'firstName', extracted: 'Mei', existing: 'Mei' },
        { field: 'phone', extracted: '416-555-0134', existing: '416-555-0177' },
      ],
      {},
    );
    expect(count).toBe(1);
  });

  it('measures lower clicks for optimized intake path', () => {
    const audit = auditSmartIntakeFlow();
    expect(audit.optimized.clicks).toBeLessThan(audit.baseline.clicks);
    expect(audit.clickReduction).toBeGreaterThan(0);
    expect(audit.passesAudit).toBe(true);
  });

  it('gates continue on required validation', () => {
    expect(canContinueSmartIntakeStep(3, { selectedCandidateId: null })).toBe(false);
    expect(canContinueSmartIntakeStep(3, { selectedCandidateId: 'p1' })).toBe(true);
    expect(canContinueSmartIntakeStep(4, { verificationComplete: false })).toBe(false);
  });
});
