import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SurgeCapacityService, type SurgeEvent } from './surge-capacity.service';
import { UnifiedPatient } from '../models/unified-patient.model';

jest.setTimeout(120_000);

/**
 * Cycle 245 (Cycle C of the "Mission Intelligence Engine v1" plan): real
 * MongoDB-backed test coverage for SurgeCapacityService, which had none
 * before this cycle. No MongoDB is provisioned anywhere in this repo's
 * docker-compose/env files (confirmed during planning), so this uses
 * mongodb-memory-server -- a real, ephemeral MongoDB binary spun up
 * in-process for the test run, not a mock of Mongoose's API. This proves
 * the service's actual query/update logic against genuine MongoDB
 * behavior (collection inserts, $set updates, sort-by-date queries), not
 * just that it calls the driver with plausible-looking arguments.
 *
 * BLOCKED LOCALLY, same class of restriction as this program's documented
 * esbuild/Vitest blocker (SCORECARD.md item #3, re-verified Cycle 166):
 * this sandbox's Application Control policy blocks execution of the
 * downloaded mongod binary outright -- confirmed three independent ways,
 * not assumed: (1) mongodb-memory-server itself fails with `spawn UNKNOWN`
 * after successfully downloading the binary to
 * ~/.cache/mongodb-binaries/mongod-x64-win32-8.2.6.exe; (2) a bare
 * `child_process.spawn()` of that exact binary, entirely outside
 * mongodb-memory-server's code, fails identically (errno -4094, code
 * UNKNOWN); (3) invoking it directly from PowerShell surfaces the policy's
 * own explicit message: "An Application Control policy has blocked this
 * file." Docker (a possible alternate path to a real MongoDB) is not
 * installed in this sandbox either. This file is therefore written and
 * type-checked but NOT executed/verified here -- run via `npm run
 * test:mongo` (test/jest-mongo.json, deliberately excluded from the main
 * `npm test` glob via the `.mongo-spec.ts` suffix so this sandbox's
 * inability to run it doesn't break every other cycle's "full suite green"
 * verification) in a real CI/dev environment without this restriction.
 */
