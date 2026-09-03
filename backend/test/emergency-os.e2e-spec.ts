process.env.NODE_ENV = 'test';
process.env.RAG_ENABLED = 'false';
process.env.RERANK_ENABLED = 'false';

import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import http from 'http';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { io as createSocketClient } from 'socket.io-client';

import { EmsModule } from '../src/modules/ems/ems.module';
import { BoardingModule } from '../src/modules/boarding/boarding.module';
import { ProtocolModule } from '../src/modules/protocol/protocol.module';
import { DeteriorationModule } from '../src/modules/deterioration/deterioration.module';
import { SurgeModule } from '../src/modules/surge/surge.module';
import { AuthorizationGuard } from '../src/modules/auth/guards/authorization.guard';
import { registerEMSWebSocketSupport } from '../src/api/ems.socket';

// Dynamically imported in beforeAll, after the env vars above are set --
// these backend modules read them at import time, and static ESM imports
// are hoisted before any other top-level code (unlike the original CJS
// require() calls, which ran in textual order).
let REQUIRED_SERVICE_NAMES: typeof import('../src/services').REQUIRED_SERVICE_NAMES;
let checkServiceHealth: typeof import('../src/services').checkServiceHealth;
let initializeAllServices: typeof import('../src/services').initializeAllServices;
let UnifiedPatient: typeof import('../src/models/unified-patient.model').UnifiedPatient;

const TEST_AUTH_HEADER = 'Bearer integration-test-token';
const FAKE_USER = {
  id: 'integration-test-user',
  role: 'physician',
  emergencyRole: 'attending',
  permissions: [
    'READ_PHI',
    'WRITE_PHI',
    'ACTIVATE_SURGE_MODE',
    'INGEST_SURGE_PATIENTS',
    'VIEW_SURGE_COMMAND',
  ],
};

/**
 * Rewritten for Cycle 287: the original version of this test mounted the
 * legacy bare-Express routers (ems.routes.ts, capacity.routes.ts, etc.) via
 * routes-registry.ts's registerAllRoutes(). Every one of those legacy files
 * had already been migrated to a real Nest controller by Cycle 285 at the
 * latest (surge itself went first, back in Cycle 243) and routes-registry.ts
 * itself was deleted this cycle -- so this test hadn't been able to import
 * successfully, let alone pass, for a long time before today. It is not run
 * by the standard backend Jest suite (`cd backend && npm test`); it lives
 * under a separate `npm run test:integration` (Vitest) script, which is why
 * this went unnoticed across the whole Cycle 277-286 migration.
 *
 * This version boots the real Nest modules directly (no AppModule -- Ems/
 * Capacity moved out of this suite: CapacityModule was deleted and the endpoint
 * now lives on EmergencyOsController as GET /api/emergency/capacity, whose module
 * pulls TypeORM and does not belong in this in-memory Mongo harness. It keeps its
 * coverage in emergency-os.controller.spec.ts (calls getCapacity) and
 * emergency-os-patient-endpoints-authorization.spec.ts (asserts READ_PHI).
 * Boarding/Protocol/Deterioration/Surge are all self-contained,
 * dependency-free @Module()s with no TypeORM/Mongoose wiring of their own)
 * and overrides AuthGuard('jwt')/AuthorizationGuard the same way this repo's
 * other e2e specs do (see backend/test/tool-orchestrator-api.e2e-spec.ts),
 * rather than a hand-rolled bearer-token Express middleware. Real guard/JWT
 * behavior (401 on missing auth, permission enforcement) already has its own
 * dedicated coverage (backend/test/auth.e2e-spec.ts, .../rbac.e2e-spec.ts);
 * this suite's job is the cross-controller clinical flow, not the guards.
 *
 * copilot and federated are intentionally not covered here: both controllers
 * live inside the much heavier EmergencyOsModule (TypeORM + AuthModule +
 * ChatModule), and both already have their own passing unit-test coverage
 * (ed-copilot.nest-parity.controller.spec.ts, emergency-os.research.controller.spec.ts).
 */
function overrideAuth(builder: ReturnType<typeof Test.createTestingModule>) {
  return builder
    .overrideGuard(AuthGuard('jwt'))
    .useValue({
      canActivate: (context: ExecutionContext) => {
        context.switchToHttp().getRequest().user = FAKE_USER;
        return true;
      },
    })
    .overrideGuard(AuthorizationGuard)
    .useValue({ canActivate: () => true });
}

