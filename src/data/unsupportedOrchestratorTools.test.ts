import { describe, it, expect } from 'vitest';
import {
  NLU_PROFILE_TOOL_IDS,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
} from './clinicalToolIdContract';
import {
  UNSUPPORTED_ORCHESTRATOR_NLU_TOOL_IDS,
  UNSUPPORTED_ORCHESTRATOR_TOOL_DOCS,
  isOrchestratorPostExecutable,
} from './unsupportedOrchestratorTools';

describe('unsupportedOrchestratorTools', () => {
  it('covers every NLU profile except registered executors', () => {
    const expected = NLU_PROFILE_TOOL_IDS.filter(
      (id) => !ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.includes(id as any)
    );
    expect([...UNSUPPORTED_ORCHESTRATOR_NLU_TOOL_IDS].sort()).toEqual([...expected].sort());
  });

  it('documents dispatch-ai as chat-only', () => {
    const dispatch = UNSUPPORTED_ORCHESTRATOR_TOOL_DOCS.find((r) => r.nluToolId === 'dispatch-ai');
    expect(dispatch?.surface).toBe('chat-assisted');
    expect(dispatch?.reason).toMatch(/POST/i);
  });

  it('isOrchestratorPostExecutable is true only for three executors', () => {
    expect(isOrchestratorPostExecutable('sofa-calculator')).toBe(true);
    expect(isOrchestratorPostExecutable('dispatch-ai')).toBe(false);
    expect(isOrchestratorPostExecutable('phq9')).toBe(false);
  });
});
