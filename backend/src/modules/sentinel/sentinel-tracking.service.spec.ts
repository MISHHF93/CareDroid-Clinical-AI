import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { SentinelTrackingService } from './sentinel-tracking.service';
import { SentinelAlarmService } from './sentinel-alarm.service';
import { SentinelOutboxService } from './sentinel-outbox.service';
import { SentinelUnitEntity } from './entities/sentinel-unit.entity';
import { SentinelPositionEntity } from './entities/sentinel-position.entity';
import { SentinelEtaEntity } from './entities/sentinel-eta.entity';
import { SentinelGeofenceEntity } from './entities/sentinel-geofence.entity';
import { SentinelGeofenceEventEntity } from './entities/sentinel-geofence-event.entity';
import { SentinelEpisodeEntity } from './entities/sentinel-episode.entity';
import { SentinelIntegrationCursorEntity } from './entities/sentinel-integration-cursor.entity';

/**
 * Real-repository regression coverage for HEAL-308: proves the organizationId
 * filter added to listUnits/listPositions actually excludes another
 * organization's rows at the database layer, not just that the controller
 * passes the parameter through to a mock (see sentinel.controller.spec.ts
 * for that separate, plumbing-only layer of coverage).
 */
describe('SentinelTrackingService tenant scoping (HEAL-308)', () => {
  let module: TestingModule;
  let service: SentinelTrackingService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [
            SentinelUnitEntity,
            SentinelPositionEntity,
            SentinelEtaEntity,
            SentinelGeofenceEntity,
            SentinelGeofenceEventEntity,
            SentinelEpisodeEntity,
            SentinelIntegrationCursorEntity,
          ],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([
          SentinelUnitEntity,
          SentinelPositionEntity,
          SentinelEtaEntity,
          SentinelGeofenceEntity,
          SentinelGeofenceEventEntity,
          SentinelEpisodeEntity,
          SentinelIntegrationCursorEntity,
        ]),
      ],
      providers: [
        SentinelTrackingService,
        { provide: SentinelAlarmService, useValue: { raise: jest.fn() } },
        { provide: SentinelOutboxService, useValue: { enqueue: jest.fn() } },
      ],
    }).compile();

    service = module.get(SentinelTrackingService);

    const unitRepo = module.get(getRepositoryToken(SentinelUnitEntity));
    const positionRepo = module.get(getRepositoryToken(SentinelPositionEntity));

    await unitRepo.save([
      unitRepo.create({
        id: 'unit-org-a',
        externalId: 'M1',
        vendorId: 'mock',
        label: 'Medic 1',
        organizationId: 'org-a',
      }),
      unitRepo.create({
        id: 'unit-org-b',
        externalId: 'M2',
        vendorId: 'mock',
        label: 'Medic 2',
        organizationId: 'org-b',
      }),
      unitRepo.create({
        id: 'unit-unassigned',
        externalId: 'M3',
        vendorId: 'mock',
        label: 'Medic 3',
        organizationId: null,
      }),
    ]);
    await positionRepo.save([
      positionRepo.create({
        id: 'pos-a',
        unitId: 'unit-org-a',
        latitude: 1,
        longitude: 1,
        source: 'mock',
        receivedAt: '2026-01-01T00:00:00.000Z',
        eventSeq: 1,
      }),
      positionRepo.create({
        id: 'pos-b',
        unitId: 'unit-org-b',
        latitude: 2,
        longitude: 2,
        source: 'mock',
        receivedAt: '2026-01-01T00:00:00.000Z',
        eventSeq: 1,
      }),
    ]);
  });

  afterAll(async () => {
    await module.close();
  });

  it("listUnits() with no organizationId returns every organization's units (back-compat / system callers)", async () => {
    const units = await service.listUnits();
    expect(units.map((u) => u.id).sort()).toEqual(['unit-org-a', 'unit-org-b', 'unit-unassigned']);
  });

  it("listUnits(organizationId) excludes every other organization's units", async () => {
    const units = await service.listUnits('org-a');
    expect(units.map((u) => u.id)).toEqual(['unit-org-a']);

    const otherUnits = await service.listUnits('org-b');
    expect(otherUnits.map((u) => u.id)).toEqual(['unit-org-b']);
  });

  it("listPositions(unitId, organizationId) returns the unit's positions when it belongs to that organization", async () => {
    const positions = await service.listPositions('unit-org-a', 'org-a');
    expect(positions.map((p) => p.id)).toEqual(['pos-a']);
  });

  it('listPositions(unitId, organizationId) returns nothing for a unit belonging to a DIFFERENT organization -- the actual cross-tenant leak this fix closes', async () => {
    const positions = await service.listPositions('unit-org-b', 'org-a');
    expect(positions).toEqual([]);
  });

  it('listPositions(unitId) with no organizationId still returns the real positions (back-compat / system callers)', async () => {
    const positions = await service.listPositions('unit-org-b');
    expect(positions.map((p) => p.id)).toEqual(['pos-b']);
  });
});

