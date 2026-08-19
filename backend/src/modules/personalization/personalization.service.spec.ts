import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { PersonalizationService } from './personalization.service';
import { SavedPrompt } from './entities/saved-prompt.entity';
import { UserAiPreference } from './entities/user-ai-preference.entity';

describe('PersonalizationService', () => {
  let service: PersonalizationService;
  let aiPreferenceRepo: {
    findOne: jest.Mock;
    findOneOrFail: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let savedPromptRepo: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    // HEAL-347.36: getOrCreatePreference() now inserts via
    // createQueryBuilder().insert()...orIgnore().execute() and reads the
    // winner back with findOneOrFail() instead of create()+save(), to
    // close a same-user race. values() captures its argument so
    // findOneOrFail() can echo it back, mirroring the same mock shape
    // already established for this pattern elsewhere (integration-hub,
    // notification-preference specs).
    let pendingInsertValues: any = null;
    const insertQueryBuilder: any = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn((values: any) => {
        pendingInsertValues = values;
        return insertQueryBuilder;
      }),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    aiPreferenceRepo = {
      findOne: jest.fn(),
      findOneOrFail: jest.fn(async () => pendingInsertValues),
      create: jest.fn((partial) => ({ ...partial })),
      save: jest.fn(async (entity) => entity),
      createQueryBuilder: jest.fn(() => insertQueryBuilder),
    };
    savedPromptRepo = {
      find: jest.fn(async () => []),
      create: jest.fn((partial) => ({ ...partial })),
      save: jest.fn(async (entity) => ({
        id: 'prompt-1',
        createdAt: new Date('2026-07-24T00:00:00.000Z'),
        updatedAt: new Date('2026-07-24T00:00:00.000Z'),
        ...entity,
      })),
      findOne: jest.fn(),
      delete: jest.fn(async () => ({ affected: 1 })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonalizationService,
        { provide: getRepositoryToken(UserAiPreference), useValue: aiPreferenceRepo },
        { provide: getRepositoryToken(SavedPrompt), useValue: savedPromptRepo },
      ],
    }).compile();

    service = module.get<PersonalizationService>(PersonalizationService);
  });

  describe('getForUser', () => {
    it('creates a default preference row (with real defaults) the first time a user is seen', async () => {
      aiPreferenceRepo.findOne.mockResolvedValue(null);

      const result = await service.getForUser('user-1');

      expect(aiPreferenceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          preferredBehavior: 'clinical_copilot',
          suggestedTools: ['calculators', 'drug-check', 'lab-interp'],
        }),
      );
      expect(aiPreferenceRepo.createQueryBuilder).toHaveBeenCalled();
      expect(result.preferredBehavior).toBe('clinical_copilot');
      expect(result.suggestedTools).toEqual(['calculators', 'drug-check', 'lab-interp']);
      expect(result.recommendedWorkflows.map((w: any) => w.id)).toEqual([
        'calculator-safety',
        'iot-rounding',
        'fleet-readiness',
      ]);
    });

    it('reuses an existing preference row rather than creating a second one', async () => {
      aiPreferenceRepo.findOne.mockResolvedValue({
        userId: 'user-1',
        preferredBehavior: 'terse',
        suggestedTools: ['calculators'],
        recommendedWorkflows: [],
        recentPrompts: [],
      });

      const result = await service.getForUser('user-1');

      expect(aiPreferenceRepo.create).not.toHaveBeenCalled();
      expect(result.preferredBehavior).toBe('terse');
      expect(result.suggestedTools).toEqual(['calculators']);
    });

    it('falls back to hardcoded defaults when an existing row has a null suggestedTools/recommendedWorkflows (not just on first create)', async () => {
      aiPreferenceRepo.findOne.mockResolvedValue({
        userId: 'user-1',
        preferredBehavior: 'clinical_copilot',
        suggestedTools: null,
        recommendedWorkflows: null,
        recentPrompts: null,
      });

      const result = await service.getForUser('user-1');

      expect(result.suggestedTools).toEqual(['calculators', 'drug-check', 'lab-interp']);
      expect(result.recommendedWorkflows).toHaveLength(3);
      expect(result.recentPrompts).toEqual([]);
    });

    it('returns saved prompts newest-first, capped at 25, each serialized without leaking userId', async () => {
      aiPreferenceRepo.findOne.mockResolvedValue({ userId: 'user-1', recentPrompts: [] });
      savedPromptRepo.find.mockResolvedValue([
        {
          id: 'p1',
          userId: 'user-1',
          title: 'Chest pain workup',
          prompt: 'Summarize',
          tags: ['cardiac'],
          workspaceId: 'ws-1',
          createdAt: new Date('2026-07-20'),
          updatedAt: new Date('2026-07-23'),
        },
      ]);

      const result = await service.getForUser('user-1');

      expect(savedPromptRepo.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { updatedAt: 'DESC' },
        take: 25,
      });
      expect(result.savedPrompts).toEqual([
        {
          id: 'p1',
          title: 'Chest pain workup',
          prompt: 'Summarize',
          tags: ['cardiac'],
          workspaceId: 'ws-1',
          createdAt: new Date('2026-07-20'),
          updatedAt: new Date('2026-07-23'),
        },
      ]);
      expect((result.savedPrompts[0] as any).userId).toBeUndefined();
    });
  });

  describe('updateForUser', () => {
    it('only overwrites fields actually present in the dto, leaving the rest untouched', async () => {
      aiPreferenceRepo.findOne.mockResolvedValue({
        userId: 'user-1',
        preferredBehavior: 'clinical_copilot',
        suggestedTools: ['calculators'],
        recommendedWorkflows: [{ id: 'x' }],
      });
      savedPromptRepo.find.mockResolvedValue([]);

      const result = await service.updateForUser('user-1', { preferredBehavior: 'terse' });

      const saved = aiPreferenceRepo.save.mock.calls[0][0];
      expect(saved.preferredBehavior).toBe('terse');
      expect(saved.suggestedTools).toEqual(['calculators']);
      expect(result.preferredBehavior).toBe('terse');
    });

    it('deduplicates suggestedTools rather than storing verbatim duplicates', async () => {
      aiPreferenceRepo.findOne.mockResolvedValue({ userId: 'user-1' });
      savedPromptRepo.find.mockResolvedValue([]);

      await service.updateForUser('user-1', {
        suggestedTools: ['calculators', 'drug-check', 'calculators'],
      });

      const saved = aiPreferenceRepo.save.mock.calls[0][0];
      expect(saved.suggestedTools).toEqual(['calculators', 'drug-check']);
    });
  });

  describe('recommendationsForUser', () => {
    it('passes through every recommendation when no allow-list is given (empty = unrestricted)', async () => {
      aiPreferenceRepo.findOne.mockResolvedValue({
        userId: 'user-1',
        suggestedTools: ['calculators', 'drug-check'],
        recommendedWorkflows: [{ id: 'w1', toolId: 'medical-iot' }],
      });
      savedPromptRepo.find.mockResolvedValue([]);

      const result = await service.recommendationsForUser('user-1');

      expect(result.suggestedTools).toEqual(['calculators', 'drug-check']);
      expect(result.recommendedWorkflows).toHaveLength(1);
    });

    it('filters suggestedTools and toolId-scoped workflows down to only what the caller says is allowed', async () => {
      aiPreferenceRepo.findOne.mockResolvedValue({
        userId: 'user-1',
        suggestedTools: ['calculators', 'drug-check'],
        recommendedWorkflows: [
          { id: 'w1', toolId: 'medical-iot' },
          { id: 'w2', toolId: 'calculators' },
        ],
      });
      savedPromptRepo.find.mockResolvedValue([]);

      const result = await service.recommendationsForUser('user-1', ['calculators']);

      expect(result.suggestedTools).toEqual(['calculators']);
      expect(result.recommendedWorkflows.map((w: any) => w.id)).toEqual(['w2']);
    });

    it('always keeps a workflow recommendation that has no toolId, regardless of the allow-list', async () => {
      aiPreferenceRepo.findOne.mockResolvedValue({
        userId: 'user-1',
        suggestedTools: [],
        recommendedWorkflows: [{ id: 'general', title: 'General tip' }],
      });
      savedPromptRepo.find.mockResolvedValue([]);

      const result = await service.recommendationsForUser('user-1', ['some-unrelated-tool']);

      expect(result.recommendedWorkflows.map((w: any) => w.id)).toEqual(['general']);
    });
  });

  describe('savePrompt', () => {
    it('trims the title and defaults tags to an empty array', async () => {
      const result = await service.savePrompt('user-1', {
        title: '  Sepsis bundle check  ',
        prompt: 'Walk through the sepsis bundle',
      } as any);

      expect(savedPromptRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', title: 'Sepsis bundle check', tags: [] }),
      );
      expect(result.title).toBe('Sepsis bundle check');
      expect(result.tags).toEqual([]);
    });

    it('omits workspaceId entirely rather than storing an empty string when none is given', async () => {
      await service.savePrompt('user-1', { title: 'x', prompt: 'y' } as any);

      const created = savedPromptRepo.create.mock.calls[0][0];
      expect(created.workspaceId).toBeUndefined();
    });
  });

  describe('deletePrompt', () => {
    it('throws NotFoundException when the prompt does not exist for this user', async () => {
      savedPromptRepo.findOne.mockResolvedValue(null);

      await expect(service.deletePrompt('user-1', 'missing')).rejects.toThrow(NotFoundException);
      expect(savedPromptRepo.delete).not.toHaveBeenCalled();
    });

    it('scopes the lookup and the delete to this user — cannot delete another user’s prompt by id alone', async () => {
      savedPromptRepo.findOne.mockResolvedValue({ id: 'p1', userId: 'user-1' });

      const result = await service.deletePrompt('user-1', 'p1');

      expect(savedPromptRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'p1', userId: 'user-1' },
      });
      expect(savedPromptRepo.delete).toHaveBeenCalledWith({ id: 'p1', userId: 'user-1' });
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('recordRecentPrompt', () => {
    it('normalizes whitespace and truncates the preview to 160 characters', async () => {
      aiPreferenceRepo.findOne.mockResolvedValue({ userId: 'user-1', recentPrompts: [] });
      const longPrompt = 'a'.repeat(200);

      const recorded = await service.recordRecentPrompt(
        'user-1',
        `multi   space\n\ttext  ${longPrompt}`,
      );

      expect(recorded.promptPreview.length).toBe(160);
      expect(recorded.promptPreview.startsWith('multi space text')).toBe(true);
      expect(recorded.promptPreview.includes('  ')).toBe(false);
    });

    it('prepends the newest prompt and caps the recent list at 10 entries', async () => {
      const existing = Array.from({ length: 10 }, (_, i) => ({ id: `old-${i}` }));
      aiPreferenceRepo.findOne.mockResolvedValue({ userId: 'user-1', recentPrompts: existing });

      await service.recordRecentPrompt('user-1', 'newest one');

      const saved = aiPreferenceRepo.save.mock.calls[0][0];
      expect(saved.recentPrompts).toHaveLength(10);
      expect(saved.recentPrompts[0].promptPreview).toBe('newest one');
      expect(saved.recentPrompts[9].id).toBe('old-8');
      expect(saved.recentPrompts.some((p: any) => p.id === 'old-9')).toBe(false);
    });

    it('carries the optional toolId/workspaceId through unchanged', async () => {
      aiPreferenceRepo.findOne.mockResolvedValue({ userId: 'user-1', recentPrompts: [] });

      const recorded = await service.recordRecentPrompt('user-1', 'text', 'calculators', 'ws-9');

      expect(recorded.toolId).toBe('calculators');
      expect(recorded.workspaceId).toBe('ws-9');
    });
  });
});
