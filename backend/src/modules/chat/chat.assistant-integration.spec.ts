import { readFileSync } from 'fs';
import { join } from 'path';

describe('ChatService assistant lifecycle integration', () => {
  const source = readFileSync(join(__dirname, 'chat.service.ts'), 'utf8');

  it('wires assistant turns through memory, cost, artifacts, RAG, tools, and evaluation', () => {
    expect(source).toContain('RoutingOptimizerService');
    expect(source).toContain('buildAssistantMemoryContext');
    expect(source).toContain('persistAssistantMemory');
    expect(source).toContain('recordAssistantArtifact');
    expect(source).toContain('recordEvaluationRun');
    expect(source).toContain('emptyRagContext');
    expect(source).toContain('context: {');
  });

  it('routes assistant tool calls through the tool-calling engine lifecycle', () => {
    expect(source).toContain('buildToolCallingClassification');
    expect(source).toContain(
      'detect intent -> collect missing fields -> execute -> summarize result',
    );
    expect(source).toContain('this.toolExecutionService.executePrompt');
    expect(source).toContain(
      'matchedPatterns: classification?.matchedPatterns || [`ui-tool-hint:${hintedToolId}`]',
    );
  });

  it('guards memory writes to UUID-backed users only', () => {
    expect(source).toContain('uuidPattern');
    expect(source).toContain("reason: 'non_uuid_user'");
  });
});
