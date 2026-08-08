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

  it('marks live-turn evaluation runs seedOnly so fabricated metrics never contaminate the "measured" dashboard pool (2026-08-08)', () => {
    // recordEvaluationRun()'s hallucinationRate/accuracy/retrievalPrecision/
    // userSatisfaction are rule-derived placeholders, not real detection/rating
    // -- see EvaluationRun.seedOnly's doc comment and evaluation.service.spec.ts's
    // "seedOnly provenance" describe block for the full regression story.
    const start = source.indexOf('private recordEvaluationRun(');
    const end = source.indexOf('\n  private compactAssistantText', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const functionBody = source.slice(start, end);

    expect(functionBody).toContain('this.evaluationService.createRun({');
    expect(functionBody).toContain('seedOnly: true');
  });
});
