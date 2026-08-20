import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SentinelAlarmService } from './sentinel-alarm.service';
import { SentinelInboundService } from './sentinel-inbound.service';
import { SentinelOutboxService } from './sentinel-outbox.service';
import { SentinelAlarmEntity } from './entities/sentinel-alarm.entity';
import { SentinelAlarmEventEntity } from './entities/sentinel-alarm-event.entity';
import { SentinelInboundPatientEntity } from './entities/sentinel-inbound-patient.entity';
import { SentinelAiRecommendationEntity } from './entities/sentinel-ai-recommendation.entity';

/**
 * HEAL-339: transition()/listEvents() (alarms) and getInbound()/
 * reviewRecommendation() (inbound pre-arrival patients) had zero
 * organizationId filtering, letting any authenticated user with sentinel
 * permissions (ACK_SENTINEL_ALARMS/REVIEW_SENTINEL_AI -- both org-scoped,
 * held by NURSE) act on another hospital's live EMS alarm or AI prep
 * recommendation by id. Real-repository coverage against an in-memory
 * sqlite DB, not mocked query args, to prove the cross-org id genuinely
 * 404s rather than just asserting the call shape.
 */
describe('Sentinel tenant isolation (HEAL-339)', () => {
  let module: TestingModule;
  let alarmService: SentinelAlarmService;
  let inboundService: SentinelInboundService;
  let alarmRepo: Repository<SentinelAlarmEntity>;
  let inboundRepo: Repository<SentinelInboundPatientEntity>;
  let aiRepo: Repository<SentinelAiRecommendationEntity>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [
            SentinelAlarmEntity,
            SentinelAlarmEventEntity,
            SentinelInboundPatientEntity,
            SentinelAiRecommendationEntity,
          ],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([
          SentinelAlarmEntity,
          SentinelAlarmEventEntity,
          SentinelInboundPatientEntity,
          SentinelAiRecommendationEntity,
        ]),
      ],
      providers: [
        SentinelAlarmService,
        SentinelInboundService,
        { provide: SentinelOutboxService, useValue: { enqueue: jest.fn() } },
      ],
    }).compile();

    alarmService = module.get(SentinelAlarmService);
    inboundService = module.get(SentinelInboundService);
    alarmRepo = module.get(getRepositoryToken(SentinelAlarmEntity));
    inboundRepo = module.get(getRepositoryToken(SentinelInboundPatientEntity));
    aiRepo = module.get(getRepositoryToken(SentinelAiRecommendationEntity));
  });

  afterAll(async () => {
    await module.close();
  });

  it('does not let a different organization acknowledge/escalate an alarm by id', async () => {
    const { alarm } = await alarmService.raise({
      source: 'test',
      category: 'ems',
      ruleId: 'r1',
      subjectId: 'unit-1',
      severity: 'critical',
      urgency: 'immediate',
      title: 'Critical alarm',
      message: 'test',
      organizationId: 'org-a',
    });
    if (!alarm) throw new Error('expected alarm to be raised');

    await expect(
      alarmService.transition(alarm.id, 'acknowledged', { actorId: 'attacker' }, 'org-b'),
    ).rejects.toThrow(`Alarm ${alarm.id} not found`);

    const acked = await alarmService.transition(
      alarm.id,
      'acknowledged',
      { actorId: 'real-nurse' },
      'org-a',
    );
    expect(acked.status).toBe('acknowledged');
  });

  it("does not let a different organization read an alarm's audit trail", async () => {
    const { alarm } = await alarmService.raise({
      source: 'test',
      category: 'ems',
      ruleId: 'r1',
      subjectId: 'unit-2',
      severity: 'critical',
      urgency: 'immediate',
      title: 'Critical alarm 2',
      message: 'test',
      organizationId: 'org-a',
    });
    if (!alarm) throw new Error('expected alarm to be raised');

    await expect(alarmService.listEvents(alarm.id, 'org-b')).rejects.toThrow(
      `Alarm ${alarm.id} not found`,
    );
    await expect(alarmService.listEvents(alarm.id, 'org-a')).resolves.toEqual(expect.any(Array));
  });

  it('does not let a different organization read an inbound pre-arrival patient by id', async () => {
    const saved = await inboundRepo.save(
      inboundRepo.create({
        id: 'inbound-heal339',
        organizationId: 'org-a',
        unitId: 'unit-3',
        status: 'en_route',
        chiefComplaint: 'chest pain',
      }),
    );

    await expect(inboundService.getInbound(saved.id, 'org-b')).resolves.toBeNull();
    await expect(inboundService.getInbound(saved.id, 'org-a')).resolves.toEqual(
      expect.objectContaining({ id: saved.id }),
    );
  });

  it("does not let a different organization review an AI prep recommendation linked to another org's inbound patient", async () => {
    const inbound = await inboundRepo.save(
      inboundRepo.create({
        id: 'inbound-heal339-ai',
        organizationId: 'org-a',
        unitId: 'unit-4',
        status: 'en_route',
        chiefComplaint: 'trauma',
      }),
    );
    const rec = await aiRepo.save(
      aiRepo.create({
        id: 'rec-heal339',
        kind: 'prep_recommendation',
        summary: 'Prepare trauma bay',
        recommendations: ['Prepare trauma bay'],
        evidence: [],
        confidence: 0.5,
        modelId: 'rules-only',
        modelVersion: 'v1',
        orchestratorVersion: 'v1',
        humanReviewStatus: 'pending',
        disclaimer: 'AI-generated, human review required.',
        sourceState: 'live',
        generatedAt: new Date().toISOString(),
        linkedEntityType: 'inbound_patient',
        linkedEntityId: inbound.id,
      }),
    );

    await expect(
      inboundService.reviewRecommendation(rec.id, 'accepted', 'attacker', 'org-b'),
    ).rejects.toThrow(`Recommendation ${rec.id} not found`);

    const reviewed = await inboundService.reviewRecommendation(
      rec.id,
      'accepted',
      'real-reviewer',
      'org-a',
    );
    expect(reviewed.humanReviewStatus).toBe('accepted');
  });
});
