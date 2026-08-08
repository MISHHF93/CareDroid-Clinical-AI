import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter';
import { incidentReportingService } from '../../services/incident-reporting.service';

// Regression coverage for the 2026-08-08 fix: IncidentReportingService.reportIncident()
// was fully implemented (report/list/updateStatus, plus a checkHealth() that already
// counted configured escalation recipients) but had ZERO real callers anywhere in the
// app -- it was only ever registered in service-registry.ts for health-check purposes.
// Every unhandled 5xx response was already logged, sent to Sentry, and recorded as
// telemetry, but never became an "incident" this service's own health check implied it
// was tracking. This wires the filter -- the one place every unhandled error in the
// whole backend already passes through -- as its first real caller.

const buildHost = (request: Record<string, unknown>) => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as any;
};

describe('ApiExceptionFilter incident reporting (2026-08-08)', () => {
  let reportIncidentSpy: jest.SpyInstance;

  beforeEach(() => {
    reportIncidentSpy = jest.spyOn(incidentReportingService, 'reportIncident');
  });

  afterEach(() => {
    reportIncidentSpy.mockRestore();
  });

  it('reports a critical incident for an unhandled 500 (non-HttpException)', () => {
    const filter = new ApiExceptionFilter();
    const request = {
      method: 'GET',
      originalUrl: '/api/emergency/patients',
      headers: {},
      params: {},
    };
    const host = buildHost(request);

    filter.catch(new Error('database connection lost'), host);

    expect(reportIncidentSpy).toHaveBeenCalledTimes(1);
    expect(reportIncidentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceName: 'backend-api',
        severity: 'critical',
        summary: expect.stringContaining('GET /api/emergency/patients -> 500'),
        reportedBy: 'api-exception-filter',
      }),
    );
  });

  it('reports a high-severity incident (not critical) for a 503 HttpException', () => {
    const filter = new ApiExceptionFilter();
    const request = {
      method: 'GET',
      originalUrl: '/api/emergency/queues',
      headers: {},
      params: {},
    };
    const host = buildHost(request);

    filter.catch(new HttpException('dependency unavailable', HttpStatus.SERVICE_UNAVAILABLE), host);

    expect(reportIncidentSpy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'high' }));
  });

  it('extracts a route patientId into the incident report when present', () => {
    const filter = new ApiExceptionFilter();
    const request = {
      method: 'PATCH',
      originalUrl: '/api/emergency/patients/patient-42/status',
      headers: {},
      params: { patientId: 'patient-42' },
    };
    const host = buildHost(request);

    filter.catch(new Error('boom'), host);

    expect(reportIncidentSpy).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'patient-42' }),
    );
  });

  it('does NOT report an incident for a client error (4xx) -- matches the existing Sentry/telemetry status >= 500 gate', () => {
    const filter = new ApiExceptionFilter();
    const request = {
      method: 'GET',
      originalUrl: '/api/emergency/patients',
      headers: {},
      params: {},
    };
    const host = buildHost(request);

    filter.catch(new HttpException('not found', HttpStatus.NOT_FOUND), host);

    expect(reportIncidentSpy).not.toHaveBeenCalled();
  });

  it('does not throw when a huge number of 5xx errors are reported (in-memory store stays bounded)', () => {
    const filter = new ApiExceptionFilter();
    for (let i = 0; i < 600; i += 1) {
      const request = { method: 'GET', originalUrl: `/api/x/${i}`, headers: {}, params: {} };
      filter.catch(new Error(`failure ${i}`), buildHost(request));
    }
    expect(reportIncidentSpy).toHaveBeenCalledTimes(600);
  });
});
