import { ClinicalDecisionSupportService } from './clinical-decision-support.service';

describe('ClinicalDecisionSupportService', () => {
  let service: ClinicalDecisionSupportService;

  beforeEach(() => {
    service = new ClinicalDecisionSupportService();
  });

  it('records calculator results with disclaimer metadata', () => {
    const envelope = service.recordCalculatorResult({
      calculatorId: 'qsofa',
      patientId: 'p1',
      inputs: { respiratoryRate: 24 },
      score: 2,
      riskCategory: 'qSOFA-positive (≥2)',
      interpretation: 'Higher risk context',
      disclaimer: 'Clinical decision support only.',
      referenceLine: 'Sepsis-3',
    });

    expect(envelope.data.calculatorId).toBe('qsofa');
    expect(envelope.data.patientId).toBe('p1');
    expect(envelope.source).toBe('clinical-decision-support');
  });

  it('records copilot interactions requiring human review by default', () => {
    const envelope = service.recordCopilotInteraction({
      question: 'What should I watch for?',
      patientId: 'p2',
      draftGuidance: 'Review vitals trend and reassessment timing.',
      patientContextSummary: 'Chest pain, P2',
      userRole: 'physician',
    });

    expect(envelope.data.requiresHumanReview).toBe(true);
    expect(envelope.data.safetyDisclaimer).toMatch(/clinician review/i);
    expect(envelope.data.reviewedAt).toBeNull();
  });

  it('filters stored calculator results by patient', () => {
    service.recordCalculatorResult({
      calculatorId: 'gcs',
      patientId: 'p1',
      inputs: {},
      score: 15,
      riskCategory: 'mild',
      interpretation: 'GCS 15',
      disclaimer: 'Clinical decision support only.',
      referenceLine: 'Teasdale',
    });
    service.recordCalculatorResult({
      calculatorId: 'gcs',
      patientId: 'p9',
      inputs: {},
      score: 8,
      riskCategory: 'severe',
      interpretation: 'GCS 8',
      disclaimer: 'Clinical decision support only.',
      referenceLine: 'Teasdale',
    });

    const listed = service.listCalculatorResults({ patientId: 'p1' });
    expect(listed.data.count).toBe(1);
    expect(listed.data.results[0].patientId).toBe('p1');
  });

  // BOLA regression: recordCalculatorResult()/recordCopilotInteraction()
  // have always stamped tenantId, but listCalculatorResults()/
  // listCopilotInteractions() never checked it -- any USE_CALCULATORS/
  // USE_AI_CHAT-permitted user of ANY org could list every org's rows by
  // omitting patientId, or read another org's patient's rows by supplying
  // that patientId.
  it('scopes listCalculatorResults to the caller org, excluding a different org even for the same patientId', () => {
    service.recordCalculatorResult(
      {
        calculatorId: 'news2',
        patientId: 'shared-patient-id',
        inputs: {},
        score: 5,
        riskCategory: 'org-a-row',
        interpretation: 'Org A result',
        disclaimer: 'Clinical decision support only.',
        referenceLine: 'NEWS2',
      },
      { tenantId: 'org-a' },
    );
    service.recordCalculatorResult(
      {
        calculatorId: 'news2',
        patientId: 'shared-patient-id',
        inputs: {},
        score: 9,
        riskCategory: 'org-b-row',
        interpretation: 'Org B result',
        disclaimer: 'Clinical decision support only.',
        referenceLine: 'NEWS2',
      },
      { tenantId: 'org-b' },
    );

    const scoped = service.listCalculatorResults({ organizationId: 'org-a' });
    expect(scoped.data.count).toBe(1);
    expect(scoped.data.results[0].riskCategory).toBe('org-a-row');

    // Even with the exact right patientId, a different org must not see it.
    const crossTenantAttempt = service.listCalculatorResults({
      patientId: 'shared-patient-id',
      organizationId: 'org-a',
    });
    expect(crossTenantAttempt.data.count).toBe(1);
    expect(crossTenantAttempt.data.results[0].riskCategory).toBe('org-a-row');
  });

  it('scopes listCopilotInteractions to the caller org', () => {
    service.recordCopilotInteraction(
      {
        question: 'Org A question',
        patientId: 'shared-patient-id',
        draftGuidance: 'Org A guidance',
        patientContextSummary: 'Org A context',
        userRole: 'physician',
      },
      { tenantId: 'org-a' },
    );
    service.recordCopilotInteraction(
      {
        question: 'Org B question',
        patientId: 'shared-patient-id',
        draftGuidance: 'Org B guidance',
        patientContextSummary: 'Org B context',
        userRole: 'physician',
      },
      { tenantId: 'org-b' },
    );

    const scoped = service.listCopilotInteractions({ organizationId: 'org-a' });
    expect(scoped.data.count).toBe(1);
    expect(scoped.data.interactions[0].question).toBe('Org A question');
  });
});
