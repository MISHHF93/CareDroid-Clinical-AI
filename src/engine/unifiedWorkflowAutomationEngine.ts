import { isWorkflowAutomationTriggerEvent } from '../config/unifiedWorkflowAutomationModel';
import { applyBackendAdministrativeAutomationQueue } from './administrativeAutomationEngine';
import { fetchWorkflowOrchestration } from '../services/emergencyOsApi';
import { useEmergencyStore } from '../store/emergencyStore';
import type { AdministrativeAutomationTask } from '../types/administrativeAutomation';
import { startWorkflowTrace } from '../services/observabilityTrace';

var REFRESH_DEBOUNCE_MS = 1_500;
var refreshTimerId: number | null = null;
// `var` throughout this block, not `let`/`const`, and deliberately so. scheduleWorkflowAutomationRefresh is
// reachable while this module is still evaluating: threeMinuteTimerEngine
// dynamically imports emergencyCareJourneyOrchestrator, which dynamically
// imports this engine and calls straight into it, and receptionIntakeOrchestrator
// starts both handoffs at once. A `let` binding is in its temporal dead zone
// until line-order evaluation reaches it, so that call threw
// "ReferenceError: Cannot access 'lastBackendEventType' before initialization"
// instead of recording the event -- 4 unhandled errors in a full suite run, and
// a real fault in the browser on the same path, not just test noise.
// `var` is hoisted and initialized, so an early call records the event type and
// schedules the refresh exactly as intended. All three bindings this function
// touches need it -- fixing only the first just moved the throw to the next one.
var lastBackendEventType: string | undefined;

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

/**
 * Cancels a debounce scheduled by scheduleWorkflowAutomationRefresh.
 *
 * The refresh is debounced 1.5s out, so a caller that finishes sooner leaves a
 * timer armed against a module graph that may no longer be there when it fires.
 * In the suite that surfaced as the callback throwing on a not-yet-initialized
 * import binding; in a browser it is a refresh firing against a torn-down view.
 * Teardown paths should call this.
 */
export function cancelWorkflowAutomationRefresh(): void {
  if (refreshTimerId) {
    window.clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }
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
  return cancelWorkflowAutomationRefresh;
}