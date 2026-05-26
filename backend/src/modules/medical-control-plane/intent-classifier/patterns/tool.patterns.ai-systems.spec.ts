import { CLINICAL_TOOL_PATTERNS } from './tool.patterns';

describe('AI system tool patterns', () => {
  const aiSystemIds = [
    'ai-gateway',
    'moe-router',
    'ai-rag',
    'ai-artifacts',
    'ai-memory',
    'ai-tool-calling',
    'ai-training',
    'ai-cost-optimization',
    'ai-evaluation',
    'ai-command-center',
  ];

  it.each(aiSystemIds)('%s is chat/reference routed without required executor params', (toolId) => {
    const pattern = CLINICAL_TOOL_PATTERNS.find((item) => item.toolId === toolId);

    expect(pattern).toBeTruthy();
    expect(pattern?.category).toBe('reference');
    expect(pattern?.requiredParameters).toEqual([]);
    expect(pattern?.keywords.length).toBeGreaterThan(0);
  });
});