/**
 * HEAL-347.26: upsertUnit()'s findOne was keyed on (externalId, vendorId)
 * alone -- neither is namespaced per hospital (vendorId is a fixed
 * per-adapter constant like 'webhook-cad' shared by every tenant hitting
 * that adapter), so two organizations whose CAD systems label a unit the
 * same way ("Unit-12") resolved to the SAME row: the second org's live
 * GPS/status updates silently overwrote the first org's unit.
 */
describe('SentinelTrackingService cross-organization unit identity (HEAL-347.26)', () => {
  let module: TestingModule;
  let service: SentinelTrackingService;
  let unitRepo: any;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [
            SentinelUnitEntity,
            SentinelPositionEntity,
            SentinelEtaEntity,
            SentinelGeofenceEntity,
            SentinelGeofenceEventEntity,
            SentinelEpisodeEntity,
            SentinelIntegrationCursorEntity,
          ],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([
          SentinelUnitEntity,
          SentinelPositionEntity,
          SentinelEtaEntity,
          SentinelGeofenceEntity,
          SentinelGeofenceEventEntity,
          SentinelEpisodeEntity,
          SentinelIntegrationCursorEntity,
        ]),
      ],
      providers: [
        SentinelTrackingService,
        { provide: SentinelAlarmService, useValue: { raise: jest.fn() } },
        { provide: SentinelOutboxService, useValue: { enqueue: jest.fn() } },
      ],
    }).compile();

    service = module.get(SentinelTrackingService);
    unitRepo = module.get(getRepositoryToken(SentinelUnitEntity));
  });

  afterAll(async () => {
    await module.close();
  });

  it("creates separate unit rows for two organizations whose CAD systems use the same externalId/vendorId, instead of one org overwriting the other's live position", async () => {
    await service.ingestCadEvents(
      [
        {
          kind: 'position',
          eventId: 'evt-a-1',
          vendorId: 'webhook-cad',
          unitExternalId: 'Unit-12',
          occurredAt: '2026-01-01T00:00:00.000Z',
          latitude: 10,
          longitude: 10,
        },
      ],
      'org-a',
    );
    await service.ingestCadEvents(
      [
        {
          kind: 'position',
          eventId: 'evt-b-1',
          vendorId: 'webhook-cad',
          unitExternalId: 'Unit-12',
          occurredAt: '2026-01-01T00:00:05.000Z',
          latitude: 90,
          longitude: 90,
        },
      ],
      'org-b',
    );

    const units = await unitRepo.find({ where: { externalId: 'Unit-12' } });
    expect(units).toHaveLength(2);

    const unitA = units.find((u: any) => u.organizationId === 'org-a');
    const unitB = units.find((u: any) => u.organizationId === 'org-b');
    expect(unitA.latitude).toBe(10);
    expect(unitB.latitude).toBe(90);

    // A follow-up event for org A must update org A's unit, not org B's.
    await service.ingestCadEvents(
      [
        {
          kind: 'position',
          eventId: 'evt-a-2',
          vendorId: 'webhook-cad',
          unitExternalId: 'Unit-12',
          occurredAt: '2026-01-01T00:00:10.000Z',
          latitude: 20,
          longitude: 20,
        },
      ],
      'org-a',
    );
    const unitBAfter = await unitRepo.findOne({ where: { id: unitB.id } });
    expect(unitBAfter.latitude).toBe(90);
  });
});

