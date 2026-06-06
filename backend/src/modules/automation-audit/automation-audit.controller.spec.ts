import { AutomationAuditController } from './automation-audit.controller';
import { AutomationAuditStatus } from './entities/automation-audit-event.entity';

describe('AutomationAuditController', () => {
  const buildController = () => {
    const service = {
      listEvents: jest.fn().mockResolvedValue([{ id: 'audit-1' }]),
      createEvent: jest.fn().mockResolvedValue({ id: 'audit-2' }),
    };

    return {
      controller: new AutomationAuditController(service as any),
      service,
    };
  };

  it('lists automation events within the authenticated tenant context', async () => {
    const { controller, service } = buildController();

    await expect(
      controller.listEvents(
        { tenantContext: { organizationId: 'context-tenant' } },
        'payload-tenant',
        AutomationAuditStatus.BLOCKED,
        '25',
      ),
    ).resolves.toEqual({
      success: true,
      data: [{ id: 'audit-1' }],
      total: 1,
    });

    expect(service.listEvents).toHaveBeenCalledWith({
      tenantId: 'context-tenant',
      status: AutomationAuditStatus.BLOCKED,
      limit: 25,
    });
  });

  it('passes request actor and tenant context when creating events', async () => {
    const { controller, service } = buildController();
    const body = {
      triggerFired: 'Device heartbeat stale',
      conditionsEvaluated: [{ label: 'Device assigned', result: false }],
      actionSelected: 'Create maintenance ticket',
      user: { id: 'payload-user', name: 'Payload User' },
      tenant: { id: 'payload-tenant', name: 'Payload Tenant' },
      workspace: { id: 'medical-iot', name: 'Medical IoT' },
      aiInvolvement: { involved: false, summary: 'Rules-only telemetry check.' },
      toolCalled: 'device-maintenance',
      backendEndpoint: '/api/devices/maintenance',
      status: AutomationAuditStatus.BLOCKED,
      reason: 'Device maintenance backend capability is disabled.',
      timestamp: '2026-06-06T17:45:00.000Z',
      reviewer: { required: true, name: 'Biomed lead' },
    };
    const req = {
      tenantContext: { organizationId: 'context-tenant' },
      user: { id: 'context-user' },
    };

    await expect(controller.createEvent(body, req)).resolves.toEqual({
      success: true,
      data: { id: 'audit-2' },
    });

    expect(service.createEvent).toHaveBeenCalledWith(body, req.tenantContext, req.user);
  });
});
