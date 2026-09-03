/**
 * Workflow trace helpers — end-to-end spans for critical CareDroid workflows.
 */
import { CRITICAL_WORKFLOW_TRACE_IDS } from '../config/observabilityModel';
import observabilityService from './observabilityService';

export type WorkflowTraceHandle = Readonly<{
  traceId: string;
  spanId: string;
  workflowId: string;
  startedAt: number;
  end: (outcome: 'success' | 'error' | 'cancelled', detail?: Record<string, unknown>) => void;
}>;

export { CRITICAL_WORKFLOW_TRACE_IDS };

export function startWorkflowTrace(
  workflowId: string,
  input: {
    patientId?: string;
    source?: string;
    summary?: string;
    metadata?: Record<string, unknown>;
  } = {},
): WorkflowTraceHandle {
  const spanId = `span-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const traceId = observabilityService.getCorrelationId();
  const startedAt = performance.now();

  observabilityService.recordEvent({
    category: 'workflow',
    name: `${workflowId}.started`,
    severity: 'info',
    patientId: input.patientId,
    workflowType: workflowId,
    source: input.source,
    message: input.summary || `${workflowId} started`,
    metadata: Object.freeze({
      spanId,
      traceId,
      phase: 'start',
      ...input.metadata,
    }),
  });

  return Object.freeze({
    traceId,
    spanId,
    workflowId,
    startedAt,
    end: (outcome, detail = {}) => {
      const durationMs = Math.round(performance.now() - startedAt);
      observabilityService.recordWorkflowTelemetry({
        id: spanId,
        type: `${workflowId}.${outcome}`,
        summary: input.summary || `${workflowId} ${outcome}`,
        patientId: input.patientId,
        source: input.source || workflowId,
        severity: outcome === 'error' ? 'Critical' : outcome === 'cancelled' ? 'Warning' : 'Info',
        timestamp: new Date().toISOString(),
        metadata: Object.freeze({
          traceId,
          outcome,
          durationMs,
          phase: 'end',
          ...input.metadata,
          ...detail,
        }),
      });
      observabilityService.recordPerformanceMark(`workflow:${workflowId}`, durationMs);
    },
  });
}

export async function withWorkflowTrace<T>(
  workflowId: string,
  input: {
    patientId?: string;
    source?: string;
    summary?: string;
    metadata?: Record<string, unknown>;
  },
  run: () => Promise<T>,
): Promise<T> {
  const trace = startWorkflowTrace(workflowId, input);
  try {
    const result = await run();
    trace.end('success');
    return result;
  } catch (error: unknown) {
    trace.end('error', {
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