/**
 * Real-repository regression coverage for upsertUnit()'s findOne-then-create
 * TOCTOU race: two near-simultaneous CAD/AVL events for the same
 * never-before-seen unit (e.g. two overlapping webhook deliveries carrying a
 * unit's first-ever position/status update) could both find no row and both
 * attempt to insert, and the loser's .save() would throw an unhandled
 * unique-constraint QueryFailedError. Also proves the entity's split partial
 * unique indexes (organizationId IS NOT NULL / IS NULL) still correctly
 * enforce one-row-per-unit for a no-tenant-context unit, not just the
 * org-scoped case.
 */
describe('SentinelTrackingService upsertUnit concurrent-insert race', () => {
  let module: TestingModule;
  let service: SentinelTrackingService;
  let unitRepo: any;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [
            SentinelUnitEntity,
            SentinelPositionEntity,
            SentinelEtaEntity,
            SentinelGeofenceEntity,
            SentinelGeofenceEventEntity,
            SentinelEpisodeEntity,
            SentinelIntegrationCursorEntity,
          ],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([
          SentinelUnitEntity,
          SentinelPositionEntity,
          SentinelEtaEntity,
          SentinelGeofenceEntity,
          SentinelGeofenceEventEntity,
          SentinelEpisodeEntity,
          SentinelIntegrationCursorEntity,
        ]),
      ],
      providers: [
        SentinelTrackingService,
        { provide: SentinelAlarmService, useValue: { raise: jest.fn() } },
        { provide: SentinelOutboxService, useValue: { enqueue: jest.fn() } },
      ],
    }).compile();

    service = module.get(SentinelTrackingService);
    unitRepo = module.get(getRepositoryToken(SentinelUnitEntity));
  });

  afterAll(async () => {
    await module.close();
  });

  it('collapses two concurrent events for the same never-before-seen org-scoped unit into ONE row, without either call rejecting', async () => {
    await Promise.all([
      service.ingestCadEvents(
        [
          {
            kind: 'status',
            eventId: 'evt-race-org-1',
            vendorId: 'webhook-cad',
            unitExternalId: 'Unit-RACE-ORG',
            occurredAt: '2026-01-01T00:00:00.000Z',
            status: 'available',
          },
        ],
        'org-race',
      ),
      service.ingestCadEvents(
        [
          {
            kind: 'status',
            eventId: 'evt-race-org-2',
            vendorId: 'webhook-cad',
            unitExternalId: 'Unit-RACE-ORG',
            occurredAt: '2026-01-01T00:00:01.000Z',
            status: 'assigned',
          },
        ],
        'org-race',
      ),
    ]);

    const units = await unitRepo.find({
      where: { externalId: 'Unit-RACE-ORG', vendorId: 'webhook-cad', organizationId: 'org-race' },
    });
    expect(units).toHaveLength(1);
  });

  it('collapses two concurrent events for the same never-before-seen no-organization unit into ONE row (the nullable-column partial-index case)', async () => {
    await Promise.all([
      service.ingestCadEvents([
        {
          kind: 'status',
          eventId: 'evt-race-noorg-1',
          vendorId: 'webhook-cad',
          unitExternalId: 'Unit-RACE-NOORG',
          occurredAt: '2026-01-01T00:00:00.000Z',
          status: 'available',
        },
      ]),
      service.ingestCadEvents([
        {
          kind: 'status',
          eventId: 'evt-race-noorg-2',
          vendorId: 'webhook-cad',
          unitExternalId: 'Unit-RACE-NOORG',
          occurredAt: '2026-01-01T00:00:01.000Z',
          status: 'assigned',
        },
      ]),
    ]);

    const units = await unitRepo.find({
      where: { externalId: 'Unit-RACE-NOORG', vendorId: 'webhook-cad' },
    });
    expect(units.filter((u: any) => u.organizationId == null)).toHaveLength(1);
  });
});
