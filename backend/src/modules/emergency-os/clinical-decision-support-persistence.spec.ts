import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { ClinicalDecisionSupportService } from './clinical-decision-support.service';
import { ClinicalCalculatorResultEntity } from './entities/clinical-calculator-result.entity';
import { CopilotInteractionEntity } from './entities/copilot-interaction.entity';

// Regression coverage for HEAL-023: ClinicalDecisionSupportService used to
// keep every calculator result and Copilot interaction -- including real
// interactions recorded from every live ED Copilot query via
// EmergencyOsController.queryCopilot() -- in a plain in-memory array, so
// this clinical decision-support audit trail (safetyCheckPassed,
// requiresHumanReview, reviewedByUserId) was lost on every backend restart.

describe('ClinicalDecisionSupportService persistence', () => {
  const savedCalculatorRows: Record<string, unknown>[] = [];
  const savedCopilotRows: Record<string, unknown>[] = [];

  const calculatorRepository = {
    create: jest.fn((row) => row),
    save: jest.fn((row) => {
      savedCalculatorRows.push(row);
      return Promise.resolve(row);
    }),
    find: jest.fn(() => Promise.resolve([])),
  };

  const copilotRepository = {
    create: jest.fn((row) => row),
    save: jest.fn((row) => {
      savedCopilotRows.push(row);
      return Promise.resolve(row);
    }),
    find: jest.fn(() => Promise.resolve([])),
  };

  let service: ClinicalDecisionSupportService;

  beforeEach(async () => {
    savedCalculatorRows.length = 0;
    savedCopilotRows.length = 0;
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicalDecisionSupportService,
        {
          provide: getRepositoryToken(ClinicalCalculatorResultEntity),
          useValue: calculatorRepository,
        },
        { provide: getRepositoryToken(CopilotInteractionEntity), useValue: copilotRepository },
      ],
    }).compile();

    service = module.get<ClinicalDecisionSupportService>(ClinicalDecisionSupportService);
  });

  it('persists a recordCalculatorResult() call to the repository, not only an in-memory array', () => {
    const result = service.recordCalculatorResult({
      calculatorId: 'heart',
      patientId: 'p1',
      inputs: { history: 2, ecg: 1 },
      score: 5,
      riskCategory: 'moderate',
      interpretation: 'Moderate risk',
      disclaimer: 'Advisory only',
      referenceLine: 'HEART score',
    });

    expect(calculatorRepository.create).toHaveBeenCalledTimes(1);
    expect(calculatorRepository.save).toHaveBeenCalledTimes(1);
    expect(savedCalculatorRows[0]).toEqual(
      expect.objectContaining({ id: (result.data as { id: string }).id, patientId: 'p1' }),
    );
  });

  it('persists a recordCopilotInteraction() call, including safety fields', () => {
    const result = service.recordCopilotInteraction({
      question: 'What is the reassessment interval for a P2 patient?',
      patientId: 'p2',
      draftGuidance: 'Reassess within 30 minutes.',
      safetyCheckPassed: true,
    });

    expect(copilotRepository.save).toHaveBeenCalledTimes(1);
    const persisted = JSON.parse(
      String((savedCopilotRows[0] as { recordJson: string }).recordJson),
    );
    expect(persisted.safetyCheckPassed).toBe(true);
    expect(persisted.requiresHumanReview).toBe(true);
    expect(persisted.id).toBe((result.data as { id: string }).id);
  });

  it('rehydrates persisted calculator results and Copilot interactions on module init, surviving a restart', async () => {
    const persistedCalculatorResult = {
      id: 'calc-restart-1',
      calculatorId: 'qsofa',
      patientId: 'p3',
      inputs: {},
      score: 2,
      riskCategory: 'high',
      interpretation: 'High risk',
      disclaimer: 'Advisory only',
      referenceLine: 'qSOFA',
      computedAt: '2026-08-09T09:00:00.000Z',
    };
    const persistedCopilotInteraction = {
      id: 'copilot-restart-1',
      patientId: 'p3',
      question: 'Prior question',
      draftGuidance: 'Prior guidance',
      requiresHumanReview: true,
      safetyDisclaimer: 'Decision support only.',
      safetyCheckPassed: true,
      createdAt: '2026-08-09T09:00:00.000Z',
      reviewedAt: null,
      reviewedByUserId: null,
    };

    const rehydrateCalculatorRepository = {
      create: jest.fn((row) => row),
      save: jest.fn((row) => Promise.resolve(row)),
      find: jest.fn(() =>
        Promise.resolve([
          { id: 'calc-restart-1', recordJson: JSON.stringify(persistedCalculatorResult) },
        ]),
      ),
    };
    const rehydrateCopilotRepository = {
      create: jest.fn((row) => row),
      save: jest.fn((row) => Promise.resolve(row)),
      find: jest.fn(() =>
        Promise.resolve([
          { id: 'copilot-restart-1', recordJson: JSON.stringify(persistedCopilotInteraction) },
        ]),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicalDecisionSupportService,
        {
          provide: getRepositoryToken(ClinicalCalculatorResultEntity),
          useValue: rehydrateCalculatorRepository,
        },
        {
          provide: getRepositoryToken(CopilotInteractionEntity),
          useValue: rehydrateCopilotRepository,
        },
      ],
    }).compile();

    const rehydratedService = module.get<ClinicalDecisionSupportService>(
      ClinicalDecisionSupportService,
    );
    await rehydratedService.onModuleInit();

    const calculatorList = rehydratedService.listCalculatorResults({ patientId: 'p3' });
    expect((calculatorList.data as { count: number }).count).toBe(1);

    const copilotList = rehydratedService.listCopilotInteractions({ patientId: 'p3' });
    expect((copilotList.data as { count: number }).count).toBe(1);
  });

  it('does not throw when no repository is available (graceful degradation, matching EmergencySettingsService/EvaluationService)', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClinicalDecisionSupportService],
    }).compile();

    const bareService = module.get<ClinicalDecisionSupportService>(ClinicalDecisionSupportService);
    expect(() =>
      bareService.recordCalculatorResult({
        calculatorId: 'news2',
        inputs: {},
        score: 3,
        riskCategory: 'low',
        interpretation: 'Low risk',
        disclaimer: 'Advisory only',
        referenceLine: 'NEWS2',
      }),
    ).not.toThrow();
    expect(() =>
      bareService.recordCopilotInteraction({
        question: 'test',
        draftGuidance: 'test guidance',
      }),
    ).not.toThrow();
    await expect(bareService.onModuleInit()).resolves.not.toThrow();
  });
});
