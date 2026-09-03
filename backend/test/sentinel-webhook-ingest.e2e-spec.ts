import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { jwtConfig } from '../src/config/auth.config';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { User, UserRole } from '../src/modules/users/entities/user.entity';
import { UserProfile } from '../src/modules/users/entities/user-profile.entity';
import { OAuthAccount } from '../src/modules/users/entities/oauth-account.entity';
import { Subscription } from '../src/modules/subscriptions/entities/subscription.entity';
import { TwoFactor } from '../src/modules/two-factor/entities/two-factor.entity';
import { BiometricConfig } from '../src/modules/auth/entities/biometric-config.entity';
import { AuditLog } from '../src/modules/audit/entities/audit-log.entity';
import { SentinelModule } from '../src/modules/sentinel/sentinel.module';
import { SentinelUnitEntity } from '../src/modules/sentinel/entities/sentinel-unit.entity';
import { SentinelPositionEntity } from '../src/modules/sentinel/entities/sentinel-position.entity';
import { SentinelEtaEntity } from '../src/modules/sentinel/entities/sentinel-eta.entity';
import { SentinelGeofenceEntity } from '../src/modules/sentinel/entities/sentinel-geofence.entity';
import { SentinelGeofenceEventEntity } from '../src/modules/sentinel/entities/sentinel-geofence-event.entity';
import { SentinelInboundPatientEntity } from '../src/modules/sentinel/entities/sentinel-inbound-patient.entity';
import { SentinelEpisodeEntity } from '../src/modules/sentinel/entities/sentinel-episode.entity';
import { SentinelAlarmEntity } from '../src/modules/sentinel/entities/sentinel-alarm.entity';
import { SentinelAlarmEventEntity } from '../src/modules/sentinel/entities/sentinel-alarm-event.entity';
import { SentinelOutboxEntity } from '../src/modules/sentinel/entities/sentinel-outbox.entity';
import { SentinelAiRecommendationEntity } from '../src/modules/sentinel/entities/sentinel-ai-recommendation.entity';
import { SentinelIntegrationCursorEntity } from '../src/modules/sentinel/entities/sentinel-integration-cursor.entity';

jest.setTimeout(120_000);

