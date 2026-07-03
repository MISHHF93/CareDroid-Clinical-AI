import { isWorkflowAutomationTriggerEvent } from '../config/unifiedWorkflowAutomationModel';
import { applyBackendAdministrativeAutomationQueue } from './administrativeAutomationEngine';
import { fetchWorkflowOrchestration } from '../services/emergencyOsApi';
import { useEmergencyStore } from '../store/emergencyStore';
import type { AdministrativeAutomationTask } from '../types/administrativeAutomation';
import { startWorkflowTrace } from '../services/observabilityTrace';

const REFRESH_DEBOUNCE_MS = 1_500;
let refreshTimerId: ReturnType<typeof setTimeout> | null = null;
let lastBackendEventType: string | undefined;

export function getLastWorkflowAutomationBackendEvent(): string | undefined {
  return lastBackendEventType;
}

export function scheduleWorkflowAutomationRefresh(eventType?: string): void {
  if (eventType) {
    lastBackendEventType = eventType;
  }
  if (refreshTimerId) {
    window.clearTimeout(refreshTimerId);
  }
  refreshTimerId = window.setTimeout(() => {
    refreshTimerId = null;
    void refreshWorkflowAutomationFromBackend(eventType);
  }, REFRESH_DEBOUNCE_MS);
}

export async function refreshWorkflowAutomationFromBackend(eventType?: string): Promise<void> {
  const trace = startWorkflowTrace('workflow-automation-refresh', {
    source: 'unified-workflow-automation-engine',
    summary: `Refresh workflow automation${eventType ? ` (${eventType})` : ''}`,
    metadata: { eventType },
  });
  const state = useEmergencyStore.getState();
  if (eventType) {
    lastBackendEventType = eventType;
  }

  if (!state.backendAvailable) {
    await state.refreshAdministrativeAutomationsAsync();
    trace.end('success', { mode: 'local-fallback' });
    return;
  }

  try {
    const envelope = (await fetchWorkflowOrchestration()) as {
      data?: { tasks?: AdministrativeAutomationTask[] };
    };
    const tasks = envelope?.data?.tasks;
    if (Array.isArray(tasks)) {
      await applyBackendAdministrativeAutomationQueue(tasks);
      trace.end('success', { mode: 'backend', taskCount: tasks.length });
      return;
    }
  } catch {
    // Fall back to local orchestrator when backend refresh fails.
  }

  await state.refreshAdministrativeAutomationsAsync();
  trace.end('success', { mode: 'local-fallback-after-error' });
}

export function handleWorkflowAutomationBackendEvent(eventType: string): void {
  if (!isWorkflowAutomationTriggerEvent(eventType)) return;
  scheduleWorkflowAutomationRefresh(eventType);
}

export function startUnifiedWorkflowAutomationEngine(): () => void {
  void refreshWorkflowAutomationFromBackend('engine_start');
  return () => {
    if (refreshTimerId) {
      window.clearTimeout(refreshTimerId);
      refreshTimerId = null;
    }
  };
}