import { EmergencyPatientService, WorkflowActionLogService } from './emergency-os.services';

/**
 * Item 28 -- the hardcoded demo fixture board must never become a silent
 * production dependency. Before this fix, `rehydrateBoardFromDatabase()`
 * unconditionally wrote the in-memory fixture patients through to the
 * database the moment it found an empty `patients` table -- in ANY
 * environment, including a genuine production deployment with zero real
 * patients registered yet. From the next boot onward those fixture rows
 * would look exactly like real rehydrated data, with nothing distinguishing
 * them. This pins the fix: a genuine production environment (no
 * ALLOW_DEMO_AUTH_IN_PRODUCTION escape hatch) clears the board instead of
 * persisting fixture data as real, while every other environment (dev,
 * test, staging, and a flagged hosted demo) keeps the existing, unchanged
 * write-through behavior.
 */
describe('EmergencyPatientService production-fixture guard (item 28)', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  class FakePatientRepository {
    savedEntities: any[] = [];
    private findResult: any[] = [];

    setFindResult(rows: any[]) {
      this.findResult = rows;
    }

    async find() {
      return this.findResult;
    }

    create(partial: any) {
      return { ...partial };
    }

    save(entity: any) {
      this.savedEntities.push(entity);
      return Promise.resolve(entity);
    }
  }

  function makeService() {
    const workflowLogService = {
      record: jest.fn(() => ({ id: 'log-1' })),
    } as unknown as WorkflowActionLogService;
    const patientRepository = new FakePatientRepository();
    const service = new EmergencyPatientService(
      workflowLogService,
      undefined,
      patientRepository as any,
    );
    return { service, patientRepository };
  }

  it('a genuine production environment (no demo flag) clears the board instead of persisting fixture data as real', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CARE_ENV = 'production';
    delete process.env.ALLOW_DEMO_AUTH_IN_PRODUCTION;

    const { service, patientRepository } = makeService();
    patientRepository.setFindResult([]); // empty database

    expect(service.listPatients().length).toBeGreaterThan(0); // fixture-seeded at construction

    await service.onModuleInit();

    expect(service.listPatients()).toEqual([]);
    expect(patientRepository.savedEntities).toHaveLength(0);
    expect(service.isBoardRehydratedFromDatabase()).toBe(true);
  });

  it('a flagged hosted demo in production keeps the existing fixture write-through behavior unchanged', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CARE_ENV = 'production';
    process.env.ALLOW_DEMO_AUTH_IN_PRODUCTION = 'true';

    const { service, patientRepository } = makeService();
    patientRepository.setFindResult([]);
    const fixtureCount = service.listPatients().length;

    await service.onModuleInit();

    expect(service.listPatients().length).toBe(fixtureCount);
    expect(patientRepository.savedEntities.length).toBe(fixtureCount);
  });

  it('a normal development environment keeps the existing fixture write-through behavior unchanged', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.CARE_ENV;
    delete process.env.ALLOW_DEMO_AUTH_IN_PRODUCTION;

    const { service, patientRepository } = makeService();
    patientRepository.setFindResult([]);
    const fixtureCount = service.listPatients().length;

    await service.onModuleInit();

    expect(service.listPatients().length).toBe(fixtureCount);
    expect(patientRepository.savedEntities.length).toBe(fixtureCount);
  });

  it('a production environment with real durable patients already in the database is unaffected either way', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CARE_ENV = 'production';
    delete process.env.ALLOW_DEMO_AUTH_IN_PRODUCTION;

    const { service, patientRepository } = makeService();
    patientRepository.setFindResult([
      {
        id: 'real-patient-1',
        firstName: 'Real',
        lastName: 'Patient',
        arrivalTime: new Date().toISOString(),
        flags: [],
        vitals: [],
        notes: [],
        timeline: [],
      },
    ]);

    await service.onModuleInit();

    const patients = service.listPatients();
    expect(patients).toHaveLength(1);
    expect(patients[0].id).toBe('real-patient-1');
  });
});
