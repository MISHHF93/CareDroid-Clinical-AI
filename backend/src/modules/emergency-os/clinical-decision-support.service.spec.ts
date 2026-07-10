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
});
