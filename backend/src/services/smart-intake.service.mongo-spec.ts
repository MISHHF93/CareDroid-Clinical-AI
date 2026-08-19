import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SmartIntakeService } from './smart-intake.service';
import { mpiService } from './mpi.service';
import { UnifiedPatient } from '../models/unified-patient.model';

jest.setTimeout(120_000);

/**
 * HEAL-347.49: real MongoDB-backed coverage proving the tenant-scoping fix
 * for the Mongoose Patient model's identity-matching/creation surface
 * (SmartIntakeService + MPIService). Same mongodb-memory-server harness and
 * same sandbox blocker as surge-capacity.service.mongo-spec.ts (see that
 * file's header for the full explanation) -- written and type-checked here,
 * not executed in this environment. Run via `npm run test:mongo`.
 */
describe('SmartIntakeService / MPIService organization scoping (real MongoDB)', () => {
  let mongod: MongoMemoryServer;
  let service: SmartIntakeService;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    service = new SmartIntakeService();
    await UnifiedPatient.deleteMany({});
  });

  async function verifiedSession(organizationId?: string) {
    const session = await service.createSession('nurse-1');
    session.verifiedSnapshot = { firstName: 'Jane', lastName: 'Doe', chiefComplaint: 'Fever' };
    await session.save();
    return { session, organizationId };
  }

  describe('MPIService.findCandidates', () => {
    it('only returns candidates from the caller org or legacy (no-org) records, never a different org', async () => {
      const orgA = await UnifiedPatient.create({
        organizationId: 'org-a',
        name: 'Jane Doe',
        chief_complaint: 'Fever',
      });
      const orgB = await UnifiedPatient.create({
        organizationId: 'org-b',
        name: 'Jane Doe',
        chief_complaint: 'Fever',
      });
      const legacy = await UnifiedPatient.create({
        name: 'Jane Doe',
        chief_complaint: 'Fever',
      });

      const candidates = await mpiService.findCandidates(
        { firstName: 'Jane', lastName: 'Doe' },
        'org-a',
      );
      const ids = candidates.map((c) => c.patientId);

      expect(ids).toContain(String(orgA._id));
      expect(ids).toContain(String(legacy._id));
      expect(ids).not.toContain(String(orgB._id));
    });

    it('is unfiltered (preserves prior behavior) when no organizationId is given', async () => {
      const orgA = await UnifiedPatient.create({
        organizationId: 'org-a',
        name: 'Jane Doe',
        chief_complaint: 'Fever',
      });
      const orgB = await UnifiedPatient.create({
        organizationId: 'org-b',
        name: 'Jane Doe',
        chief_complaint: 'Fever',
      });

      const candidates = await mpiService.findCandidates({ firstName: 'Jane', lastName: 'Doe' });
      const ids = candidates.map((c) => c.patientId);

      expect(ids).toContain(String(orgA._id));
      expect(ids).toContain(String(orgB._id));
    });
  });

  describe('SmartIntakeService.createPatient', () => {
    it('stamps the caller-resolved organizationId onto the created patient', async () => {
      const { session, organizationId } = await verifiedSession('org-a');
      const output = await service.createPatient(String(session._id), 'nurse-1', organizationId);

      const created = await UnifiedPatient.findOne({ name: 'Jane Doe' }).lean();
      expect(created!.organizationId).toBe('org-a');
      expect(output.finalAction).toBe('create_new_patient');
    });

    it('leaves organizationId null when no tenant context is given', async () => {
      const { session } = await verifiedSession();
      await service.createPatient(String(session._id), 'nurse-1');

      const created = await UnifiedPatient.findOne({ name: 'Jane Doe' }).lean();
      expect(created!.organizationId ?? null).toBeNull();
    });
  });

  describe('SmartIntakeService.reconcileUnknown', () => {
    it('rejects reconciling a patient that belongs to a different organization, with the same not-found error shape as a missing id', async () => {
      const unknownPatient = await UnifiedPatient.create({
        organizationId: 'org-a',
        name: 'Unknown Patient',
        chief_complaint: 'Unknown complaint',
      });
      const session = await service.createSession('nurse-1');
      session.linkedPatientId = String(unknownPatient._id);
      await session.save();

      await expect(
        service.reconcileUnknown(String(session._id), 'real-patient-id', 'nurse-1', 'org-b'),
      ).rejects.toThrow('Unknown patient record not found for reconciliation');
    });

    it('allows reconciling a patient in the caller own org', async () => {
      const unknownPatient = await UnifiedPatient.create({
        organizationId: 'org-a',
        name: 'Unknown Patient',
        chief_complaint: 'Unknown complaint',
      });
      const session = await service.createSession('nurse-1');
      session.linkedPatientId = String(unknownPatient._id);
      await session.save();

      const output = await service.reconcileUnknown(
        String(session._id),
        'real-patient-id',
        'nurse-1',
        'org-a',
      );

      expect(output.finalAction).toBeNull();
      const reconciled = await UnifiedPatient.findById(unknownPatient._id).lean();
      expect(reconciled!.identity_reconciled).toBe(true);
    });
  });
});
