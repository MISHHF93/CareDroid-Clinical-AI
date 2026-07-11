import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  launchCareDroidTool,
  launchOrchestrationRecommendation,
} from './careDroidToolLaunch';
import type { ToolRecommendation } from '../../lib/patient-orchestration';

describe('careDroidToolLaunch', () => {
  beforeEach(() => {
    vi.stubGlobal('dispatchEvent', vi.fn());
  });

  it('dispatches calculator open for orchestration calculator recommendations', () => {
    launchOrchestrationRecommendation({
      patientId: 'patient-1',
      recommendation: {
        toolId: 'heart-score',
        registryId: 'heart-score',
        label: 'HEART Score',
        reason: 'Chest pain pathway',
        launchKind: 'calculator',
        category: 'calculator' as any,
        priority: 1,
        missing: true,
      } as unknown as ToolRecommendation,
    });

    expect(dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ed:open-calculator',
        detail: { calculatorId: 'heart-score', patientId: 'patient-1' },
      }),
    );
  });

  it('dispatches copilot prefill for orchestration copilot recommendations', () => {
    launchOrchestrationRecommendation({
      patientId: 'patient-2',
      recommendation: {
        toolId: 'ed-copilot',
        label: 'Copilot review',
        reason: 'Gap fill',
        launchKind: 'copilot',
        category: 'copilot' as any,
        priority: 1,
        missing: false,
      } as unknown as ToolRecommendation,
    });

    expect(dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ed:copilot-prefill',
      }),
    );
  });

  it('dispatches tools open for orchestration workflow recommendations', () => {
    launchOrchestrationRecommendation({
      patientId: 'patient-4',
      recommendation: {
        toolId: 'protocols',
        registryId: 'protocols',
        label: 'Protocols',
        reason: 'Care pathway',
        launchKind: 'workflow',
        category: 'clinical-tools' as any,
        priority: 1,
        missing: false,
      } as unknown as ToolRecommendation,
    });

    expect(dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ed:open-tools',
      }),
    );
  });

  it('unified launcher supports calculator kind', () => {
    launchCareDroidTool({
      kind: 'calculator',
      calculatorId: 'qsofa',
      patientId: 'patient-3',
    });

    expect(dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ed:open-calculator',
        detail: { calculatorId: 'qsofa', patientId: 'patient-3' },
      }),
    );
  });
});