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
      unitRepo.create({ id: 'unit-org-a', externalId: 'M1', vendorId: 'mock', label: 'Medic 1', organizationId: 'org-a' }),
      unitRepo.create({ id: 'unit-org-b', externalId: 'M2', vendorId: 'mock', label: 'Medic 2', organizationId: 'org-b' }),
      unitRepo.create({ id: 'unit-unassigned', externalId: 'M3', vendorId: 'mock', label: 'Medic 3', organizationId: null }),
    ]);
    await positionRepo.save([
      positionRepo.create({ id: 'pos-a', unitId: 'unit-org-a', latitude: 1, longitude: 1, source: 'mock', receivedAt: '2026-01-01T00:00:00.000Z', eventSeq: 1 }),
      positionRepo.create({ id: 'pos-b', unitId: 'unit-org-b', latitude: 2, longitude: 2, source: 'mock', receivedAt: '2026-01-01T00:00:00.000Z', eventSeq: 1 }),
    ]);
  });

  afterAll(async () => {
    await module.close();
  });

  it('listUnits() with no organizationId returns every organization\'s units (back-compat / system callers)', async () => {
    const units = await service.listUnits();
    expect(units.map((u) => u.id).sort()).toEqual(['unit-org-a', 'unit-org-b', 'unit-unassigned']);
  });

  it('listUnits(organizationId) excludes every other organization\'s units', async () => {
    const units = await service.listUnits('org-a');
    expect(units.map((u) => u.id)).toEqual(['unit-org-a']);

    const otherUnits = await service.listUnits('org-b');
    expect(otherUnits.map((u) => u.id)).toEqual(['unit-org-b']);
  });

  it('listPositions(unitId, organizationId) returns the unit\'s positions when it belongs to that organization', async () => {
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
