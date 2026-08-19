import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SentinelInboundService } from './sentinel-inbound.service';
import { SentinelOutboxService } from './sentinel-outbox.service';
import { SentinelInboundPatientEntity } from './entities/sentinel-inbound-patient.entity';
import { SentinelAiRecommendationEntity } from './entities/sentinel-ai-recommendation.entity';

/**
 * Real-repository regression coverage for HEAL-311: two concurrent
 * upsertFromCadOrNemsis() calls for a unit with no existing inbound row
 * previously both read "nothing exists" and both inserted, leaving two PHI
 * rows in sentinel_inbound_patients for one real incoming patient. This
 * proves the unique index + race-recovery path actually collapses that to
 * one row at the database layer, not just that the service "looks" correct.
 */
describe('SentinelInboundService concurrent upsert (HEAL-311)', () => {
  let module: TestingModule;
  let service: SentinelInboundService;
  let inboundRepo: Repository<SentinelInboundPatientEntity>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [SentinelInboundPatientEntity, SentinelAiRecommendationEntity],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([SentinelInboundPatientEntity, SentinelAiRecommendationEntity]),
      ],
      providers: [
        SentinelInboundService,
        { provide: SentinelOutboxService, useValue: { enqueue: jest.fn() } },
      ],
    }).compile();

    service = module.get(SentinelInboundService);
    inboundRepo = module.get(getRepositoryToken(SentinelInboundPatientEntity));
  });

  afterAll(async () => {
    await module.close();
  });

  it('collapses two concurrent CAD/NEMSIS deliveries for the same never-before-seen unit into ONE row, not a duplicate PHI record', async () => {
    const unitId = 'unit-race-1';

    const [first, second] = await Promise.all([
      service.upsertFromCadOrNemsis({
        payload: { unitId, chiefComplaint: 'chest pain', vitals: { heartRate: 110 } },
        unitId,
      }),
      service.upsertFromCadOrNemsis({
        payload: { unitId, chiefComplaint: 'chest pain, now diaphoretic', vitals: { heartRate: 130 } },
        unitId,
      }),
    ]);

    const rows = await inboundRepo.find({ where: { unitId } });
    // Before HEAL-311 this was routinely 2: both concurrent requests read
    // "no existing row" and both inserted.
    expect(rows).toHaveLength(1);

    // Neither caller's request should have been dropped/errored -- both
    // resolve, and both point at the same single surviving row.
    expect(first.inbound.unitId).toBe(unitId);
    expect(second.inbound.unitId).toBe(unitId);
    expect(first.inbound.id).toBe(second.inbound.id);
  });

  it('still updates the existing row in place on a normal sequential re-delivery (back-compat)', async () => {
    const unitId = 'unit-sequential-1';

    const initial = await service.upsertFromCadOrNemsis({
      payload: { unitId, chiefComplaint: 'shortness of breath' },
      unitId,
    });

    const updated = await service.upsertFromCadOrNemsis({
      payload: { unitId, chiefComplaint: 'shortness of breath, worsening' },
      unitId,
    });

    expect(updated.inbound.id).toBe(initial.inbound.id);
    expect(updated.inbound.chiefComplaint).toBe('shortness of breath, worsening');

    const rows = await inboundRepo.find({ where: { unitId } });
    expect(rows).toHaveLength(1);
  });
});

/**
 * HEAL-347.26: unitId is a raw, caller-supplied CAD/NEMSIS identifier, not
 * namespaced per hospital -- the HEAL-311 fix above made it GLOBALLY
 * unique, which closed the same-org race but meant two different
 * organizations whose CAD/NEMSIS payloads use a colliding unitId silently
 * overwrote each other's pre-arrival PHI (chief complaint, vitals,
 * narrative) through the same findOne-by-unitId lookup.
 */
describe('SentinelInboundService cross-organization isolation (HEAL-347.26)', () => {
  let module: TestingModule;
  let service: SentinelInboundService;
  let inboundRepo: Repository<SentinelInboundPatientEntity>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [SentinelInboundPatientEntity, SentinelAiRecommendationEntity],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([SentinelInboundPatientEntity, SentinelAiRecommendationEntity]),
      ],
      providers: [
        SentinelInboundService,
        { provide: SentinelOutboxService, useValue: { enqueue: jest.fn() } },
      ],
    }).compile();

    service = module.get(SentinelInboundService);
    inboundRepo = module.get(getRepositoryToken(SentinelInboundPatientEntity));
  });

  afterAll(async () => {
    await module.close();
  });

  it('keeps two organizations with a colliding unitId as separate rows instead of overwriting one PHI record with the other', async () => {
    const unitId = 'unit-shared-label-12';

    const orgA = await service.upsertFromCadOrNemsis({
      payload: { unitId, chiefComplaint: 'chest pain' },
      unitId,
      organizationId: 'org-a',
    });
    const orgB = await service.upsertFromCadOrNemsis({
      payload: { unitId, chiefComplaint: 'traumatic injury, unrelated patient' },
      unitId,
      organizationId: 'org-b',
    });

    expect(orgA.inbound.id).not.toBe(orgB.inbound.id);

    const rows = await inboundRepo.find({ where: { unitId } });
    expect(rows).toHaveLength(2);

    const rowA = rows.find((r) => r.organizationId === 'org-a');
    const rowB = rows.find((r) => r.organizationId === 'org-b');
    expect(rowA?.chiefComplaint).toBe('chest pain');
    expect(rowB?.chiefComplaint).toBe('traumatic injury, unrelated patient');

    // A follow-up delivery for org A must update org A's row, not org B's.
    const orgAUpdate = await service.upsertFromCadOrNemsis({
      payload: { unitId, chiefComplaint: 'chest pain, now diaphoretic' },
      unitId,
      organizationId: 'org-a',
    });
    expect(orgAUpdate.inbound.id).toBe(orgA.inbound.id);

    const rowBAfter = await inboundRepo.findOne({ where: { id: orgB.inbound.id } });
    expect(rowBAfter?.chiefComplaint).toBe('traumatic injury, unrelated patient');
  });
});
