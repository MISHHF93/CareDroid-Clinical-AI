import { describe, expect, it } from 'vitest';
import {
  auditReceptionCopyClarity,
  auditReceptionTrainingReadiness,
  auditReceptionWorkflowTraining,
} from './receptionTrainingAuditModel';

describe('receptionTrainingAuditModel', () => {
  it('passes the five-minute training rule for primary workflows', () => {
    const audit = auditReceptionTrainingReadiness();
    expect(audit.copy.usesPlainLanguage).toBe(true);
    expect(audit.workflows.passesAudit).toBe(true);
    expect(audit.passesAudit).toBe(true);
  });

  it('flags express walk-in as the fastest training path', () => {
    const workflows = auditReceptionWorkflowTraining();
    const express = workflows.workflows.find((workflow) => workflow.id === 'express-walk-in');
    expect(express?.passesFiveMinuteRule).toBe(true);
    expect(express?.estimatedSeconds).toBeLessThan(60);
  });

  it('uses plain queue tab labels', () => {
    const copy = auditReceptionCopyClarity();
    expect(copy.queueTabsUnderstandable).toBe(true);
    expect(copy.jargonHits).toEqual([]);
  });
});
