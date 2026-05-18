import {
  REGISTERED_EXECUTOR_TOOL_IDS,
  REGISTRY_ID_TO_EXECUTOR_TOOL_ID,
  EXECUTOR_ID_ALIASES,
  EXECUTOR_REQUEST_CONTRACTS,
  resolveExecutorToolId,
  classifyToolExecutionError,
  validateExecutorRequestPayload,
  ToolExecutionErrorCode,
} from './tool-orchestrator.registry';

describe('tool-orchestrator.registry', () => {
  it('exposes exactly three registered executor ids', () => {
    expect(REGISTERED_EXECUTOR_TOOL_IDS).toEqual([
      'sofa-calculator',
      'drug-interactions',
      'lab-interpreter',
    ]);
  });

  it('maps registry ids to executor ids (frontend REGISTRY_ID_TO_ORCHESTRATOR_TOOL parity)', () => {
    expect(REGISTRY_ID_TO_EXECUTOR_TOOL_ID).toEqual({
      'drug-check': 'drug-interactions',
      'lab-interp': 'lab-interpreter',
      'sofa-score': 'sofa-calculator',
    });
  });

  it('resolves drug-interaction-checker alias', () => {
    const resolved = resolveExecutorToolId('drug-interaction-checker');
    expect(resolved?.resolvedId).toBe('drug-interactions');
    expect(resolved?.aliased).toBe(true);
  });

  it('resolves sidebar registry ids', () => {
    expect(resolveExecutorToolId('sofa-score')?.resolvedId).toBe('sofa-calculator');
    expect(resolveExecutorToolId('drug-check')?.resolvedId).toBe('drug-interactions');
  });

  it('returns null for unknown ids', () => {
    expect(resolveExecutorToolId('dispatch-ai')).toBeNull();
    expect(resolveExecutorToolId('')).toBeNull();
  });

  it('classifies dispatch-ai as unsupported', () => {
    expect(classifyToolExecutionError('dispatch-ai')).toBe(
      ToolExecutionErrorCode.UNSUPPORTED_TOOL,
    );
  });

  it('documents contracts for every registered executor', () => {
    for (const id of REGISTERED_EXECUTOR_TOOL_IDS) {
      expect(EXECUTOR_REQUEST_CONTRACTS[id]).toBeDefined();
      expect(EXECUTOR_REQUEST_CONTRACTS[id].toolId).toBe(id);
    }
  });

  it('marks SOFA as deterministic', () => {
    expect(EXECUTOR_REQUEST_CONTRACTS['sofa-calculator'].deterministic).toBe(true);
  });

  it('validates parameters must be a plain object', () => {
    expect(validateExecutorRequestPayload({ a: 1 }).valid).toBe(true);
    expect(validateExecutorRequestPayload([]).valid).toBe(false);
    expect(validateExecutorRequestPayload(null).valid).toBe(false);
  });

  it('does not alias unknown legacy ids into executors', () => {
    expect(EXECUTOR_ID_ALIASES['sofa_calculator']).toBeUndefined();
  });
});
