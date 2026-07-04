import type { Mock } from 'vitest';

type MockFactory = <T extends (...args: never[]) => unknown>(
  implementation?: T,
) => Mock<T>;

export type WorkflowEngineMockModules = {
  unifiedWorkflowAutomationEngine: {
    scheduleWorkflowAutomationRefresh: Mock;
    handleWorkflowAutomationBackendEvent: Mock;
    getLastWorkflowAutomationBackendEvent: Mock;
    startUnifiedWorkflowAutomationEngine: Mock;
    refreshWorkflowAutomationFromBackend: Mock;
  };
  unifiedOperationalIntelligenceEngine: {
    handleUnifiedOperationalIntelligenceBackendEvent: Mock;
    scheduleUnifiedOperationalIntelligenceRefresh: Mock;
    getLastUnifiedOperationalIntelligenceBackendEvent: Mock;
    startUnifiedOperationalIntelligenceEngine: Mock;
    queueUnifiedOperationalIntelligenceEvent: Mock;
    refreshUnifiedOperationalIntelligenceFromBackend: Mock;
  };
  emergencyCareJourneyOrchestrator: {
    syncJourneyFromPatientStateTransition: Mock;
    onPatientArrivalAtReception: Mock;
    onRapidIntakeCompleted: Mock;
    onEmsArrivalStatusChange: Mock;
  };
  alertLifecycleOrchestrator: {
    ingestRealtimeAlertPayload: Mock;
    ingestUnifiedAlert: Mock;
    transitionAlertLifecycle: Mock;
  };
  administrativeAutomationEngine: {
    refreshAdministrativeAutomationsFromBackend: Mock;
    runAdministrativeAutomationTick: Mock;
    startAdministrativeAutomationEngine: Mock;
    applyBackendAdministrativeAutomationQueue: Mock;
    mergeBackendAdministrativeAutomationTasks: Mock;
    buildEnrichedAdministrativeAutomationSnapshot: Mock;
  };
};

/**
 * Build no-op stubs for fire-and-forget dynamic imports on workflow/orchestrator paths.
 * Services tests: `import './_workflowTestMocks'` (hoisted-safe, preferred).
 * Other tests: spread inside `vi.mock(..., () => ({ ...buildWorkflowEngineMockModules(vi.fn).<module> }))`.
 */
/** Synchronous Vitest mock factory — safe inside `vi.mock(..., () => …)`. */
export function createVitestWorkflowEngineMocks(vitest: { fn: MockFactory }): WorkflowEngineMockModules {
  return buildWorkflowEngineMockModules(vitest.fn);
}

export function buildWorkflowEngineMockModules(mock: MockFactory): WorkflowEngineMockModules {
  const noop = mock();
  const noopStop = mock(() => mock());

  return {
    unifiedWorkflowAutomationEngine: {
      scheduleWorkflowAutomationRefresh: noop,
      handleWorkflowAutomationBackendEvent: noop,
      getLastWorkflowAutomationBackendEvent: mock(() => undefined),
      startUnifiedWorkflowAutomationEngine: noopStop,
      refreshWorkflowAutomationFromBackend: mock().mockResolvedValue(undefined),
    },
    unifiedOperationalIntelligenceEngine: {
      handleUnifiedOperationalIntelligenceBackendEvent: noop,
      scheduleUnifiedOperationalIntelligenceRefresh: noop,
      getLastUnifiedOperationalIntelligenceBackendEvent: mock(() => undefined),
      startUnifiedOperationalIntelligenceEngine: noopStop,
      queueUnifiedOperationalIntelligenceEvent: noop,
      refreshUnifiedOperationalIntelligenceFromBackend: mock().mockResolvedValue(undefined),
    },
    emergencyCareJourneyOrchestrator: {
      syncJourneyFromPatientStateTransition: noop,
      onPatientArrivalAtReception: noop,
      onRapidIntakeCompleted: noop,
      onEmsArrivalStatusChange: noop,
    },
    alertLifecycleOrchestrator: {
      ingestRealtimeAlertPayload: noop,
      ingestUnifiedAlert: noop,
      transitionAlertLifecycle: noop,
    },
    administrativeAutomationEngine: {
      refreshAdministrativeAutomationsFromBackend: mock().mockResolvedValue([]),
      runAdministrativeAutomationTick: mock().mockResolvedValue({
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
      applyBackendAdministrativeAutomationQueue: mock().mockResolvedValue(undefined),
      mergeBackendAdministrativeAutomationTasks: mock().mockResolvedValue([]),
      buildEnrichedAdministrativeAutomationSnapshot: mock().mockResolvedValue({
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
  };
}