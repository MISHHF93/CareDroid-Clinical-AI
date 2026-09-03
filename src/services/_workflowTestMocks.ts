/**
 * Shared workflow engine mocks for services/*.test.ts.
 * Import as the first line in workflow/handoff orchestrator tests.
 * Paths are relative to src/services/ (this file's directory).
 */
import { vi } from 'vitest';

const workflowMocks = vi.hoisted(() => {
  const noop = vi.fn();
  const noopStop = vi.fn(() => vi.fn());

  return {
    unifiedWorkflowAutomationEngine: {
      scheduleWorkflowAutomationRefresh: noop,
      handleWorkflowAutomationBackendEvent: noop,
      getLastWorkflowAutomationBackendEvent: vi.fn(() => undefined),
      startUnifiedWorkflowAutomationEngine: noopStop,
      refreshWorkflowAutomationFromBackend: vi.fn().mockResolvedValue(undefined),
    },
    unifiedOperationalIntelligenceEngine: {
      handleUnifiedOperationalIntelligenceBackendEvent: noop,
      scheduleUnifiedOperationalIntelligenceRefresh: noop,
      getLastUnifiedOperationalIntelligenceBackendEvent: vi.fn(() => undefined),
      startUnifiedOperationalIntelligenceEngine: noopStop,
      queueUnifiedOperationalIntelligenceEvent: noop,
      refreshUnifiedOperationalIntelligenceFromBackend: vi.fn().mockResolvedValue(undefined),
    },
    administrativeAutomationEngine: {
      refreshAdministrativeAutomationsFromBackend: vi.fn().mockResolvedValue([]),
      runAdministrativeAutomationTick: vi.fn().mockResolvedValue({
        engineId: 'unified-clinical-workflow-orchestrator',
        generatedAt: '2026-01-01T00:00:00.000Z',
        tasks: [],
        metrics: {
          pendingReview: 0,
          executedToday: 0,
          overridden: 0,
          byCategory: {},
        },
        safetyStatement: 'test',
      }),
      applyBackendAdministrativeAutomationQueue: vi.fn().mockResolvedValue(undefined),
      mergeBackendAdministrativeAutomationTasks: vi.fn().mockResolvedValue([]),
      buildEnrichedAdministrativeAutomationSnapshot: vi.fn().mockResolvedValue({
        engineId: 'unified-clinical-workflow-orchestrator',
        generatedAt: '2026-01-01T00:00:00.000Z',
        tasks: [],
        metrics: {
          pendingReview: 0,
          executedToday: 0,
          overridden: 0,
          byCategory: {},
        },
        safetyStatement: 'test',
      }),
      startAdministrativeAutomationEngine: noopStop,
    },
    emergencyCareJourneyOrchestrator: {
      syncJourneyFromPatientStateTransition: noop,
      onPatientArrivalAtReception: noop,
      onRapidIntakeCompleted: noop,
      onEmsArrivalStatusChange: noop,
    },
  };
});

vi.mock('../engine/unifiedWorkflowAutomationEngine', () => ({
  ...workflowMocks.unifiedWorkflowAutomationEngine,
}));
vi.mock('../engine/unifiedOperationalIntelligenceEngine', () => ({
  ...workflowMocks.unifiedOperationalIntelligenceEngine,
}));
vi.mock('../engine/administrativeAutomationEngine', () => ({
  ...workflowMocks.administrativeAutomationEngine,
}));
vi.mock('./emergencyCareJourneyOrchestrator', () => ({
  ...workflowMocks.emergencyCareJourneyOrchestrator,
}));
