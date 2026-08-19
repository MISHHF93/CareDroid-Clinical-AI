import { AuditService } from '../audit/audit.service';
import { IntegrationAutomationRouter } from './integration-automation-router.service';
import { IntegrationEventRegistry } from './integration-event-registry.service';
import { IntegrationHubService } from './integration-hub.service';
import { IntegrationEventProcessingStatus } from './entities/integration-hub.entity';

function createRepositoryMock() {
  return {
    create: jest.fn((entity) => entity),
    save: jest.fn(async (entity) => entity),
    findOne: jest.fn(),
    find: jest.fn(),
  };
}

describe('IntegrationHubService', () => {
  let sourceRepository: ReturnType<typeof createRepositoryMock>;
  let eventRepository: ReturnType<typeof createRepositoryMock>;
  let normalizedRepository: ReturnType<typeof createRepositoryMock>;
  let auditService: Pick<AuditService, 'log'>;
  let service: IntegrationHubService;
  let sourceSequence: number;
  let rawSequence: number;
  let normalizedSequence: number;

  beforeEach(() => {
    sourceSequence = 0;
    rawSequence = 0;
    normalizedSequence = 0;
    sourceRepository = createRepositoryMock();
    eventRepository = createRepositoryMock();
    normalizedRepository = createRepositoryMock();
    auditService = { log: jest.fn(async () => ({}) as any) };

    sourceRepository.findOne.mockResolvedValue(null);
    sourceRepository.save.mockImplementation(async (entity) => ({
      ...entity,
      id: entity.id || `source-${++sourceSequence}`,
      createdAt: entity.createdAt || new Date('2026-06-12T10:00:00.000Z'),
      updatedAt: entity.updatedAt || new Date('2026-06-12T10:00:00.000Z'),
    }));
    eventRepository.findOne.mockResolvedValue(null);
    eventRepository.save.mockImplementation(async (entity) => ({
      ...entity,
      id: entity.id || `raw-${++rawSequence}`,
      createdAt: entity.createdAt || new Date('2026-06-12T10:00:00.000Z'),
      updatedAt: entity.updatedAt || new Date('2026-06-12T10:00:00.000Z'),
    }));
    normalizedRepository.save.mockImplementation(async (entity) => ({
      ...entity,
      id: entity.id || `normalized-${++normalizedSequence}`,
      createdAt: entity.createdAt || new Date('2026-06-12T10:00:00.000Z'),
    }));
    normalizedRepository.findOne.mockResolvedValue(null);

    // HEAL-347.32: ingest()'s idempotency-safe path now inserts via
    // createQueryBuilder().insert()...orIgnore().execute() and reads the
    // winner back with findOneOrFail() instead of a plain save(). The
    // candidate already carries a real (randomUUID()) id by the time
    // values() is called, so this mock just needs to store and echo it
    // back -- no id-assignment logic needed here, unlike the save() mock
    // above (which backs the DB-generated-id path for entities that don't
    // pre-assign one).
    let pendingInsertValues: any = null;
    const insertQueryBuilder: any = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn((values: any) => {
        pendingInsertValues = {
          ...values,
          createdAt: new Date('2026-06-12T10:00:00.000Z'),
          updatedAt: new Date('2026-06-12T10:00:00.000Z'),
        };
        return insertQueryBuilder;
      }),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    (eventRepository as any).createQueryBuilder = jest.fn(() => insertQueryBuilder);
    (eventRepository as any).findOneOrFail = jest.fn(async () => {
      if (!pendingInsertValues) {
        throw new Error('EntityNotFoundError: no row inserted');
      }
      return pendingInsertValues;
    });

    service = new IntegrationHubService(
      sourceRepository as any,
      eventRepository as any,
      normalizedRepository as any,
      new IntegrationAutomationRouter(new IntegrationEventRegistry()),
      auditService as AuditService,
    );
  });

  it('persists raw and normalized FHIR observation events', async () => {
    const result = await service.ingest(
      {
        idempotencyKey: 'obs-1',
        family: 'fhir',
        eventType: 'Observation',
        sourceSystem: 'ehr-sandbox',
        organizationId: 'org-1',
        workspaceId: 'ed',
        receivedAt: '2026-06-12T09:59:00.000Z',
        payload: {
          resourceType: 'Observation',
          status: 'final',
          subject: { reference: 'Patient/patient-123' },
          code: { coding: [{ code: '6299-2', display: 'Urea nitrogen' }] },
          valueQuantity: { value: 42, unit: 'mg/dL' },
          interpretation: { coding: [{ code: 'H' }] },
        },
      },
      { userId: 'user-1', ipAddress: '127.0.0.1', userAgent: 'jest' },
    );

    expect(result.duplicate).toBe(false);
    expect(result.event).toMatchObject({
      processingStatus: IntegrationEventProcessingStatus.ROUTED,
      family: 'fhir',
      eventType: 'Observation',
      normalizedEventId: 'normalized-1',
    });
    expect(result.normalizedEvent).toMatchObject({
      kind: 'observation',
      severity: 'high',
      safeAction: expect.objectContaining({
        requiresHumanReview: true,
        prohibitedSideEffects: expect.arrayContaining(['clinical_writeback', 'device_control']),
      }),
    });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        // HEAL-347.32: the raw record's id is now a real randomUUID()
        // (pre-assigned so the orIgnore()+read-back race check can compare
        // it against the winning row), not the old raw-N mock counter.
        resource: expect.stringMatching(/^integration:event:[0-9a-f-]{36}$/),
        phiAccessed: true,
      }),
    );
  });

  it('returns the existing trace for duplicate idempotency keys', async () => {
    const existingRaw = {
      id: 'raw-existing',
      sourceId: 'source-existing',
      organizationId: 'org-1',
      workspaceId: 'ed',
      sourceSystem: 'ehr-sandbox',
      family: 'fhir',
      eventType: 'Observation',
      vendor: null,
      idempotencyKey: 'same-event',
      processingStatus: IntegrationEventProcessingStatus.NORMALIZED,
      routeResult: { status: 'normalized_no_trigger', labels: [], safeAction: { type: 'none' } },
      normalizedEventId: 'normalized-existing',
      error: null,
      receivedAt: new Date('2026-06-12T10:00:00.000Z'),
      createdAt: new Date('2026-06-12T10:00:00.000Z'),
    };
    const existingNormalized = {
      id: 'normalized-existing',
      rawEventRecordId: 'raw-existing',
      organizationId: 'org-1',
      workspaceId: 'ed',
      kind: 'observation',
      sourceFamily: 'fhir',
      sourceEventType: 'Observation',
      parserStatus: 'normalized',
      severity: 'info',
      labels: [],
      normalizedEvent: { patientId: 'patient-1' },
      trigger: null,
      safeAction: { type: 'none', requiresHumanReview: false },
      occurredAt: new Date('2026-06-12T10:00:00.000Z'),
      receivedAt: new Date('2026-06-12T10:00:00.000Z'),
      createdAt: new Date('2026-06-12T10:00:00.000Z'),
    };
    eventRepository.findOne.mockResolvedValue(existingRaw);
    normalizedRepository.findOne.mockResolvedValue(existingNormalized);

    const result = await service.ingest({
      idempotencyKey: 'same-event',
      family: 'fhir',
      eventType: 'Observation',
      sourceSystem: 'ehr-sandbox',
      organizationId: 'org-1',
      payload: { resourceType: 'Observation', status: 'final', code: {} },
    });

    expect(result.duplicate).toBe(true);
    expect(result.event.id).toBe('raw-existing');
    expect(result.normalizedEvent?.id).toBe('normalized-existing');
    expect(eventRepository.save).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it('stores unsupported integration events with blocked safe actions', async () => {
    const result = await service.ingest({
      family: 'fhir',
      eventType: 'AllergyIntolerance',
      sourceSystem: 'ehr-sandbox',
      payload: { resourceType: 'AllergyIntolerance', id: 'allergy-1' },
    });

    expect(result.event.processingStatus).toBe(IntegrationEventProcessingStatus.UNSUPPORTED);
    expect(result.normalizedEvent).toMatchObject({
      kind: 'unsupported',
      parserStatus: 'unsupported',
      safeAction: expect.objectContaining({
        type: 'label_unsupported_integration',
        blocked: true,
        requiresHumanReview: true,
      }),
    });
  });

  it('routes device telemetry into review-bound actions without device control side effects', async () => {
    const result = await service.ingest({
      family: 'device_telemetry',
      eventType: 'telemetry',
      sourceSystem: 'device-gateway',
      payload: {
        deviceId: 'pump-17',
        metric: 'battery',
        value: 12,
        unit: '%',
        severity: 'high',
        status: 'warning',
        location: 'ICU-12',
      },
    });

    expect(result.event.processingStatus).toBe(IntegrationEventProcessingStatus.ROUTED);
    expect(result.normalizedEvent).toMatchObject({
      kind: 'device_telemetry',
      safeAction: expect.objectContaining({
        type: 'create_operational_task',
        requiresHumanReview: true,
        prohibitedSideEffects: expect.arrayContaining(['device_control']),
      }),
    });
  });

  describe('HEAL-337: tenant isolation', () => {
    it('ignores a client-supplied organizationId and attributes the event to the caller\'s own tenant', async () => {
      const result = await service.ingest(
        {
          family: 'fhir',
          eventType: 'Observation',
          sourceSystem: 'ehr-sandbox',
          organizationId: 'attacker-org',
          payload: { resourceType: 'Observation', status: 'final', code: {} },
        },
        { userId: 'user-1', organizationId: 'real-org' },
      );

      expect(result.event.organizationId).toBe('real-org');
    });

    it('404s getTrace for an event belonging to a different organization instead of leaking it', async () => {
      eventRepository.findOne.mockResolvedValue({
        id: 'raw-1',
        organizationId: 'org-a',
        normalizedEventId: null,
        rawEvent: {},
        processingStatus: IntegrationEventProcessingStatus.ROUTED,
        receivedAt: new Date(),
        createdAt: new Date(),
      });

      await expect(service.getTrace('raw-1', 'org-b')).rejects.toThrow('raw-1');
      // Same-org access still works.
      await expect(service.getTrace('raw-1', 'org-a')).resolves.toBeTruthy();
    });

    it('scopes listRecent to the caller\'s organization when provided', async () => {
      eventRepository.find.mockResolvedValue([]);
      await service.listRecent(25, 'org-a');
      expect(eventRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 'org-a' } }),
      );
    });
  });
});
