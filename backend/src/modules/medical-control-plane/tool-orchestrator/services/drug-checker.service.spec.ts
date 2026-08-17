import { DrugCheckerService } from './drug-checker.service';
import { AIService } from '../../../ai/ai.service';

function makeService() {
  const mockAiService = {
    generateStructuredJSON: jest.fn(),
  } as unknown as jest.Mocked<AIService>;
  const service = new DrugCheckerService(mockAiService);
  return { service, mockAiService };
}

describe('DrugCheckerService — AI human-review flagging (Cycle 230 regression)', () => {
  // Same gap as LabInterpreterService: generateStructuredJSON's
  // requiresHumanReview defaults to false unless the caller passes
  // context.aiFoundation.requiresHumanReview. AI-generated drug-interaction
  // analysis (severity, contraindications, management recommendations) never
  // triggered the human-review workflow the chat/gateway path enforces
  // unconditionally.
  it('flags AI-generated drug-interaction analysis for human review', async () => {
    const { service, mockAiService } = makeService();
    (mockAiService.generateStructuredJSON as jest.Mock).mockResolvedValue({
      interactions: [
        {
          drug1: 'warfarin',
          drug2: 'aspirin',
          severity: 'major',
          mechanism: 'Additive anticoagulant effect',
          clinicalSignificance: 'Increased bleeding risk',
          management: 'Monitor INR closely',
        },
      ],
    });

    await service.execute({ medications: ['warfarin', 'aspirin'] });

    expect(mockAiService.generateStructuredJSON).toHaveBeenCalled();
    const [, , , context] = (mockAiService.generateStructuredJSON as jest.Mock).mock.calls[0];
    expect(context).toEqual({ aiFoundation: { requiresHumanReview: true } });
  });
});

describe('DrugCheckerService — patient-allergy cross-reference (HEAL-309)', () => {
  // Before this fix, the only medication-safety tool in the app checked
  // drug-drug interactions ONLY -- it had no allergies parameter at all, so a
  // patient with a documented penicillin allergy being ordered amoxicillin
  // produced zero warning. These tests fail against the pre-fix service
  // (no `allergies` handling => the finding never appears) and pass after.
  function makeAllergyService() {
    const mockAiService = {
      generateStructuredJSON: jest.fn().mockResolvedValue({ interactions: [] }),
    } as unknown as jest.Mocked<AIService>;
    return new DrugCheckerService(mockAiService);
  }

  it('flags a CONTRAINDICATED finding when an ordered medication is a direct match for a documented allergy', async () => {
    const service = makeAllergyService();
    const result = await service.execute({
      medications: ['Amoxicillin'],
      allergies: ['Amoxicillin'],
    });

    expect(result.data.allergyContraindicationCount).toBe(1);
    expect(result.data.groupedBySeverity.contraindicated).toHaveLength(1);
    expect(result.data.groupedBySeverity.contraindicated[0]).toMatchObject({
      drug1: 'Amoxicillin',
      severity: 'contraindicated',
    });
  });

  it('flags cross-reactivity within a drug class -- penicillin allergy vs. amoxicillin (a different named drug in the same class)', async () => {
    const service = makeAllergyService();
    const result = await service.execute({
      medications: ['Amoxicillin'],
      allergies: ['Penicillin'],
    });

    expect(result.data.allergyContraindicationCount).toBe(1);
    expect(result.data.interactionsBySeverity.contraindicated).toBe(1);
  });

  it('flags cross-reactivity for the sulfa drug class -- sulfa allergy vs. Bactrim', async () => {
    const service = makeAllergyService();
    const result = await service.execute({
      medications: ['Bactrim'],
      allergies: ['Sulfa'],
    });

    expect(result.data.allergyContraindicationCount).toBe(1);
  });

  it('does not flag an allergy finding when no ordered medication matches any documented allergy', async () => {
    const service = makeAllergyService();
    const result = await service.execute({
      medications: ['Metoprolol', 'Atorvastatin'],
      allergies: ['Penicillin'],
    });

    expect(result.data.allergyContraindicationCount).toBe(0);
  });

  it('still executes normally when allergies is omitted entirely (back-compat)', async () => {
    const service = makeAllergyService();
    const result = await service.execute({ medications: ['Metoprolol', 'Atorvastatin'] });

    expect(result.success).toBe(true);
    expect(result.data.allergyContraindicationCount).toBe(0);
    expect(result.data.allergiesChecked).toEqual([]);
  });

  it('rejects a non-array allergies parameter', () => {
    const service = makeAllergyService();
    const validation = service.validate({ medications: ['Amoxicillin'], allergies: 'penicillin' });

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('allergies must be an array');
  });
});
