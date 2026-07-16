import { EdCopilotNestParityController } from './ed-copilot.nest-parity.controller';

describe('EdCopilotNestParityController', () => {
  it('returns validation envelope when query/user_role missing', async () => {
    const copilotService = { processQuery: jest.fn() };
    const controller = new EdCopilotNestParityController(copilotService as any);
    const result = await controller.query({});
    expect(result).toMatchObject({
      success: false,
      error: { code: 'VALIDATION', statusCode: 400 },
    });
    expect(copilotService.processQuery).not.toHaveBeenCalled();
  });

  it('returns accountable recommendation for a recognized query', async () => {
    const copilotService = {
      processQuery: jest.fn().mockReturnValue({
        suggestion: 'Patient X waited longest',
        requires_review: true,
        data: { response: 'Patient X waited longest' },
      }),
    };
    const controller = new EdCopilotNestParityController(copilotService as any);
    const result = (await controller.query({
      query: 'Who waited longest?',
      user_role: 'charge_nurse',
    })) as any;

    expect(copilotService.processQuery).toHaveBeenCalled();
    expect(result.accountableRecommendation).toBeDefined();
    expect(result.accountableRecommendation.content).toMatch(/waited/i);
    expect(result.requiresClinicianReview).toBe(true);
  });
});
