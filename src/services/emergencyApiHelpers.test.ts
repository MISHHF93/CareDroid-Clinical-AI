import { describe, expect, it } from 'vitest';
import { extractWorkflowOrchestrationTasks, unwrapEmergencyEnvelope } from './emergencyApiHelpers';

describe('emergencyApiHelpers', () => {
  it('unwraps module envelope data', () => {
    const payload = unwrapEmergencyEnvelope<{ tasks: string[] }>({
      module: 'workflow-orchestration',
      generatedAt: '2026-07-01T12:00:00.000Z',
      data: { tasks: ['task-1'] },
    });
    expect(payload?.tasks).toEqual(['task-1']);
  });

  it('unwraps legacy success envelope data', () => {
    const payload = unwrapEmergencyEnvelope<{ tasks: string[] }>({
      success: true,
      title: 'Unified Clinical Workflow Orchestrator',
      data: { tasks: ['task-2'] },
    });
    expect(payload?.tasks).toEqual(['task-2']);
  });

  it('extracts workflow tasks from nested snapshot', () => {
    const tasks = extractWorkflowOrchestrationTasks({
      module: 'workflow-orchestration',
      data: {
        snapshot: { tasks: [{ id: 'auto-route-1' }] },
      },
    });
    expect(tasks).toHaveLength(1);
  });
});
