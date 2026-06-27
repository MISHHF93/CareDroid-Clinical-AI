import { readFileSync } from 'fs';
import { join } from 'path';

describe('EmergencyAIController Copilot context forwarding', () => {
  const source = readFileSync(join(__dirname, 'emergency-ai.controller.ts'), 'utf8');

  it('preserves client aiRequest flags before applying server-owned metadata', () => {
    expect(source).toContain('const clientAiRequest =');
    expect(source).toContain('...clientAiRequest');
    expect(source).toContain('requestType');
  });
});
