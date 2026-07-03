/**
 * Workflow and audit mocks for route integration tests.
 * Import via canonicalRouteTree.testShared.tsx (after _routeTestMocks).
 */
import { vi } from 'vitest';

const routeWorkflowMocks = vi.hoisted(() => {
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
        metrics: { pendingReview: 0, executedToday: 0, overridden: 0, byCategory: {} },
        safetyStatement: 'test',
      }),
      applyBackendAdministrativeAutomationQueue: vi.fn().mockResolvedValue(undefined),
      mergeBackendAdministrativeAutomationTasks: vi.fn().mockResolvedValue([]),
      buildEnrichedAdministrativeAutomationSnapshot: vi.fn().mockResolvedValue({
        engineId: 'unified-clinical-workflow-orchestrator',
        generatedAt: '2026-01-01T00:00:00.000Z',
        tasks: [],
        metrics: { pendingReview: 0, executedToday: 0, overridden: 0, byCategory: {} },
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
    unifiedPatientWorkflowOrchestrator: {
      afterPatientWorkflowTransition: vi.fn().mockResolvedValue(undefined),
      onReceptionHandoffCompleted: vi.fn().mockResolvedValue(undefined),
    },
    securityAuditService: {
      ingestEmergencyAuditEntries: noop,
      recordSecurityAuditEvent: vi.fn((entry) => ({
        id: `sec-audit-test-${entry.action}`,
        action: entry.action,
        patientId: entry.patientId,
        staffId: entry.staffId,
        timestamp: new Date().toISOString(),
        details: entry.details || {},
      })),
      flushPendingSecurityAudits: vi.fn().mockResolvedValue(undefined),
      getPendingSecurityAuditCount: vi.fn(() => 0),
    },
  };
});

vi.mock('../engine/unifiedWorkflowAutomationEngine', () => ({
  ...routeWorkflowMocks.unifiedWorkflowAutomationEngine,
}));
vi.mock('../engine/unifiedOperationalIntelligenceEngine', () => ({
  ...routeWorkflowMocks.unifiedOperationalIntelligenceEngine,
}));
vi.mock('../engine/administrativeAutomationEngine', () => ({
  ...routeWorkflowMocks.administrativeAutomationEngine,
}));
vi.mock('../services/emergencyCareJourneyOrchestrator', () => ({
  ...routeWorkflowMocks.emergencyCareJourneyOrchestrator,
}));
vi.mock('../services/unifiedPatientWorkflowOrchestrator', () => ({
  ...routeWorkflowMocks.unifiedPatientWorkflowOrchestrator,
}));
vi.mock('../services/securityAuditService', () => ({
  ...routeWorkflowMocks.securityAuditService,
}));

vi.mock('../services/alertLifecycleOrchestrator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/alertLifecycleOrchestrator')>();
  return {
    ...actual,
    checkUnacknowledgedAlertEscalations: vi.fn(() => []),
  };
});