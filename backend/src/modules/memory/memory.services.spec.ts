import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClinicalMemoryService } from './clinical-memory.service';
import { ClinicalMemoryEntry, ClinicalMemoryType } from './entities/clinical-memory-entry.entity';
import { LongMemoryEntry, LongMemoryType } from './entities/long-memory-entry.entity';
import { ShortMemoryEntry, ShortMemoryType } from './entities/short-memory-entry.entity';
import { LongMemoryService } from './long-memory.service';
import { MemoryFabricScope, MemoryFabricSignalType } from './memory-fabric.constants';
import { MemoryFabricService } from './memory-fabric.service';
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

  it('lists recent conversations and tools from short-term memory', async () => {
    shortRepository.find.mockResolvedValueOnce([
      {
        id: 'conversation-memory',
        type: ShortMemoryType.ACTIVE_CONVERSATION,
        title: 'ICU rounds',
        content: { messageCount: 6 },
        createdAt: NOW,
        updatedAt: NOW,
      },
    ]);

    const conversations = await shortMemoryService.recentConversationsForUser('user-1', 5);

    expect(shortRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', type: ShortMemoryType.ACTIVE_CONVERSATION },
        take: 5,
      }),
    );
    expect(conversations[0]).toMatchObject({ title: 'ICU rounds' });

    shortRepository.find.mockResolvedValueOnce([
      {
        id: 'tool-memory',
        type: ShortMemoryType.ACTIVE_CALCULATOR,
        title: 'qSOFA',
        content: { toolId: 'qsofa' },
        createdAt: NOW,
        updatedAt: NOW,
      },
    ]);

    const tools = await shortMemoryService.recentToolsForUser('user-1', 5);

    expect(shortRepository.find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', type: ShortMemoryType.ACTIVE_CALCULATOR },
        take: 5,
      }),
    );
    expect(tools[0]).toMatchObject({ title: 'qSOFA' });
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

  it('returns recent saved tools without workflow memories', async () => {
    longRepository.find.mockResolvedValue([
      {
        id: 'tool-memory',
        type: LongMemoryType.SAVED_TOOLS,
        title: 'Drug checker',
        content: { toolId: 'drug-check' },
        tags: ['tool'],
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'workflow-memory',
        type: LongMemoryType.SAVED_TOOLS,
        title: 'Sepsis escalation workflow',
        content: { kind: 'workflow' },
        tags: ['workflow'],
        createdAt: NOW,
        updatedAt: NOW,
      },
    ]);

    const tools = await longMemoryService.recentToolsForUser('user-1', 5);

    expect(tools).toHaveLength(1);
    expect(tools[0]).toMatchObject({ id: 'tool-memory', title: 'Drug checker' });
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

describe('MemoryFabricService', () => {
  function createFabricService(overrides: Partial<Record<string, any>> = {}) {
    const shortMemoryService = {
      getActiveContext: jest.fn().mockResolvedValue({
        activeConversation: { id: 'short-1', title: 'Active chat', content: { message: 'raw' } },
      }),
      remember: jest.fn().mockImplementation((_userId, dto) => Promise.resolve({ id: 'short-new', ...dto })),
    };
    const longMemoryService = {
      getContext: jest.fn().mockResolvedValue({
        preferences: [],
        history: [
          {
            id: 'search-allowed',
            title: 'Allowed search bucket',
            content: { organizationId: 'org-1', signalType: MemoryFabricSignalType.COMMON_SEARCH, query: 'raw' },
            tags: ['memory-fabric', 'common-search'],
          },
          {
            id: 'search-other-tenant',
            title: 'Other tenant search bucket',
            content: { organizationId: 'org-2', signalType: MemoryFabricSignalType.COMMON_SEARCH },
            tags: ['memory-fabric', 'common-search'],
          },
        ],
        savedTools: [
          { id: 'tool-1', title: 'qSOFA', content: { toolId: 'qsofa' }, tags: ['tool'] },
          { id: 'tool-2', title: 'Locked asset', content: { toolId: 'locked-tool' }, tags: ['tool'] },
        ],
      }),
      savedWorkflowsForUser: jest.fn().mockResolvedValue([
        { id: 'workflow-1', title: 'Rounds', content: { workflowId: 'qsofa' }, tags: ['workflow'] },
        { id: 'workflow-locked', title: 'Locked', content: { workflowId: 'locked-tool' }, tags: ['workflow'] },
      ]),
      remember: jest.fn().mockImplementation((_userId, dto) => Promise.resolve({ id: 'long-new', ...dto })),
    };
    const userActivityService = {
      summaryForUser: jest.fn().mockResolvedValue({
        recentTools: [
          { id: 'activity-1', metadata: { toolId: 'qsofa' } },
          { id: 'activity-2', metadata: { toolId: 'locked-tool' } },
        ],
        recentCalculators: [],
        recentAiChats: [],
      }),
    };
    const personalizationService = {
      getForUser: jest.fn().mockResolvedValue({
        preferredBehavior: 'concise',
        suggestedTools: ['qsofa'],
        savedPrompts: [],
        recentPrompts: [],
        recommendedWorkflows: [],
      }),
    };
    const artifactsService = {
      list: jest.fn().mockResolvedValue({
        artifacts: [
          { id: 'artifact-1', title: 'Protocol', type: 'protocol', version: '1.0', tags: ['sepsis'] },
        ],
      }),
    };
    const assetAccessService = {
      getUserAssetAccess: jest.fn().mockResolvedValue({
        entitledPackIds: ['pack-1'],
        roleProfile: { id: 'role-1', label: 'Clinician', preferredAssetIds: ['qsofa', 'locked-tool'] },
        access: [
          { assetId: 'qsofa', accessState: 'allowed' },
          { assetId: 'locked-tool', accessState: 'locked' },
        ],
        pinnedAssetIds: ['qsofa', 'locked-tool'],
      }),
    };
    const auditService = { log: jest.fn().mockResolvedValue({}) };
    return {
      service: new MemoryFabricService(
        (overrides.shortMemoryService || shortMemoryService) as any,
        (overrides.longMemoryService || longMemoryService) as any,
        (overrides.userActivityService || userActivityService) as any,
        (overrides.personalizationService || personalizationService) as any,
        (overrides.artifactsService || artifactsService) as any,
        (overrides.assetAccessService || assetAccessService) as any,
        (overrides.auditService || auditService) as any,
      ),
      mocks: {
        shortMemoryService,
        longMemoryService,
        userActivityService,
        personalizationService,
        artifactsService,
        assetAccessService,
        auditService,
      },
    };
  }

  it('builds tenant-scoped and permission-filtered fabric context', async () => {
    const { service, mocks } = createFabricService();

    const context = await service.getContext({
      user: { id: 'user-1', role: 'clinician' },
      tenantContext: { organizationId: 'org-1', workspaceId: 'workspace-1', role: 'clinician' },
    });

    expect(context.organizationMemory.commonSearches).toHaveLength(1);
    expect(context.organizationMemory.commonSearches[0].id).toBe('search-allowed');
    expect(context.userMemory.pinnedAssets).toEqual(['qsofa']);
    expect(context.workspaceMemory.recentAssets).toEqual(['qsofa']);
    expect(context.roleMemory.preferredAssetIds).toEqual(['qsofa']);
    expect(context.aiMemory.shortTerm.activeConversation.content).not.toHaveProperty('message');
    expect(mocks.auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'memory_read',
        organizationId: 'org-1',
        workspaceId: 'workspace-1',
      }),
    );
  });

  it('records sanitized fabric signals and audits the write', async () => {
    const { service, mocks } = createFabricService();

    const result = await service.recordSignal({
      user: { id: 'user-1', role: 'clinician' },
      tenantContext: { organizationId: 'org-1', workspaceId: 'workspace-1' },
      dto: {
        scope: MemoryFabricScope.WORKSPACE,
        signalType: MemoryFabricSignalType.COMMON_SEARCH,
        title: 'Search bucket',
        content: {
          query: 'raw patient question',
          searchLength: 20,
          resultCount: 4,
        },
      },
    });

    expect(result.status).toBe('recorded');
    expect(mocks.longMemoryService.remember).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        content: expect.not.objectContaining({ query: expect.anything() }),
        tags: expect.arrayContaining(['memory-fabric', 'workspace', 'common_search']),
      }),
    );
    expect(mocks.longMemoryService.remember.mock.calls[0][1].content).toMatchObject({
      searchLength: 20,
      resultCount: 4,
      organizationId: 'org-1',
    });
    expect(mocks.auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'memory_write',
        resource: 'memory/fabric/long-new',
      }),
    );
  });
});
