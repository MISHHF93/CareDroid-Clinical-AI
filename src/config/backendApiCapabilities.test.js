import { describe, it, expect } from 'vitest';
import {
  BACKEND_API_CAPABILITIES,
  BACKEND_EXECUTOR_NLU_TOOL_IDS,
  isBackendCapabilityEnabled,
  isBackendExecutorToolId,
} from './backendApiCapabilities';

describe('backendApiCapabilities', () => {
  it('enables only real orchestrator executors', () => {
    expect(BACKEND_EXECUTOR_NLU_TOOL_IDS).toEqual([
      'sofa-calculator',
      'drug-interactions',
      'lab-interpreter',
    ]);
    expect(isBackendExecutorToolId('qsofa')).toBe(false);
    expect(isBackendExecutorToolId('drug-interactions')).toBe(true);
  });

  it('disables phantom platform routes', () => {
    expect(isBackendCapabilityEnabled('toolsShareResults')).toBe(false);
    expect(isBackendCapabilityEnabled('teamManagement')).toBe(false);
    expect(isBackendCapabilityEnabled('bulkSync')).toBe(false);
    expect(isBackendCapabilityEnabled('chatPersistence')).toBe(false);
  });

  it('enables wired clinical routes', () => {
    expect(isBackendCapabilityEnabled('toolsExecute')).toBe(true);
    expect(isBackendCapabilityEnabled('chatMessage')).toBe(true);
    expect(isBackendCapabilityEnabled('complianceConsent')).toBe(true);
    expect(isBackendCapabilityEnabled('toolsResultsSync')).toBe(true);
  });

  it('exports frozen capability map', () => {
    expect(Object.isFrozen(BACKEND_API_CAPABILITIES)).toBe(true);
  });
});