describe('SurgeCapacityService (real MongoDB via mongodb-memory-server)', () => {
  let mongod: MongoMemoryServer;
  let service: SurgeCapacityService;

  const resourceStatus = {
    traumaBedsAvailable: 6,
    traumaBedsTotal: 10,
    surgeonsAvailable: 4,
    surgeonsTotal: 5,
    anaesthetistsAvailable: 2,
    anaesthetistsTotal: 3,
    bloodUnitsAvailable: 18,
    bloodUnitsTotal: 20,
    ventilatorsAvailable: 5,
    ventilatorsTotal: 6,
  };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    service = new SurgeCapacityService();
    const db = mongoose.connection.db;
    if (db) {
      await db.collection('surge_events').deleteMany({});
      await db.collection('protocol_audit').deleteMany({});
    }
    await UnifiedPatient.deleteMany({});
  });

  describe('activateSurgeMode', () => {
    it('inserts a real surge_events document and a protocol_audit entry', async () => {
      const event = await service.activateSurgeMode({
        type: 'mci',
        estimatedPatientCount: 15,
        actualPatientCount: 0,
        resourceStatus,
      });

      expect(event.id).toMatch(/^surge_/);
      expect(event.status).toBe('activated');
      expect(event.actualPatientCount).toBe(0);

      const stored = await mongoose.connection
        .db!.collection('surge_events')
        .findOne({ id: event.id });
      expect(stored).not.toBeNull();
      expect(stored!.type).toBe('mci');
      expect(stored!.status).toBe('activated');

      const auditEntries = await mongoose.connection
        .db!.collection('protocol_audit')
        .find({ surgeEventId: event.id })
        .toArray();
      // reallocateResources() (surge_resource_reallocation_recommended) +
      // createSurgeAuditTrail() (surge_activated), both real inserts.
      expect(auditEntries.map((entry) => entry.eventType).sort()).toEqual([
        'surge_activated',
        'surge_resource_reallocation_recommended',
      ]);
    });
  });

  describe('batchEMSIntake', () => {
    it('throws when there is no active surge event', async () => {
      await expect(
        service.batchEMSIntake(
          [
            {
              temporaryId: 't1',
              chiefComplaint: 'Blunt trauma',
              triageColor: 'RED',
              etaMinutes: 8,
              mechanismOfInjury: 'MVC',
            },
          ],
          'surge-does-not-exist',
        ),
      ).rejects.toThrow('No active surge event');
    });

    it('creates real UnifiedPatient documents tagged with the MCI batch and updates the surge event count', async () => {
      const event = await service.activateSurgeMode({
        type: 'mci',
        estimatedPatientCount: 10,
        actualPatientCount: 0,
        resourceStatus,
      });

      const created = await service.batchEMSIntake(
        [
          {
            temporaryId: 't1',
            age: '34',
            sex: 'M',
            chiefComplaint: 'Blunt chest trauma',
            triageColor: 'RED',
            etaMinutes: 6,
            mechanismOfInjury: 'MVC',
            vitalSigns: { heartRate: 128, bloodPressure: '90/60', oxygenSaturation: 91 },
          },
          {
            temporaryId: 't2',
            chiefComplaint: 'Laceration',
            triageColor: 'GREEN',
            etaMinutes: 20,
            mechanismOfInjury: 'Fall',
          },
        ],
        event.id,
      );

      expect(created).toHaveLength(2);
      expect(created[0].patientId).toBeDefined();

      const patients = await UnifiedPatient.find({ mciBatchId: event.id }).lean();
      expect(patients).toHaveLength(2);
      const redPatient = patients.find((p) => p.triageColor === 'RED');
      expect(redPatient).toBeDefined();
      expect(redPatient!.ems_status).toBe('en_route');
      expect(redPatient!.current_state).toBe('EMS_EN_ROUTE');
      expect(redPatient!.mciPatientNumber).toBe(1);

      const updatedEvent = (await mongoose.connection
        .db!.collection('surge_events')
        .findOne({ id: event.id })) as unknown as SurgeEvent;
      expect(updatedEvent.actualPatientCount).toBe(2);
    });

    it('HEAL-347.49: stamps the caller-resolved organizationId onto every created patient, and omits it (leaving it null) when no tenant context is given', async () => {
      const event = await service.activateSurgeMode({
        type: 'mci',
        estimatedPatientCount: 5,
        actualPatientCount: 0,
        resourceStatus,
      });

      const [scoped] = await service.batchEMSIntake(
        [
          {
            temporaryId: 't-scoped',
            chiefComplaint: 'Blunt trauma',
            triageColor: 'RED',
            etaMinutes: 5,
            mechanismOfInjury: 'MVC',
          },
        ],
        event.id,
        'org-a',
      );
      const [unscoped] = await service.batchEMSIntake(
        [
          {
            temporaryId: 't-unscoped',
            chiefComplaint: 'Laceration',
            triageColor: 'GREEN',
            etaMinutes: 15,
            mechanismOfInjury: 'Fall',
          },
        ],
        event.id,
      );

      const scopedPatient = await UnifiedPatient.findById(scoped.patientId).lean();
      const unscopedPatient = await UnifiedPatient.findById(unscoped.patientId).lean();
      expect(scopedPatient!.organizationId).toBe('org-a');
      expect(unscopedPatient!.organizationId ?? null).toBeNull();
    });

    it('HEAL-232: two concurrent batches for the same surge event never assign duplicate mciPatientNumber values, and the final count reflects both batches', async () => {
      // Real MongoDB, real concurrency: fire both batchEMSIntake calls
      // without awaiting either first, so their internal read/increment/
      // write steps genuinely interleave. Before HEAL-232, both batches
      // read the same starting actualPatientCount (computed in JS memory)
      // and both ended with a full-document $set -- duplicate patient
      // numbers across the two batches, and whichever $set landed last
      // silently discarded the other batch's count increment.
      const event = await service.activateSurgeMode({
        type: 'mci',
        estimatedPatientCount: 20,
        actualPatientCount: 0,
        resourceStatus,
      });

      const buildBatch = (prefix: string, count: number) =>
        Array.from({ length: count }, (_, i) => ({
          temporaryId: `${prefix}${i}`,
          chiefComplaint: 'MCI triage',
          triageColor: 'YELLOW' as const,
          etaMinutes: 10,
          mechanismOfInjury: 'Structural collapse',
        }));

      const [batchA, batchB] = await Promise.all([
        service.batchEMSIntake(buildBatch('a', 4), event.id),
        service.batchEMSIntake(buildBatch('b', 3), event.id),
      ]);

      expect(batchA).toHaveLength(4);
      expect(batchB).toHaveLength(3);

      const allPatients = await UnifiedPatient.find({ mciBatchId: event.id }).lean();
      expect(allPatients).toHaveLength(7);

      const patientNumbers = allPatients
        .map((p) => p.mciPatientNumber ?? -1)
        .sort((a, b) => a - b);
      const uniqueNumbers = new Set(patientNumbers);
      expect(uniqueNumbers.size).toBe(7);
      expect(patientNumbers).toEqual([1, 2, 3, 4, 5, 6, 7]);

      const updatedEvent = (await mongoose.connection
        .db!.collection('surge_events')
        .findOne({ id: event.id })) as unknown as SurgeEvent;
      expect(updatedEvent.actualPatientCount).toBe(7);
    });
  });

  describe('assessResourceBottlenecks', () => {
    it('returns empty result when there is no active surge event', async () => {
      const result = await service.assessResourceBottlenecks();
      expect(result).toEqual({
        criticalResources: [],
        estimatedTimeToDepletion: {},
        recommendations: [],
      });
    });

    it('flags surgeons as a bottleneck above 80% utilization and recommends recall', async () => {
      await service.activateSurgeMode({
        type: 'mci',
        estimatedPatientCount: 20,
        actualPatientCount: 12,
        resourceStatus: {
          ...resourceStatus,
          surgeonsAvailable: 1,
          surgeonsTotal: 6, // utilization = 1 - 1/6 = 0.833, clearly above the ">0.8" threshold
        },
      });

      const result = await service.assessResourceBottlenecks();
      expect(result.criticalResources).toContain('surgeons');
      expect(result.recommendations.some((r) => r.includes('surgeon recall'))).toBe(true);
      expect(result.estimatedTimeToDepletion.surgeons).toBeGreaterThanOrEqual(0);
    });

    it('does not flag resources below their utilization thresholds', async () => {
      await service.activateSurgeMode({
        type: 'local_surge',
        estimatedPatientCount: 5,
        actualPatientCount: 0,
        resourceStatus, // all well within thresholds
      });

      const result = await service.assessResourceBottlenecks();
      expect(result.criticalResources).toEqual([]);
    });
  });

  describe('deactivateSurgeMode', () => {
    it('returns null for an unknown surge event', async () => {
      const result = await service.deactivateSurgeMode('does-not-exist', 'n/a');
      expect(result).toBeNull();
    });

    it('transitions status to deactivated, appends a debrief log entry, and writes a post-event report', async () => {
      const event = await service.activateSurgeMode({
        type: 'disaster',
        estimatedPatientCount: 8,
        actualPatientCount: 0,
        resourceStatus,
      });

      const result = await service.deactivateSurgeMode(event.id, 'All patients accounted for.');

      expect(result).not.toBeNull();
      expect(result!.status).toBe('deactivated');
      expect(result!.deactivationTime).toBeDefined();
      expect(
        result!.communicationLog.some((entry) =>
          entry.message.includes('All patients accounted for.'),
        ),
      ).toBe(true);

      const stored = await mongoose.connection
        .db!.collection('surge_events')
        .findOne({ id: event.id });
      expect(stored!.status).toBe('deactivated');

      const report = await mongoose.connection
        .db!.collection('protocol_audit')
        .findOne({ surgeEventId: event.id, eventType: 'surge_deactivated' });
      expect(report).not.toBeNull();
    });
  });

  describe('getCurrentSurgeStatus', () => {
    it('reports inactive when nothing has ever been activated', async () => {
      const status = await service.getCurrentSurgeStatus();
      expect(status).toEqual({ active: false });
    });

    it('reports the active event with its bottleneck assessment after activation', async () => {
      const event = await service.activateSurgeMode({
        type: 'mci',
        estimatedPatientCount: 6,
        actualPatientCount: 0,
        resourceStatus,
      });

      const status = await service.getCurrentSurgeStatus();
      expect(status.active).toBe(true);
      expect(status.surgeEvent?.id).toBe(event.id);
      expect(status.bottlenecks).toBeDefined();
    });

    it('falls back to the latest DB-persisted active event on a fresh service instance (no in-memory cache)', async () => {
      const event = await service.activateSurgeMode({
        type: 'mci',
        estimatedPatientCount: 6,
        actualPatientCount: 0,
        resourceStatus,
      });

      // A brand-new instance (e.g. a new request in a real deployment) has
      // no in-memory `activeSurgeEvent` -- getCurrentSurgeStatus() must
      // fall back to querying Mongo directly, not just an in-memory cache.
      const freshInstanceService = new SurgeCapacityService();
      const status = await freshInstanceService.getCurrentSurgeStatus();
      expect(status.active).toBe(true);
      expect(status.surgeEvent?.id).toBe(event.id);
    });
  });
});
