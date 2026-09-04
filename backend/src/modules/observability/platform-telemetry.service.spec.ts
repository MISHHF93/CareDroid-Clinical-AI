import { PlatformTelemetryService } from './platform-telemetry.service';

describe('PlatformTelemetryService', () => {
  let service: PlatformTelemetryService;

  beforeEach(() => {
    service = new PlatformTelemetryService();
  });

  it('buffers workflow and error telemetry events', () => {
    const result = service.ingestEvents({
      sessionId: 'session-1',
      correlationId: 'corr-1',
      events: [
        {
          id: 'evt-1',
          category: 'workflow',
          name: 'patient_arrived',
          severity: 'info',
          timestamp: new Date().toISOString(),
          workflowType: 'patient_arrived',
          patientId: 'patient-1',
        },
        {
          id: 'evt-2',
          category: 'error',
          name: 'api_failure',
          severity: 'error',
          timestamp: new Date().toISOString(),
          message: 'Request failed',
        },
      ],
    });

    expect(result.accepted).toBe(2);
    const diagnostics = service.getDiagnostics();
    expect(diagnostics.totals.bufferedEvents).toBe(2);
    expect(diagnostics.recentWorkflow).toHaveLength(1);
    expect(diagnostics.recentErrors).toHaveLength(1);
  });

  it('records backend HTTP and workflow telemetry with trace lookup', () => {
    service.recordBackendRequest({
      method: 'GET',
      path: '/api/emergency/patients',
      statusCode: 200,
      durationMs: 2400,
      correlationId: 'corr-trace-1',
      requestId: 'req-1',
    });
    service.recordBackendWorkflow({
      workflowType: 'operational-intelligence-refresh',
      name: 'operational_intelligence.evaluate',
      correlationId: 'corr-trace-1',
      durationMs: 42,
      message: 'OI evaluate',
    });

    const trace = service.getTraceTimeline('corr-trace-1');
    expect(trace.eventCount).toBeGreaterThanOrEqual(2);
    expect(trace.workflowSpans.length).toBeGreaterThanOrEqual(1);
    expect(trace.apiCalls.length).toBeGreaterThanOrEqual(1);

    const performance = service.getPerformanceSummary();
    expect(performance.slowEndpoints.length).toBeGreaterThan(0);
    expect(performance.regressionSignals.length).toBeGreaterThanOrEqual(0);
  });

  it('records backend audit events for administrator audit trails', () => {
    service.recordBackendAudit({
      action: 'PHI_ACCESS',
      resource: 'patient/123',
      userId: 'user-1',
      phiAccessed: true,
    });
    const diagnostics = service.getDiagnostics();
    expect(diagnostics.categoryCounts.audit).toBeGreaterThanOrEqual(1);
  });

  it('records crash reports for administrator diagnostics', () => {
    const crashId = service.recordCrash({
      id: 'crash-1',
      error: { name: 'TypeError', message: 'Cannot read property' },
      sessionId: 'session-1',
    });

    expect(crashId).toBe('crash-1');
    const diagnostics = service.getDiagnostics();
    expect(diagnostics.totals.crashReports).toBe(1);
    expect(diagnostics.totals.errorCount).toBeGreaterThan(0);
  });

  describe('recordBackendRequest severity', () => {
    const latestSeverity = () =>
      (service as unknown as { events: Array<{ severity: string }> }).events[0]?.severity;

    it.each(['/health', '/api/health', '/health/'])(
      'grades a %s 503 as a warning, not an error (readiness, not failure)',
      (path) => {
        service.recordBackendRequest({ method: 'GET', path, statusCode: 503, durationMs: 12 });
        expect(latestSeverity()).toBe('warn');
        expect(service.getDiagnostics().totals.errorCount).toBe(0);
      },
    );

    it('still grades a real 5xx as an error', () => {
      service.recordBackendRequest({
        method: 'GET',
        path: '/api/patients',
        statusCode: 500,
        durationMs: 12,
      });
      expect(latestSeverity()).toBe('error');
      expect(service.getDiagnostics().totals.errorCount).toBe(1);
    });

    it('does not treat a path that merely contains "health" as a probe', () => {
      service.recordBackendRequest({
        method: 'GET',
        path: '/api/patients/healthcheck-notes',
        statusCode: 500,
        durationMs: 12,
      });
      expect(latestSeverity()).toBe('error');
    });

    it('grades a slow successful request as a warning', () => {
      service.recordBackendRequest({
        method: 'GET',
        path: '/api/patients',
        statusCode: 200,
        durationMs: 5000,
      });
      expect(latestSeverity()).toBe('warn');
    });
  });
});
