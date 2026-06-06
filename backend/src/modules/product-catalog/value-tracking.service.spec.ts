import { AuditAction } from '../audit/entities/audit-log.entity';
import { EntitlementStatus } from '../platform-assets/enums/platform-asset.enums';
import { UsageEventType } from '../subscriptions/subscription-plans.config';
import { ValueTrackingService } from './value-tracking.service';

describe('ValueTrackingService', () => {
  function buildService() {
    const now = new Date();
    const auditRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'audit-1',
          organizationId: 'org-1',
          userId: 'user-1',
          action: 'complete',
          resource: 'protocol-sepsis adherence',
          metadata: { responseTimeMs: 1200 },
          timestamp: now,
        },
        {
          id: 'audit-2',
          organizationId: 'org-1',
          userId: 'user-2',
          action: 'view',
          resource: 'protocol-acs',
          metadata: {},
          timestamp: now,
        },
        {
          id: 'audit-3',
          organizationId: 'org-1',
          userId: 'user-1',
          action: AuditAction.AI_QUERY,
          resource: 'assistant',
          metadata: {},
          timestamp: now,
        },
        {
          id: 'audit-4',
          organizationId: 'org-1',
          userId: 'user-1',
          action: 'launch',
          resource: 'calculator qsofa',
          metadata: {},
          timestamp: now,
        },
        {
          id: 'audit-5',
          organizationId: 'org-1',
          userId: 'user-2',
          action: 'complete',
          resource: 'workflow discharge',
          metadata: {},
          timestamp: now,
        },
        {
          id: 'audit-6',
          organizationId: 'org-1',
          userId: 'user-2',
          action: 'start',
          resource: 'workflow intake',
          metadata: {},
          timestamp: now,
        },
        {
          id: 'audit-7',
          organizationId: 'org-1',
          userId: 'user-3',
          action: 'sample',
          resource: 'fleet command',
          metadata: { uptimePercent: 98 },
          timestamp: now,
        },
        {
          id: 'audit-8',
          organizationId: 'org-1',
          userId: 'user-3',
          action: 'sample',
          resource: 'device telemetry',
          metadata: { availabilityPercent: 96 },
          timestamp: now,
        },
      ]),
    };
    const entitlementRepository = {
      find: jest.fn().mockResolvedValue([
        { organizationId: 'org-1', packId: 'core-platform', status: EntitlementStatus.ENABLED },
        { organizationId: 'org-1', packId: 'icu-pack', status: EntitlementStatus.ENABLED },
      ]),
    };
    const usageEventRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'usage-1',
          organizationId: 'org-1',
          userId: 'user-1',
          eventType: UsageEventType.CALCULATOR_LAUNCH,
          quantity: 3,
          metadata: { responseTimeMs: 800 },
          occurredAt: now,
        },
        {
          id: 'usage-2',
          organizationId: 'org-1',
          userId: 'user-2',
          eventType: UsageEventType.AI_CALL,
          quantity: 5,
          metadata: {},
          occurredAt: now,
        },
        {
          id: 'usage-3',
          organizationId: 'org-1',
          userId: 'user-2',
          eventType: UsageEventType.SIMULATION,
          quantity: 2,
          metadata: {},
          occurredAt: now,
        },
      ]),
    };

    const service = new ValueTrackingService(
      auditRepository as any,
      entitlementRepository as any,
      usageEventRepository as any,
    );

    return { service, auditRepository, entitlementRepository, usageEventRepository };
  }

  it('rolls up clinical, operational, and executive value metrics', async () => {
    const { service } = buildService();

    const result = await service.getOrganizationValueTracking('org-1', 'month');

    expect(result.categories.clinical).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'protocol-adherence', value: 50, unit: 'percent' }),
        expect.objectContaining({ id: 'simulation-completion', value: 2 }),
        expect.objectContaining({ id: 'calculator-usage', value: 4 }),
        expect.objectContaining({ id: 'ai-usage', value: 6 }),
      ]),
    );
    expect(result.categories.operational).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'fleet-uptime', value: 98 }),
        expect.objectContaining({ id: 'device-uptime', value: 96 }),
        expect.objectContaining({ id: 'workflow-completion', value: 50 }),
        expect.objectContaining({ id: 'response-times', value: 1000 }),
      ]),
    );
    expect(result.categories.executive).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'adoption', value: 14 }),
        expect.objectContaining({ id: 'engagement', value: 3 }),
        expect.objectContaining({ id: 'outcomes', value: expect.any(Number) }),
      ]),
    );
    expect(result.sources).toEqual({
      auditEvents: 8,
      usageEvents: 3,
      enabledEntitlements: 2,
    });
  });
});
