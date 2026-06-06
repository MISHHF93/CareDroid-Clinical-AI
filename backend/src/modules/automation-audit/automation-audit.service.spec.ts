import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { AutomationAuditService } from './automation-audit.service';
import {
  AutomationAuditEvent,
  AutomationAuditStatus,
} from './entities/automation-audit-event.entity';

const baseEvent = {
  triggerFired: 'High NEWS2 threshold reached',
  conditionsEvaluated: [{ label: 'Patient is admitted', result: true }],
  actionSelected: 'Notify clinician escalation pool',
  user: { id: 'payload-user', name: 'Payload User' },
  tenant: { id: 'payload-tenant', name: 'Payload Tenant' },
  workspace: { id: 'payload-workspace', name: 'Payload Workspace' },
  aiInvolvement: { involved: true, summary: 'AI summarized deterioration risk.' },
  toolCalled: 'news2',
  backendEndpoint: '/api/clinical/alerts',
  status: AutomationAuditStatus.SUCCESS,
  timestamp: '2026-06-06T17:40:00.000Z',
  reviewer: { required: false, name: '' },
};

describe('AutomationAuditService', () => {
  let service: AutomationAuditService;

  const repository = {
    create: jest.fn((event) => event),
    save: jest.fn((event) => Promise.resolve({ id: 'audit-1', ...event })),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationAuditService,
        {
          provide: getRepositoryToken(AutomationAuditEvent),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<AutomationAuditService>(AutomationAuditService);
    jest.clearAllMocks();
  });

  it('persists automation events with tenant context overriding payload scope', async () => {
    const event = await service.createEvent(
      baseEvent,
      {
        organizationId: 'context-tenant',
        organizationName: 'Context Tenant',
        workspaceId: 'context-workspace',
        workspaceName: 'Context Workspace',
      },
      { id: 'context-user', email: 'clinician@example.com' },
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'context-tenant',
        tenantName: 'Context Tenant',
        workspaceId: 'context-workspace',
        workspaceName: 'Context Workspace',
        userId: 'context-user',
        userName: 'clinician@example.com',
        status: AutomationAuditStatus.SUCCESS,
      }),
    );
    expect(event).toEqual(expect.objectContaining({ id: 'audit-1', tenantId: 'context-tenant' }));
  });

  it('filters audit events by tenant and status', async () => {
    repository.find.mockResolvedValue([{ id: 'audit-1' }]);

    await expect(
      service.listEvents({
        tenantId: 'tenant-a',
        status: AutomationAuditStatus.BLOCKED,
        limit: 10,
      }),
    ).resolves.toEqual([{ id: 'audit-1' }]);

    expect(repository.find).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a', status: AutomationAuditStatus.BLOCKED },
      order: { timestamp: 'DESC' },
      take: 10,
    });
  });

  it('requires blocked automations to include a reason', async () => {
    await expect(
      service.createEvent({
        ...baseEvent,
        status: AutomationAuditStatus.BLOCKED,
        reason: '',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires failed automations to include an error', async () => {
    await expect(
      service.createEvent({
        ...baseEvent,
        status: AutomationAuditStatus.FAILED,
        error: '',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
