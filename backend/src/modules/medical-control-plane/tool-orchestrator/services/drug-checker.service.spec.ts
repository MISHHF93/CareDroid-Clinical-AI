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
