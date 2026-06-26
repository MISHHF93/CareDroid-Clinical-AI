import { describe, expect, it } from 'vitest';
import {
  FRONTEND_OS_FLOW,
  getFrontendOperatingSystemStage,
  getFrontendOperatingSystemState,
} from './frontendOperatingSystem';

describe('frontend operating system model', () => {
  it('defines the canonical frontend shell flow', () => {
    expect(FRONTEND_OS_FLOW.map((step) => step.label)).toEqual([
      'AppShell',
      'CareDroid',
      'Whiteboard',
      'Asset Launch',
      'Workflow',
      'Result',
    ]);
  });

  it('classifies routes into operating-system stages', () => {
    expect(getFrontendOperatingSystemStage('/workspace/emergency')).toBe('workspace');
    expect(getFrontendOperatingSystemStage('/dashboard')).toBe('dashboard');
    expect(getFrontendOperatingSystemStage('/search?q=sepsis')).toBe('asset-launch');
    expect(getFrontendOperatingSystemStage('/workflows')).toBe('workflow');
    expect(getFrontendOperatingSystemStage('/timeline')).toBe('result');
  });

  it('builds workspace-aware shell state for UI surfaces', () => {
    const state = getFrontendOperatingSystemState({
      pathname: '/workflows',
      workspace: { id: 'medical-iot', name: 'Medical IoT' },
      tenantId: 'tenant-1',
      plan: 'enterprise',
    });

    expect(state.shellLabel).toBe('CareDroid Frontend OS');
    expect(state.workspaceLabel).toBe('Medical IoT');
    expect(state.currentStage.label).toBe('Workflow');
    expect(state.flowSteps.find((step) => step.id === 'workflow')?.state).toBe('current');
    expect(state.summary).toContain('Medical IoT');
  });
});
