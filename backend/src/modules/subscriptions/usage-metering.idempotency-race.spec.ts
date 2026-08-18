import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsageMeteringService } from './usage-metering.service';
import { UsageEvent } from './entities/usage-event.entity';
import { UsageEventType } from './subscription-plans.config';

/**
 * Real-repository regression coverage for HEAL-330: two concurrent
 * recordUsage() calls sharing an idempotency key previously both passed the
 * findOne() dedup check before either committed -- the loser's .save() then
 * threw an uncaught unique-constraint QueryFailedError instead of
 * transparently returning the winner's row, defeating the entire point of
 * idempotency. Proves the insert-or-ignore + read-back fix actually
 * collapses this to one row and one resolved promise each at the database
 * layer, not just that the service "looks" correct.
 */
describe('UsageMeteringService concurrent idempotent recordUsage (HEAL-330)', () => {
  let module: TestingModule;
  let service: UsageMeteringService;
  let usageEventRepo: Repository<UsageEvent>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [UsageEvent],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([UsageEvent]),
      ],
      providers: [UsageMeteringService],
    }).compile();

    service = module.get(UsageMeteringService);
    usageEventRepo = module.get(getRepositoryToken(UsageEvent));
  });

  afterAll(async () => {
    await module.close();
  });

  it('collapses two concurrent requests sharing an idempotency key into ONE row, without either call rejecting', async () => {
    const idempotencyKey = 'race-key-1';

    const [first, second] = await Promise.all([
      service.recordUsage({
        organizationId: 'org-race',
        eventType: UsageEventType.SIMULATION,
        idempotencyKey,
        source: 'first-caller',
      }),
      service.recordUsage({
        organizationId: 'org-race',
        eventType: UsageEventType.SIMULATION,
        idempotencyKey,
        source: 'second-caller',
      }),
    ]);

    const rows = await usageEventRepo.find({
      where: { organizationId: 'org-race', idempotencyKey },
    });
    // Before HEAL-330, a real concurrent race here could throw instead of
    // deduping -- and even when it didn't throw, nothing enforced exactly
    // one persisted row under true concurrency.
    expect(rows).toHaveLength(1);

    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(first!.id).toBe(second!.id);
    expect(first!.id).toBe(rows[0].id);
  });

  it('still allows multiple events with no idempotency key (unaffected by the fix)', async () => {
    await service.recordUsage({ organizationId: 'org-no-key', eventType: UsageEventType.API_CALL });
    await service.recordUsage({ organizationId: 'org-no-key', eventType: UsageEventType.API_CALL });

    const rows = await usageEventRepo.find({ where: { organizationId: 'org-no-key' } });
    expect(rows).toHaveLength(2);
  });
});
