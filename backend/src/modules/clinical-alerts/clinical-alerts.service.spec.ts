import { ClinicalAlertsService } from './clinical-alerts.service';

describe('ClinicalAlertsService', () => {
  let service: ClinicalAlertsService;

  beforeEach(() => {
    service = new ClinicalAlertsService();
  });

  it('returns demo-backed alert list with summary metadata', () => {
    const result = service.listForUser('user-1');

    expect(result.ok).toBe(true);
    expect(result.mode).toBe('demo');
    expect(result.alerts.length).toBeGreaterThan(0);
    expect(result.summary.total).toBe(result.alerts.length);
    expect(result.safety).toContain('not a bedside alarm source');
  });

  it('tracks acknowledgement state per user', () => {
    const acknowledged = service.acknowledge('user-1', 'alert-1', '2026-01-01T00:00:00.000Z');
    const userOneAlerts = service.listForUser('user-1').alerts;
    const userTwoAlerts = service.listForUser('user-2').alerts;

    expect(acknowledged.alert.status).toBe('acknowledged');
    expect(userOneAlerts.find((alert) => alert.id === 'alert-1')?.status).toBe('acknowledged');
    expect(userTwoAlerts.find((alert) => alert.id === 'alert-1')?.status).toBe('unacknowledged');
  });

  it('tracks dismiss reason in demo state', () => {
    const dismissed = service.dismiss('user-1', 'alert-1', 'duplicate', '2026-01-01T00:00:00.000Z');

    expect(dismissed.alert.status).toBe('dismissed');
    expect(dismissed.alert.dismissReason).toBe('duplicate');
  });
});