/**
 * Minimal, self-contained JWT auth module -- deliberately NOT the real
 * AuthModule. AuthModule transitively pulls in PlatformAssetsModule (asset
 * seeding, entitlements, FleetModule, UserPreferencesModule) and several
 * other business-logic modules with their own large entity graphs; wiring
 * all of that up is unrelated to what this test verifies (real JWT auth +
 * real Sentinel ingestion) and, per a quick check while building this test,
 * that exact combination is currently broken even in the codebase's own
 * pre-existing test/two-factor.e2e-spec.ts (EntityMetadataNotFoundError for
 * "PlatformAsset" -- a real, separate finding, not something this test
 * introduces or should silently work around). This module provides just the
 * real JwtStrategy against a real (if minimal) User repository, so requests
 * go through the actual Passport JWT verification + AuthGuard('jwt') the
 * real SentinelController uses -- not a mocked guard.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<any>('jwt');
        return {
          secret: config.secret,
          signOptions: {
            expiresIn: config.accessTokenExpiry,
            issuer: config.issuer,
            audience: config.audience,
          },
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [JwtStrategy],
  exports: [JwtModule, PassportModule],
})
class MinimalJwtAuthModule {}

describe('Sentinel CAD/AVL webhook ingestion (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let positionRepo: Repository<SentinelPositionEntity>;
  let unitRepo: Repository<SentinelUnitEntity>;
  let etaRepo: Repository<SentinelEtaEntity>;
  let outboxRepo: Repository<SentinelOutboxEntity>;
  let geofenceEventRepo: Repository<SentinelGeofenceEventEntity>;
  let alarmRepo: Repository<SentinelAlarmEntity>;

  const originalSentinelEnabled = process.env.SENTINEL_ENABLED;
  const originalMockAdapter = process.env.SENTINEL_MOCK_ADAPTER;

  beforeAll(async () => {
    process.env.SENTINEL_ENABLED = 'true';
    process.env.SENTINEL_MOCK_ADAPTER = 'false';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [jwtConfig],
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [
            User,
            UserProfile,
            OAuthAccount,
            Subscription,
            TwoFactor,
            BiometricConfig,
            AuditLog,
            SentinelUnitEntity,
            SentinelPositionEntity,
            SentinelEtaEntity,
            SentinelGeofenceEntity,
            SentinelGeofenceEventEntity,
            SentinelInboundPatientEntity,
            SentinelEpisodeEntity,
            SentinelAlarmEntity,
            SentinelAlarmEventEntity,
            SentinelOutboxEntity,
            SentinelAiRecommendationEntity,
            SentinelIntegrationCursorEntity,
          ],
          synchronize: true,
          logging: false,
        }),
        // SentinelModule pulls in the global AuditModule, whose controller
        // guards its routes with ThrottlerGuard; AppModule registers the
        // throttler options at the root, so a standalone boot must too.
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
        MinimalJwtAuthModule,
        SentinelModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    positionRepo = moduleFixture.get(getRepositoryToken(SentinelPositionEntity));
    unitRepo = moduleFixture.get(getRepositoryToken(SentinelUnitEntity));
    etaRepo = moduleFixture.get(getRepositoryToken(SentinelEtaEntity));
    outboxRepo = moduleFixture.get(getRepositoryToken(SentinelOutboxEntity));
    geofenceEventRepo = moduleFixture.get(getRepositoryToken(SentinelGeofenceEventEntity));
    alarmRepo = moduleFixture.get(getRepositoryToken(SentinelAlarmEntity));

    // Real User row (no service-layer encryption/business-logic needed for
    // what JwtStrategy.validate() reads: id + isActive). PHYSICIAN holds
    // MANAGE_SENTINEL_UNITS, satisfying ingestCad's
    // @AnyPermission(INGEST_SENTINEL_CAD, MANAGE_INTEGRATIONS, MANAGE_SENTINEL_UNITS).
    const userRepo: Repository<User> = moduleFixture.get(getRepositoryToken(User));
    const user = await userRepo.save(
      userRepo.create({
        id: randomUUID(),
        email: `sentinel-webhook-${Date.now()}@example.com`,
        isActive: true,
        role: UserRole.PHYSICIAN,
        emailVerified: true,
      }),
    );

    const jwtService = moduleFixture.get<JwtService>(JwtService);
    authToken = jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenUse: 'access',
    });
  });

  afterAll(async () => {
    await app?.close();
    if (originalSentinelEnabled === undefined) delete process.env.SENTINEL_ENABLED;
    else process.env.SENTINEL_ENABLED = originalSentinelEnabled;
    if (originalMockAdapter === undefined) delete process.env.SENTINEL_MOCK_ADAPTER;
    else process.env.SENTINEL_MOCK_ADAPTER = originalMockAdapter;
  });

  it('rejects the webhook without a bearer token', async () => {
    await request(app.getHttpServer())
      .post('/sentinel/ingest/cad')
      .send({ unitExternalId: 'Medic-9', latitude: 40.758, longitude: -73.9855 })
      .expect(401);
  });

  it('ingests a real vendor-shaped position event through the full pipeline', async () => {
    const unitExternalId = `E2E-${Date.now()}`;
    const response = await request(app.getHttpServer())
      .post('/sentinel/ingest/cad')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        unitExternalId,
        vendorId: 'e2e-test-vendor',
        eventId: 'evt-1',
        latitude: 40.758,
        longitude: -73.9855,
        heading: 90,
        speedKmh: 42,
        status: 'responding',
        occurredAt: new Date().toISOString(),
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.eventCount).toBe(1);
    expect(response.body.data.accepted).toBe(1);

    const unit = await unitRepo.findOne({ where: { externalId: unitExternalId } });
    expect(unit).not.toBeNull();
    expect(unit!.latitude).toBeCloseTo(40.758, 5);
    expect(unit!.longitude).toBeCloseTo(-73.9855, 5);

    const positions = await positionRepo.find({ where: { unitId: unit!.id } });
    expect(positions).toHaveLength(1);
    expect(positions[0].sourceEventId).toBe('evt-1');

    // Real Haversine ETA engine (lib/sentinel/etaEngine), not a stub.
    const etas = await etaRepo.find({ where: { unitId: unit!.id } });
    expect(etas).toHaveLength(1);
    expect(etas[0].etaPointMin).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(etas[0].distanceKm)).toBe(true);

    const outboxRows = await outboxRepo.find({ where: { aggregateId: unit!.id } });
    expect(outboxRows.some((row) => row.eventType === 'UnitPositionReceived')).toBe(true);

    // The position (40.758, -73.9855) is the hospital center itself, so it
    // lands inside both default geofences seeded at boot (Hospital approach,
    // Ambulance bay) -- first-ever position for this unit means "entered".
    const geofenceEvents = await geofenceEventRepo.find({ where: { unitId: unit!.id } });
    expect(geofenceEvents.length).toBeGreaterThan(0);
    expect(geofenceEvents.every((event) => event.transition === 'entered')).toBe(true);

    const alarms = await alarmRepo.find({ where: { subjectId: unit!.id } });
    expect(alarms.length).toBeGreaterThan(0);
  });

  it('is idempotent: replaying the same eventId does not create a duplicate position row', async () => {
    const unitExternalId = `E2E-IDEMPOTENT-${Date.now()}`;
    const payload = {
      unitExternalId,
      vendorId: 'e2e-test-vendor',
      eventId: 'evt-replayed',
      latitude: 40.758,
      longitude: -73.9855,
      occurredAt: new Date().toISOString(),
    };

    await request(app.getHttpServer())
      .post('/sentinel/ingest/cad')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(201);

    await request(app.getHttpServer())
      .post('/sentinel/ingest/cad')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(201);

    const unit = await unitRepo.findOne({ where: { externalId: unitExternalId } });
    expect(unit).not.toBeNull();

    const positions = await positionRepo.find({ where: { unitId: unit!.id } });
    expect(positions).toHaveLength(1);
  });

  it('rejects a malformed payload with no identifiable unit as accepted:0, not a crash', async () => {
    const response = await request(app.getHttpServer())
      .post('/sentinel/ingest/cad')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ latitude: 40.758, longitude: -73.9855 })
      .expect(201);

    expect(response.body.data.eventCount).toBe(0);
  });
});
