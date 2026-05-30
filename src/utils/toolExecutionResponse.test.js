import { describe, it, expect } from 'vitest';
import { parseToolExecutionResponse } from './toolExecutionResponse';

describe('parseToolExecutionResponse', () => {
  it('parses Nest ToolExecutionResponseDto', () => {
    const json = {
      success: true,
      toolId: 'sofa-calculator',
      toolName: 'SOFA',
      result: {
        success: true,
        data: { totalScore: 6 },
        errors: [],
        interpretation: 'Moderate organ dysfunction',
        warnings: ['Use full clinical context'],
        citations: [{ title: 'SOFA' }],
        disclaimer: 'Decision support only',
        timestamp: '2026-05-30T00:00:00.000Z',
      },
    };
    const p = parseToolExecutionResponse(json);
    expect(p.ok).toBe(true);
    expect(p.data.totalScore).toBe(6);
    expect(p.interpretation).toBe('Moderate organ dysfunction');
    expect(p.warnings).toEqual(['Use full clinical context']);
    expect(p.citations).toEqual([{ title: 'SOFA' }]);
    expect(p.disclaimer).toBe('Decision support only');
    expect(p.timestamp).toBe('2026-05-30T00:00:00.000Z');
  });

  it('handles legacy wrapped shape', () => {
    const json = {
      data: {
        success: true,
        toolId: 'x',
        toolName: 'X',
        result: { success: true, data: { foo: 1 } },
      },
    };
    const p = parseToolExecutionResponse(json);
    expect(p.ok).toBe(true);
    expect(p.data.foo).toBe(1);
  });
});
