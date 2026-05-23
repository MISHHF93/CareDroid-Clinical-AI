import { readFileSync } from 'fs';
import { join } from 'path';

describe('ChatService unsupported tool boundary', () => {
  it('returns structured unsupported-tool metadata instead of hiding missing executors behind fallback', () => {
    const source = readFileSync(join(__dirname, 'chat.service.ts'), 'utf8');

    expect(source).toContain('ToolExecutionErrorCode.UNSUPPORTED_TOOL');
    expect(source).toContain("type: 'unsupported-tool'");
    expect(source).toContain('UNSUPPORTED_ORCHESTRATOR_TOOL_DOCS');
    expect(source).not.toContain('falling back to general clinical response');
  });
});
