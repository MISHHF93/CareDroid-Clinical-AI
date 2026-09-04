import { beforeEach, describe, expect, it } from 'vitest';
import observabilityService from './observabilityService';

describe('observabilityService', () => {
  beforeEach(() => {
    observabilityService.initialize();
  });

  it('records workflow telemetry with correlation trace id', () => {
    const span = observabilityService.recordWorkflowTelemetry({
      id: 'workflow-test-1',
      type: 'patient_arrived',
      summary: 'Patient arrived at reception.',
      patientId: 'patient-1',
      source: 'reception',
      severity: 'Info',
      timestamp: new Date().toISOString(),
    });

    expect(span.traceId).toBe(observabilityService.getCorrelationId());
    const snapshot = observabilityService.buildDiagnosticsSnapshot();
    expect(snapshot.recentWorkflowSpans[0]?.workflowType).toBe('patient_arrived');
    expect(snapshot.eventCounts.workflow).toBeGreaterThan(0);
  });

  it('flags slow API calls in diagnostics', () => {
    observabilityService.recordApiTiming({
      path: '/api/emergency/whiteboard',
      method: 'GET',
      durationMs: 2500,
      status: 200,
    });

    const snapshot = observabilityService.buildDiagnosticsSnapshot();
    expect(snapshot.slowApiCalls).toHaveLength(1);
    expect(snapshot.slowApiCalls[0]?.path).toBe('/api/emergency/whiteboard');
  });

  it.each(['/health', '/api/health'])(
    'keeps a %s 503 out of recentErrors (readiness, not failure)',
    (path) => {
      const before = observabilityService.buildDiagnosticsSnapshot().recentErrors.length;
      observabilityService.recordApiTiming({ path, method: 'GET', durationMs: 12, status: 503 });

      const snapshot = observabilityService.buildDiagnosticsSnapshot();
      expect(snapshot.recentErrors).toHaveLength(before);
    },
  );

  it('still records a real 5xx as an error', () => {
    const before = observabilityService.buildDiagnosticsSnapshot().recentErrors.length;
    observabilityService.recordApiTiming({
      path: '/api/emergency/patients',
      method: 'GET',
      durationMs: 12,
      status: 500,
    });

    const snapshot = observabilityService.buildDiagnosticsSnapshot();
    expect(snapshot.recentErrors.length).toBe(before + 1);
    expect(snapshot.recentErrors[0]?.path).toBe('/api/emergency/patients');
  });

  it('emits trace headers for apiClient', () => {
    const headers = observabilityService.buildTraceHeaders('workflow-trace-1');
    expect(headers['x-correlation-id']).toBeTruthy();
    expect(headers['x-request-id']).toBeTruthy();
    expect(headers['x-workflow-trace-id']).toBe('workflow-trace-1');
  });
});
