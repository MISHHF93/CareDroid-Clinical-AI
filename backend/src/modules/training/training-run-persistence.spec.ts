import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { ExpertSelectorService } from '../moe-router/expert-selector.service';
import { MoERouterService } from '../moe-router/moe-router.service';
import { TrainingService } from './training.service';
import { TrainingRunEntity } from './entities/training-run.entity';

// Regression coverage for HEAL-021: TrainingService used to keep every run
// (a structural sibling of EvaluationService, fixed in HEAL-020) in a plain
// in-memory array, so both createRun() and evaluateRun() results, along with
// their provenance, were lost on every backend restart. Verifies the fix
// actually persists and reads back real runs without disturbing the 2
// hardcoded baseline/seed runs synced fresh from disk on every boot.

describe('TrainingService run persistence', () => {
  let service: TrainingService;
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
        ExpertSelectorService,
        MoERouterService,
        TrainingService,
        { provide: getRepositoryToken(TrainingRunEntity), useValue: repository },
      ],
    }).compile();

    service = module.get<TrainingService>(TrainingService);
  });

  it('persists a createRun() call to the repository, not only an in-memory array', () => {
    const run = service.createRun({ modelName: 'test-model' });

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(savedRows[0]).toEqual(expect.objectContaining({ id: run.id }));
    const persisted = JSON.parse(String((savedRows[0] as { runJson: string }).runJson));
    expect(persisted.modelName).toBe('test-model');
  });

  it('persists an evaluateRun() call, not only createRun()', () => {
    const run = service.createRun({ modelName: 'eval-target' });
    savedRows.length = 0;
    jest.clearAllMocks();

    service.evaluateRun(run.id, { accuracy: 0.97, provenance: 'MEASURED' });

    expect(repository.save).toHaveBeenCalledTimes(1);
    const persisted = JSON.parse(String((savedRows[0] as { runJson: string }).runJson));
    expect(persisted.provenance).toBe('MEASURED');
    expect(persisted.metrics.accuracy).toBe(0.97);
  });

  it('rehydrates a persisted run from the repository on module init, surviving a restart', async () => {
    const persistedRun = {
      id: 'run-restart-1',
      modelName: 'rehydrated-model',
      datasetName: 'd',
      currentStage: 'evaluation',
      status: 'completed',
      metrics: {
        accuracy: 0.93,
        hallucinationRate: 0.03,
        precision: 0.9,
        latencyMs: 400,
        costUsd: 5,
      },
      capabilities: ['prompt_engineering'],
      createdAt: '2026-08-09T09:00:00.000Z',
      updatedAt: '2026-08-09T10:00:00.000Z',
      modelType: 'generative',
      provenance: 'MEASURED',
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
        ExpertSelectorService,
        MoERouterService,
        TrainingService,
        { provide: getRepositoryToken(TrainingRunEntity), useValue: rehydrateRepository },
      ],
    }).compile();

    const rehydratedService = module.get<TrainingService>(TrainingService);
    await rehydratedService.onModuleInit();

    const found = rehydratedService.getRuns().find((run) => run.id === 'run-restart-1');
    expect(found).toBeDefined();
    expect(found?.modelName).toBe('rehydrated-model');
    expect(found?.provenance).toBe('MEASURED');
  });

  it('never lets a persisted row override the hardcoded baseline runs synced fresh from disk', async () => {
    const collidingRepository = {
      create: jest.fn((row) => row),
      save: jest.fn((row) => Promise.resolve(row)),
      find: jest.fn(() =>
        Promise.resolve([
          {
            id: 'training-run-baseline',
            runJson: JSON.stringify({ id: 'training-run-baseline', modelName: 'stale-db-value' }),
          },
        ]),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpertSelectorService,
        MoERouterService,
        TrainingService,
        { provide: getRepositoryToken(TrainingRunEntity), useValue: collidingRepository },
      ],
    }).compile();

    const rehydratedService = module.get<TrainingService>(TrainingService);
    await rehydratedService.onModuleInit();

    const baselineRuns = rehydratedService
      .getRuns()
      .filter((run) => run.id === 'training-run-baseline');
    expect(baselineRuns).toHaveLength(1);
    expect(baselineRuns[0].modelName).toBe('caredroid-nlu-intent-classifier');
  });

  it('does not throw when no repository is available (graceful degradation, matching EvaluationService)', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExpertSelectorService, MoERouterService, TrainingService],
    }).compile();

    const bareService = module.get<TrainingService>(TrainingService);
    expect(() => bareService.createRun({ modelName: 'no-db-model' })).not.toThrow();
    await expect(bareService.onModuleInit()).resolves.not.toThrow();
  });
});
