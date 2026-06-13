process.env.NODE_ENV = 'test';
process.env.ENABLE_MONGOOSE_EMERGENCY_OS = 'true';
process.env.RAG_ENABLED = 'false';
process.env.RERANK_ENABLED = 'false';

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { io: createSocketClient } = require('socket.io-client');

const { registerAllRoutes } = require('../../backend/src/api/routes-registry');
const { registerEMSWebSocketSupport } = require('../../backend/src/api/ems.socket');
const {
  REQUIRED_SERVICE_NAMES,
  checkServiceHealth,
  initializeAllServices,
} = require('../../backend/src/services');
const { UnifiedPatient } = require('../../backend/src/models/unified-patient.model');

const TEST_AUTH_HEADER = 'Bearer integration-test-token';

function requireIntegrationAuth(req: any, res: any, next: any) {
  if (req.headers.authorization !== TEST_AUTH_HEADER) {
    return res.status(401).json({ error: 'Authorization header is required' });
  }

  return next();
}

function createIntegrationApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1', requireIntegrationAuth);

  const mountedRoutes = registerAllRoutes(app, { apiPrefix: '/api/v1' });
  return { app, mountedRoutes };
}

function listen(server: any): Promise<string> {
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

function closeServer(server: any): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error: Error | undefined) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function waitForSocketEvent(socket: any, eventName: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Timed out waiting for ${eventName}`)),
      5000,
    );

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
      socket.emit('join-whiteboard', 'integration-test-user');
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
  let app: any;
  let httpServer: any;
  let ioServer: any;
  let baseUrl: string;
  let mountedRoutes: any[];
  let initialization: any;

  beforeAll(async () => {
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

    const integrationApp = createIntegrationApp();
    app = integrationApp.app;
    mountedRoutes = integrationApp.mountedRoutes;
    httpServer = http.createServer(app);
    ioServer = registerEMSWebSocketSupport(app, httpServer);
    baseUrl = await listen(httpServer);
  });

  afterAll(async () => {
    ioServer?.close();
    if (httpServer?.listening) {
      await closeServer(httpServer);
    }
    await mongoose.disconnect();
    await mongoServer?.stop();
  });

  it('initializes services, moves data through APIs, and emits whiteboard updates', async () => {
    expect(initialization.totals.registered).toBe(REQUIRED_SERVICE_NAMES.length);
    expect(initialization.totals.failed).toBe(0);
    expect(Object.keys(initialization.services)).toEqual(
      expect.arrayContaining(REQUIRED_SERVICE_NAMES),
    );

    const health = await checkServiceHealth();
    expect(health.totals.failed).toBe(0);
    expect(mountedRoutes.map((route) => route.fullPath)).toEqual(
      expect.arrayContaining([
        '/api/v1/ems',
        '/api/v1/capacity',
        '/api/v1/boarding',
        '/api/v1/protocol',
        '/api/v1/surge',
        '/api/v1/copilot',
        '/api/v1/deterioration',
        '/api/v1/federated',
      ]),
    );

    await request(app).get('/api/v1/capacity/dashboard').expect(401);
    await request(app).post('/api/v1/ems/alert').set('Authorization', TEST_AUTH_HEADER).send({}).expect(400);

    const socket = await connectWhiteboardClient(baseUrl);
    const whiteboardUpdate = waitForSocketEvent(socket, 'ems_alert_received');
    const emsUnitId = `EMS-${Date.now()}`;
    const alertResponse = await request(app)
      .post('/api/v1/ems/alert')
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

    const capacityResponse = await request(app)
      .get('/api/v1/capacity/dashboard')
      .set('Authorization', TEST_AUTH_HEADER)
      .expect(200);
    expect(capacityResponse.body.metrics.active_patients).toBeGreaterThanOrEqual(1);
    expect(capacityResponse.body.metrics.ems_inbound_45min).toBeGreaterThanOrEqual(1);

    const onSceneResponse = await request(app)
      .patch(`/api/v1/ems/status/${emsUnitId}`)
      .set('Authorization', TEST_AUTH_HEADER)
      .send({ status: 'on_scene', eta_minutes: 6 })
      .expect(200);
    expect(onSceneResponse.body.patient.current_state).toBe('EMS_ON_SCENE');

    const arrivalResponse = await request(app)
      .post(`/api/v1/ems/arrive/${emsUnitId}`)
      .set('Authorization', TEST_AUTH_HEADER)
      .send({ real_name: 'Integration Patient', real_age: '58' })
      .expect(200);
    expect(arrivalResponse.body.patient.current_state).toBe('ARRIVAL');

    const boardingResponse = await request(app)
      .post('/api/v1/boarding/track-decision')
      .set('Authorization', TEST_AUTH_HEADER)
      .send({ patientId, clinicianId: 'clinician-integration' })
      .expect(200);
    expect(boardingResponse.body.success).toBe(true);

    const boardedPatient = await UnifiedPatient.findById(patientId).lean();
    expect(boardedPatient.boardingStatus).toBe('boarding');
    expect(boardedPatient.state_history.map((entry: any) => entry.state)).toEqual(
      expect.arrayContaining(['EMS_EN_ROUTE', 'EMS_ON_SCENE', 'ARRIVAL']),
    );

    const protocolResponse = await request(app)
      .get('/api/v1/protocol/evaluate')
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

    const deteriorationResponse = await request(app)
      .post('/api/v1/deterioration/predict')
      .set('Authorization', TEST_AUTH_HEADER)
      .send({
        age: 58,
        triageCode: 'CTAS2',
        vitals: { hr: 132, sbp: 84, spo2: 90, rr: 28, temp: 38.8, gcs: 13 },
        riskFlags: ['sepsis', 'shock'],
      })
      .expect(200);
    expect(deteriorationResponse.body.prediction.riskBand).toBe('critical');
    expect(deteriorationResponse.body.prediction.contributingSignals).toEqual(
      expect.arrayContaining(['hypotension', 'hypoxia', 'high-risk-flag']),
    );

    const surgeResponse = await request(app)
      .post('/api/v1/surge/activate')
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

    const copilotResponse = await request(app)
      .post('/api/v1/copilot/query')
      .set('Authorization', TEST_AUTH_HEADER)
      .send({ query: 'What is the current capacity?', user_role: 'charge_nurse' })
      .expect(200);
    expect(copilotResponse.body.safety_check_passed).toBe(true);
    expect(copilotResponse.body.data.metrics.active_patients).toBeGreaterThanOrEqual(1);

    const federatedResponse = await request(app)
      .post('/api/v1/federated/round')
      .set('Authorization', TEST_AUTH_HEADER)
      .send({
        hospitalId: 'integration-ed',
        localModel: { urgency: 0.37, distress: 0.25, physiology: 0.32 },
        dataQualityScore: 0.95,
      })
      .expect(200);
    expect(federatedResponse.body).toMatchObject({
      success: true,
      round: { status: 'completed', contributor: 'integration-ed' },
    });

    await request(app)
      .post('/api/v1/deterioration/predict')
      .set('Authorization', TEST_AUTH_HEADER)
      .send({})
      .expect(400);
  });
});
