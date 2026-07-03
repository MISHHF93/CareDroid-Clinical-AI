import { HUMAN_REVIEW_DISCLAIMER } from '../../../lib/ai/safetyPolicy';
import { AIGovernanceService } from './ai-governance.service';

describe('AIGovernanceService', () => {
  it('returns the enterprise registry snapshot with governed services and safety rules', () => {
    const service = new AIGovernanceService();

    const snapshot = service.getRegistrySnapshot();

    expect(Object.keys(snapshot.services)).toEqual(
      expect.arrayContaining([
        'copilot',
        'smartHandover',
        'protocolTrigger',
        'deteriorationPrediction',
        'dischargePrediction',
        'admissionPrediction',
        'triageSupport',
        'ambientDocumentation',
        'textMining',
        'mohPatientMatching',
      ]),
    );
    expect(snapshot.safetyRules.requiredDisclaimers).toContain(HUMAN_REVIEW_DISCLAIMER);
    expect(snapshot.governanceFrameworks).toContain('NIST AI RMF');
  });

  it('blocks unsafe priority lowering for critical acuity patients', () => {
    const service = new AIGovernanceService();

    const result = service.checkSafetyViolation(
      'triageSupport',
      {},
      {
        action: 'lower_priority',
        patientDps: 2,
      },
    );

    expect(result).toEqual({
      safe: false,
      violation: 'Cannot lower priority for DPS 2 patient (critical acuity)',
    });
  });

  it('generates compliance metrics from the auditable fixture repository', async () => {
    const service = new AIGovernanceService();

    await service.logInteraction({
      userId: 'physician-1',
      userRole: 'physician',
      serviceName: 'ambientDocumentation',
      input: { transcript: 'demo' },
      output: { note: 'Human review required' },
      safetyCheckPassed: true,
      humanReviewed: true,
      latencyMs: 250,
      costCents: 3,
    });

    const report = await service.generateComplianceReport(
      new Date('2026-06-12T00:00:00.000Z'),
      new Date('2999-01-01T00:00:00.000Z'),
    );

    expect(report.totalInteractions).toBeGreaterThanOrEqual(3);
    expect(report.interactionsByService.ambientDocumentation).toBe(1);
    expect(report.humanReviewRate).toBeGreaterThan(0);
    expect(report.storageMode).toBe('in-memory-audit-fixture');
  });

  it('validates all registered prompt templates', () => {
    const service = new AIGovernanceService();

    const results = service.validateAllPromptTemplates();

    expect(Object.values(results).every((result) => result.valid)).toBe(true);
  });
});
