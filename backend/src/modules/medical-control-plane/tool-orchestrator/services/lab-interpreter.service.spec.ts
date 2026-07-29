import { LabInterpreterService } from './lab-interpreter.service';
import { AIService } from '../../../ai/ai.service';

function makeService() {
  const mockAiService = {
    generateStructuredJSON: jest.fn(),
  } as unknown as jest.Mocked<AIService>;
  const service = new LabInterpreterService(mockAiService);
  return { service, mockAiService };
}

describe('LabInterpreterService — AI human-review flagging (Cycle 230 regression)', () => {
  // AIService.generateStructuredJSON's requiresHumanReview defaults to false
  // unless the caller passes context.aiFoundation.requiresHumanReview -- the
  // chat/gateway path always sets this via AIGatewayService, but this tool
  // executor called generateStructuredJSON with no context argument at all,
  // meaning AI-generated clinical lab interpretation never triggered the
  // human-review workflow (createHumanReviewItemIfRequired/
  // postAiChiefRecommendation) that the same codebase already enforces
  // unconditionally for chat-routed AI output.
  it('flags AI-generated lab interpretation for human review', async () => {
    const { service, mockAiService } = makeService();
    (mockAiService.generateStructuredJSON as jest.Mock).mockResolvedValue({
      findings: ['Elevated WBC'],
      clinicalSignificance: 'Possible infection or inflammatory process.',
      suggestedActions: ['Repeat CBC', 'Clinical correlation'],
    });

    await service.execute({
      labValues: [{ name: 'wbc', value: 20, unit: 'K/uL' }],
    });

    expect(mockAiService.generateStructuredJSON).toHaveBeenCalled();
    const [, , , context] = (mockAiService.generateStructuredJSON as jest.Mock).mock.calls[0];
    expect(context).toEqual({ aiFoundation: { requiresHumanReview: true } });
  });

  it('does not call the AI at all when every lab value is normal (no regression to existing behavior)', async () => {
    const { service, mockAiService } = makeService();

    await service.execute({
      labValues: [{ name: 'wbc', value: 7, unit: 'K/uL' }],
    });

    expect(mockAiService.generateStructuredJSON).not.toHaveBeenCalled();
  });
});
