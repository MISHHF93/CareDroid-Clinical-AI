import { readFileSync } from 'fs';
import { join } from 'path';

describe('ChatService ED Copilot wiring', () => {
  const source = readFileSync(join(__dirname, 'chat.service.ts'), 'utf8');

  it('routes emergency workspace chat through ED Copilot with Anthropic support', () => {
    expect(source).toContain('workspaceContext?.edCopilot?.enabled');
    expect(source).toContain('handleEdCopilot');
    expect(source).toContain('unifiedAIClient.request');
    expect(source).toContain('ANTHROPIC_API_KEY');
  });

  it('returns structured whiteboard actions with human-review guardrails', () => {
    expect(source).toContain("type: 'filterComplaint'");
    expect(source).toContain("type: 'flagReassessment'");
    expect(source).toContain('requiresHumanReview: true');
    expect(source).toContain('autonomousClinicalDecisionsAllowed: false');
  });
});
