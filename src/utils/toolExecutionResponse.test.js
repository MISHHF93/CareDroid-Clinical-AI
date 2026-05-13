import { describe, it, expect } from 'vitest';
import { parseToolExecutionResponse } from './toolExecutionResponse';

describe('parseToolExecutionResponse', () => {
  it('parses Nest ToolExecutionResponseDto', () => {
    const json = {
      success: true,
      toolId: 'sofa-calculator',
      toolName: 'SOFA',
      result: { success: true, data: { totalScore: 6 }, errors: [], timestamp: new Date() },
    };
    const p = parseToolExecutionResponse(json);
    expect(p.ok).toBe(true);
    expect(p.data.totalScore).toBe(6);
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
