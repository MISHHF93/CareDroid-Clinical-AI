import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClinicalMemoryService } from './clinical-memory.service';
import { ClinicalMemoryEntry, ClinicalMemoryType } from './entities/clinical-memory-entry.entity';
import { LongMemoryEntry, LongMemoryType } from './entities/long-memory-entry.entity';
import { ShortMemoryEntry, ShortMemoryType } from './entities/short-memory-entry.entity';
import { LongMemoryService } from './long-memory.service';
import { ShortMemoryService } from './short-memory.service';

const NOW = new Date('2026-05-25T12:00:00.000Z');

function createRepositoryMock(idPrefix: string) {
  let nextId = 1;
  return {
    find: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn((value) =>
      Promise.resolve({
        id: `${idPrefix}-${nextId++}`,
        createdAt: NOW,
        updatedAt: NOW,
        ...value,
      }),
    ),
  };
}

describe('Memory services', () => {
  let shortMemoryService: ShortMemoryService;
  let longMemoryService: LongMemoryService;
  let clinicalMemoryService: ClinicalMemoryService;
  let shortRepository: ReturnType<typeof createRepositoryMock>;
  let longRepository: ReturnType<typeof createRepositoryMock>;
  let clinicalRepository: ReturnType<typeof createRepositoryMock>;

  beforeEach(async () => {
    shortRepository = createRepositoryMock('short');
    longRepository = createRepositoryMock('long');
    clinicalRepository = createRepositoryMock('clinical');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShortMemoryService,
        LongMemoryService,
        ClinicalMemoryService,
        { provide: getRepositoryToken(ShortMemoryEntry), useValue: shortRepository },
        { provide: getRepositoryToken(LongMemoryEntry), useValue: longRepository },
        { provide: getRepositoryToken(ClinicalMemoryEntry), useValue: clinicalRepository },
      ],
    }).compile();

    shortMemoryService = module.get<ShortMemoryService>(ShortMemoryService);
    longMemoryService = module.get<LongMemoryService>(LongMemoryService);
    clinicalMemoryService = module.get<ClinicalMemoryService>(ClinicalMemoryService);
    jest.clearAllMocks();
  });

  it('persists short-term active session memory', async () => {
    const result = await shortMemoryService.remember('user-1', {
      type: ShortMemoryType.ACTIVE_CONVERSATION,
      title: '  ICU rounds handoff  ',
      content: { conversationId: 'conversation-1', messageCount: 4 },
    });

    expect(shortRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: ShortMemoryType.ACTIVE_CONVERSATION,
        title: 'ICU rounds handoff',
        content: { conversationId: 'conversation-1', messageCount: 4 },
      }),
    );
    expect(result).toMatchObject({
      type: ShortMemoryType.ACTIVE_CONVERSATION,
      title: 'ICU rounds handoff',
    });
  });

  it('returns the latest active short-term context by memory type', async () => {
    shortRepository.find.mockResolvedValue([
      {
        id: 'latest-conversation',
        type: ShortMemoryType.ACTIVE_CONVERSATION,
        title: 'Latest conversation',
        content: {},
        createdAt: NOW,
        updatedAt: new Date('2026-05-25T12:05:00.000Z'),
      },
      {
        id: 'active-calculator',
        type: ShortMemoryType.ACTIVE_CALCULATOR,
        title: 'qSOFA',
        content: { toolId: 'qsofa' },
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'older-conversation',
        type: ShortMemoryType.ACTIVE_CONVERSATION,
        title: 'Older conversation',
        content: {},
        createdAt: NOW,
        updatedAt: new Date('2026-05-25T12:01:00.000Z'),
      },
    ]);

    const context = await shortMemoryService.getActiveContext('user-1');

    expect(context.activeConversation).toMatchObject({ id: 'latest-conversation' });
    expect(context.activeCalculator).toMatchObject({ title: 'qSOFA' });
  });

  it('normalizes long-term saved workflow metadata', async () => {
    const result = await longMemoryService.remember('user-1', {
      type: LongMemoryType.SAVED_TOOLS,
      title: ' Sepsis Escalation ',
      content: { kind: 'workflow', workflowId: 'sepsis-escalation' },
      tags: ['Workflow', ' sepsis ', 'Workflow'],
    });

    expect(longRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ['workflow', 'sepsis'],
      }),
    );
    expect(result.tags).toEqual(['workflow', 'sepsis']);
  });

  it('filters saved workflows from long-term saved tools', async () => {
    longRepository.find.mockResolvedValue([
      {
        id: 'workflow-memory',
        type: LongMemoryType.SAVED_TOOLS,
        title: 'Sepsis Escalation',
        content: { kind: 'workflow' },
        tags: ['workflow'],
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'plain-tool-memory',
        type: LongMemoryType.SAVED_TOOLS,
        title: 'Drug checker',
        content: { toolId: 'drug-check' },
        tags: ['tool'],
        createdAt: NOW,
        updatedAt: NOW,
      },
    ]);

    const workflows = await longMemoryService.savedWorkflowsForUser('user-1');

    expect(workflows).toHaveLength(1);
    expect(workflows[0]).toMatchObject({ id: 'workflow-memory' });
  });

  it('groups clinical findings, summaries, and scores for AI context', async () => {
    clinicalRepository.find.mockResolvedValue([
      {
        id: 'finding-memory',
        type: ClinicalMemoryType.FINDINGS,
        title: 'Hypotension noted',
        content: { finding: 'SBP below target' },
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'score-memory',
        type: ClinicalMemoryType.SCORES,
        title: 'qSOFA score',
        content: { score: 2 },
        createdAt: NOW,
        updatedAt: NOW,
      },
    ]);

    const context = await clinicalMemoryService.getClinicalContext('user-1');

    expect(context.findings).toHaveLength(1);
    expect(context.scores[0]).toMatchObject({ title: 'qSOFA score' });
    expect(context.summaries).toEqual([]);
  });
});