function fakeSocketAuthMiddleware(socket: any, next: (error?: Error) => void) {
  socket.data.user = { id: FAKE_USER.id, role: FAKE_USER.role, permissions: FAKE_USER.permissions };
  next();
}

function listen(server: http.Server): Promise<string> {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('Integration HTTP server did not expose a TCP address');
      }
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function waitForSocketEvent(socket: any, eventName: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${eventName}`)), 5000);

    socket.once(eventName, (payload: any) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });
}

async function connectWhiteboardClient(baseUrl: string) {
  const socket = createSocketClient(baseUrl, {
    forceNew: true,
    reconnection: false,
    transports: ['websocket'],
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out connecting websocket')), 5000);
    socket.once('connect_error', reject);
    socket.once('connect', () => {
      socket.emit('join-whiteboard', FAKE_USER.id);
      setTimeout(() => {
        clearTimeout(timeout);
        resolve();
      }, 25);
    });
  });

  return socket;
}

describe('Emergency OS end-to-end integration', () => {
  let mongoServer: any;
  let app: INestApplication;
  let ioServer: any;
  let baseUrl: string;
  let initialization: any;

  beforeAll(async () => {
    ({ REQUIRED_SERVICE_NAMES, checkServiceHealth, initializeAllServices } = await import(
      '../src/services'
    ));
    ({ UnifiedPatient } = await import('../src/models/unified-patient.model'));

    mongoServer = await MongoMemoryServer.create({
      instance: {
        launchTimeout: 60000,
      },
    });
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri;
    process.env.DATABASE_MONGO_URI = mongoUri;

    await mongoose.connect(mongoUri);
    initialization = await initializeAllServices();

    const moduleFixture = await overrideAuth(
      Test.createTestingModule({
        imports: [EmsModule, BoardingModule, ProtocolModule, DeteriorationModule, SurgeModule],
      }),
    ).compile();

    app = moduleFixture.createNestApplication();
    // Mirror main.ts. Without it every route mounts at /emergency/... while this
    // suite asks for /api/emergency/..., so each request 404s and the assertions
    // describe a routing layout production does not have.
    app.setGlobalPrefix('api', { exclude: ['health', 'metrics', ''] });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
    await app.listen(0, '127.0.0.1');

    const expressInstance = app.getHttpAdapter().getInstance();
    const httpServer = app.getHttpServer();
    const address = httpServer.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
    ioServer = registerEMSWebSocketSupport(
      expressInstance,
      httpServer,
      undefined,
      fakeSocketAuthMiddleware,
    );
    // mongodb-memory-server has to download-or-spawn mongod and Nest then
    // initialises the real modules; under jest's 5s default this hook timed
    // out whenever a full unit run shared the CPU (2026-09-03), which read as
    // a failing test. Booting is allowed a minute; the assertions keep theirs.
  }, 60_000);

  afterAll(async () => {
    ioServer?.close();
    await app?.close();
    await mongoose.disconnect();
    await mongoServer?.stop();
  }, 60_000);

  it('initializes services, moves data through APIs, and emits whiteboard updates', async () => {
    expect(initialization.totals.registered).toBe(REQUIRED_SERVICE_NAMES.length);
    expect(initialization.totals.failed).toBe(0);
    expect(Object.keys(initialization.services)).toEqual(
      expect.arrayContaining(REQUIRED_SERVICE_NAMES),
    );

    const health = await checkServiceHealth();
    expect(health.totals.failed).toBe(0);

    const httpServerHandle = app.getHttpServer();
    await request(httpServerHandle)
      .post('/api/emergency/ems/alert')
      .set('Authorization', TEST_AUTH_HEADER)
      .send({})
      .expect(400);

    const socket = await connectWhiteboardClient(baseUrl);
    const whiteboardUpdate = waitForSocketEvent(socket, 'ems_alert_received');
    const emsUnitId = `EMS-${Date.now()}`;
    const alertResponse = await request(httpServerHandle)
      .post('/api/emergency/ems/alert')
      .set('Authorization', TEST_AUTH_HEADER)
      .send({
        ems_unit_id: emsUnitId,
        patient: {
          unknown: true,
          age: '58',
          sex: 'female',
          chief_complaint: 'fever, hypotension, suspected sepsis',
        },
        vitals: { hr: 132, bp: '84/48', o2: 90, rr: 28 },
        eta_minutes: 12,
        triage_code: 'CTAS2',
        risk_flags: ['sepsis', 'deterioration-risk'],
        notes: 'Integration test prehospital alert',
      })
      .expect(201);

    const patientId = alertResponse.body.patient._id;
    expect(patientId).toBeTruthy();
    expect(alertResponse.body.patient.current_state).toBe('EMS_EN_ROUTE');
    expect(await whiteboardUpdate).toMatchObject({
      ems_unit_id: emsUnitId,
      current_state: 'EMS_EN_ROUTE',
    });
    socket.disconnect();

    const onSceneResponse = await request(httpServerHandle)
      .patch(`/api/emergency/ems/status/${emsUnitId}`)
      .set('Authorization', TEST_AUTH_HEADER)
      .send({ status: 'on_scene', eta_minutes: 6 })
      .expect(200);
    expect(onSceneResponse.body.patient.current_state).toBe('EMS_ON_SCENE');

    const arrivalResponse = await request(httpServerHandle)
      .post(`/api/emergency/ems/arrive/${emsUnitId}`)
      .set('Authorization', TEST_AUTH_HEADER)
      .send({ real_name: 'Integration Patient', real_age: '58' })
      // 201: @Post('arrive/:emsUnitId') carries no @HttpCode, so Nest returns
      // Created. This suite already expects 201 from POST /ems/alert, so the
      // 200 here was the outlier rather than a controller bug worth changing --
      // a status code is part of the contract clients hold.
      .expect(201);
    expect(arrivalResponse.body.patient.current_state).toBe('ARRIVAL');

    const boardingResponse = await request(httpServerHandle)
      .post('/api/emergency/boarding/track-decision')
      .set('Authorization', TEST_AUTH_HEADER)
      .send({ patientId, clinicianId: 'clinician-integration' })
      .expect(201); // @Post with no @HttpCode -> Nest returns Created
    expect(boardingResponse.body.success).toBe(true);

    const boardedPatient = await UnifiedPatient.findById(patientId).lean();
    expect(boardedPatient).not.toBeNull();
    expect(boardedPatient!.boardingStatus).toBe('boarding');
    expect(boardedPatient!.state_history.map((entry: any) => entry.state)).toEqual(
      expect.arrayContaining(['EMS_EN_ROUTE', 'EMS_ON_SCENE', 'ARRIVAL']),
    );

    const protocolResponse = await request(httpServerHandle)
      .get('/api/protocol/evaluate')
      .set('Authorization', TEST_AUTH_HEADER)
      .query({
        chiefComplaint: 'fever hypotension suspected sepsis',
        hr: 132,
        sbp: 84,
      })
      .expect(200);
    expect(protocolResponse.body.protocols.map((protocol: any) => protocol.id)).toContain(
      'sepsis-screen',
    );

    const deteriorationResponse = await request(httpServerHandle)
      .post('/api/deterioration/predict')
      .set('Authorization', TEST_AUTH_HEADER)
      .send({
        age: 58,
        triageCode: 'CTAS2',
        vitals: { hr: 132, sbp: 84, spo2: 90, rr: 28, temp: 38.8, gcs: 13 },
        riskFlags: ['sepsis', 'shock'],
      })
      .expect(201);
    expect(deteriorationResponse.body.prediction.riskBand).toBe('critical');
    expect(deteriorationResponse.body.prediction.contributingSignals).toEqual(
      expect.arrayContaining(['hypotension', 'hypoxia', 'high-risk-flag']),
    );

    const surgeResponse = await request(httpServerHandle)
      .post('/api/emergency/surge/activate')
      .set('Authorization', TEST_AUTH_HEADER)
      .send({
        type: 'mci',
        estimatedPatientCount: 9,
        actualPatientCount: 0,
        resourceStatus: {
          traumaBedsAvailable: 2,
          traumaBedsTotal: 6,
          surgeonsAvailable: 2,
          surgeonsTotal: 5,
          anaesthetistsAvailable: 2,
          anaesthetistsTotal: 4,
          bloodUnitsAvailable: 14,
          bloodUnitsTotal: 40,
          ventilatorsAvailable: 3,
          ventilatorsTotal: 8,
        },
      })
      .expect(201);
    expect(surgeResponse.body.success).toBe(true);
    expect(surgeResponse.body.surgeEvent.status).toBe('activated');

    await request(httpServerHandle)
      .post('/api/deterioration/predict')
      .set('Authorization', TEST_AUTH_HEADER)
      .send({})
      .expect(400);
  });
});
