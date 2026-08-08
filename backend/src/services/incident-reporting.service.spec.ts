import { IncidentReportingService } from './incident-reporting.service';

// Regression coverage for the 2026-08-08 fix that gave this previously-unreachable
// service its first real caller (ApiExceptionFilter, on every unhandled 5xx). Before
// that fix reportIncident() had zero callers anywhere in the app -- checkHealth()'s
// openIncidents/escalationRecipients counters were permanently zero regardless of real
// backend errors, even though the class itself was fully implemented and DI-registered.

describe('IncidentReportingService', () => {
  it('reportIncident stores the incident as open and reflects it in checkHealth', () => {
    const service = new IncidentReportingService();
    const report = service.reportIncident({
      serviceName: 'backend-api',
      severity: 'critical',
      summary: 'GET /api/x -> 500: boom',
    });

    expect(report.status).toBe('open');
    expect(report.id).toMatch(/^incident-/);
    expect(service.checkHealth().openIncidents).toBe(1);
  });

  it('updateStatus closes an incident, which then drops out of the openIncidents count', () => {
    const service = new IncidentReportingService();
    const report = service.reportIncident({ serviceName: 'x', severity: 'low', summary: 's' });

    const updated = service.updateStatus(report.id, 'closed');

    expect(updated?.status).toBe('closed');
    expect(service.checkHealth().openIncidents).toBe(0);
    expect(service.listIncidents()).toHaveLength(1);
  });

  it('updateStatus returns null for an unknown incident id rather than throwing', () => {
    const service = new IncidentReportingService();
    expect(service.updateStatus('does-not-exist', 'closed')).toBeNull();
  });

  it('caps in-memory storage at 500 entries, keeping the most recent (bounded, not unbounded growth)', () => {
    const service = new IncidentReportingService();
    for (let i = 0; i < 550; i += 1) {
      service.reportIncident({ serviceName: 'x', severity: 'low', summary: `incident ${i}` });
    }

    const stored = service.listIncidents();
    expect(stored).toHaveLength(500);
    expect(stored[0].summary).toBe('incident 50');
    expect(stored[stored.length - 1].summary).toBe('incident 549');
  });
});
