import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationService } from './evaluation.service';
import { EvaluationRunEntity } from './entities/evaluation-run.entity';

// Regression coverage for HEAL-020: EvaluationService used to keep every run
// (including real runs recorded from live ED Copilot conversations via
// ChatService.recordEvaluationRun()) in a plain in-memory array, so both the
// run and its carefully-tracked provenance (MEASURED/SEED_ONLY/UNKNOWN/etc.)
// were lost on every backend restart. Verifies the fix actually persists and
// reads back real runs.

describe('EvaluationService run persistence', () => {
  let service: EvaluationService;
  const savedRows: Record<string, unknown>[] = [];

  const repository = {
    create: jest.fn((row) => row),
    save: jest.fn((row) => {
      savedRows.push(row);
      return Promise.resolve(row);
    }),
    find: jest.fn(() => Promise.resolve([])),
  };

  beforeEach(async () => {
    savedRows.length = 0;
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationService,
        { provide: getRepositoryToken(EvaluationRunEntity), useValue: repository },
      ],
    }).compile();

    service = module.get<EvaluationService>(EvaluationService);
  });

  it('persists a createRun() call to the repository, not only an in-memory array', () => {
    const run = service.createRun({ modelName: 'test-model', provenance: 'MEASURED' });

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(savedRows[0]).toEqual(expect.objectContaining({ id: run.id }));
    const persisted = JSON.parse(String((savedRows[0] as { runJson: string }).runJson));
    expect(persisted.modelName).toBe('test-model');
    expect(persisted.provenance).toBe('MEASURED');
  });

  it('rehydrates a persisted run from the repository on module init, surviving a restart', async () => {
    const persistedRun = {
      id: 'run-restart-1',
      modelName: 'rehydrated-model',
      promptName: 'p',
      agentName: 'a',
      ragStrategy: 'r',
      datasetName: 'd',
      status: 'completed',
      sampleCount: 10,
      metrics: {
        modelQuality: 0.9,
        hallucinationRate: 0.02,
        accuracy: 0.95,
        latencyMs: 500,
        retrievalPrecision: 0.9,
        toolExecutionSuccess: 0.99,
        workflowSuccess: 0.95,
        userSatisfaction: 4.5,
        costUsd: 10,
      },
      evaluatedAt: '2026-08-09T10:00:00.000Z',
      provenance: 'MEASURED',
      seedOnly: false,
    };

    const rehydrateRepository = {
      create: jest.fn((row) => row),
      save: jest.fn((row) => Promise.resolve(row)),
      find: jest.fn(() =>
        Promise.resolve([{ id: 'run-restart-1', runJson: JSON.stringify(persistedRun) }]),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationService,
        { provide: getRepositoryToken(EvaluationRunEntity), useValue: rehydrateRepository },
      ],
    }).compile();

    const rehydratedService = module.get<EvaluationService>(EvaluationService);
    await rehydratedService.onModuleInit();

    const dashboard = rehydratedService.getDashboard();
    const found = dashboard.runs.find((run) => run.id === 'run-restart-1');
    expect(found).toBeDefined();
    expect(found?.modelName).toBe('rehydrated-model');
    expect(found?.provenance).toBe('MEASURED');
  });

  it('does not duplicate a run already present from bootstrapRuns() (e.g. the offline-harness fixture)', async () => {
    // bootstrapRuns() runs synchronously in the field initializer before onModuleInit --
    // simulate a persisted row whose id collides with a seed/bootstrap run and confirm
    // rehydration skips it rather than adding a duplicate entry.
    const bareService = new EvaluationService();
    const existingIds = bareService.getDashboard().runs.map((run) => run.id);
    expect(existingIds.length).toBeGreaterThan(0);
    const collidingId = existingIds[0];

    const collidingRepository = {
      create: jest.fn((row) => row),
      save: jest.fn((row) => Promise.resolve(row)),
      find: jest.fn(() =>
        Promise.resolve([
          {
            id: collidingId,
            runJson: JSON.stringify({ id: collidingId, modelName: 'should-not-duplicate' }),
          },
        ]),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationService,
        { provide: getRepositoryToken(EvaluationRunEntity), useValue: collidingRepository },
      ],
    }).compile();

    const rehydratedService = module.get<EvaluationService>(EvaluationService);
    await rehydratedService.onModuleInit();

    const matches = rehydratedService.getDashboard().runs.filter((run) => run.id === collidingId);
    expect(matches).toHaveLength(1);
  });

  it('does not throw when no repository is available (graceful degradation, matching ReferralService/EmergencySettingsService)', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EvaluationService],
    }).compile();

    const bareService = module.get<EvaluationService>(EvaluationService);
    expect(() => bareService.createRun({ modelName: 'no-db-model' })).not.toThrow();
    await expect(bareService.onModuleInit()).resolves.not.toThrow();
  });

  it('warns but does not throw when a persisted run row has malformed JSON', async () => {
    const malformedRepository = {
      create: jest.fn((row) => row),
      save: jest.fn((row) => Promise.resolve(row)),
      find: jest.fn(() => Promise.resolve([{ id: 'bad-row', runJson: '{not valid json' }])),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationService,
        { provide: getRepositoryToken(EvaluationRunEntity), useValue: malformedRepository },
      ],
    }).compile();

    const rehydratedService = module.get<EvaluationService>(EvaluationService);
    await expect(rehydratedService.onModuleInit()).resolves.not.toThrow();
  });
});
